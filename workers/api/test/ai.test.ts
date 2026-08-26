import { afterEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import app from '../src/index';
import type { Env } from '../src/env';
import { signJwt } from '../src/lib/auth';

function runMigrations(db: Database): void {
  const migrationDir = join(import.meta.dir, '..', 'migrations');
  const migrationNames = readdirSync(migrationDir)
    // Skip seed migrations (demo data) — tests build their own fixtures.
    .filter(name => name.endsWith('.sql') && !name.includes('seed'))
    .sort();

  for (const name of migrationNames) {
    db.exec(readFileSync(join(migrationDir, name), 'utf8'));
  }
}

function createSqliteD1(db: Database): D1Database {
  return {
    prepare: (sql: string) =>
      ({
        bind: (...values: unknown[]) => {
          const statement = db.prepare(sql);

          return {
            first: async <T>() => (statement.get(...values) ?? null) as T | null,
            all: async <T>() => ({ results: statement.all(...values) as T[] }),
            run: async () => {
              const result = statement.run(...values);

              return {
                success: true,
                meta: {
                  last_row_id: Number(result.lastInsertRowid ?? 0),
                  changes: Number(result.changes ?? 0),
                },
                results: [],
              };
            },
          };
        },
      } as unknown as D1PreparedStatement),
  } as unknown as D1Database;
}

function createEnv(db: Database): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost:4173,http://localhost:8788',
    JWT_SECRET: 'test-secret',
    GEMINI_API_KEY: 'test-gemini-key',
    DB: createSqliteD1(db),
  };
}

const originalFetch = globalThis.fetch;
let geminiCalls = 0;
let geminiFails = false;

/** Mock the Gemini generateContent API used by the AI route. */
function mockGemini(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')) {
      geminiCalls += 1;

      if (geminiFails) {
        return new Response('provider exploded', { status: 500 });
      }

      const isStream = url.includes(':streamGenerateContent');

      if (isStream) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                'data: {"candidates":[{"content":{"parts":[{"text":"Mock stream"}]}}]}\n\n'
              )
            );
            controller.close();
          },
        });

        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }

      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Mock answer' }] } }] }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return originalFetch(input, init);
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  geminiCalls = 0;
  geminiFails = false;
});

function postChat(
  env: Env,
  opts: { message?: string; cookie?: string; userId?: number; stream?: boolean } = {}
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (opts.cookie) headers.Cookie = `ai_usage=${opts.cookie}`;
  if (opts.userId) headers['X-User-ID'] = String(opts.userId);

  return app.request(
    'http://localhost/api/ai/chat',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: opts.message ?? 'Hello', stream: opts.stream ?? false }),
    },
    env
  );
}

function usageCookieValue(response: Response): string | null {
  const cookie = response.headers.get('Set-Cookie');

  if (!cookie) return null;

  return cookie.split(';')[0].split('=')[1] ?? null;
}

function jwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

function insertUser(db: Database, user: { role: string; email: string; firstName?: string }): void {
  db.prepare(
    `
      INSERT INTO users (
        first_name,
        last_name,
        email,
        password_hash,
        role,
        is_verified,
        email_verified,
        account_status,
        boarder_status
      )
      VALUES (?, 'User', ?, '$2y$10$hash', ?, 1, 1, 'active', ?)
    `
  ).run(user.firstName ?? 'Test', user.email, user.role, user.role === 'boarder' ? 'new' : null);
}

function phDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}

describe('ai chat response limits', () => {
  it('allows a guest one response and blocks the second with 429', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    mockGemini();

    const first = await postChat(env, { message: 'Find a room' });

    expect(first.status).toBe(200);
    // Room searches also carry property_count (0 here — no published listings).
    expect(await first.json()).toMatchObject({ success: true, response: 'Mock answer' });

    const cookie = usageCookieValue(first);
    expect(cookie).toBeString();
    expect(jwtPayload(cookie as string)).toMatchObject({ kind: 'guest', count: 1 });

    const second = await postChat(env, { message: 'Another question', cookie: cookie as string });

    expect(second.status).toBe(429);
    expect(await second.json()).toEqual({
      success: false,
      error: "You've used your one free Haven AI question. Log in or sign up for unlimited chat.",
      code: 'AI_LIMIT_REACHED',
      limit: { scope: 'guest', max: 1 },
    });
    // The blocked request never reached the AI provider.
    expect(geminiCalls).toBe(1);
  });

  it('refunds the guest freebie when the provider fails', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    mockGemini();

    geminiFails = true;
    const failed = await postChat(env, { message: 'Hi' });

    expect(failed.status).toBe(502);
    expect(failed.headers.get('Set-Cookie')).toBeNull();
    expect(((await failed.json()) as { code: string }).code).toBe('AI_PROVIDER_ERROR');

    // The freebie is preserved, so a retry succeeds and then writes the cookie.
    geminiFails = false;
    const retry = await postChat(env, { message: 'Hi' });

    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ success: true, response: 'Mock answer' });
    expect(usageCookieValue(retry)).toContain('.');
  });

  it('enforces the daily cap of 10 for authenticated users', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    mockGemini();
    insertUser(sqlite, { role: 'boarder', email: 'boarder@example.com' });

    let cookie: string | null = null;

    for (let index = 0; index < 10; index += 1) {
      const response = await postChat(env, {
        message: `Question ${index + 1}`,
        cookie: cookie ?? undefined,
        userId: 1,
      });

      expect(response.status).toBe(200);
      cookie = usageCookieValue(response);
      expect(cookie).toBeString();
    }

    const payload = jwtPayload(cookie as string);
    expect(payload).toMatchObject({
      kind: 'user',
      user_id: 1,
      date: phDate(),
      count: 10,
    });

    const eleventh = await postChat(env, {
      message: 'Question 11',
      cookie: cookie as string,
      userId: 1,
    });

    expect(eleventh.status).toBe(429);
    expect(await eleventh.json()).toEqual({
      success: false,
      error: "You've reached today's limit of 10 Haven AI questions. Come back tomorrow.",
      code: 'AI_LIMIT_REACHED',
      limit: { scope: 'user', max: 10 },
    });
    expect(geminiCalls).toBe(10);
  });

  it('resets the daily cap when the cookie date is stale', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    mockGemini();
    insertUser(sqlite, { role: 'boarder', email: 'boarder@example.com' });

    const staleCookie = await signJwt(
      { kind: 'user', user_id: 1, date: '2000-01-01', count: 10 },
      'test-secret',
      3600
    );

    const response = await postChat(env, { cookie: staleCookie, userId: 1 });

    expect(response.status).toBe(200);
    expect(jwtPayload(usageCookieValue(response) as string)).toMatchObject({
      kind: 'user',
      user_id: 1,
      date: phDate(),
      count: 1,
    });
  });

  it('exempts admins from response limits', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    mockGemini();
    insertUser(sqlite, { role: 'admin', email: 'admin@example.com' });

    for (let index = 0; index < 12; index += 1) {
      const response = await postChat(env, { message: `Admin q${index}`, userId: 1 });

      expect(response.status).toBe(200);
      // No usage cookie is written for admins.
      expect(response.headers.get('Set-Cookie')).toBeNull();
    }

    expect(geminiCalls).toBe(12);
  });

  it('treats a tampered or malformed cookie as absent', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    mockGemini();

    const tampered = await postChat(env, { cookie: 'not-a-real-jwt' });

    expect(tampered.status).toBe(200);
    expect(await tampered.json()).toEqual({ success: true, response: 'Mock answer' });
    // A fresh guest cookie is issued.
    expect(jwtPayload(usageCookieValue(tampered) as string)).toMatchObject({ kind: 'guest' });
  });

  it('blocks a blocked guest streaming request with a JSON 429', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    mockGemini();

    const first = await postChat(env, { message: 'Stream me', stream: true });

    expect(first.status).toBe(200);
    expect(first.headers.get('content-type')).toContain('text/event-stream');
    const cookie = usageCookieValue(first);
    expect(cookie).toBeString();

    const second = await postChat(env, {
      message: 'Again',
      cookie: cookie as string,
      stream: true,
    });

    expect(second.status).toBe(429);
    expect(second.headers.get('content-type')).toContain('application/json');
    expect(((await second.json()) as { code: string }).code).toBe('AI_LIMIT_REACHED');
    expect(geminiCalls).toBe(1);
  });
});

describe('gemini model validity (regression for AI_PROVIDER_ERROR)', () => {
  it('routes non-stream chat to a valid Gemini model (not gemini-3.6-flash)', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);

    let requestedUrl = '';
    const savedFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')) {
        requestedUrl = url;
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Mock answer' }] } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return savedFetch(input as RequestInfo, init);
    }) as typeof fetch;

    try {
      const response = await postChat(env, { message: 'Hello' });
      expect(response.status).toBe(200);
      expect(requestedUrl).toContain('gemini-2.0-flash');
      expect(requestedUrl).not.toContain('gemini-3.6-flash');
      expect(requestedUrl).toContain(':generateContent');
    } finally {
      globalThis.fetch = savedFetch;
    }
  });

  it('routes streaming chat to a valid Gemini model (not gemini-3.6-flash)', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);

    let requestedUrl = '';
    const savedFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')) {
        requestedUrl = url;
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"Mock stream"}]}}]}\n\n'));
            controller.close();
          },
        });
        return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
      }
      return savedFetch(input as RequestInfo, init);
    }) as typeof fetch;

    try {
      const response = await postChat(env, { message: 'Hello stream', stream: true });
      expect(response.status).toBe(200);
      expect(requestedUrl).toContain('gemini-2.0-flash');
      expect(requestedUrl).not.toContain('gemini-3.6-flash');
      expect(requestedUrl).toContain(':streamGenerateContent');
    } finally {
      globalThis.fetch = savedFetch;
    }
  });

  it('fails explicitly if still pointing at the nonexistent gemini-3.6-flash', async () => {
    const source = await Bun.file(join(import.meta.dir, '..', 'src/routes/ai.ts')).text();
    expect(source).not.toContain('gemini-3.6-flash');
    expect(source).toContain('gemini-2.0-flash');
  });

  it('retries with fallback model when primary returns model_not_found (non-stream)', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);

    const calls: string[] = [];
    const savedFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')) {
        calls.push(url);
        if (url.includes('gemini-2.0-flash')) {
          return new Response(JSON.stringify({ error: { message: 'models/gemini-2.0-flash is not found', code: 404 } }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('gemini-1.5-flash')) {
          return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Fallback answer' }] } }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
      return savedFetch(input as RequestInfo);
    }) as typeof fetch;

    try {
      const response = await postChat(env, { message: 'Hello fallback' });
      expect(response.status).toBe(200);
      const body = (await response.json()) as { success: boolean; response: string };
      expect(body.success).toBe(true);
      expect(body.response).toBe('Fallback answer');
      expect(calls.some(u => u.includes('gemini-2.0-flash'))).toBe(true);
      expect(calls.some(u => u.includes('gemini-1.5-flash'))).toBe(true);
    } finally {
      globalThis.fetch = savedFetch;
    }
  });

  it('retries with fallback model when primary returns model_not_found (stream)', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);

    const calls: string[] = [];
    const savedFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')) {
        calls.push(url);
        if (url.includes('gemini-2.0-flash')) {
          return new Response('models/gemini-2.0-flash is not found', { status: 404 });
        }
        if (url.includes('gemini-1.5-flash')) {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"Fallback stream"}]}}]}\n\n'));
              controller.close();
            },
          });
          return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
        }
      }
      return savedFetch(input as RequestInfo);
    }) as typeof fetch;

    try {
      const response = await postChat(env, { message: 'Hello fallback stream', stream: true });
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      expect(calls.some(u => u.includes('gemini-2.0-flash'))).toBe(true);
      expect(calls.some(u => u.includes('gemini-1.5-flash'))).toBe(true);
    } finally {
      globalThis.fetch = savedFetch;
    }
  });
});
