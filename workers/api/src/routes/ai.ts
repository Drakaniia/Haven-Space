import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { authenticateUser, cookieValue, signJwt, verifyJwt } from '../lib/auth';
import type { AuthenticatedUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { HttpError, jsonResponse } from '../lib/http';

const aiRoutes = new Hono<{ Bindings: Env }>();

const DEFAULT_MODEL = 'gemini-3.6-flash';
const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`;
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:streamGenerateContent?alt=sse`;
const MAX_HISTORY_MESSAGES = 10;
const MAX_LISTINGS = 6;

// Response limits. Guests get one free response per browser (tracked by a
// signed cookie that never expires); authenticated boarders/landlords get a
// daily cap that resets at midnight Philippine Time; admins are unlimited.
const AI_USAGE_COOKIE = 'ai_usage';
const GUEST_MAX_RESPONSES = 1;
const USER_DAILY_MAX_RESPONSES = 10;
const GUEST_COOKIE_SECONDS = 60 * 60 * 24 * 365 * 10;
const USER_COOKIE_SECONDS = 60 * 60 * 24 * 2;

const SYSTEM_PROMPT = `You are Haven AI, the friendly and knowledgeable assistant for Haven Space, a boarding house platform in the Philippines connecting boarders with verified landlords.
Help users find rooms, understand payments, maintenance requests, applications, and tenancy.
Keep answers concise and practical. If real listings were provided, use them to answer accurately; otherwise, if you do not know something specific about a listing or account, be honest and point the user to the relevant page in the app (Find a Room, Payments, Maintenance, or their landlord).`;

interface ChatMessage {
  role: string;
  content: string;
}

const ROOM_KEYWORDS = [
  'room',
  'rooms',
  'boarding',
  'dorm',
  'dormitory',
  'rent',
  'rental',
  'property',
  'listing',
  'apartment',
  'bedspace',
  'ac',
  'wifi',
  'price',
  'find',
  'search',
  'near',
  'budget',
  'monthly',
  'under',
  'pesos',
  'php',
];

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'to',
  'in',
  'and',
  'or',
  'of',
  'at',
  'for',
  'with',
  'me',
  'my',
  'i',
  'we',
  'you',
  'your',
  'is',
  'are',
  'it',
  'that',
  'this',
  'these',
  'those',
  'under',
  'near',
  'nearby',
  'below',
  'around',
  'show',
  'shows',
  'want',
  'looking',
  'look',
  'list',
  'listing',
  'listings',
  'available',
  'good',
  'cheap',
  'affordable',
  'apartment',
  'dorm',
  'dormitory',
  'monthly',
  'rent',
  'rental',
  'rents',
  'per',
  'month',
  'please',
  'can',
  'how',
  'much',
  'do',
  'does',
  'need',
  'pesos',
  'php',
  'less',
  'than',
  'like',
  'some',
  'any',
  'anyone',
  'have',
  'has',
  'had',
  'there',
  'they',
  'their',
  'find',
  'room',
  'rooms',
  'boarding',
  'house',
  'houses',
  'budget',
  'max',
  'maximum',
  'minimum',
  'yes',
  'no',
  'several',
  'about',
  'tell',
  'what',
  'which',
  'where',
  'who',
  'when',
  'why',
  'would',
  'could',
  'get',
  'give',
  'recommend',
  'suggest',
  'options',
  'option',
  'place',
  'places',
  'spot',
  'staying',
  'stay',
]);

function looksLikeRoomSearch(message: string): boolean {
  const lower = message.toLowerCase();
  return ROOM_KEYWORDS.some(keyword => lower.includes(keyword));
}

function parseMaxPrice(message: string): number | null {
  const patterns = [
    /₱\s*(\d[\d,]*)/i,
    /(\d[\d,]*)\s*(?:pesos?|php|₱)/i,
    /(?:under|below|less than|max(?:imum)?|budget of?)\s+(\d[\d,]*)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return Number(match[1].replace(/,/g, ''));
    }
  }
  return null;
}

function parseSearchPhrase(message: string): string {
  const words = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(
      word => word.length >= 3 && !STOPWORDS.has(word) && !/^\d{2,}(?:,\d{3})*$/.test(word) // skip prices/amounts — handled by parseMaxPrice
    );
  return [...new Set(words)].slice(0, 4).join(' ');
}

interface RoomListing {
  property_id: number;
  property_title: string;
  price: number;
  city: string | null;
  province: string | null;
  address_line_1: string | null;
  available_rooms: number;
}

async function fetchRoomContext(
  db: D1Database,
  message: string
): Promise<{ listings: RoomListing[]; searched: boolean }> {
  if (!looksLikeRoomSearch(message)) {
    return { listings: [], searched: false };
  }

  const maxPrice = parseMaxPrice(message);
  const searchPhrase = parseSearchPhrase(message);

  const conditions = ['p.deleted_at IS NULL', "p.listing_moderation_status = 'published'"];
  const params: Array<string | number> = [];

  if (maxPrice !== null) {
    conditions.push('p.price <= ?');
    params.push(maxPrice);
  }

  if (searchPhrase) {
    conditions.push(
      '(p.title LIKE ? OR a.address_line_1 LIKE ? OR a.city LIKE ? OR p.description LIKE ?)'
    );
    const term = `%${searchPhrase}%`;
    params.push(term, term, term, term);
  }

  const sql = `
    SELECT p.id AS property_id, p.title AS property_title, p.price,
           a.city, a.province, a.address_line_1,
           (SELECT COUNT(*) FROM rooms r
             WHERE r.property_id = p.id AND r.deleted_at IS NULL AND r.status = 'available'
           ) AS available_rooms
    FROM properties p
    LEFT JOIN addresses a ON a.id = p.address_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.price ASC
    LIMIT ${MAX_LISTINGS}
  `;

  try {
    const result = await db
      .prepare(sql)
      .bind(...params)
      .all<RoomListing>();
    return {
      listings: (result.results ?? []) as RoomListing[],
      searched: true,
    };
  } catch {
    return { listings: [], searched: true };
  }
}

function formatRoomContext(listings: RoomListing[]): string {
  const lines = listings.map(
    (listing, index) =>
      `${index + 1}. ${listing.property_title} — ${listing.address_line_1 ?? listing.city ?? ''}${
        listing.city && listing.city !== listing.address_line_1 ? `, ${listing.city}` : ''
      }${listing.province ? `, ${listing.province}` : ''} — ₱${Number(
        listing.price
      ).toLocaleString()} — ${Number(listing.available_rooms) || 1} room(s) available`
  );
  return `Real listings currently available on Haven Space:\n${lines.join('\n')}`;
}

interface AiUsageState {
  kind?: 'guest' | 'user';
  user_id?: number | string;
  date?: string;
  count?: number;
}

/**
 * Current calendar date in Philippine Time (Asia/Manila, UTC+8) as YYYY-MM-DD,
 * used to reset the authenticated daily chat cap at local midnight.
 */
function phDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}

/**
 * HttpOnly tracking cookie carrying a signed usage counter. Over https it must
 * be SameSite=None; Secure so the cross-origin web app can send it back (same
 * pattern as the Google OAuth state cookie); over plain http (local dev) it
 * stays Lax and omits Secure so browsers don't reject it.
 */
function aiUsageCookie(requestUrl: string, value: string, maxAgeSeconds: number): string {
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : '';
  const sameSite = secure ? 'None' : 'Lax';

  return `${AI_USAGE_COOKIE}=${value}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; SameSite=${sameSite}${secure}`;
}

/** Read and verify the signed ai_usage cookie; null when absent or invalid. */
async function readAiUsage(c: Context<{ Bindings: Env }>): Promise<AiUsageState | null> {
  if (!c.env.JWT_SECRET) return null;

  const raw = cookieValue(c.req.raw, AI_USAGE_COOKIE);

  if (!raw) return null;

  const payload = await verifyJwt(raw, c.env.JWT_SECRET);

  if (!payload || (payload.kind !== 'guest' && payload.kind !== 'user')) return null;

  return {
    kind: payload.kind,
    user_id: payload.user_id,
    date: typeof payload.date === 'string' ? payload.date : undefined,
    count: typeof payload.count === 'number' ? payload.count : 0,
  };
}

/** Build the Set-Cookie value for a fresh/incremented usage state. */
async function aiUsageCookieValue(
  c: Context<{ Bindings: Env }>,
  payload: Record<string, unknown>
): Promise<string> {
  const maxAgeSeconds = payload.kind === 'guest' ? GUEST_COOKIE_SECONDS : USER_COOKIE_SECONDS;
  const value = await signJwt(payload, c.env.JWT_SECRET!, maxAgeSeconds);

  return aiUsageCookie(c.req.url, value, maxAgeSeconds);
}

function isRegionBlocked(detail: string): boolean {
  const lower = detail.toLowerCase();
  return (
    lower.includes('user location is not supported') ||
    (lower.includes('failed_precondition') && lower.includes('location'))
  );
}

function buildFallbackResponse(userMessage: string, roomContext: { listings: RoomListing[]; searched: boolean }): string {
  if (roomContext.listings.length > 0) {
    return `Haven AI is temporarily running in offline mode due to a regional AI limitation, but I can still help!\n\n${formatRoomContext(roomContext.listings)}\n\nYou asked: "${userMessage}" — you can view these listings on the Find a Room page. If you need help with payments, maintenance, or tenancy, let me know and I'll point you to the right place in the app.`;
  }
  return `Haven AI is temporarily running in offline mode due to a regional AI limitation, but I'm still here to help! You asked: "${userMessage}"\n\nTry browsing Find a Room for listings, or ask about payments, maintenance requests, or tenancy — I can guide you to the right page in the app.`;
}

function fallbackSseResponse(message: string, propertyCount: number, usageCookie: string | null): Response {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  void (async () => {
    const chunkSize = 24;
    for (let i = 0; i < message.length; i += chunkSize) {
      const delta = message.slice(i, i + chunkSize);
      await writer.write(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
      await new Promise(r => setTimeout(r, 12));
    }
    await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true, property_count: propertyCount })}\n\n`));
    await writer.close().catch(() => {});
  })();
  const headers = new Headers({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  if (usageCookie) headers.append('Set-Cookie', usageCookie);
  return new Response(readable, { headers });
}

function toGeminiPayload(messages: ChatMessage[]): Record<string, unknown> {
  const systemTexts: string[] = [];
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const m of messages) {
    if (m.role === 'system') systemTexts.push(m.content);
    else contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
  }
  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
  };
  if (systemTexts.length) body.systemInstruction = { parts: [{ text: systemTexts.join('\n\n') }] };
  return body;
}

async function geminiChatCompletion(apiKey: string, messages: ChatMessage[]): Promise<string> {
  const response = await fetch(GEMINI_GENERATE_URL, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toGeminiPayload(messages)),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new HttpError(502, 'AI provider request failed', {
      code: 'AI_PROVIDER_ERROR',
      details: detail.slice(0, 500),
    });
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const content = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('');
  if (!content || !content.trim()) {
    throw new HttpError(502, 'AI provider returned no response', { code: 'AI_EMPTY_RESPONSE' });
  }

  return content;
}

function streamGeminiChat(
  apiKey: string,
  messages: ChatMessage[],
  propertyCount: number,
  usageCookie: string | null
): Promise<Response> {
  return fetch(GEMINI_STREAM_URL, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toGeminiPayload(messages)),
    signal: AbortSignal.timeout(60_000),
  })
    .then(async upstream => {
      if (!upstream.ok) {
        const detail = await upstream.text();
        return jsonResponse(
          {
            success: false,
            error: 'AI provider request failed',
            code: 'AI_PROVIDER_ERROR',
            details: detail.slice(0, 500),
          },
          200
        );
      }

      if (!upstream.body) {
        return jsonResponse(
          { success: false, error: 'AI provider returned no stream', code: 'AI_EMPTY_RESPONSE' },
          200
        );
      }

      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      void (async () => {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const payload = trimmed.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;
              try {
                const parsed = JSON.parse(payload) as {
                  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                };
                const delta = parsed.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('');
                if (delta) {
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                }
              } catch {
                // ignore malformed upstream frames
              }
            }
          }
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, property_count: propertyCount })}\n\n`
            )
          );
        } catch {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, error: 'stream interrupted' })}\n\n`
            )
          );
        } finally {
          await writer.close().catch(() => {});
        }
      })();

      const headers = new Headers({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      if (usageCookie) {
        headers.append('Set-Cookie', usageCookie);
      }

      return new Response(readable, { headers });
    })
    .catch(error => {
      return jsonResponse(
        {
          success: false,
          error: error instanceof Error ? error.message : 'AI provider request failed',
          code: 'AI_PROVIDER_ERROR',
        },
        200
      );
    });
}

aiRoutes.post('/api/ai/chat', async c => {
  const apiKey = c.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { success: false, error: 'AI assistant is not configured', code: 'AI_NOT_CONFIGURED' },
      200
    );
  }

  let body: { message?: unknown; history?: unknown; stream?: unknown };
  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    throw new HttpError(400, 'Message is required');
  }

  // --- Response limits ---------------------------------------------------
  // Guests get one free response per browser; authenticated boarders and
  // landlords get a daily cap (10, reset at midnight Philippine Time); admins
  // are unlimited. The cookie is only written after a successful AI response,
  // so failed/errored attempts do not consume the allowance (refund on
  // failure). Enforcement is skipped entirely if JWT_SECRET is missing.
  let usageCookie: string | null = null;

  if (c.env.JWT_SECRET) {
    let authUser: AuthenticatedUser | null = null;
    try {
      authUser = await authenticateUser(requireD1(c.env), c.req.raw, c.env.JWT_SECRET);
    } catch {
      // Missing/invalid token (or DB/auth failure) — fall back to guest rules
    }

    const usage = await readAiUsage(c);

    if (authUser && authUser.role === 'admin') {
      // Admins are exempt from response limits.
    } else if (authUser) {
      const today = phDate();
      const current =
        usage &&
        usage.kind === 'user' &&
        Number(usage.user_id) === authUser.user_id &&
        usage.date === today
          ? Math.max(0, usage.count ?? 0)
          : 0;

      if (current >= USER_DAILY_MAX_RESPONSES) {
        return jsonResponse(
          {
            success: false,
            error: `You've reached today's limit of ${USER_DAILY_MAX_RESPONSES} Haven AI questions. Come back tomorrow.`,
            code: 'AI_LIMIT_REACHED',
            limit: { scope: 'user', max: USER_DAILY_MAX_RESPONSES },
          },
          429
        );
      }

      usageCookie = await aiUsageCookieValue(c, {
        kind: 'user',
        user_id: authUser.user_id,
        date: today,
        count: current + 1,
      });
    } else if (usage && usage.kind === 'guest') {
      return jsonResponse(
        {
          success: false,
          error:
            "You've used your one free Haven AI question. Log in or sign up for unlimited chat.",
          code: 'AI_LIMIT_REACHED',
          limit: { scope: 'guest', max: GUEST_MAX_RESPONSES },
        },
        429
      );
    } else {
      usageCookie = await aiUsageCookieValue(c, { kind: 'guest', count: 1 });
    }
  }

  let roomContext: { listings: RoomListing[]; searched: boolean } = {
    listings: [],
    searched: false,
  };
  try {
    const db = requireD1(c.env);
    roomContext = await fetchRoomContext(db, message);
  } catch {
    // DB unavailable — fall back to plain chat
  }

  const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

  if (roomContext.listings.length > 0) {
    messages.push({ role: 'system', content: formatRoomContext(roomContext.listings) });
  }

  if (Array.isArray(body.history)) {
    const recent = body.history.slice(-MAX_HISTORY_MESSAGES);
    for (const item of recent) {
      if (!item || typeof item !== 'object') continue;
      const { role, content } = item as ChatMessage;
      if (
        (role === 'user' || role === 'assistant') &&
        typeof content === 'string' &&
        content.trim()
      ) {
        messages.push({ role, content: content.trim() });
      }
    }
  }

  messages.push({ role: 'user', content: message });

  const propertyCount = roomContext.searched ? roomContext.listings.length : 0;
  const fallbackMessage = buildFallbackResponse(message, roomContext);

  if (body.stream === true) {
    return streamGeminiChat(apiKey, messages, propertyCount, usageCookie);
  }

  try {
    const response = await geminiChatCompletion(apiKey, messages);
    const result = jsonResponse({
      success: true,
      response,
      ...(roomContext.searched ? { property_count: roomContext.listings.length } : {}),
    });
    if (usageCookie) {
      result.headers.append('Set-Cookie', usageCookie);
    }
    return result;
  } catch (error) {
    if (error instanceof HttpError && isRegionBlocked(String(error.details ?? error.message))) {
      const result = jsonResponse({
        success: true,
        response: fallbackMessage,
        ...(roomContext.searched ? { property_count: roomContext.listings.length } : {}),
      });
      if (usageCookie) result.headers.append('Set-Cookie', usageCookie);
      return result;
    }
    throw error;
  }
});

export default aiRoutes;
