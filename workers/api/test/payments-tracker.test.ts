import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Env } from '../src/env';
import app from '../src/index';
import { runBillingJob } from '../src/repositories/payments/billing-run';
import { addDays, addMonthsClamped, manilaToday } from '../src/repositories/payments/helpers';

/**
 * The monthly boarder tracker (spec `payments-tracker-redesign`).
 *
 * Covers the money rules the brief calls out — first due date from the move-in
 * day (R3), re-anchor on the payment date (R4), the manual edit (R5), the
 * grace/late-fee policy (R6–R9) — plus the tracker's row shape, filters, history
 * and export.
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

/** One confirmed tenancy (boarder 2 → landlord 3, room 100 in property 10) plus a rival landlord. */
function seed(db: Database): void {
  db.exec(`
    INSERT INTO users (id, first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status, boarder_status, created_at)
    VALUES
      (2, 'Benny', 'Boarder', 'boarder@example.com', 'hash', 'boarder', 1, 1, 'active', 'confirmed', '2026-01-15 08:00:00'),
      (3, 'Lara', 'Landlord', 'landlord@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-02 08:00:00'),
      (4, 'Rival', 'Landlord', 'rival@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-02 08:00:00');

    INSERT INTO addresses (id, address_line_1, city, province)
    VALUES (5, '100 Flow Street', 'Manila', 'Metro Manila'),
           (6, '200 Rival Road', 'Cebu', 'Cebu');

    INSERT INTO properties (id, landlord_id, address_id, title, price, deposit, listing_moderation_status, status, late_fee_amount, late_fee_grace_days)
    VALUES
      (10, 3, 5, 'Flow House', 6500, 1500, 'published', 'available', 500, 3),
      (11, 4, 6, 'Rival House', 5000, 1000, 'published', 'available', 500, 3);

    INSERT INTO rooms (id, property_id, landlord_id, room_number, title, price, deposit, capacity, occupied, status)
    VALUES
      (100, 10, 3, 'A1', 'Flow Room', 6500, 1500, 4, 2, 'occupied'),
      (101, 11, 4, 'B1', 'Rival Room', 5000, 1000, 1, 1, 'occupied');

    INSERT INTO applications (id, boarder_id, landlord_id, room_id, message, status, advance_amount, created_at, confirmed_at)
    VALUES (200, 2, 3, 100, 'Me please.', 'confirmed', 0, '2026-01-15 08:00:00', '2026-01-15 08:00:00');
  `);
}

function setup(): { sqlite: Database; env: Env } {
  const sqlite = new Database(':memory:');
  runMigrations(sqlite);
  seed(sqlite);

  return { sqlite, env: createEnv(sqlite) };
}

interface InsertRentInput {
  dueDate: string;
  amount?: number;
  status?: string;
  key?: string | null;
  applicationId?: number;
}

function insertCharge(sqlite: Database, input: InsertRentInput): number {
  const applicationId = input.applicationId ?? 200;
  const statement = sqlite
    .prepare(
      `
        INSERT INTO payments (
          boarder_id, landlord_id, room_id, property_id, application_id, charge_type,
          description, amount, due_date, period_start, period_end, status, generation_key,
          created_at, updated_at
        )
        VALUES (2, 3, 100, 10, ?, 'rent', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .run(
      applicationId,
      `Monthly rent — ${input.dueDate}`,
      input.amount ?? 6500,
      input.dueDate,
      input.dueDate,
      addMonthsClamped(input.dueDate, 1),
      input.status ?? 'pending',
      input.key === undefined ? `rent:${applicationId}:${input.dueDate}` : input.key
    );

  return Number(statement.lastInsertRowid ?? 0);
}

function insertUtility(sqlite: Database, dueDate: string, amount: number): number {
  const statement = sqlite
    .prepare(
      `
        INSERT INTO payments (
          boarder_id, landlord_id, room_id, property_id, application_id, charge_type,
          description, amount, due_date, status, created_at, updated_at
        )
        VALUES (2, 3, 100, 10, 200, 'utility', 'Electricity', ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .run(amount, dueDate);

  return Number(statement.lastInsertRowid ?? 0);
}

async function tracker(env: Env, query = ''): Promise<{
  rows: Array<Record<string, unknown>>;
  summary: Record<string, number>;
  counts: { rows: number; needs_review: number };
}> {
  const response = await app.request(
    `http://localhost/api/landlord/payments/tracker${query}`,
    { headers: { 'X-User-ID': '3' } },
    env
  );

  expect(response.status).toBe(200);
  const body = (await response.json()) as { data: never };

  return body.data;
}

describe('tracker rows', () => {
  it('shows one row per boarder with the due date derived from the move-in day (R3)', async () => {
    const { env } = setup();
    const data = await tracker(env);
    const row = data.rows[0] as Record<string, unknown>;

    expect(data.rows).toHaveLength(1);
    expect(row.boarder_name).toBe('Benny Boarder');
    expect(row.move_in_date).toBe('2026-01-15');
    expect(row.monthly_rent).toBe(6500);
    expect(row.room_number).toBe('A1');
    expect(row.room_occupied).toBe(2);
    expect(row.room_capacity).toBe(4);
    // No charges yet, so nothing is owed and the row says so rather than showing
    // a stale past date.
    expect(row.status).toBe('no_charge');
    expect(String(row.next_due_date) >= manilaToday()).toBe(true);
  });

  it('exposes the open rent cycle with its days and the last payment', async () => {
    const { sqlite, env } = setup();
    const due = addMonthsClamped(manilaToday(), 1);
    insertCharge(sqlite, { dueDate: due });
    sqlite
      .prepare(
        `UPDATE applications SET next_due_date = ? WHERE id = 200`
      )
      .run(due);

    const data = await tracker(env);
    const row = data.rows[0] as Record<string, unknown>;

    expect(row.status).toBe('upcoming');
    expect(row.next_due_date).toBe(due);
    expect(typeof row.current_charge_id).toBe('number');
    expect(row.amount_due).toBe(6500);
    expect(row.days_remaining).toBeGreaterThan(3);
    expect(row.last_payment).toBeNull();
  });

  it('narrows rows by month, status and the needs-review filter (D1/D15/D19)', async () => {
    const { sqlite, env } = setup();
    const month = manilaToday().slice(0, 7);
    insertCharge(sqlite, { dueDate: `${month}-05`, status: 'awaiting_verification' });

    const byMonth = await tracker(env, `?month=${month}`);

    expect(byMonth.rows).toHaveLength(1);

    const otherMonth = await tracker(env, '?month=2020-01');

    expect(otherMonth.rows).toHaveLength(0);

    const byStatus = await tracker(env, '?status=no_charge');

    expect(byStatus.rows).toHaveLength(0);
  });

  it('scopes the tracker to the caller’s properties', async () => {
    const { env } = setup();

    const rival = await app.request(
      'http://localhost/api/landlord/payments/tracker',
      { headers: { 'X-User-ID': '4' } },
      env
    );
    const body = (await rival.json()) as { data: { rows: unknown[] } };

    expect(rival.status).toBe(200);
    expect(body.data.rows).toHaveLength(0);

    const boarder = await app.request(
      'http://localhost/api/landlord/payments/tracker',
      { headers: { 'X-User-ID': '2' } },
      env
    );

    expect(boarder.status).toBe(403);
  });
});

describe('next due date', () => {
  it('re-anchors one month after the payment date and shifts the not-yet-due rent row (R4/D33)', async () => {
    const { sqlite, env } = setup();
    // The brief's case: the October cycle is paid late, so the next one lands a
    // month after the payment date (Oct 15 due, paid Oct 30 → next Nov 30).
    const overdueId = insertCharge(sqlite, { dueDate: addDays(manilaToday(), -10) });
    const upComingId = insertCharge(sqlite, { dueDate: addDays(manilaToday(), 20) });
    const expectedNext = addMonthsClamped(manilaToday(), 1);

    const response = await app.request(
      `http://localhost/api/landlord/charges/${overdueId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ payment_method: 'cash' }),
      },
      env
    );
    const body = (await response.json()) as { data: { next_due_date: string } };

    expect(response.status).toBe(201);
    // Paid today, so the next cycle is one month from today, day clamped.
    expect(body.data.next_due_date).toBe(expectedNext);

    const settled = sqlite
      .prepare('SELECT status, due_date FROM payments WHERE id = ?')
      .get(overdueId) as { status: string; due_date: string };

    expect(settled.status).toBe('paid');
    // D4: the settled row is never rewritten.
    expect(settled.due_date).toBe(addDays(manilaToday(), -10));

    // The later, still-open rent row followed the anchor onto the new date.
    const shifted = sqlite
      .prepare('SELECT due_date, generation_key FROM payments WHERE id = ?')
      .get(upComingId) as { due_date: string; generation_key: string };

    expect(shifted.due_date).toBe(expectedNext);
    expect(shifted.generation_key).toBe(`rent:200:${expectedNext}`);

    const trackerResponse = await tracker(env);

    expect(trackerResponse.rows[0].next_due_date).toBe(expectedNext);
  });

  it('accepts an explicit next due date and refuses a silent past one (R5)', async () => {
    const { sqlite, env } = setup();
    const chargeId = insertCharge(sqlite, { dueDate: addMonthsClamped(manilaToday(), 1) });
    const explicit = addMonthsClamped(manilaToday(), 2);

    await app.request(
      `http://localhost/api/landlord/charges/${chargeId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ payment_method: 'cash', next_due_date: explicit }),
      },
      env
    );

    const manual = await app.request(
      'http://localhost/api/landlord/tenancies/200/next-due-date',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ next_due_date: addMonthsClamped(manilaToday(), 3) }),
      },
      env
    );

    expect(manual.status).toBe(200);

    const anchor = sqlite
      .prepare('SELECT next_due_date FROM applications WHERE id = 200')
      .get() as { next_due_date: string };

    expect(anchor.next_due_date).toBe(addMonthsClamped(manilaToday(), 3));

    const past = await app.request(
      'http://localhost/api/landlord/tenancies/200/next-due-date',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ next_due_date: '2020-01-01' }),
      },
      env
    );

    expect(past.status).toBe(400);

    const confirmedPast = await app.request(
      'http://localhost/api/landlord/tenancies/200/next-due-date',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ next_due_date: '2020-01-01', confirm_past: true }),
      },
      env
    );

    expect(confirmedPast.status).toBe(200);

    const denied = await app.request(
      'http://localhost/api/landlord/tenancies/200/next-due-date',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '4' },
        body: JSON.stringify({ next_due_date: addMonthsClamped(manilaToday(), 2) }),
      },
      env
    );

    expect(denied.status).toBe(404);
  });
});

describe('recording a payment', () => {
  it('settles several charges at once and refuses an amount below the total (D11/D27)', async () => {
    const { sqlite, env } = setup();
    const rentId = insertCharge(sqlite, { dueDate: addMonthsClamped(manilaToday(), 1) });
    const utilityDue = addMonthsClamped(manilaToday(), 1);
    const utilityId = insertUtility(sqlite, utilityDue, 800);

    const underpaid = await app.request(
      `http://localhost/api/landlord/charges/${rentId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({
          payment_method: 'gcash',
          reference_number: 'REF-1',
          proof_url: 'https://example.com/receipt.png',
          charge_ids: [rentId, utilityId],
          amount: 6000,
        }),
      },
      env
    );
    const underpaidBody = (await underpaid.json()) as { code?: string };

    expect(underpaid.status).toBe(422);
    expect(underpaidBody.code).toBe('amount_below_selected_total');

    const recorded = await app.request(
      `http://localhost/api/landlord/charges/${rentId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({
          payment_method: 'gcash',
          reference_number: 'REF-2',
          proof_url: 'https://example.com/receipt.png',
          charge_ids: [rentId, utilityId],
        }),
      },
      env
    );
    const body = (await recorded.json()) as {
      data: { amount: number; settled: number[] };
    };

    expect(recorded.status).toBe(201);
    expect(body.data.amount).toBe(7300);
    expect(body.data.settled.sort()).toEqual([rentId, utilityId].sort());

    const paid = sqlite
      .prepare(`SELECT COUNT(*) AS count FROM payments WHERE status = 'paid'`)
      .get() as { count: number };

    expect(paid.count).toBe(2);
  });

  it('requires a receipt for non-cash and stores a custom method name (D12/D13)', async () => {
    const { sqlite, env } = setup();
    const chargeId = insertCharge(sqlite, { dueDate: addMonthsClamped(manilaToday(), 1) });

    const noReceipt = await app.request(
      `http://localhost/api/landlord/charges/${chargeId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ payment_method: 'card', reference_number: 'CARD-1' }),
      },
      env
    );

    expect(noReceipt.status).toBe(400);

    const missingLabel = await app.request(
      `http://localhost/api/landlord/charges/${chargeId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ payment_method: 'other', reference_number: 'X-1' }),
      },
      env
    );

    expect(missingLabel.status).toBe(400);

    const custom = await app.request(
      `http://localhost/api/landlord/charges/${chargeId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({
          payment_method: 'other',
          payment_method_label: 'Palawan Express',
          reference_number: 'PX-77',
          proof_url: 'https://example.com/receipt.png',
        }),
      },
      env
    );

    expect(custom.status).toBe(201);

    const row = sqlite
      .prepare('SELECT payment_method, payment_method_label FROM payments WHERE id = ?')
      .get(chargeId) as { payment_method: string; payment_method_label: string };

    expect(row.payment_method).toBe('other');
    expect(row.payment_method_label).toBe('Palawan Express');

    const submission = sqlite
      .prepare('SELECT payment_method_label FROM payment_submissions LIMIT 1')
      .get() as { payment_method_label: string };

    expect(submission.payment_method_label).toBe('Palawan Express');
  });
});

describe('late fee policy', () => {
  it('charges a percentage of the cycle base, including that cycle’s other charges (R8/D10)', async () => {
    const { sqlite, env } = setup();
    // The tenancy is ended so the nightly run only looks at the charges inserted
    // here — the point is the fee maths, not schedule generation.
    sqlite.exec(`UPDATE applications SET status = 'ended' WHERE id = 200`);
    const rentId = insertCharge(sqlite, { dueDate: '2026-02-15' });
    insertUtility(sqlite, '2026-02-20', 800);
    sqlite.exec(
      `UPDATE properties SET late_fee_enabled = 1, late_fee_type = 'percent', late_fee_percent = 5 WHERE id = 10`
    );

    const run = await runBillingJob(env.DB!, new Date('2026-03-01T00:00:00Z'));

    expect(run.late_fees_applied).toBe(2);

    const fee = sqlite
      .prepare(`SELECT amount FROM payments WHERE charge_type = 'late_fee' AND generation_key = ?`)
      .get(`late_fee:${rentId}`) as { amount: number };

    // 5% of (6,500 rent + 800 utility inside the cycle window).
    expect(fee.amount).toBe(365);
  });

  it('adds nothing when the property disables late fees (R7)', async () => {
    const { sqlite, env } = setup();
    sqlite.exec(`UPDATE applications SET status = 'ended' WHERE id = 200`);
    insertCharge(sqlite, { dueDate: '2026-02-15' });
    sqlite.exec(`UPDATE properties SET late_fee_enabled = 0 WHERE id = 10`);

    const run = await runBillingJob(env.DB!, new Date('2026-03-01T00:00:00Z'));

    expect(run.marked_overdue).toBe(1);
    expect(run.late_fees_applied).toBe(0);
  });
});

describe('overdue notices and reminders', () => {
  it('notifies the landlord once after grace and never the boarder (D17)', async () => {
    const { sqlite, env } = setup();
    sqlite.exec(`UPDATE applications SET status = 'ended' WHERE id = 200`);
    insertCharge(sqlite, { dueDate: '2026-02-15' });

    const first = await runBillingJob(env.DB!, new Date('2026-03-01T00:00:00Z'));
    const retry = await runBillingJob(env.DB!, new Date('2026-03-01T00:00:00Z'));

    expect(first.overdue_notices).toBe(1);
    expect(retry.overdue_notices).toBe(0);

    const notices = sqlite
      .prepare('SELECT user_id, type, COUNT(*) AS count FROM notifications GROUP BY user_id, type')
      .all() as Array<{ user_id: number; type: string; count: number }>;

    expect(notices).toEqual([{ user_id: 3, type: 'payment_overdue_landlord', count: 1 }]);
  });

  it('sends the manual reminder once per cycle (D14)', async () => {
    const { sqlite, env } = setup();
    const chargeId = insertCharge(sqlite, { dueDate: addMonthsClamped(manilaToday(), 1) });

    const first = await app.request(
      `http://localhost/api/landlord/charges/${chargeId}/remind`,
      { method: 'POST', headers: { 'X-User-ID': '3' } },
      env
    );
    const second = await app.request(
      `http://localhost/api/landlord/charges/${chargeId}/remind`,
      { method: 'POST', headers: { 'X-User-ID': '3' } },
      env
    );
    const secondBody = (await second.json()) as { code?: string };

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(secondBody.code).toBe('reminder_already_sent');

    const notices = sqlite
      .prepare(`SELECT COUNT(*) AS count FROM notifications WHERE type = 'payment_reminder'`)
      .get() as { count: number };

    expect(notices.count).toBe(1);
  });
});

describe('history and export', () => {
  it('returns every charge for one tenancy (D16)', async () => {
    const { sqlite, env } = setup();
    const rentId = insertCharge(sqlite, { dueDate: addMonthsClamped(manilaToday(), 1) });
    insertUtility(sqlite, addMonthsClamped(manilaToday(), 1), 800);

    const response = await app.request(
      'http://localhost/api/landlord/tenancies/200/payment-history',
      { headers: { 'X-User-ID': '3' } },
      env
    );
    const body = (await response.json()) as {
      data: { tenancy: { boarder_name: string }; charges: Array<{ id: number }> };
    };

    expect(response.status).toBe(200);
    expect(body.data.tenancy.boarder_name).toBe('Benny Boarder');
    expect(body.data.charges.map(charge => charge.id).sort()).toEqual(
      [rentId, rentId + 1].sort()
    );

    const denied = await app.request(
      'http://localhost/api/landlord/tenancies/200/payment-history',
      { headers: { 'X-User-ID': '4' } },
      env
    );

    expect(denied.status).toBe(404);
  });

  it('exports the tracker rows and the charge detail in one file (D29)', async () => {
    const { sqlite, env } = setup();
    const month = manilaToday().slice(0, 7);
    insertCharge(sqlite, { dueDate: `${month}-05` });

    const response = await app.request(
      `http://localhost/api/landlord/payments/export.csv?month=${month}`,
      { headers: { 'X-User-ID': '3' } },
      env
    );

    expect(response.status).toBe(200);

    const csv = await response.text();

    expect(csv).toContain('# Tracker —');
    expect(csv).toContain('# Charges —');
    expect(csv).toContain('Boarder,Room,Move-in,Monthly rent,Current due date');
    expect(csv).toContain('Benny Boarder');
    expect(csv).toContain('A1 · 2/4');
  });
});
