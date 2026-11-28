import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Env } from '../src/env';
import app from '../src/index';
import { runBillingJob } from '../src/repositories/payments/billing-run';
import { endApprovedLeaveNow } from '../src/repositories/tenancy/approval';

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

function setup(): { sqlite: Database; env: Env } {
  const sqlite = new Database(':memory:');
  runMigrations(sqlite);
  sqlite.exec(`
    INSERT INTO users (
      id, first_name, last_name, email, password_hash, role,
      is_verified, email_verified, account_status, boarder_status, created_at
    )
    VALUES
      (2, 'Benny', 'Boarder', 'boarder@example.com', 'hash', 'boarder', 1, 1, 'active', 'confirmed', '2026-01-15 08:00:00'),
      (3, 'Lara', 'Landlord', 'landlord@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-02 08:00:00'),
      (4, 'Rival', 'Landlord', 'rival@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-01-02 08:00:00'),
      (7, 'Other', 'Boarder', 'other@example.com', 'hash', 'boarder', 1, 1, 'active', 'confirmed', '2026-01-15 08:00:00');

    INSERT INTO addresses (id, address_line_1, city, province)
    VALUES (5, '100 Flow Street', 'Manila', 'Metro Manila'),
           (6, '200 Rival Road', 'Cebu', 'Cebu');

    INSERT INTO properties (
      id, landlord_id, address_id, title, price, deposit,
      late_fee_enabled, late_fee_amount, late_fee_grace_days,
      listing_moderation_status, status
    )
    VALUES
      (10, 3, 5, 'Flow House', 6500, 1500, 1, 500, 3, 'published', 'available'),
      (11, 4, 6, 'Rival House', 5000, 1000, 1, 500, 3, 'published', 'available');

    INSERT INTO rooms (id, property_id, landlord_id, room_number, title, price, deposit, status)
    VALUES
      (100, 10, 3, 'A1', 'Flow Room', 6500, 1500, 'occupied'),
      (102, 10, 3, 'A2', 'Flow Room 2', 6500, 1500, 'occupied'),
      (101, 11, 4, 'B1', 'Rival Room', 5000, 1000, 'occupied');

    INSERT INTO applications (
      id, boarder_id, landlord_id, room_id, message, status, advance_amount,
      next_due_date, created_at, confirmed_at
    )
    VALUES
      (200, 2, 3, 100, 'Me please.', 'confirmed', 6500, '2026-12-20', '2026-01-15 08:00:00', '2026-01-15 08:00:00'),
      (202, 7, 3, 102, 'Me too.', 'confirmed', 6500, '2026-12-20', '2026-01-15 08:00:00', '2026-01-15 08:00:00');
  `);

  return {
    sqlite,
    env: {
      APP_ENV: 'test',
      APP_ORIGIN: 'http://localhost:4173',
      JWT_SECRET: 'test-secret',
      DB: createSqliteD1(sqlite),
    },
  };
}

async function api(env: Env, path: string, userId: number, init?: RequestInit) {
  return await app.request(
    `http://localhost${path}`,
    {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': String(userId),
        ...(init?.headers ?? {}),
      },
    },
    env
  );
}

describe('paid amenities under Payments', () => {
  it('supports catalog CRUD, slot limits, boarder requests, approval billing, and rival isolation', async () => {
    const { sqlite, env } = setup();

    // 1. Landlord creates a limited-slot monthly parking amenity and a free included perk.
    const createRes = await api(env, '/api/landlord/properties/10/amenities', 3, {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            name: 'Parking Slot',
            billing_model: 'monthly',
            price: 600,
            unit_label: 'slot',
            max_slots: 2,
          },
          {
            name: 'Bike Rack',
            billing_model: 'monthly',
            price: 999,
            is_included: true,
          },
        ],
      }),
    });
    expect(createRes.status).toBe(201);
    const createdBody = (await createRes.json()) as {
      data: Array<{ id: number; name: string; price: number; is_included: boolean }>;
    };
    expect(createdBody.data.length).toBe(2);
    const parkingId = createdBody.data.find(a => a.name === 'Parking Slot')!.id;
    const bikeId = createdBody.data.find(a => a.name === 'Bike Rack')!.id;
    expect(createdBody.data.find(a => a.id === bikeId)!.price).toBe(0);

    // Rival landlord cannot read or edit property 10's amenities.
    const rivalRead = await api(env, '/api/landlord/payments/amenities?propertyId=10', 4);
    expect(rivalRead.status).toBe(404);

    // 2. Boarder 2 requests 2 parking slots (consuming full capacity once approved).
    const reqRes = await api(env, `/api/boarder/payments/amenities/${parkingId}/request`, 2, {
      method: 'POST',
      body: JSON.stringify({ quantity: 2, notes: '2 motorcycles' }),
    });
    expect(reqRes.status).toBe(201);
    const reqData = (await reqRes.json()) as { data: { id: number; status: string } };
    expect(reqData.data.status).toBe('pending_approval');

    // Notification bell surfaces the amenity request to the landlord.
    const lNotifRes = await api(env, '/api/notifications', 3);
    expect(lNotifRes.status).toBe(200);
    const lNotifs = ((await lNotifRes.json()) as { data: Array<{ type: string }> }).data;
    expect(lNotifs.some(n => n.type === 'amenity_request')).toBe(true);

    // Landlord approves -> creates initial amenity charge (600 * 2 = 1200).
    const approveRes = await api(
      env,
      `/api/landlord/payments/amenities/requests/${reqData.data.id}/approve`,
      3,
      { method: 'POST', body: JSON.stringify({}) }
    );
    expect(approveRes.status).toBe(200);
    const approved = (await approveRes.json()) as {
      data: { status: string; next_bill_date: string | null };
    };
    expect(approved.data.status).toBe('active');
    expect(approved.data.next_bill_date).toBeTruthy();

    const charge = sqlite
      .prepare("SELECT charge_type, amount, status FROM payments WHERE tenancy_amenity_id = ?")
      .get(reqData.data.id) as { charge_type: string; amount: number; status: string };
    expect(charge).toEqual({ charge_type: 'amenity', amount: 1200, status: 'pending' });

    // 3. Boarder 7 tries to request another parking slot when max_slots (2) is full -> 409.
    const fullRes = await api(env, `/api/boarder/payments/amenities/${parkingId}/request`, 7, {
      method: 'POST',
      body: JSON.stringify({ quantity: 1 }),
    });
    expect(fullRes.status).toBe(409);

    // 4. Direct assignment of included ₱0 perk creates no payments row.
    const assignBike = await api(env, `/api/landlord/properties/10/amenities/${bikeId}/assign`, 3, {
      method: 'POST',
      body: JSON.stringify({ application_id: 200 }),
    });
    expect(assignBike.status).toBe(201);
    const bikeCharges = sqlite
      .prepare('SELECT COUNT(*) AS cnt FROM payments WHERE paid_amenity_id = ?')
      .get(bikeId) as { cnt: number };
    expect(bikeCharges.cnt).toBe(0);
  });

  it('logs metered/per-use usage, confirms boarder usage requests, and exempts amenities from late fees', async () => {
    const { sqlite, env } = setup();

    const createRes = await api(env, '/api/landlord/properties/10/amenities', 3, {
      method: 'POST',
      body: JSON.stringify({
        name: 'AC Sub-meter',
        billing_model: 'per_use',
        price: 18,
        unit_label: 'kWh',
        is_metered: true,
      }),
    });
    const acId = ((await createRes.json()) as { data: Array<{ id: number }> }).data[0].id;

    // Landlord logs meter reading 100 -> 125 kWh (25 * 18 = 450) with past due date to test late fee exemption.
    const logRes = await api(env, `/api/landlord/properties/10/amenities/${acId}/usage`, 3, {
      method: 'POST',
      body: JSON.stringify({
        application_ids: [200],
        previous_reading: 100,
        current_reading: 125,
        due_date: '2026-10-01',
      }),
    });
    expect(logRes.status).toBe(201);
    const logData = ((await logRes.json()) as { data: Array<{ total_amount: number; payment_id: number }> }).data[0];
    expect(logData.total_amount).toBe(450);

    // Nightly billing job marks overdue, notifies landlord, and applies ZERO late fees to amenity charges.
    const job = await runBillingJob(env.DB, new Date('2026-10-10T02:00:00Z'));
    expect(job.marked_overdue).toBe(1);
    expect(job.late_fees_applied).toBe(0);
    const lateFees = sqlite
      .prepare("SELECT COUNT(*) AS cnt FROM payments WHERE charge_type = 'late_fee'")
      .get() as { cnt: number };
    expect(lateFees.cnt).toBe(0);

    // Boarder submits a per-use request and landlord confirms it.
    const reqUsage = await api(env, `/api/boarder/payments/amenities/${acId}/usage-request`, 2, {
      method: 'POST',
      body: JSON.stringify({ quantity: 10 }),
    });
    expect(reqUsage.status).toBe(201);
    const logId = ((await reqUsage.json()) as { data: { id: number } }).data.id;

    const confirmRes = await api(env, `/api/landlord/payments/amenities/usage/${logId}/approve`, 3, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(confirmRes.status).toBe(200);
    expect(((await confirmRes.json()) as { data: { status: string; total_amount: number } }).data).toMatchObject({
      status: 'posted',
      total_amount: 180,
    });
  });

  it('renews monthly subscriptions idempotently in runBillingJob and auto-cancels when tenancy ends', async () => {
    const { sqlite, env } = setup();

    const createRes = await api(env, '/api/landlord/properties/10/amenities', 3, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Mini-Fridge',
        billing_model: 'monthly',
        price: 400,
        unit_label: 'unit',
      }),
    });
    const fridgeId = ((await createRes.json()) as { data: Array<{ id: number }> }).data[0].id;

    const assignRes = await api(env, `/api/landlord/properties/10/amenities/${fridgeId}/assign`, 3, {
      method: 'POST',
      body: JSON.stringify({ application_id: 200 }),
    });
    const subId = ((await assignRes.json()) as { data: { id: number } }).data.id;

    // Force next_bill_date to 2026-12-20 and run nightly job on 2026-12-18 (within 3-day horizon).
    sqlite
      .prepare("UPDATE tenancy_amenities SET next_bill_date = '2026-12-20' WHERE id = ?")
      .run(subId);

    const firstRun = await runBillingJob(env.DB, new Date('2026-12-18T02:00:00Z'));
    expect(firstRun.amenities_billed).toBe(1);

    // Running again the same day must be idempotent (next_bill_date advanced to Jan 2027).
    const secondRun = await runBillingJob(env.DB, new Date('2026-12-18T03:00:00Z'));
    expect(secondRun.amenities_billed).toBe(0);

    const subRow = sqlite
      .prepare('SELECT next_bill_date, status FROM tenancy_amenities WHERE id = ?')
      .get(subId) as { next_bill_date: string; status: string };
    expect(subRow.next_bill_date).toBe('2027-01-20');

    // End tenancy via approved leave-now -> auto-cancels active amenity subscription.
    sqlite
      .prepare("UPDATE applications SET leave_request_status = 'approved' WHERE id = 200")
      .run();
    const ended = await endApprovedLeaveNow(env.DB, 200, 2);
    expect(ended).toBe(true);

    const afterEnd = sqlite
      .prepare('SELECT status, cancelled_at FROM tenancy_amenities WHERE id = ?')
      .get(subId) as { status: string; cancelled_at: string | null };
    expect(afterEnd.status).toBe('cancelled');
    expect(afterEnd.cancelled_at).toBeTruthy();
  });
});
