import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Env } from '../src/env';
import app from '../src/index';
import {
  buildCalendarSummary,
  CALENDAR_EVENT_TYPES,
  calendarReferenceDate,
  capCalendarEvents,
  isCalendarWindowValid,
  parseCalendarTypes,
  sortCalendarEvents,
  type CalendarEvent,
  type CalendarResult,
} from '../src/repositories/landlord-calendar';
import { manilaToday } from '../src/repositories/payments/helpers';

/**
 * Route-level tests for the landlord calendar (spec `landlord-calendar` §12):
 * real in-memory SQLite with every non-seed migration applied, driven through the
 * Hono app exactly like the browser does.
 *
 * Every window here is a **fixed** one — a past January and a 2099 future month —
 * so no assertion depends on the machine's clock. The seeded "as of the window's
 * last day" behaviour is the one exception, and it is asserted deliberately.
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

/**
 * Landlord 3 owns property 10; landlord 4 owns the rival property 11; landlord 8
 * holds a `property_access` grant on property 10 (so a co-landlord sees exactly
 * the same calendar); boarder 2 lives in room 100.
 */
function seedCalendarData(db: Database): void {
  db.exec(`
    INSERT INTO users (
      id, first_name, last_name, email, password_hash, role,
      is_verified, email_verified, account_status, boarder_status, created_at
    )
    VALUES
      (2, 'Benny', 'Boarder', 'boarder@example.com', 'hash', 'boarder', 1, 1, 'active', 'confirmed', '2026-01-01 08:00:00'),
      (3, 'Lara', 'Landlord', 'landlord@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-01 08:00:00'),
      (4, 'Rival', 'Landlord', 'rival@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-01 08:00:00'),
      (7, 'Other', 'Boarder', 'other@example.com', 'hash', 'boarder', 1, 1, 'active', 'confirmed', '2026-01-01 08:00:00'),
      (8, 'Cora', 'Colandlord', 'cora@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-01 08:00:00');

    INSERT INTO addresses (id, address_line_1, city, province)
    VALUES (5, '100 Flow Street', 'Manila', 'Metro Manila'),
           (6, '200 Rival Road', 'Cebu', 'Cebu');

    INSERT INTO properties (
      id, landlord_id, address_id, title, price, deposit, electricity_cost,
      listing_moderation_status, status
    )
    VALUES
      (10, 3, 5, 'Flow House', 6500, 1500, 800, 'published', 'available'),
      (11, 4, 6, 'Rival House', 5000, 1000, 0, 'published', 'available');

    INSERT INTO rooms (id, property_id, landlord_id, room_number, title, price, deposit, status)
    VALUES
      (100, 10, 3, 'A1', 'Flow Room', 6500, 1500, 'occupied'),
      (101, 11, 4, 'B1', 'Rival Room', 5000, 1000, 'occupied');

    INSERT INTO property_access (property_id, landlord_id, granted_by)
    VALUES (10, 8, 3);

    INSERT INTO applications (
      id, boarder_id, landlord_id, room_id, message, status, advance_amount,
      created_at, confirmed_at, updated_at, leave_request_status, leave_request_date,
      intended_leave_date
    )
    VALUES
      (200, 2, 3, 100, 'Me please.', 'confirmed', 6500, '2026-01-02 08:00:00', '2026-01-04 08:00:00', '2026-01-04 08:00:00', 'none', NULL, NULL),
      (201, 7, 4, 101, 'Me too.', 'confirmed', 0, '2026-01-05 08:00:00', '2026-01-05 08:00:00', '2026-01-05 08:00:00', 'none', NULL, NULL),
      (202, 2, 3, 100, 'Still waiting.', 'pending', 0, '2026-01-06 09:00:00', NULL, '2026-01-06 09:00:00', 'none', NULL, NULL),
      (203, 7, 3, 100, 'Turned down.', 'rejected', 0, '2026-01-07 09:00:00', NULL, '2026-01-07 09:00:00', 'none', NULL, NULL),
      (204, 2, 3, 100, 'Leaving soon.', 'confirmed', 0, '2026-01-08 09:00:00', '2026-01-09 09:00:00', '2026-01-09 09:00:00', 'pending', '2026-01-10', '2026-01-20'),
      (205, 2, 3, 100, 'Withdrawn.', 'cancelled', 0, '2026-01-11 09:00:00', NULL, '2026-01-11 09:00:00', 'none', NULL, NULL);

    INSERT INTO payments (
      id, boarder_id, landlord_id, room_id, property_id, amount, late_fee, due_date,
      paid_date, status, charge_type, period_start, period_end, created_at
    )
    VALUES
      (300, 2, 3, 100, 10, 6500, 0, '2026-01-10', NULL, 'pending', 'rent', '2026-01-01', '2026-01-31', '2026-01-01 08:00:00'),
      (301, 2, 3, 100, 10, 6500, 500, '2026-01-20', '2026-01-22 10:00:00', 'paid', 'rent', '2026-01-01', '2026-01-31', '2026-01-01 08:00:00'),
      (302, 2, 3, 100, 10, 6500, 0, '2026-01-12', NULL, 'cancelled', 'rent', NULL, NULL, '2026-01-01 08:00:00'),
      (303, 2, 3, 100, 10, 800, 0, '2026-01-31', NULL, 'pending', 'utility', NULL, NULL, '2026-01-01 08:00:00'),
      (304, 7, 4, 101, 11, 5000, 0, '2026-01-15', NULL, 'pending', 'rent', NULL, NULL, '2026-01-01 08:00:00');

    INSERT INTO announcements (id, landlord_id, title, description, category, priority, publish_date)
    VALUES
      (400, 3, 'Water interruption', 'No water on the 5th.', 'general', 'medium', '2026-01-05'),
      (401, 3, 'Future notice', 'Scheduled far ahead.', 'general', 'medium', '2099-01-15'),
      (402, 3, 'Deleted notice', 'Gone.', 'general', 'medium', '2026-01-06'),
      (403, 4, 'Rival notice', 'Not mine.', 'general', 'medium', '2026-01-07'),
      (404, 3, 'Flow House only', 'Just this property.', 'general', 'medium', '2026-01-08');

    UPDATE announcements SET deleted_at = '2026-01-06 09:00:00' WHERE id = 402;

    INSERT INTO announcement_properties (announcement_id, property_id)
    VALUES (404, 10);
  `);
}

function setup(): Env {
  const sqlite = new Database(':memory:');
  runMigrations(sqlite);
  seedCalendarData(sqlite);

  return createEnv(sqlite);
}

async function getCalendar(
  env: Env,
  query: string,
  userId = '3'
): Promise<{ status: number; body: { data?: CalendarResult; error?: string } }> {
  const response = await app.request(
    `http://localhost/api/landlord/calendar?${query}`,
    { headers: { 'X-User-ID': userId } },
    env
  );

  return { status: response.status, body: (await response.json()) as never };
}

const JANUARY = 'from=2026-01-01&to=2026-02-01';
const FAR_FUTURE = 'from=2099-01-01&to=2099-02-01';

function eventKey(event: CalendarEvent): string {
  return event.id;
}

describe('landlord calendar helpers', () => {
  it('accepts a window of one to 62 days and rejects anything else', () => {
    expect(isCalendarWindowValid('2026-01-01', '2026-02-01')).toBe(true);
    expect(isCalendarWindowValid('2026-01-01', '2026-01-02')).toBe(true);
    expect(isCalendarWindowValid('2026-02-01', '2026-01-01')).toBe(false);
    expect(isCalendarWindowValid('2026-01-01', '2026-01-01')).toBe(false);
    expect(isCalendarWindowValid('2026-01-01', '2026-06-01')).toBe(false);
    expect(isCalendarWindowValid('01-01-2026', '2026-02-01')).toBe(false);
    expect(isCalendarWindowValid(undefined, '2026-02-01')).toBe(false);
  });

  it('derives a charge against the window, not against today', () => {
    // A past window is judged as of its own last day, so browsing history never
    // repaints it with today's overdue tint (agent default §14-9).
    expect(calendarReferenceDate('2026-10-12', '2026-02-01')).toBe('2026-01-31');
    expect(calendarReferenceDate('2026-10-12', '2026-11-01')).toBe('2026-10-12');
  });

  it('expands families and event types, and ignores nothing it does not know', () => {
    expect(parseCalendarTypes(undefined)).toBeNull();
    expect(parseCalendarTypes('money')).toEqual(['charge_due', 'payment_received']);
    expect(parseCalendarTypes('MONEY,tenancy')).toEqual([
      'charge_due',
      'payment_received',
      'tenancy_move_in',
      'tenancy_move_out',
      'leave_requested',
    ]);
    expect(parseCalendarTypes('charge_due,announcement_publish')).toEqual([
      'charge_due',
      'announcement_publish',
    ]);
    expect(parseCalendarTypes('not_a_type')).toEqual([]);
    expect(CALENDAR_EVENT_TYPES.length).toBe(9);
  });

  it('sorts by date, then family order, then id', () => {
    const base = {
      family: 'money' as const,
      status: 'pending',
      approximate: false,
      amount: null,
      late_fee: null,
      charge_type: null,
      description: null,
      period_start: null,
      period_end: null,
      reference_number: null,
      boarder: null,
      room: null,
      property: null,
      subject: 'Boarder 2',
      link: { to: '/landlord/payments', label: 'View ledger' },
    };

    const sorted = sortCalendarEvents([
      { ...base, id: 'b', type: 'announcement_publish', family: 'content', date: '2026-01-02' },
      { ...base, id: 'a', type: 'payment_received', date: '2026-01-02' },
      { ...base, id: 'c', type: 'tenancy_move_in', family: 'tenancy', date: '2026-01-01' },
    ]);

    expect(sorted.map(event => event.id)).toEqual(['c', 'a', 'b']);
  });

  it('caps a window payload and reports the real total', () => {
    const events = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as unknown as CalendarEvent[];
    const capped = capCalendarEvents(events, 2);

    expect(capped.events.map(event => event.id)).toEqual(['a', 'b']);
    expect(capped.total).toBe(3);
    expect(capped.truncated).toBe(true);
    expect(capCalendarEvents(events, 5).truncated).toBe(false);
  });

  it('sums money and overdue from the events themselves', () => {
    const events = [
      { type: 'charge_due', family: 'money', amount: 6500, status: 'overdue' },
      { type: 'charge_due', family: 'money', amount: 7000, status: 'paid' },
      { type: 'payment_received', family: 'money', amount: 7000, status: 'paid' },
      { type: 'tenancy_move_in', family: 'tenancy', amount: null, status: 'confirmed' },
    ] as unknown as CalendarEvent[];

    expect(buildCalendarSummary(events)).toEqual({
      due_amount: 13500,
      collected_amount: 7000,
      overdue_count: 1,
      overdue_amount: 6500,
    });
  });
});

describe('GET /api/landlord/calendar', () => {
  it('aggregates the window with derived statuses and a money summary', async () => {
    const { status, body } = await getCalendar(setup(), JANUARY);
    const data = body.data!;

    expect(status).toBe(200);
    expect(data.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.today).toBe(manilaToday());
    expect(data.window).toEqual({ from: '2026-01-01', to: '2026-02-01' });
    expect(data.truncated).toBe(false);
    expect(data.total).toBe(data.events.length);
    expect(data.counts).toEqual({ money: 4, tenancy: 4, applications: 5, content: 2 });

    // A charge past its grace period, as of the window's last day.
    const overdue = data.events.find(event => eventKey(event) === 'charge:300:charge_due')!;
    expect(overdue.status).toBe('overdue');
    expect(overdue.date).toBe('2026-01-10');
    expect(overdue.amount).toBe(6500);
    expect(overdue.subject).toBe('Benny Boarder');
    expect(overdue.room).toEqual({ id: 100, name: 'A1' });
    expect(overdue.property).toEqual({ id: 10, name: 'Flow House' });
    expect(overdue.link).toEqual({ to: '/landlord/payments', label: 'View ledger' });

    // Due on the 31st with a 3-day grace period, so not overdue *on that day* —
    // proving the reference date is the window's last day and not `manilaToday`.
    const lastDay = data.events.find(event => eventKey(event) === 'charge:303:charge_due')!;
    expect(lastDay.status).toBe('pending');

    // Paid late: the due event stays, and the money moves on the paid date.
    const settled = data.events.find(event => eventKey(event) === 'charge:301:charge_due')!;
    const received = data.events.find(event => eventKey(event) === 'charge:301:payment_received')!;
    expect(settled.status).toBe('paid');
    expect(settled.amount).toBe(7000);
    expect(received.date).toBe('2026-01-22');
    expect(received.status).toBe('paid');

    expect(data.summary).toEqual({
      due_amount: 14300,
      collected_amount: 7000,
      overdue_count: 1,
      overdue_amount: 6500,
    });
  });

  it('keeps cancelled, withdrawn, deleted and rejected rows off the grid', async () => {
    const { body } = await getCalendar(setup(), JANUARY);
    const ids = body.data!.events.map(eventKey);

    expect(ids).not.toContain('charge:302:charge_due');
    expect(ids.some(id => id.startsWith('application:203'))).toBe(false);
    expect(ids.some(id => id.startsWith('application:205'))).toBe(false);
    expect(ids.some(id => id.startsWith('announcement:402'))).toBe(false);
    // Another landlord's property is out of reach entirely.
    expect(ids).not.toContain('charge:304:charge_due');
    expect(ids.some(id => id.startsWith('announcement:403'))).toBe(false);

    const leave = ids.find(id => id.endsWith('tenancy_move_out'));
    expect(leave).toBe('application:204:tenancy_move_out');
  });

  it('marks the accepted transition as approximate and the confirmation as exact', async () => {
    const { body } = await getCalendar(setup(), JANUARY);
    const events = body.data!.events;

    const accepted = events.find(event => eventKey(event) === 'application:200:application_accepted')!;
    const confirmed = events.find(
      event => eventKey(event) === 'application:200:application_confirmed'
    )!;

    expect(accepted.approximate).toBe(true);
    expect(confirmed.approximate).toBe(false);
    expect(confirmed.status).toBe('confirmed');
  });

  it('scopes to one property and to a co-landlord grant', async () => {
    const env = setup();

    const owned = await getCalendar(env, `${JANUARY}&propertyId=10`);
    expect(owned.body.data!.property_id).toBe(10);
    expect(owned.body.data!.counts.money).toBe(4);

    const inaccessible = await getCalendar(env, `${JANUARY}&propertyId=11`);
    expect(inaccessible.status).toBe(200);
    expect(inaccessible.body.data!.events).toEqual([]);
    expect(inaccessible.body.data!.total).toBe(0);

    // Landlord 8 holds a `property_access` grant on property 10.
    const coLandlord = await getCalendar(env, JANUARY, '8');
    expect(coLandlord.body.data!.events.length).toBeGreaterThan(0);
    expect(coLandlord.body.data!.events.some(event => eventKey(event) === 'charge:300:charge_due')).toBe(
      true
    );

    // Landlord 4 owns property 11: their own tenancy, their own announcement,
    // and none of landlord 3's rows.
    const rival = await getCalendar(env, JANUARY, '4');
    expect(rival.body.data!.events.map(eventKey)).toEqual([
      'application:201:tenancy_move_in',
      'application:201:application_accepted',
      'application:201:application_confirmed',
      'announcement:403:announcement_publish',
      'charge:304:charge_due',
    ]);
  });

  it('filters by family through the types parameter', async () => {
    const { body } = await getCalendar(setup(), `${JANUARY}&types=money`);

    expect(body.data!.events.map(event => event.family)).toEqual([
      'money',
      'money',
      'money',
      'money',
    ]);
    expect(body.data!.counts).toEqual({ money: 4, tenancy: 0, applications: 0, content: 0 });
  });

  it('shows a future publish date as a scheduled announcement', async () => {
    const { body } = await getCalendar(setup(), FAR_FUTURE);
    const scheduled = body.data!.events.find(
      event => eventKey(event) === 'announcement:401:announcement_publish'
    )!;

    expect(scheduled.status).toBe('submitted');
    expect(scheduled.date).toBe('2099-01-15');
  });

  it('labels a targeted announcement with its property', async () => {
    const { body } = await getCalendar(setup(), JANUARY);
    const global = body.data!.events.find(
      event => eventKey(event) === 'announcement:400:announcement_publish'
    )!;
    const targeted = body.data!.events.find(
      event => eventKey(event) === 'announcement:404:announcement_publish'
    )!;

    expect(global.status).toBe('published');
    expect(global.property).toBeNull();
    expect(targeted.property).toEqual({ id: 10, name: 'Flow House' });
  });

  it('rejects a bad window, an oversized window and an unknown type', async () => {
    const env = setup();

    const missing = await getCalendar(env, 'from=2026-01-01');
    expect(missing.status).toBe(400);

    const reversed = await getCalendar(env, 'from=2026-02-01&to=2026-01-01');
    expect(reversed.status).toBe(400);

    const oversized = await getCalendar(env, 'from=2026-01-01&to=2026-06-01');
    expect(oversized.status).toBe(400);

    const unknownType = await getCalendar(env, `${JANUARY}&types=rent`);
    expect(unknownType.status).toBe(400);
    expect(unknownType.body.error).toContain('rent');

    const badProperty = await getCalendar(env, `${JANUARY}&propertyId=zero`);
    expect(badProperty.status).toBe(400);
  });

  it('rejects a non-landlord session', async () => {
    const { status } = await getCalendar(setup(), JANUARY, '2');

    expect(status).toBe(403);
  });
});
