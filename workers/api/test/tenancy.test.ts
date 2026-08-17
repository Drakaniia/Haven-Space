import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Env } from '../src/env';
import app from '../src/index';

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
    APP_ORIGIN: 'http://localhost:4173',
    JWT_SECRET: 'test-secret',
    DB: createSqliteD1(db),
  };
}

function seedTenancyData(db: Database): void {
  db.exec(`
    INSERT INTO users (
      id,
      first_name,
      last_name,
      email,
      password_hash,
      role,
      is_verified,
      email_verified,
      account_status,
      boarder_status,
      phone_number,
      avatar_url,
      created_at
    )
    VALUES
      (2, 'Benny', 'Boarder', 'boarder@example.com', 'hash', 'boarder', 1, 1, 'active', 'accepted', '09171234567', NULL, '2026-05-02 08:00:00'),
      (3, 'Lara', 'Landlord', 'landlord@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '09170000000', NULL, '2026-05-03 08:00:00');

    INSERT INTO addresses (id, address_line_1, city, province, latitude, longitude)
    VALUES (5, '100 Flow Street', 'Manila', 'Metro Manila', 14.5995, 120.9842);

    INSERT INTO properties (
      id,
      landlord_id,
      address_id,
      title,
      price,
      deposit,
      house_rules,
      listing_moderation_status,
      status
    )
    VALUES (10, 3, 5, 'Accepted House', 6500, 1500, '["No loud music"]', 'published', 'available');

    INSERT INTO rooms (id, property_id, landlord_id, room_number, title, price, deposit, status)
    VALUES (100, 10, 3, 'A1', 'Accepted Room', 6500, 1500, 'occupied');

    INSERT INTO applications (
      id,
      boarder_id,
      landlord_id,
      room_id,
      message,
      status,
      created_at
    )
    VALUES (200, 2, 3, 100, 'I want this room.', 'confirmed', '2026-05-01 08:00:00');

    INSERT INTO payments (id, boarder_id, landlord_id, room_id, property_id, amount, due_date, status)
    VALUES
      (300, 2, 3, 100, 10, 6500, '2026-06-01', 'pending'),
      (301, 2, 3, 100, 10, 6500, '2026-05-01', 'paid');
  `);
}

describe('tenancy and leave request routes', () => {
  it('returns current boarder tenancy with the PHP response shape', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);

    const response = await app.request(
      'http://localhost/api/boarder/tenancy',
      { headers: { 'X-User-ID': '2' } },
      createEnv(sqlite)
    );
    const body = (await response.json()) as {
      success: boolean;
      data: {
        application_id: number;
        property_name: string;
        room_number: string;
        monthly_rent: number;
        house_rules: string[];
        landlord: { name: string; phone: string; is_verified: boolean };
      };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.application_id).toBe(200);
    expect(body.data.property_name).toBe('Accepted House');
    expect(body.data.room_number).toBe('A1');
    expect(body.data.monthly_rent).toBe(6500);
    expect(body.data.house_rules).toEqual(['No loud music']);
    expect(body.data.landlord).toEqual({
      id: 3,
      name: 'Lara Landlord',
      email: 'landlord@example.com',
      phone: '09170000000',
      is_verified: true,
    });
  });

  it('sends a leave request message and keeps the tenancy active with a pending leave request', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);

    const response = await app.request(
      'http://localhost/api/boarder/leave-request',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({
          reason: 'Moving closer to work',
          leave_date: '2026-07-01',
          message: 'Thank you for hosting me.',
        }),
      },
      createEnv(sqlite)
    );
    const body = (await response.json()) as {
      success: boolean;
      data: { conversation_id: number; message_id: number; leave_date: string };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.conversation_id).toBeGreaterThan(0);
    expect(body.data.message_id).toBeGreaterThan(0);
    expect(body.data.leave_date).toBe('July 1, 2026');

    expect(
      sqlite
        .prepare(
          `
            SELECT status, leave_request_status, leave_request_reason, intended_leave_date, deleted_at IS NOT NULL AS deleted
            FROM applications
            WHERE id = 200
          `
        )
        .get()
    ).toEqual({
      status: 'confirmed',
      leave_request_status: 'pending',
      leave_request_reason: 'Moving closer to work',
      intended_leave_date: '2026-07-01',
      deleted: 0,
    });
    // The tenancy stays visible and the room stays occupied while pending.
    expect(sqlite.prepare('SELECT boarder_status FROM users WHERE id = 2').get()).toEqual({
      boarder_status: 'accepted',
    });
    expect(
      sqlite.prepare('SELECT status FROM payments WHERE id = 300').get() as { status: string }
    ).toEqual({ status: 'pending' });
    expect(sqlite.prepare('SELECT status FROM rooms WHERE id = 100').get()).toEqual({
      status: 'occupied',
    });
    expect(
      sqlite.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }
    ).toEqual({ count: 1 });

    const tenancyResponse = await app.request(
      'http://localhost/api/boarder/tenancy',
      { headers: { 'X-User-ID': '2' } },
      createEnv(sqlite)
    );
    const tenancyBody = (await tenancyResponse.json()) as {
      data: { application_id: number; leave_request_status: string; intended_leave_date: string };
    };
    expect(tenancyBody.data.application_id).toBe(200);
    expect(tenancyBody.data.leave_request_status).toBe('pending');
    expect(tenancyBody.data.intended_leave_date).toBe('2026-07-01');
  });

  it('approves a pending leave request for the owning landlord', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);
    sqlite.exec(`
      UPDATE applications
      SET leave_request_status = 'pending',
          intended_leave_date = '2026-07-15',
          deleted_at = NULL
      WHERE id = 200;
    `);

    const response = await app.request(
      'http://localhost/api/landlord/approve-leave-request',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ application_id: 200 }),
      },
      createEnv(sqlite)
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Leave request approved successfully',
      data: {
        application_id: 200,
        boarder_name: 'Benny Boarder',
        intended_leave_date: '2026-07-15',
      },
    });
    expect(
      sqlite
        .prepare(
          `
            SELECT status, leave_request_status, deleted_at IS NOT NULL AS deleted
            FROM applications
            WHERE id = 200
          `
        )
        .get()
    ).toEqual({ status: 'ended', leave_request_status: 'approved', deleted: 1 });
    // Approval finalizes the leave: room freed, boarder back to browsing, payments cancelled.
    expect(sqlite.prepare('SELECT status FROM rooms WHERE id = 100').get()).toEqual({
      status: 'available',
    });
    expect(sqlite.prepare('SELECT boarder_status FROM users WHERE id = 2').get()).toEqual({
      boarder_status: 'new',
    });
    expect(
      sqlite.prepare('SELECT status FROM payments WHERE id = 300').get() as { status: string }
    ).toEqual({ status: 'cancelled' });
  });

  it('rejects a second leave request while one is pending', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);

    const first = await app.request(
      'http://localhost/api/boarder/leave-request',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({
          reason: 'Moving closer to work',
          leave_date: '2026-07-01',
          message: 'Thank you for hosting me.',
        }),
      },
      createEnv(sqlite)
    );
    expect(first.status).toBe(200);

    const second = await app.request(
      'http://localhost/api/boarder/leave-request',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({
          reason: 'Changed my mind',
          leave_date: '2026-08-01',
          message: 'Second attempt.',
        }),
      },
      createEnv(sqlite)
    );

    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({
      error:
        'You already have a pending leave request. Please wait for your landlord to review it before submitting another.',
    });
    // The original request is untouched.
    expect(
      sqlite
        .prepare(
          'SELECT leave_request_status, leave_request_reason FROM applications WHERE id = 200'
        )
        .get()
    ).toEqual({
      leave_request_status: 'pending',
      leave_request_reason: 'Moving closer to work',
    });
  });

  it('declines a pending leave request without ending the tenancy', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);
    sqlite.exec(`
      UPDATE applications
      SET leave_request_status = 'pending',
          intended_leave_date = '2026-07-15'
      WHERE id = 200;
    `);

    const response = await app.request(
      'http://localhost/api/landlord/decline-leave-request',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ application_id: 200 }),
      },
      createEnv(sqlite)
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Leave request declined successfully',
      data: {
        application_id: 200,
        boarder_name: 'Benny Boarder',
        intended_leave_date: '2026-07-15',
      },
    });
    // The tenancy stays active and the room stays occupied.
    expect(
      sqlite
        .prepare(
          `
            SELECT status, leave_request_status, deleted_at IS NOT NULL AS deleted
            FROM applications
            WHERE id = 200
          `
        )
        .get()
    ).toEqual({ status: 'confirmed', leave_request_status: 'declined', deleted: 0 });
    expect(sqlite.prepare('SELECT status FROM rooms WHERE id = 100').get()).toEqual({
      status: 'occupied',
    });

    // A non-pending (already processed) request is not found.
    const again = await app.request(
      'http://localhost/api/landlord/decline-leave-request',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ application_id: 200 }),
      },
      createEnv(sqlite)
    );
    expect(again.status).toBe(404);
    expect(await again.json()).toEqual({ error: 'Leave request not found or already processed' });
  });

  it('returns PHP-compatible tenancy and leave validation errors', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);

    const missingBody = await app.request(
      'http://localhost/api/boarder/leave-request',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({ reason: 'Other' }),
      },
      createEnv(sqlite)
    );

    expect(missingBody.status).toBe(400);
    expect(await missingBody.json()).toEqual({
      error: 'Reason, leave date, and message are required',
    });

    sqlite.exec('UPDATE applications SET deleted_at = CURRENT_TIMESTAMP WHERE id = 200');
    const noTenancy = await app.request(
      'http://localhost/api/boarder/tenancy',
      { headers: { 'X-User-ID': '2' } },
      createEnv(sqlite)
    );

    expect(noTenancy.status).toBe(200);
    expect(await noTenancy.json()).toEqual({
      success: true,
      data: null,
      message: 'No active tenancy found',
    });
  });
});
