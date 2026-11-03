import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Env } from '../src/env';
import app from '../src/index';
import type { ActivityResult } from '../src/repositories/landlord-activity';

/**
 * Route-level tests for `GET /api/landlord/activity` (spec
 * `landlord-dashboard-redesign` §8.5). January 2026 is entirely in the past, so
 * the feed's "only what happened" filter is deterministic here.
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
      } as unknown as D1PreparedStatement),
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

function seedActivity(db: Database): void {
  db.exec(`
    INSERT INTO users (
      id, first_name, last_name, email, password_hash, role,
      is_verified, email_verified, account_status, boarder_status, created_at
    )
    VALUES
      (2, 'Benny', 'Boarder', 'boarder@example.com', 'hash', 'boarder', 1, 1, 'active', 'confirmed', '2026-01-01 07:00:00'),
      (3, 'Lara', 'Landlord', 'landlord@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-01 07:00:00'),
      (4, 'Rival', 'Landlord', 'rival@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-01 07:00:00');

    INSERT INTO addresses (id, address_line_1, city, province)
    VALUES (5, '100 Flow Street', 'Manila', 'Metro Manila'),
           (6, '200 Rival Road', 'Cebu', 'Cebu');

    INSERT INTO properties (
      id, landlord_id, address_id, title, price, deposit,
      listing_moderation_status, status, created_at
    )
    VALUES
      (10, 3, 5, 'Flow House', 6500, 1500, 'published', 'available', '2026-01-03 08:00:00'),
      (11, 4, 6, 'Rival House', 5000, 1000, 'published', 'available', '2026-01-04 08:00:00'),
      (12, 3, 5, 'Draft House', 5000, 1000, 'published', 'draft', '2026-01-05 08:00:00');

    INSERT INTO rooms (id, property_id, landlord_id, room_number, title, price, deposit, status)
    VALUES
      (100, 10, 3, 'A1', 'Flow Room', 6500, 1500, 'occupied'),
      (101, 11, 4, 'B1', 'Rival Room', 5000, 1000, 'occupied');

    INSERT INTO applications (
      id, boarder_id, landlord_id, room_id, message, status, advance_amount,
      created_at, confirmed_at, updated_at
    )
    VALUES (200, 2, 3, 100, 'Me please.', 'confirmed', 6500,
            '2026-01-02 08:00:00', '2026-01-04 08:00:00', '2026-01-04 08:00:00');

    INSERT INTO payments (
      id, boarder_id, landlord_id, room_id, property_id, amount, late_fee,
      due_date, paid_date, status, charge_type, created_at, updated_at
    )
    VALUES (300, 2, 3, 100, 10, 6500, 0, '2026-01-10', '2026-01-22',
            'paid', 'rent', '2026-01-01 08:00:00', '2026-01-22 10:00:00');

    INSERT INTO announcements (id, landlord_id, title, description, category, priority, publish_date)
    VALUES
      (400, 3, 'Water interruption', 'No water on the 5th.', 'general', 'medium', '2026-01-05'),
      (401, 3, 'Future notice', 'Scheduled far ahead.', 'general', 'medium', '2099-01-15');
  `);
}

function setup(): Env {
  const sqlite = new Database(':memory:');
  runMigrations(sqlite);
  seedActivity(sqlite);

  return createEnv(sqlite);
}

async function getActivity(
  env: Env,
  query: string,
  userId = '3'
): Promise<{ status: number; body: { data?: ActivityResult; error?: string } }> {
  const response = await app.request(
    `http://localhost/api/landlord/activity?${query}`,
    { headers: { 'X-User-ID': userId } },
    env
  );

  return { status: response.status, body: (await response.json()) as never };
}

const JANUARY = 'from=2026-01-01&to=2026-02-01';

describe('GET /api/landlord/activity', () => {
  it('returns only things that happened, newest first, with no scheduled charge_due rows', async () => {
    const { status, body } = await getActivity(setup(), JANUARY);
    const data = body.data!;

    expect(status).toBe(200);
    expect(data.window).toEqual({ from: '2026-01-01', to: '2026-02-01' });
    expect(data.total).toBe(data.events.length);
    expect(data.truncated).toBe(false);
    expect(data.events.some(event => event.type === 'charge_due')).toBe(false);
    expect(data.events.map(event => event.type)).toEqual(
      expect.arrayContaining([
        'payment_received',
        'application_received',
        'application_accepted',
        'application_confirmed',
        'tenancy_move_in',
        'announcement_publish',
        'listing_published',
      ])
    );

    // The future announcement and the draft property are not activity yet.
    expect(data.events.some(event => event.subject === 'Future notice')).toBe(false);
    expect(data.events.some(event => event.subject === 'Draft House')).toBe(false);

    // A payment carries its record timestamp, not just the paid date.
    const paid = data.events.find(event => event.type === 'payment_received')!;
    expect(paid.occurred_at).toBe('2026-01-22T10:00:00Z');

    // Newest first.
    for (let index = 1; index < data.events.length; index += 1) {
      expect(Date.parse(data.events[index - 1]!.occurred_at)).toBeGreaterThanOrEqual(
        Date.parse(data.events[index]!.occurred_at)
      );
    }
  });

  it('filters by family and never treats charge_due as an activity type', async () => {
    const env = setup();
    const money = await getActivity(env, `${JANUARY}&types=money`);

    expect(money.body.data!.events.every(event => event.family === 'money')).toBe(true);
    expect(money.body.data!.events.some(event => event.type === 'charge_due')).toBe(false);

    const bad = await getActivity(env, `${JANUARY}&types=charge_due`);
    expect(bad.status).toBe(400);
    expect(bad.body.error).toContain('charge_due');
  });

  it('scopes to an accessible property and returns an empty list for a foreign one', async () => {
    const env = setup();
    const own = await getActivity(env, `${JANUARY}&propertyId=10`);
    const other = await getActivity(env, `${JANUARY}&propertyId=11`);

    // Global announcements have no property, but nothing may point at property 11.
    expect(
      own.body.data!.events.every(event => event.property === null || event.property.id === 10)
    ).toBe(true);
    expect(other.status).toBe(200);
    expect(other.body.data!.events).toEqual([]);
  });

  it('pages deterministically and reports the next offset', async () => {
    const env = setup();
    const first = await getActivity(env, `${JANUARY}&limit=2`);
    const second = await getActivity(env, `${JANUARY}&limit=2&offset=2`);

    expect(first.body.data!.events).toHaveLength(2);
    expect(first.body.data!.has_more).toBe(true);
    expect(first.body.data!.next_offset).toBe(2);
    expect(second.body.data!.events).toHaveLength(2);
    expect(second.body.data!.events[0]!.id).not.toBe(first.body.data!.events[0]!.id);
  });

  it('rejects bad windows and non-landlord callers', async () => {
    const env = setup();

    expect((await getActivity(env, 'from=2026-02-01&to=2026-01-01')).status).toBe(400);
    expect((await getActivity(env, 'from=2026-01-01&to=2027-06-01')).status).toBe(400);
    expect((await getActivity(env, JANUARY, '2')).status).toBe(403);
  });
});
