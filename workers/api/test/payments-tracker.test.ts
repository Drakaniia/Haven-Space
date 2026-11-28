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

function insertSubmission(
  sqlite: Database,
  chargeId: number,
  input: { status?: string; amount?: number; createdAt?: string } = {}
): number {
  const statement = sqlite
    .prepare(
      `
        INSERT INTO payment_submissions (
          payment_id, submitted_by, amount, payment_method, reference_number, proof_url,
          status, created_at, updated_at
        )
        VALUES (?, 2, ?, 'gcash', '8842', 'https://example.com/proof.png', ?, ?, ?)
      `
    )
    .run(
      chargeId,
      input.amount ?? 6500,
      input.status ?? 'pending',
      input.createdAt ?? '2026-10-08 02:42:00',
      input.createdAt ?? '2026-10-08 02:42:00'
    );

  return Number(statement.lastInsertRowid ?? 0);
}

async function tracker(
  env: Env,
  query = ''
): Promise<{
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
    sqlite.prepare(`UPDATE applications SET next_due_date = ? WHERE id = 200`).run(due);

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

  it('derives the claim’s own charge, the rejected-claim state and the reminder stamp (D3/D40/D41)', async () => {
    const { sqlite, env } = setup();
    const rentId = insertCharge(sqlite, { dueDate: addDays(manilaToday(), -4) });

    expect((await tracker(env)).rows[0].reminder_sent_at).toBeNull();

    // A pending proof hands the row to the landlord, with that charge's id.
    insertSubmission(sqlite, rentId);
    const pending = (await tracker(env)).rows[0];

    expect(pending.has_pending_claim).toBe(true);
    expect(pending.pending_claim_charge_id).toBe(rentId);
    expect(pending.has_rejected_claim).toBe(false);

    // Rejecting it produces the derived "Payment issue" state.
    sqlite
      .prepare(
        `UPDATE payment_submissions
            SET status = 'rejected', verified_by = 3,
                verified_at = '2026-10-09 03:00:00', rejection_reason = 'Blurry proof'
          WHERE payment_id = ?`
      )
      .run(rentId);
    const rejected = (await tracker(env)).rows[0];

    expect(rejected.has_pending_claim).toBe(false);
    expect(rejected.has_rejected_claim).toBe(true);

    // A newer proof clears it — the label only lasts until the tenant acts.
    insertSubmission(sqlite, rentId, { createdAt: '2026-10-11 02:42:00' });
    const again = (await tracker(env)).rows[0];

    expect(again.has_rejected_claim).toBe(false);
    expect(again.pending_claim_charge_id).toBe(rentId);
  });

  it('points a utility claim at its own charge, not at the rent cycle (L4)', async () => {
    const { sqlite, env } = setup();
    insertCharge(sqlite, { dueDate: addDays(manilaToday(), 5) });
    const utilityId = insertUtility(sqlite, addDays(manilaToday(), 5), 800);
    insertSubmission(sqlite, utilityId, { amount: 800 });

    const row = (await tracker(env)).rows[0];

    expect(row.has_pending_claim).toBe(true);
    expect(row.pending_claim_charge_id).toBe(utilityId);
    expect(row.has_rejected_claim).toBe(false);
  });

  it('lists every tenant of a property and each one’s claim separately (3 tenants)', async () => {
    const { sqlite, env } = setup();
    const today = manilaToday();
    const month = today.slice(0, 7);

    sqlite.exec(`
      INSERT INTO users (id, first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status, boarder_status, created_at)
      VALUES
        (8, 'Cara', 'New', 'cara@example.com', 'hash', 'boarder', 1, 1, 'active', 'confirmed', '2026-01-02 08:00:00'),
        (9, 'Dan', 'Gone', 'dan@example.com', 'hash', 'boarder', 1, 1, 'active', 'new', '2026-01-02 08:00:00');
      INSERT INTO rooms (id, property_id, landlord_id, room_number, title, price, deposit, capacity, occupied, status)
      VALUES (102, 10, 3, 'A2', 'Second Room', 5000, 1000, 1, 1, 'occupied');
    `);
    // Benny: rent cycle due this month. Cara: moved in today, so her first rent is
    // next month and only her deposit is open. Dan: moved out, still owes a bill.
    insertCharge(sqlite, { dueDate: `${month}-01` });
    sqlite
      .prepare(
        `INSERT INTO applications (id, boarder_id, landlord_id, room_id, message, status, advance_amount, created_at, confirmed_at, deleted_at)
         VALUES (210, 8, 3, 102, 'Hi', 'confirmed', 0, ?, ?, NULL),
                (211, 9, 3, 102, 'Hi', 'ended', 0, '2026-01-02 08:00:00', '2026-01-02 08:00:00', '2026-02-01 00:00:00')`
      )
      .run(`${today} 08:00:00`, `${today} 08:00:00`);
    const caraDeposit = Number(
      sqlite
        .prepare(
          `INSERT INTO payments (boarder_id, landlord_id, room_id, property_id, application_id, charge_type, description, amount, due_date, status)
           VALUES (8, 3, 102, 10, 210, 'deposit', 'Security deposit', 1000, ?, 'pending')`
        )
        .run(addMonthsClamped(today, 1)).lastInsertRowid
    );
    sqlite
      .prepare(
        `INSERT INTO payments (boarder_id, landlord_id, room_id, property_id, application_id, charge_type, description, amount, due_date, status)
         VALUES (9, 3, 102, 10, 211, 'utility', 'Water', 300, '2026-01-20', 'overdue')`
      )
      .run();

    const submit = (boarderId: string, chargeId: number, body: object) =>
      app.request(
        `http://localhost/api/boarder/payments/${chargeId}/submissions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-ID': boarderId },
          body: JSON.stringify(body),
        },
        env
      );

    const bennyRent = Number(
      (sqlite.prepare('SELECT id FROM payments WHERE application_id = 200').get() as { id: number })
        .id
    );

    expect(
      (await submit('2', bennyRent, { payment_method: 'gcash', reference_number: 'G-1' })).status
    ).toBe(201);
    expect((await submit('8', caraDeposit, { payment_method: 'cash' })).status).toBe(201);

    const data = await tracker(env, `?propertyId=10&month=${month}`);
    const byName = Object.fromEntries(data.rows.map(row => [row.boarder_name, row]));

    expect(Object.keys(byName).sort()).toEqual(['Benny Boarder', 'Cara New', 'Dan Gone']);
    expect(data.counts.needs_review).toBe(2);
    expect(byName['Benny Boarder'].pending_claim_method).toBe('gcash');
    expect(byName['Cara New'].pending_claim_charge_id).toBe(caraDeposit);
    expect(byName['Cara New'].pending_claim_method).toBe('cash');
    expect(byName['Dan Gone'].tenancy_status).toBe('ended');

    // The review drawer reads the claim from the landlord charge endpoint.
    const reviewed = await app.request(
      `http://localhost/api/landlord/charges/${caraDeposit}`,
      { headers: { 'X-User-ID': '3' } },
      env
    );
    const reviewedBody = (await reviewed.json()) as {
      data: { submissions: Array<{ status: string; payment_method: string }> };
    };

    expect(reviewedBody.data.submissions).toMatchObject([
      { status: 'pending', payment_method: 'cash' },
    ]);

    // Each claim is reviewed on its own; approving Cara's leaves Benny's pending.
    const caraClaim = (
      sqlite
        .prepare('SELECT id FROM payment_submissions WHERE payment_id = ?')
        .get(caraDeposit) as {
        id: number;
      }
    ).id;
    const verified = await app.request(
      `http://localhost/api/landlord/submissions/${caraClaim}/verify`,
      { method: 'POST', headers: { 'X-User-ID': '3' } },
      env
    );

    expect(verified.status).toBe(200);

    const after = await tracker(env, `?propertyId=10&month=${month}`);

    expect(after.rows).toHaveLength(3);
    expect(after.counts.needs_review).toBe(1);
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

describe('additional bills', () => {
  function seedRooms(sqlite: Database): void {
    sqlite.exec(`
      INSERT INTO users (id, first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status, boarder_status, created_at)
      VALUES
        (8, 'Cara', 'Two', 'cara@example.com', 'hash', 'boarder', 1, 1, 'active', 'confirmed', '2026-01-02 08:00:00'),
        (9, 'Dan', 'Three', 'dan@example.com', 'hash', 'boarder', 1, 1, 'active', 'confirmed', '2026-01-02 08:00:00'),
        (10, 'Eve', 'Leaving', 'eve@example.com', 'hash', 'boarder', 1, 1, 'active', 'confirmed', '2026-01-02 08:00:00');
      INSERT INTO rooms (id, property_id, landlord_id, room_number, title, price, deposit, capacity, occupied, status)
      VALUES (102, 10, 3, 'Room 2', 'Two', 5000, 1000, 2, 2, 'occupied'),
             (103, 10, 3, 'Room 3', 'Three', 5000, 1000, 1, 1, 'occupied');
      INSERT INTO applications (id, boarder_id, landlord_id, room_id, message, status, advance_amount, created_at, confirmed_at, leave_request_status, intended_leave_date)
      VALUES
        (210, 8, 3, 102, 'Hi', 'confirmed', 0, '2026-01-15 08:00:00', '2026-01-15 08:00:00', 'none', NULL),
        (211, 9, 3, 103, 'Hi', 'confirmed', 0, '2026-01-15 08:00:00', '2026-01-15 08:00:00', 'none', NULL),
        (212, 10, 3, 102, 'Hi', 'confirmed', 0, '2026-01-15 08:00:00', '2026-01-15 08:00:00', 'approved', '2026-02-01');
    `);
  }

  const postBill = (env: Env, body: object, landlordId = '3') =>
    app.request(
      'http://localhost/api/landlord/properties/10/bills',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': landlordId },
        body: JSON.stringify(body),
      },
      env
    );

  const billsFor = (sqlite: Database, name: string) =>
    sqlite
      .prepare(
        'SELECT boarder_id, amount, charge_type FROM payments WHERE description = ? ORDER BY boarder_id'
      )
      .all(name);

  it('charges every current tenant for an all-rooms bill, once', async () => {
    const { sqlite, env } = setup();
    seedRooms(sqlite);
    const bill = {
      name: 'Electricity',
      charge_type: 'utility',
      amount: 400,
      due_date: '2026-03-10',
      billing_period: '2026-02',
      applies_to: 'all',
      arrangement: 'each',
    };

    const first = await postBill(env, bill);

    expect(first.status).toBe(201);
    // Eve left on 2026-02-01, before the bill is due, so she is not charged.
    expect(billsFor(sqlite, 'Electricity')).toEqual([
      { boarder_id: 2, amount: 400, charge_type: 'utility' },
      { boarder_id: 8, amount: 400, charge_type: 'utility' },
      { boarder_id: 9, amount: 400, charge_type: 'utility' },
    ]);

    const again = await postBill(env, bill);
    const body = (await again.json()) as { data: { created: number; skipped: number } };

    expect(again.status).toBe(200);
    expect(body.data).toMatchObject({ created: 0, skipped: 3 });
    expect(billsFor(sqlite, 'Electricity')).toHaveLength(3);
    // Rent records are untouched.
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM payments WHERE charge_type = 'rent'").get()
    ).toEqual({ n: 0 });
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM notifications WHERE type = 'bill_added'").get()
    ).toEqual({ n: 3 });
  });

  it('limits a bill to the chosen rooms and can split it evenly', async () => {
    const { sqlite, env } = setup();
    seedRooms(sqlite);

    const water = await postBill(env, {
      name: 'Water',
      amount: 600,
      due_date: '2026-03-10',
      applies_to: 'rooms',
      room_ids: [102, 103],
      arrangement: 'split',
    });

    expect(water.status).toBe(201);
    expect(billsFor(sqlite, 'Water')).toEqual([
      { boarder_id: 8, amount: 300, charge_type: 'utility' },
      { boarder_id: 9, amount: 300, charge_type: 'utility' },
    ]);

    const noRooms = await postBill(env, {
      name: 'Maintenance',
      amount: 100,
      due_date: '2026-03-10',
      applies_to: 'rooms',
      room_ids: [],
    });
    const rival = await postBill(
      env,
      { name: 'Hack', amount: 100, due_date: '2026-03-10', applies_to: 'all' },
      '4'
    );

    expect(noRooms.status).toBe(400);
    expect(rival.status).toBe(404);
  });
});

describe('next due date', () => {
  it('keeps the original due day with a reason on late payment and creates next month automatically', async () => {
    const { sqlite, env } = setup();
    const due = '2026-11-30';
    const paidDate = '2026-12-03';
    const overdueId = insertCharge(sqlite, { dueDate: due });

    const response = await app.request(
      `http://localhost/api/landlord/charges/${overdueId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ payment_method: 'cash', paid_date: paidDate }),
      },
      env
    );
    const body = (await response.json()) as { data: { next_due_date: string } };

    expect(response.status).toBe(201);
    // Due Nov 30, paid late Dec 3 -> next due stays on Dec 30 (not Jan 3).
    expect(body.data.next_due_date).toBe('2026-12-30');

    const settled = sqlite
      .prepare('SELECT status, due_date FROM payments WHERE id = ?')
      .get(overdueId) as { status: string; due_date: string };

    expect(settled.status).toBe('paid');
    expect(settled.due_date).toBe(due);

    const nextRow = sqlite
      .prepare(
        `SELECT due_date, period_start, period_end, notes, generation_key FROM payments WHERE application_id = 200 AND status = 'pending'`
      )
      .get() as {
      due_date: string;
      period_start: string;
      period_end: string;
      notes: string | null;
      generation_key: string;
    };

    expect(nextRow.due_date).toBe('2026-12-30');
    expect(nextRow.generation_key).toBe('rent:200:2026-12-30');
    expect(nextRow.notes).toContain('late payment');

    const trackerResponse = await tracker(env);

    expect(trackerResponse.rows[0].next_due_date).toBe('2026-12-30');
  });

  it('anchors next month on the payment date when paid on or before due date', async () => {
    const { sqlite, env } = setup();
    const due = '2026-12-25';
    const paidDate = '2026-12-24';
    const rentId = insertCharge(sqlite, { dueDate: due });

    const response = await app.request(
      `http://localhost/api/landlord/charges/${rentId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ payment_method: 'cash', paid_date: paidDate }),
      },
      env
    );
    const body = (await response.json()) as { data: { next_due_date: string } };

    expect(response.status).toBe(201);
    expect(body.data.next_due_date).toBe('2027-01-24');

    const nextRow = sqlite
      .prepare(
        `SELECT due_date, period_start, period_end, notes FROM payments WHERE application_id = 200 AND status = 'pending'`
      )
      .get() as {
      due_date: string;
      period_start: string;
      period_end: string;
      notes: string | null;
    };

    expect(nextRow.due_date).toBe('2027-01-24');
    expect(nextRow.period_start).toBe('2026-12-24');
    expect(nextRow.period_end).toBe('2027-01-24');
    expect(nextRow.notes).toBeNull();
  });

  it('advances to the following month when paid a full cycle ahead', async () => {
    const { sqlite, env } = setup();
    const rentId = insertCharge(sqlite, { dueDate: '2026-12-28' });

    const response = await app.request(
      `http://localhost/api/landlord/charges/${rentId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ payment_method: 'cash', paid_date: '2026-11-28' }),
      },
      env
    );
    const body = (await response.json()) as { data: { next_due_date: string } };

    expect(response.status).toBe(201);
    expect(body.data.next_due_date).toBe('2027-01-28');

    const nextRow = sqlite
      .prepare(
        `SELECT due_date, period_start, period_end FROM payments WHERE application_id = 200 AND status = 'pending'`
      )
      .get() as { due_date: string; period_start: string; period_end: string };

    expect(nextRow.due_date).toBe('2027-01-28');
    expect(nextRow.period_start).toBe('2026-12-28');
    expect(nextRow.period_end).toBe('2027-01-28');
  });

  it('does not create a next rent bill past an approved move-out date', async () => {
    const { sqlite, env } = setup();
    sqlite
      .prepare(
        `UPDATE applications SET leave_request_status = 'approved', intended_leave_date = '2026-12-10' WHERE id = 200`
      )
      .run();
    const rentId = insertCharge(sqlite, { dueDate: '2026-11-30' });

    const response = await app.request(
      `http://localhost/api/landlord/charges/${rentId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ payment_method: 'cash', paid_date: '2026-11-30' }),
      },
      env
    );

    expect(response.status).toBe(201);
    const openCount = (
      sqlite
        .prepare(`SELECT COUNT(*) AS count FROM payments WHERE application_id = 200 AND status = 'pending'`)
        .get() as { count: number }
    ).count;

    expect(openCount).toBe(0);
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
    expect(body.data.charges.map(charge => charge.id).sort()).toEqual([rentId, rentId + 1].sort());

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
