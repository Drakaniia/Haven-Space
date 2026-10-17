import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Env } from '../src/env';
import app from '../src/index';

/**
 * Route-level tests for landlord ↔ boarder messaging (spec
 * `messages-feature-review` §8): real in-memory SQLite with every non-seed
 * migration applied, driven through the Hono app exactly like the browser does.
 */

function runMigrations(db: Database): void {
  const migrationDir = join(import.meta.dir, '..', 'migrations');
  const migrationNames = readdirSync(migrationDir)
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
      }) as unknown as D1PreparedStatement,
  } as unknown as D1Database;
}

function createEnv(db: Database): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost:4173',
    JWT_SECRET: 'test-secret',
    DB: createSqliteD1(db),
  };
}

const LARA = 3;
const BENNY = 2;
const CARA = 4;
const MILO = 5;

/** Two landlords, two boarders, an application linking Benny to Lara, and a spare landlord pool. */
function seedMessagingData(db: Database): void {
  db.exec(`
    INSERT INTO users (id, first_name, last_name, email, role, is_verified, email_verified, account_status)
    VALUES
      (1, 'Ada', 'Admin', 'admin@example.com', 'admin', 1, 1, 'active'),
      (2, 'Benny', 'Boarder', 'benny@example.com', 'boarder', 1, 1, 'active'),
      (3, 'Lara', 'Landlord', 'lara@example.com', 'landlord', 1, 1, 'active'),
      (4, 'Cara', 'Boarder', 'cara@example.com', 'boarder', 1, 1, 'active'),
      (5, 'Milo', 'Landlord', 'milo@example.com', 'landlord', 1, 1, 'active'),
      (6, 'Nina', 'Landlord', 'nina@example.com', 'landlord', 1, 1, 'active'),
      (7, 'Omar', 'Landlord', 'omar@example.com', 'landlord', 1, 1, 'active'),
      (8, 'Pia', 'Landlord', 'pia@example.com', 'landlord', 1, 1, 'active'),
      (9, 'Quincy', 'Landlord', 'quincy@example.com', 'landlord', 1, 1, 'active');

    INSERT INTO properties (id, landlord_id, title, price, listing_moderation_status, status)
    VALUES
      (10, ${LARA}, 'Lara Boarding House', 4500, 'published', 'available'),
      (11, ${MILO}, 'Milo Boarding House', 5200, 'published', 'available'),
      (12, ${LARA}, 'Lara Annex', 3800, 'published', 'available');

    INSERT INTO rooms (id, property_id, landlord_id, title, price, status)
    VALUES (100, 10, ${LARA}, 'Room A', 4500, 'available');

    INSERT INTO applications (id, boarder_id, landlord_id, room_id, message, status)
    VALUES (200, ${BENNY}, ${LARA}, 100, 'I want this room.', 'pending');
  `);
}

function jsonHeaders(userId: number): HeadersInit {
  return { 'X-User-ID': String(userId), 'Content-Type': 'application/json' };
}

async function post(path: string, userId: number, body?: unknown): Promise<Response> {
  return app.request(
    `http://localhost${path}`,
    {
      method: 'POST',
      headers: jsonHeaders(userId),
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    activeEnv
  );
}

async function get(path: string, userId: number): Promise<Response> {
  return app.request(`http://localhost${path}`, { headers: jsonHeaders(userId) }, activeEnv);
}

async function del(path: string, userId: number): Promise<Response> {
  return app.request(
    `http://localhost${path}`,
    { method: 'DELETE', headers: jsonHeaders(userId) },
    activeEnv
  );
}

let activeEnv: Env;

function setup(): Database {
  const sqlite = new Database(':memory:');
  runMigrations(sqlite);
  seedMessagingData(sqlite);
  activeEnv = createEnv(sqlite);

  return sqlite;
}

/** Benny opens the inquiry thread with Lara about listing 10. */
async function openInquiry(): Promise<number> {
  const response = await post('/api/messages/threads', BENNY, {
    counterpart_id: LARA,
    property_id: 10,
  });
  const body = (await response.json()) as { data: { thread: { id: number } } };

  return body.data.thread.id;
}

describe('messages: threads', () => {
  it('creates one thread per pair and returns it on every later open', async () => {
    const sqlite = setup();

    const first = await post('/api/messages/threads', BENNY, {
      counterpart_id: LARA,
      property_id: 10,
    });
    const firstBody = (await first.json()) as {
      data: { thread: { id: number; property_title: string; counterpart_id: number } };
    };

    expect(first.status).toBe(201);
    expect(firstBody.data.thread.counterpart_id).toBe(LARA);
    expect(firstBody.data.thread.property_title).toBe('Lara Boarding House');

    const second = await post('/api/messages/threads', BENNY, {
      counterpart_id: LARA,
      property_id: 12,
    });
    const secondBody = (await second.json()) as {
      data: { thread: { id: number; property_title: string } };
    };

    expect(second.status).toBe(200);
    expect(secondBody.data.thread.id).toBe(firstBody.data.thread.id);
    // Origin listing is remembered; a later inquiry does not rewrite it (D21).
    expect(secondBody.data.thread.property_title).toBe('Lara Boarding House');
    expect(sqlite.query('SELECT COUNT(*) AS total FROM message_threads').get()).toEqual({
      total: 1,
    });
  });

  it('rejects a thread with a mismatched counterpart role, self-threads and foreign listings', async () => {
    setup();

    const selfThread = await post('/api/messages/threads', BENNY, { counterpart_id: BENNY });
    expect(selfThread.status).toBe(400);

    const wrongRole = await post('/api/messages/threads', BENNY, { counterpart_id: CARA });
    expect(wrongRole.status).toBe(404);

    // Listing 11 belongs to Milo, not Lara.
    const foreign = await post('/api/messages/threads', BENNY, {
      counterpart_id: LARA,
      property_id: 11,
    });
    expect(foreign.status).toBe(400);
  });

  it('returns the boarder’s inbox with unread counts for both sides', async () => {
    setup();
    await openInquiry();
    await post('/api/messages/threads/1/messages', BENNY, { body: 'Is Room A still free?' });

    const landlordInbox = await get('/api/messages/threads', LARA);
    const landlordBody = (await landlordInbox.json()) as {
      data: Array<{ counterpart_id: number; unread_count: number; last_body: string }>;
      unread_count: number;
    };

    expect(landlordBody.data).toHaveLength(1);
    expect(landlordBody.data[0].counterpart_id).toBe(BENNY);
    expect(landlordBody.data[0].unread_count).toBe(1);
    expect(landlordBody.data[0].last_body).toBe('Is Room A still free?');
    expect(landlordBody.unread_count).toBe(1);

    // The sender's own message is never unread for them (R8).
    const boarderInbox = await get('/api/messages/threads', BENNY);
    const boarderBody = (await boarderInbox.json()) as { unread_count: number };
    expect(boarderBody.unread_count).toBe(0);
  });

  it('resolves the landlord from the listing when a boarder composes from a CTA (R14)', async () => {
    setup();

    // The Contact Landlord link sends only the listing — the boarder never sees
    // the landlord's user id, so the server derives it.
    const response = await post('/api/messages/threads', BENNY, { property_id: 10 });
    const body = (await response.json()) as {
      data: { thread: { id: number; counterpart_id: number; property_title: string } };
    };

    expect(response.status).toBe(201);
    expect(body.data.thread.counterpart_id).toBe(LARA);
    expect(body.data.thread.property_title).toBe('Lara Boarding House');

    // Same intent again is the same conversation, not a second one (R1).
    const again = await post('/api/messages/threads', BENNY, { property_id: 10 });
    expect(again.status).toBe(200);
    expect(((await again.json()) as { data: { thread: { id: number } } }).data.thread.id).toBe(
      body.data.thread.id
    );

    // A landlord cannot use the shortcut: they own the listing, not the inquiry.
    const landlordAttempt = await post('/api/messages/threads', LARA, { property_id: 10 });
    expect(landlordAttempt.status).toBe(400);
  });

  it('allows a landlord to open a thread only with a linked boarder', async () => {
    setup();

    const linked = await post('/api/messages/threads', LARA, { counterpart_id: BENNY });
    expect(linked.status).toBe(201);

    const unlinked = await post('/api/messages/threads', MILO, { counterpart_id: BENNY });
    expect(unlinked.status).toBe(403);
  });

  it('caps a boarder at five new conversations per day', async () => {
    setup();

    for (const landlordId of [LARA, MILO, 6, 7, 8]) {
      const response = await post('/api/messages/threads', BENNY, {
        counterpart_id: landlordId,
      });
      expect(response.status).toBe(201);
    }

    // The same five pairs stay open all day — the cap only counts *new* threads (D13/Q1).
    const reopened = await post('/api/messages/threads', BENNY, { counterpart_id: LARA });
    expect(reopened.status).toBe(200);

    const capped = await post('/api/messages/threads', BENNY, { counterpart_id: 9 });
    const cappedBody = (await capped.json()) as { error: string; code: string };

    expect(capped.status).toBe(429);
    expect(cappedBody.code).toBe('inquiry_limit_reached');
    expect(cappedBody.error).toContain('Try again tomorrow');

    // Other boarders are unaffected by Benny's allowance.
    expect((await post('/api/messages/threads', CARA, { counterpart_id: LARA })).status).toBe(201);
  });
});

describe('messages: sending, unread and blocks', () => {
  it('rejects empty, oversized and over-attached messages', async () => {
    setup();
    const threadId = await openInquiry();

    const empty = await post(`/api/messages/threads/${threadId}/messages`, BENNY, { body: '   ' });
    expect(empty.status).toBe(400);

    const tooLong = await post(`/api/messages/threads/${threadId}/messages`, BENNY, {
      body: 'x'.repeat(2001),
    });
    expect(tooLong.status).toBe(400);

    const tooMany = await post(`/api/messages/threads/${threadId}/messages`, BENNY, {
      body: 'hi',
      attachments: Array.from({ length: 5 }, (_, index) => ({
        url: `https://utfs.io/f/key-${index}.png`,
        key: `key-${index}`,
      })),
    });
    expect(tooMany.status).toBe(400);

    // An image-only message is valid (R3).
    const imageOnly = await post(`/api/messages/threads/${threadId}/messages`, BENNY, {
      body: '',
      attachments: [{ url: 'https://utfs.io/f/room.png', key: 'room' }],
    });
    expect(imageOnly.status).toBe(201);

    const imageOnlyBody = (await imageOnly.json()) as {
      data: { message: { body: string; attachments: Array<{ url: string }> } };
    };
    expect(imageOnlyBody.data.message.attachments).toHaveLength(1);
  });

  it('marks the counterpart’s messages read and keeps the chip property', async () => {
    setup();
    const threadId = await openInquiry();
    await post(`/api/messages/threads/${threadId}/messages`, BENNY, { body: 'Hello' });
    await post(`/api/messages/threads/${threadId}/messages`, LARA, {
      body: 'Yes, it is free.',
      property_id: 12,
    });

    const landlordView = await get(`/api/messages/threads/${threadId}`, LARA);
    const landlordBody = (await landlordView.json()) as {
      data: { thread: { unread_count: number; property_title: string }; messages: unknown[] };
    };
    expect(landlordBody.data.messages).toHaveLength(2);
    expect(landlordBody.data.thread.unread_count).toBe(1);

    const read = await post(`/api/messages/threads/${threadId}/read`, LARA);
    expect(read.status).toBe(200);

    const afterRead = await get('/api/messages/unread-count', LARA);
    const afterReadBody = (await afterRead.json()) as { data: { unread_count: number } };
    expect(afterReadBody.data.unread_count).toBe(0);

    const boarderView = await get(`/api/messages/threads/${threadId}`, BENNY);
    const boarderBody = (await boarderView.json()) as {
      data: {
        thread: { property_title: string };
        messages: Array<{ body: string; property_id: number | null }>;
      };
    };
    // The thread's origin stays the first listing while the reply carries its own chip (D6/D21).
    expect(boarderBody.data.thread.property_title).toBe('Lara Boarding House');
    expect(boarderBody.data.messages[1].property_id).toBe(12);
  });

  it('reads the bell rows that point at the thread it just opened (R9)', async () => {
    setup();
    const threadId = await openInquiry();
    await post(`/api/messages/threads/${threadId}/messages`, BENNY, { body: 'Hello' });
    await post(`/api/messages/threads/${threadId}/messages`, LARA, { body: 'Hi there' });

    // Both sides have one unread bell row: the inquiry for Lara, the reply for Benny.
    for (const userId of [LARA, BENNY]) {
      const bell = await get('/api/notifications/unread-count', userId);
      const bellBody = (await bell.json()) as { data: { unread_count: number } };
      expect(bellBody.data.unread_count).toBe(1);
    }

    await post(`/api/messages/threads/${threadId}/read`, BENNY);

    const boarderBell = await get('/api/notifications/unread-count', BENNY);
    const landlordBell = await get('/api/notifications/unread-count', LARA);
    const boarderBellBody = (await boarderBell.json()) as { data: { unread_count: number } };
    const landlordBellBody = (await landlordBell.json()) as { data: { unread_count: number } };

    expect(boarderBellBody.data.unread_count).toBe(0);
    // One side reading a conversation never clears the other side's bell.
    expect(landlordBellBody.data.unread_count).toBe(1);
  });

  it('stops both directions while blocked and resumes after unblock', async () => {
    setup();
    const threadId = await openInquiry();
    await post(`/api/messages/threads/${threadId}/messages`, BENNY, { body: 'Hello' });

    const block = await post(`/api/messages/threads/${threadId}/block`, LARA, { blocked: true });
    expect(block.status).toBe(200);

    const boarderSend = await post(`/api/messages/threads/${threadId}/messages`, BENNY, {
      body: 'blocked?',
    });
    const landlordSend = await post(`/api/messages/threads/${threadId}/messages`, LARA, {
      body: 'also blocked?',
    });
    expect(boarderSend.status).toBe(403);
    expect(landlordSend.status).toBe(403);

    const boarderView = await get(`/api/messages/threads/${threadId}`, BENNY);
    const boarderBody = (await boarderView.json()) as {
      data: { blocked_by: string | null; thread: { blocked_me: number; blocked_by_me: number } };
    };
    expect(boarderBody.data.blocked_by).toBe('them');
    expect(boarderBody.data.thread.blocked_me).toBe(1);

    await post(`/api/messages/threads/${threadId}/block`, LARA, { blocked: false });
    const resumed = await post(`/api/messages/threads/${threadId}/messages`, BENNY, {
      body: 'welcome back',
    });
    expect(resumed.status).toBe(201);
  });

  it('rejects a non-participant from reading or writing a thread', async () => {
    setup();
    const threadId = await openInquiry();

    expect((await get(`/api/messages/threads/${threadId}`, CARA)).status).toBe(403);
    expect((await post(`/api/messages/threads/${threadId}/messages`, CARA, { body: 'hi' })).status).toBe(
      403
    );
    expect((await del(`/api/messages/threads/${threadId}`, CARA)).status).toBe(403);
    expect((await get('/api/messages/threads/9999', BENNY)).status).toBe(404);
  });

  it('deletes a thread for one side only and revives it on the next message', async () => {
    setup();
    const threadId = await openInquiry();
    await post(`/api/messages/threads/${threadId}/messages`, BENNY, { body: 'Hello' });

    const removed = await del(`/api/messages/threads/${threadId}`, LARA);
    expect(removed.status).toBe(200);

    const landlordInbox = await get('/api/messages/threads', LARA);
    const boarderInbox = await get('/api/messages/threads', BENNY);
    expect(((await landlordInbox.json()) as { data: unknown[] }).data).toHaveLength(0);
    expect(((await boarderInbox.json()) as { data: unknown[] }).data).toHaveLength(1);

    await post(`/api/messages/threads/${threadId}/messages`, BENNY, { body: 'Still there?' });

    const revived = await get('/api/messages/threads', LARA);
    expect(((await revived.json()) as { data: unknown[] }).data).toHaveLength(1);
  });

  it('records one open report per reporter and logs it for admins', async () => {
    setup();
    const threadId = await openInquiry();

    const invalid = await post(`/api/messages/threads/${threadId}/report`, LARA, {
      reason: 'because',
    });
    expect(invalid.status).toBe(400);

    const first = await post(`/api/messages/threads/${threadId}/report`, LARA, {
      reason: 'spam',
      details: 'Promoting another app.',
    });
    expect(first.status).toBe(201);

    const repeat = await post(`/api/messages/threads/${threadId}/report`, LARA, { reason: 'spam' });
    const repeatBody = (await repeat.json()) as { data: { already_reported: boolean } };
    expect(repeat.status).toBe(200);
    expect(repeatBody.data.already_reported).toBe(true);
  });
});

describe('messages: notifications', () => {
  it('tells the recipient about a message without leaking its body', async () => {
    setup();
    const threadId = await openInquiry();
    await post(`/api/messages/threads/${threadId}/messages`, BENNY, {
      body: 'Secret body text',
    });

    const landlordBell = await get('/api/notifications', LARA);
    const landlordBody = (await landlordBell.json()) as {
      data: Array<{ type: string; title: string; message: string; metadata: unknown }>;
    };

    expect(landlordBody.data).toHaveLength(1);
    expect(landlordBody.data[0].type).toBe('message');
    expect(landlordBody.data[0].title).toBe('New message from Benny Boarder');
    expect(JSON.stringify(landlordBody.data[0])).not.toContain('Secret body text');
    expect(landlordBody.data[0].metadata).toEqual({ thread_id: threadId, sender_id: BENNY });

    const boarderBell = await get('/api/notifications', BENNY);
    expect(((await boarderBell.json()) as { data: unknown[] }).data).toHaveLength(0);

    // Admins are metadata-only: no message rows reach the admin bell (D9/R12).
    const adminBell = await get('/api/notifications', 1);
    expect(((await adminBell.json()) as { data: unknown[] }).data).toHaveLength(0);
  });

  it('rate-limits a flood inside one conversation', async () => {
    setup();
    const threadId = await openInquiry();

    for (let index = 0; index < 30; index += 1) {
      const response = await post(`/api/messages/threads/${threadId}/messages`, BENNY, {
        body: `message ${index}`,
      });
      expect(response.status).toBe(201);
    }

    const blocked = await post(`/api/messages/threads/${threadId}/messages`, BENNY, {
      body: 'one too many',
    });
    expect(blocked.status).toBe(429);
  });
});
