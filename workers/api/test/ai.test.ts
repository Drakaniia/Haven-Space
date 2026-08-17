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
    GROQ_API_KEY: 'test-groq-key',
    DB: createSqliteD1(db),
  };
}

const originalFetch = globalThis.fetch;
let groqCalls = 0;
let groqFails = false;

/** Mock the Groq chat completions API used by the AI route. */
function mockGroq(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url.startsWith('https://api.groq.com/openai/v1/chat/completions')) {
      groqCalls += 1;

      if (groqFails) {
        return new Response('provider exploded', { status: 500 });
      }

      const body = JSON.parse(String(init?.body ?? '{}')) as { stream?: boolean };

      if (body.stream) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode('data: {"choices":[{"delta":{"content":"Mock stream"}}]}\n\n')
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });

        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }

      return new Response(JSON.stringify({ choices: [{ message: { content: 'Mock answer' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  groqCalls = 0;
  groqFails = false;
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
    mockGroq();

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
    expect(groqCalls).toBe(1);
  });

  it('refunds the guest freebie when the provider fails', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    mockGroq();

    groqFails = true;
    const failed = await postChat(env, { message: 'Hi' });

    expect(failed.status).toBe(502);
    expect(failed.headers.get('Set-Cookie')).toBeNull();
    expect(((await failed.json()) as { code: string }).code).toBe('AI_PROVIDER_ERROR');

    // The freebie is preserved, so a retry succeeds and then writes the cookie.
    groqFails = false;
    const retry = await postChat(env, { message: 'Hi' });

    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ success: true, response: 'Mock answer' });
    expect(usageCookieValue(retry)).toContain('.');
  });

  it('enforces the daily cap of 10 for authenticated users', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    mockGroq();
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
    expect(groqCalls).toBe(10);
  });

  it('resets the daily cap when the cookie date is stale', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    mockGroq();
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
    mockGroq();
    insertUser(sqlite, { role: 'admin', email: 'admin@example.com' });

    for (let index = 0; index < 12; index += 1) {
      const response = await postChat(env, { message: `Admin q${index}`, userId: 1 });

      expect(response.status).toBe(200);
      // No usage cookie is written for admins.
      expect(response.headers.get('Set-Cookie')).toBeNull();
    }

    expect(groqCalls).toBe(12);
  });

  it('treats a tampered or malformed cookie as absent', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    mockGroq();

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
    mockGroq();

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
    expect(groqCalls).toBe(1);
  });
});
