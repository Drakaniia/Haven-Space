import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Env } from '../src/env';
import app from '../src/index';
import {
  addMonthsClamped,
  effectiveStatus,
  manilaToday,
  nextDueAfter,
  roundMoney,
} from '../src/repositories/payments/helpers';
import { runBillingJob } from '../src/repositories/payments/billing-run';
import { generateScheduleForApplication } from '../src/repositories/payments/schedule';

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

/** Migrate only through `maxName`, recreating a database that is behind the code. */
function runMigrationsUpTo(db: Database, maxName: string): void {
  const migrationDir = join(import.meta.dir, '..', 'migrations');
  const migrationNames = readdirSync(migrationDir)
    .filter(name => name.endsWith('.sql') && !name.includes('seed'))
    .sort();

  for (const name of migrationNames) {
    if (name > maxName) {
      break;
    }

    db.exec(readFileSync(join(migrationDir, name), 'utf8'));
  }
}

describe('payments against a database that predates the migrations', () => {
  /*
    The screenshot that opened spec `payments-shell-reverification` showed the
    ledger rendering "Internal server error": the dev database was at 0020 while
    the code selected `0021`'s columns. The API now names that situation.
  */
  it('reports a stale schema as 503 database_schema_stale, not a bare 500', async () => {
    const db = new Database(':memory:');
    runMigrationsUpTo(db, '0020_messages.sql');
    db.exec(`
      INSERT INTO users (
        id, first_name, last_name, email, password_hash, role,
        is_verified, email_verified, account_status, boarder_status, created_at
      )
      VALUES (3, 'Lara', 'Landlord', 'landlord@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-02 08:00:00');
    `);

    // Landlord 3 owns nothing yet — the query still fails at prepare time on the
    // missing `properties.late_fee_grace_days` / `payments.charge_type` columns.
    const response = await app.request(
      'http://localhost/api/landlord/payments',
      { headers: { 'X-User-ID': '3' } },
      createEnv(db)
    );

    expect(response.status).toBe(503);

    const body = (await response.json()) as { error: string; code?: string };

    expect(body.code).toBe('database_schema_stale');
    expect(body.error).toContain('migrate:local');
  });
});

/**
 * One confirmed tenancy (boarder 2 → landlord 3, room 100 in property 10) plus a
 * second landlord (4) whose property must stay out of reach, an admin (5), and a
 * second boarder (7) who owns no charges.
 */
function seedPaymentsData(db: Database): void {
  db.exec(`
    INSERT INTO users (
      id, first_name, last_name, email, password_hash, role,
      is_verified, email_verified, account_status, boarder_status, created_at
    )
    VALUES
      (2, 'Benny', 'Boarder', 'boarder@example.com', 'hash', 'boarder', 1, 1, 'active', 'confirmed', '2026-01-15 08:00:00'),
      (3, 'Lara', 'Landlord', 'landlord@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-02 08:00:00'),
      (4, 'Rival', 'Landlord', 'rival@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-02 08:00:00'),
      (5, 'Ada', 'Admin', 'admin@example.com', 'hash', 'admin', 1, 1, 'active', NULL, '2026-01-02 08:00:00'),
      (7, 'Other', 'Boarder', 'other@example.com', 'hash', 'boarder', 1, 1, 'active', 'new', '2026-01-02 08:00:00');

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

    INSERT INTO applications (
      id, boarder_id, landlord_id, room_id, message, status, advance_amount,
      created_at, confirmed_at
    )
    VALUES
      (200, 2, 3, 100, 'Me please.', 'confirmed', 6500, '2026-01-15 08:00:00', '2026-01-15 08:00:00'),
      (201, 7, 4, 101, 'Me too.', 'confirmed', 0, '2026-01-15 08:00:00', '2026-01-15 08:00:00');
  `);
}

function setup(): { sqlite: Database; env: Env } {
  const sqlite = new Database(':memory:');
  runMigrations(sqlite);
  seedPaymentsData(sqlite);

  return { sqlite, env: createEnv(sqlite) };
}

function chargeRow(sqlite: Database, chargeType: string, dueDate?: string) {
  const row = sqlite
    .prepare(
      dueDate
        ? `SELECT * FROM payments WHERE charge_type = ? AND due_date = ? ORDER BY id LIMIT 1`
        : `SELECT * FROM payments WHERE charge_type = ? ORDER BY id LIMIT 1`
    )
    .get(chargeType, ...(dueDate ? [dueDate] : [])) as {
    id: number;
    status: string;
    generation_key: string;
    due_date: string;
  } | null;

  return row ?? undefined;
}

describe('payment helpers', () => {
  it('bills the first full charge on the next due date, never pro-rated', () => {
    expect(nextDueAfter('2026-01-15', 15)).toBe('2026-02-15');
    expect(nextDueAfter('2026-01-20', 20)).toBe('2026-02-20');
  });

  it('clamps a month-end due day to the shorter month', () => {
    expect(nextDueAfter('2026-01-31', 31)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-02-28', 1, 31)).toBe('2026-03-31');
    expect(addMonthsClamped('2026-01-31', 1, 31)).toBe('2026-02-28');
  });

  it('derives overdue from the due date plus the grace period', () => {
    expect(effectiveStatus('pending', '2026-02-15', 3, '2026-02-18')).toBe('pending');
    expect(effectiveStatus('pending', '2026-02-15', 3, '2026-02-19')).toBe('overdue');
    expect(effectiveStatus('pending', '2026-02-15', 0, '2026-02-16')).toBe('overdue');
    expect(effectiveStatus('paid', '2026-02-15', 3, '2026-06-01')).toBe('paid');
  });

  it('resolves today in Asia/Manila, not UTC', () => {
    expect(manilaToday(new Date('2026-02-15T17:30:00Z'))).toBe('2026-02-16');
    expect(roundMoney(4500.005)).toBe(4500.01);
  });
});

describe('billing schedule generation', () => {
  it('creates deposit, advance and a rent horizon from the tenancy, idempotently', async () => {
    const { sqlite, env } = setup();
    const db = env.DB!;

    const first = await generateScheduleForApplication(db, 200);

    expect(first.first_due_date).toBe('2026-02-15');
    expect(first.created).toBe(5);

    const rentRows = sqlite
      .prepare(
        `SELECT due_date, amount, generation_key FROM payments WHERE charge_type = 'rent' ORDER BY due_date`
      )
      .all() as Array<{ due_date: string; amount: number; generation_key: string }>;

    expect(rentRows.map(row => row.due_date)).toEqual(['2026-02-15', '2026-03-15', '2026-04-15']);
    expect(rentRows[0].amount).toBe(6500);
    expect(rentRows[0].generation_key).toBe('rent:200:2026-02-15');
    expect(chargeRow(sqlite, 'deposit')?.generation_key).toBe('deposit:200');
    expect(chargeRow(sqlite, 'advance')?.generation_key).toBe('advance:200');

    const second = await generateScheduleForApplication(db, 200);

    expect(second.created).toBe(0);
    expect(
      (sqlite.prepare('SELECT COUNT(*) AS count FROM payments').get() as { count: number }).count
    ).toBe(5);
  });

  it('skips the advance charge when no amount was captured', async () => {
    const { sqlite, env } = setup();

    const result = await generateScheduleForApplication(env.DB!, 201);

    expect(result.first_due_date).toBe('2026-02-15');
    expect(chargeRow(sqlite, 'advance')).toBeUndefined();
    expect(chargeRow(sqlite, 'deposit')?.generation_key).toBe('deposit:201');
  });
});

describe('confirm-booking integration', () => {
  it('generates the tenancy schedule when the booking is confirmed through the API', async () => {
    const { env } = setup();

    // Start from an accepted application so the real confirm route runs the
    // whole flow: state transition, room occupancy, and schedule generation.
    await env
      .DB!.prepare(
        `UPDATE applications SET status = 'accepted', confirmed_at = NULL WHERE id = 200`
      )
      .bind()
      .run();

    const confirmed = await app.request(
      'http://localhost/api/boarder/applications/200/confirm',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '2' },
        body: JSON.stringify({ payment_method: 'gcash' }),
      },
      env
    );

    expect(confirmed.status).toBe(200);

    const ledger = await app.request(
      'http://localhost/api/boarder/payments',
      { headers: { 'X-User-ID': '2' } },
      env
    );
    const body = (await ledger.json()) as {
      data: {
        charges: Array<{ charge_type: string; due_date: string }>;
        summary: { total_due: number };
      };
    };

    // deposit + advance + the 3-month rent horizon, all anchored on the
    // confirmation date rather than the original application date.
    expect(body.data.charges).toHaveLength(5);
    expect(body.data.charges.map(charge => charge.charge_type).sort()).toEqual([
      'advance',
      'deposit',
      'rent',
      'rent',
      'rent',
    ]);
    expect(body.data.summary.total_due).toBe(1500 + 6500 + 6500 * 3);
  });
});

describe('boarder ledger routes', () => {
  it('lists only the caller’s charges with a live summary', async () => {
    const { env } = setup();
    await generateScheduleForApplication(env.DB!, 200);

    const response = await app.request(
      'http://localhost/api/boarder/payments',
      { headers: { 'X-User-ID': '2' } },
      env
    );
    const body = (await response.json()) as {
      data: {
        charges: Array<{ id: number; charge_type: string; status: string; is_overdue: boolean }>;
        summary: { total_due: number; overdue_count: number };
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.charges).toHaveLength(5);
    expect(body.data.charges.map(charge => charge.charge_type)).toContain('deposit');
    expect(body.data.charges.every(charge => charge.is_overdue)).toBe(true);
    expect(body.data.summary.overdue_count).toBe(5);
    // deposit 1500 + advance 6500 + three months of 6500 rent.
    expect(body.data.summary.total_due).toBe(1500 + 6500 + 6500 * 3);

    const otherBoarder = await app.request(
      'http://localhost/api/boarder/payments',
      { headers: { 'X-User-ID': '7' } },
      env
    );
    const otherBody = (await otherBoarder.json()) as {
      data: { charges: Array<{ id: number }>; summary: { total_due: number } };
    };

    expect(otherBody.data.charges.map(charge => charge.id)).not.toContain(body.data.charges[0].id);
  });

  it('hides another boarder’s charge behind a 404', async () => {
    const { sqlite, env } = setup();
    await generateScheduleForApplication(env.DB!, 200);
    const charge = chargeRow(sqlite, 'rent', '2026-02-15')!;

    const mine = await app.request(
      `http://localhost/api/boarder/payments/${charge.id}`,
      { headers: { 'X-User-ID': '2' } },
      env
    );
    const theirs = await app.request(
      `http://localhost/api/boarder/payments/${charge.id}`,
      { headers: { 'X-User-ID': '7' } },
      env
    );

    expect(mine.status).toBe(200);
    expect(theirs.status).toBe(404);
  });
});

describe('submission and verification', () => {
  async function firstChargeId(env: Env): Promise<number> {
    await generateScheduleForApplication(env.DB!, 200);

    return (
      (
        await env
          .DB!.prepare(`SELECT id FROM payments ORDER BY id LIMIT 1`)
          .bind()
          .first<{ id: number }>()
      )?.id ?? 0
    );
  }

  it('parks a submitted charge in awaiting_verification, then settles it on approval', async () => {
    const { sqlite, env } = setup();
    const chargeId = await firstChargeId(env);

    const submitted = await app.request(
      `http://localhost/api/boarder/payments/${chargeId}/submissions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '2' },
        body: JSON.stringify({ payment_method: 'gcash', reference_number: 'REF-100' }),
      },
      env
    );

    expect(submitted.status).toBe(201);
    expect(chargeRow(sqlite, 'deposit')?.status).toBe('awaiting_verification');

    const duplicate = await app.request(
      `http://localhost/api/boarder/payments/${chargeId}/submissions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '2' },
        body: JSON.stringify({ payment_method: 'gcash', reference_number: 'REF-101' }),
      },
      env
    );

    expect(duplicate.status).toBe(409);

    const submissionId = (
      sqlite.prepare('SELECT id FROM payment_submissions ORDER BY id LIMIT 1').get() as {
        id: number;
      }
    ).id;

    const verified = await app.request(
      `http://localhost/api/landlord/submissions/${submissionId}/verify`,
      { method: 'POST', headers: { 'X-User-ID': '3' } },
      env
    );

    expect(verified.status).toBe(200);
    expect(chargeRow(sqlite, 'deposit')?.status).toBe('paid');

    const settled = sqlite
      .prepare(
        'SELECT paid_date, payment_method, reference_number FROM payments WHERE charge_type = ?'
      )
      .get('deposit') as { paid_date: string; payment_method: string; reference_number: string };

    expect(settled.payment_method).toBe('gcash');
    expect(settled.reference_number).toBe('REF-100');
    expect(settled.paid_date).toBe(manilaToday());

    // Verification is final: a second decision is refused (spec R5).
    const again = await app.request(
      `http://localhost/api/landlord/submissions/${submissionId}/verify`,
      { method: 'POST', headers: { 'X-User-ID': '3' } },
      env
    );

    expect(again.status).toBe(409);
  });

  it('requires a reference number and a valid method', async () => {
    const { env } = setup();
    const chargeId = await firstChargeId(env);

    const noReference = await app.request(
      `http://localhost/api/boarder/payments/${chargeId}/submissions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '2' },
        body: JSON.stringify({ payment_method: 'gcash', reference_number: '  ' }),
      },
      env
    );
    const badMethod = await app.request(
      `http://localhost/api/boarder/payments/${chargeId}/submissions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '2' },
        body: JSON.stringify({ payment_method: 'crypto', reference_number: 'REF-1' }),
      },
      env
    );

    expect(noReference.status).toBe(400);
    expect(badMethod.status).toBe(400);
  });

  it('returns a rejected claim to the open ledger so it can be resubmitted', async () => {
    const { sqlite, env } = setup();
    const chargeId = await firstChargeId(env);

    await app.request(
      `http://localhost/api/boarder/payments/${chargeId}/submissions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '2' },
        body: JSON.stringify({ payment_method: 'cash', reference_number: 'RECEIPT-9' }),
      },
      env
    );

    const submissionId = (
      sqlite.prepare('SELECT id FROM payment_submissions ORDER BY id LIMIT 1').get() as {
        id: number;
      }
    ).id;

    const missingReason = await app.request(
      `http://localhost/api/landlord/submissions/${submissionId}/reject`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({}),
      },
      env
    );

    expect(missingReason.status).toBe(400);

    const rejected = await app.request(
      `http://localhost/api/landlord/submissions/${submissionId}/reject`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ rejection_reason: 'Wrong reference number' }),
      },
      env
    );

    expect(rejected.status).toBe(200);
    expect(chargeRow(sqlite, 'deposit')?.status).toBe('pending');

    // The boarder can try again with a new reference.
    const resubmitted = await app.request(
      `http://localhost/api/boarder/payments/${chargeId}/submissions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '2' },
        body: JSON.stringify({ payment_method: 'cash', reference_number: 'RECEIPT-10' }),
      },
      env
    );

    expect(resubmitted.status).toBe(201);
  });

  it('lets the landlord record cash in hand and auto-verify it (D29)', async () => {
    const { sqlite, env } = setup();
    const chargeId = await firstChargeId(env);

    const denied = await app.request(
      `http://localhost/api/landlord/charges/${chargeId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '4' },
        body: JSON.stringify({ payment_method: 'cash', reference_number: 'CASH-1' }),
      },
      env
    );

    expect(denied.status).toBe(404);

    const recorded = await app.request(
      `http://localhost/api/landlord/charges/${chargeId}/record`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ payment_method: 'cash', reference_number: 'CASH-1' }),
      },
      env
    );

    expect(recorded.status).toBe(201);
    expect(chargeRow(sqlite, 'deposit')?.status).toBe('paid');

    const submission = sqlite
      .prepare('SELECT status, submitted_by, verified_by FROM payment_submissions LIMIT 1')
      .get() as { status: string; submitted_by: number; verified_by: number };

    expect(submission.status).toBe('verified');
    expect(submission.submitted_by).toBe(3);
    expect(submission.verified_by).toBe(3);
  });
});

describe('billing run', () => {
  it('marks overdue once, applies one flat late fee per charge and notifies the landlord once', async () => {
    const { sqlite, env } = setup();
    const db = env.DB!;
    // Only the tenancy under test is billed; the second confirmed tenancy in the
    // seed would otherwise generate its own charges and notices.
    sqlite.exec(`UPDATE applications SET status = 'ended' WHERE id = 201`);
    await generateScheduleForApplication(db, 200);

    const early = await runBillingJob(db, new Date('2026-02-13T00:00:00Z'));

    // Nothing is due yet, and the run no longer nudges boarders at all (D17).
    expect(early.marked_overdue).toBe(0);
    expect(early.late_fees_applied).toBe(0);
    expect(early.overdue_notices).toBe(0);
    expect(
      (sqlite.prepare('SELECT COUNT(*) AS count FROM notifications').get() as { count: number })
        .count
    ).toBe(0);

    const late = await runBillingJob(db, new Date('2026-02-25T00:00:00Z'));

    expect(late.marked_overdue).toBe(3);
    expect(late.late_fees_applied).toBe(3);
    expect(late.overdue_notices).toBe(3);

    const fees = sqlite
      .prepare(
        `SELECT amount, due_date, generation_key FROM payments WHERE charge_type = 'late_fee'`
      )
      .all() as Array<{ amount: number; due_date: string; generation_key: string }>;

    expect(fees).toHaveLength(3);
    expect(fees.every(fee => fee.amount === 500)).toBe(true);
    expect(fees.every(fee => fee.due_date === '2026-02-25')).toBe(true);

    // A cron retry is a no-op: no second fee, no repeated reminder.
    const retry = await runBillingJob(db, new Date('2026-02-25T00:00:00Z'));

    expect(retry.late_fees_applied).toBe(0);
    expect(retry.overdue_notices).toBe(0);
    expect(retry.marked_overdue).toBe(0);
    expect(
      (
        sqlite
          .prepare(`SELECT COUNT(*) AS count FROM payments WHERE charge_type = 'late_fee'`)
          .get() as {
          count: number;
        }
      ).count
    ).toBe(3);

    // The only automatic notice is the landlord's, one per overdue boarder charge.
    const reminderTypes = sqlite
      .prepare('SELECT user_id, type, COUNT(*) AS count FROM notifications GROUP BY user_id, type')
      .all() as Array<{ user_id: number; type: string; count: number }>;

    expect(reminderTypes).toEqual([{ user_id: 3, type: 'payment_overdue_landlord', count: 3 }]);
  });

  it('never charges a late fee when the property sets it to zero', async () => {
    const { sqlite, env } = setup();
    const db = env.DB!;
    sqlite.exec('UPDATE properties SET late_fee_amount = 0 WHERE id = 10');
    sqlite.exec(`UPDATE applications SET status = 'ended' WHERE id = 201`);
    await generateScheduleForApplication(db, 200);

    const run = await runBillingJob(db, new Date('2026-02-25T00:00:00Z'));

    expect(run.marked_overdue).toBe(3);
    expect(run.late_fees_applied).toBe(0);
  });
});

describe('landlord ledger routes', () => {
  it('scopes the ledger to accessible properties and rejects other roles', async () => {
    const { env } = setup();
    await generateScheduleForApplication(env.DB!, 200);

    const mine = await app.request(
      'http://localhost/api/landlord/payments?propertyId=10',
      { headers: { 'X-User-ID': '3' } },
      env
    );
    const mineBody = (await mine.json()) as {
      data: {
        charges: Array<{ charge_type: string; boarder_name: string }>;
        summary: { total_due: number };
        aging: { total_outstanding: number };
        collection: { month: string };
      };
    };

    expect(mine.status).toBe(200);
    expect(mineBody.data.charges).toHaveLength(5);
    expect(mineBody.data.charges[0].boarder_name).toBe('Benny Boarder');
    expect(mineBody.data.summary.total_due).toBe(1500 + 6500 + 6500 * 3);
    expect(mineBody.data.aging.total_outstanding).toBe(1500 + 6500 + 6500 * 3);

    const otherProperty = await app.request(
      'http://localhost/api/landlord/payments?propertyId=11',
      { headers: { 'X-User-ID': '3' } },
      env
    );
    const otherBody = (await otherProperty.json()) as { data: { charges: unknown[] } };

    expect(otherBody.data.charges).toHaveLength(0);

    const admin = await app.request(
      'http://localhost/api/landlord/payments',
      { headers: { 'X-User-ID': '5' } },
      env
    );
    const boarder = await app.request(
      'http://localhost/api/boarder/payments',
      { headers: { 'X-User-ID': '3' } },
      env
    );

    expect(admin.status).toBe(403);
    expect(boarder.status).toBe(403);
  });

  it('exports the ledger as CSV', async () => {
    const { env } = setup();
    await generateScheduleForApplication(env.DB!, 200);

    const response = await app.request(
      'http://localhost/api/landlord/payments/export.csv',
      { headers: { 'X-User-ID': '3' } },
      env
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');

    const csv = await response.text();

    // D29: the export carries the per-boarder tracker first, then the per-charge
    // detail it summarizes.
    expect(csv).toContain('# Tracker — Flow House — all months');
    expect(csv).toContain('Boarder,Room,Move-in,Monthly rent,Current due date');
    expect(csv).toContain('# Charges — Flow House — all months');
    expect(csv).toContain(
      'Boarder,Charge,Due,Period,Amount,Late fee,Total,Status,Paid date,Method,Reference,Notes,Receipt'
    );
    expect(csv).toContain('Benny Boarder');

    // The charge section is its title, the header row, then one row per charge
    // (deposit + advance + the three-month rent horizon).
    const chargeSection = (csv.split('# Charges —')[1] ?? '').trim().split('\n').slice(1);

    expect(chargeSection).toHaveLength(6);
  });

  it('creates utility charges for a tenant and refuses rent or late fees', async () => {
    const { sqlite, env } = setup();

    const utility = await app.request(
      'http://localhost/api/landlord/properties/10/charges',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({
          boarder_id: 2,
          charge_type: 'utility',
          amount: 800,
          due_date: '2026-03-01',
          description: 'Electricity — February',
        }),
      },
      env
    );

    expect(utility.status).toBe(201);
    expect(chargeRow(sqlite, 'utility')?.due_date).toBe('2026-03-01');

    const rent = await app.request(
      'http://localhost/api/landlord/properties/10/charges',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({
          boarder_id: 2,
          charge_type: 'rent',
          amount: 6500,
          due_date: '2026-03-01',
        }),
      },
      env
    );
    const foreignBoarder = await app.request(
      'http://localhost/api/landlord/properties/10/charges',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({
          boarder_id: 7,
          charge_type: 'utility',
          amount: 100,
          due_date: '2026-03-01',
        }),
      },
      env
    );

    expect(rent.status).toBe(400);
    expect(foreignBoarder.status).toBe(404);
  });

  it('upserts billing settings and generates the schedule on request', async () => {
    const { sqlite, env } = setup();

    const patched = await app.request(
      'http://localhost/api/landlord/properties/10/billing-settings',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ late_fee_amount: 0, late_fee_grace_days: 5, water_cost: 250 }),
      },
      env
    );
    const patchedBody = (await patched.json()) as {
      data: { late_fee_amount: number; late_fee_grace_days: number; water_cost: number };
    };

    expect(patched.status).toBe(200);
    expect(patchedBody.data).toEqual({
      property_id: 10,
      late_fee_amount: 0,
      late_fee_grace_days: 5,
      late_fee_enabled: 1,
      late_fee_type: 'fixed',
      late_fee_percent: 0,
      electricity_cost: 800,
      water_cost: 250,
      internet_cost: 0,
    });

    const denied = await app.request(
      'http://localhost/api/landlord/properties/10/billing-settings',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '4' },
        body: JSON.stringify({ late_fee_amount: 100 }),
      },
      env
    );

    expect(denied.status).toBe(404);

    const generated = await app.request(
      'http://localhost/api/landlord/tenancies/200/billing',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ advance_amount: 3000, horizon_months: 2 }),
      },
      env
    );
    const generatedBody = (await generated.json()) as {
      data: { created: number; first_due_date: string };
    };

    expect(generated.status).toBe(200);
    expect(generatedBody.data.created).toBe(4);
    expect(generatedBody.data.first_due_date).toBe('2026-02-15');

    const advance = sqlite
      .prepare(`SELECT amount FROM payments WHERE charge_type = 'advance'`)
      .get() as { amount: number };

    expect(advance.amount).toBe(3000);
  });

  it('resolves a deposit and refuses a non-deposit charge', async () => {
    const { sqlite, env } = setup();
    await generateScheduleForApplication(env.DB!, 200);
    const depositId = chargeRow(sqlite, 'deposit')!.id;
    const rentId = chargeRow(sqlite, 'rent', '2026-02-15')!.id;

    const resolved = await app.request(
      `http://localhost/api/landlord/charges/${depositId}/deposit-resolution`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ resolution: 'partial', amount: 900, reason: 'Damaged blinds' }),
      },
      env
    );

    expect(resolved.status).toBe(200);

    const row = sqlite
      .prepare(
        'SELECT deposit_resolution, deposit_resolution_amount, deposit_resolution_reason FROM payments WHERE id = ?'
      )
      .get(depositId) as {
      deposit_resolution: string;
      deposit_resolution_amount: number;
      deposit_resolution_reason: string;
    };

    expect(row.deposit_resolution).toBe('partial');
    expect(row.deposit_resolution_amount).toBe(900);

    const notADeposit = await app.request(
      `http://localhost/api/landlord/charges/${rentId}/deposit-resolution`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': '3' },
        body: JSON.stringify({ resolution: 'refund', amount: 100, reason: 'nope' }),
      },
      env
    );

    expect(notADeposit.status).toBe(404);
  });
});
