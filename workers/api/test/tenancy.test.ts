import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Env } from '../src/env';
import app from '../src/index';
import { addDays, manilaToday } from '../src/repositories/payments/helpers';

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

    INSERT INTO payments (id, boarder_id, landlord_id, room_id, property_id, application_id, amount, due_date, status)
    VALUES
      (300, 2, 3, 100, 10, 200, 6500, '2026-06-01', 'pending'),
      (301, 2, 3, 100, 10, 200, 6500, '2026-05-01', 'paid');
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
      data: {
        conversation_id: number;
        message_id: number;
        leave_date: string;
        outstanding_amount: number;
      };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.conversation_id).toBeGreaterThan(0);
    expect(body.data.message_id).toBeGreaterThan(0);
    expect(body.data.leave_date).toBe('July 1, 2026');
    // The tenant learns about the debt that would block approval now, not when
    // the landlord refuses (spec §4.7).
    expect(body.data.outstanding_amount).toBe(6500);

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

  it('approves a pending leave request without ending the tenancy and notifies the boarder', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);
    sqlite.exec(`
      UPDATE applications
      SET leave_request_status = 'pending',
          leave_request_date = '2026-10-01 08:00:00',
          leave_request_reason = 'Moving closer to work',
          intended_leave_date = '2999-07-15',
          deleted_at = NULL
      WHERE id = 200;

      -- Approval is gated on a settled balance (spec §3.5), so clear the June rent.
      UPDATE payments SET status = 'paid' WHERE id = 300;
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
    const approvedBody = (await response.json()) as {
      success: boolean;
      message: string;
      data: { approved_at: string; approved_by_name: string };
    };
    expect(approvedBody).toMatchObject({
      success: true,
      message: 'Leave request approved successfully',
      data: {
        application_id: 200,
        boarder_name: 'Benny Boarder',
        intended_leave_date: '2999-07-15',
        finalized: false,
        approved_by_name: 'Lara Landlord',
      },
    });
    expect(typeof approvedBody.data.approved_at).toBe('string');
    // The tenancy stays active until the leave date and the room is released now.
    // Open charges deliberately stay owed so Leave now can require settlement.
    expect(
      sqlite
        .prepare(
          `
            SELECT status, leave_request_status, approved_by, approved_by_name,
                   approved_at IS NOT NULL AS approved, deleted_at IS NOT NULL AS deleted
            FROM applications
            WHERE id = 200
          `
        )
        .get()
    ).toEqual({
      status: 'confirmed',
      leave_request_status: 'approved',
      approved_by: 3,
      approved_by_name: 'Lara Landlord',
      approved: 1,
      deleted: 0,
    });
    expect(sqlite.prepare('SELECT status FROM rooms WHERE id = 100').get()).toEqual({
      status: 'available',
    });
    expect(sqlite.prepare('SELECT boarder_status FROM users WHERE id = 2').get()).toEqual({
      boarder_status: 'accepted',
    });
    // Approval leaves the ledger alone; the balance gate above is what keeps a
    // debt from being stranded behind a released room.
    expect(sqlite.prepare('SELECT id, status FROM payments ORDER BY id').all()).toEqual([
      { id: 300, status: 'paid' },
      { id: 301, status: 'paid' },
    ]);

    // The boarder is told in the bell and in the leave conversation, as the landlord.
    const notification = sqlite
      .prepare('SELECT type, title, message, metadata FROM notifications WHERE user_id = 2')
      .get() as { type: string; title: string; message: string; metadata: string };
    expect(notification.type).toBe('leave_request_approved');
    expect(notification.title).toBe('Leave approved by Lara Landlord');
    expect(notification.message).toBe(
      'Your leave request has been approved. Your tenancy at Accepted House ends on July 15, 2999.'
    );
    expect(JSON.parse(notification.metadata)).toEqual({
      application_id: 200,
      intended_leave_date: '2999-07-15',
      route: '/boarder/tenancy',
    });
    expect(sqlite.prepare('SELECT sender_id, message_text FROM messages').all()).toEqual([
      {
        sender_id: 3,
        message_text:
          'Your leave request has been approved. Your tenancy at Accepted House ends on July 15, 2999.',
      },
    ]);
  });

  it('refuses to approve a leave request while the tenant still owes money', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);
    sqlite.exec(`
      UPDATE applications
      SET leave_request_status = 'pending',
          leave_request_date = '2026-10-01 08:00:00',
          leave_request_reason = 'Moving closer to work',
          intended_leave_date = '2999-07-15',
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

    // Payment 300 (June rent) is still pending, so approval is a hard stop.
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'This tenant still owes ₱6,500. Settle or verify payments before approving.',
      code: 'unsettled_balance',
      details: { outstanding_amount: 6500 },
    });
    expect(
      sqlite
        .prepare(
          'SELECT leave_request_status, approved_at, approved_by FROM applications WHERE id = 200'
        )
        .get()
    ).toEqual({ leave_request_status: 'pending', approved_at: null, approved_by: null });
    expect(sqlite.prepare('SELECT status FROM rooms WHERE id = 100').get()).toEqual({
      status: 'occupied',
    });
    expect(sqlite.prepare('SELECT COUNT(*) as count FROM notifications').get()).toEqual({
      count: 0,
    });
    expect(sqlite.prepare('SELECT COUNT(*) as count FROM messages').get()).toEqual({ count: 0 });
  });

  it('treats a submitted-but-unverified payment as unsettled', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);
    sqlite.exec(`
      UPDATE applications
      SET leave_request_status = 'pending',
          intended_leave_date = '2999-07-15',
          deleted_at = NULL
      WHERE id = 200;

      UPDATE payments SET status = 'awaiting_verification' WHERE id = 300;
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

    expect(response.status).toBe(409);
    expect((await response.json()) as { error: string; code: string }).toMatchObject({
      code: 'unsettled_balance',
    });
  });

  it('reports the tenant balance and the approver on the boarders list', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);

    const listBoarders = async () => {
      const response = await app.request(
        'http://localhost/api/landlord/boarders?propertyId=10',
        { headers: { 'X-User-ID': '3' } },
        createEnv(sqlite)
      );

      return (await response.json()) as {
        data: {
          boarders: Array<{
            outstanding_amount: number;
            approved_at: string | null;
            approved_by_name: string | null;
          }>;
        };
      };
    };

    const before = await listBoarders();
    expect(before.data.boarders[0].outstanding_amount).toBe(6500);
    expect(before.data.boarders[0].approved_by_name).toBeNull();

    sqlite.exec(`
      UPDATE payments SET status = 'paid' WHERE id = 300;
      UPDATE applications
      SET leave_request_status = 'pending',
          intended_leave_date = '2999-07-15',
          deleted_at = NULL
      WHERE id = 200;
    `);

    const approved = await app.request(
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
    expect(approved.status).toBe(200);

    const after = await listBoarders();
    expect(after.data.boarders[0].outstanding_amount).toBe(0);
    expect(after.data.boarders[0].approved_by_name).toBe('Lara Landlord');
    expect(typeof after.data.boarders[0].approved_at).toBe('string');
  });

  it('finalizes an approval immediately when the leave date has passed', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);
    sqlite.exec(`
      UPDATE applications
      SET leave_request_status = 'pending',
          intended_leave_date = '2020-01-01',
          deleted_at = NULL
      WHERE id = 200;

      UPDATE payments SET status = 'paid' WHERE id = 300;
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
    const body = (await response.json()) as { data: { finalized: boolean } };
    expect(body.data.finalized).toBe(true);
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
    expect(sqlite.prepare('SELECT boarder_status FROM users WHERE id = 2').get()).toEqual({
      boarder_status: 'new',
    });
  });

  it('reports the outstanding balance on the tenancy payload', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);

    const response = await app.request(
      'http://localhost/api/boarder/tenancy',
      { headers: { 'X-User-ID': '2' } },
      createEnv(sqlite)
    );
    const body = (await response.json()) as {
      data: { outstanding_balance: number; open_charge_count: number };
    };

    expect(response.status).toBe(200);
    expect(body.data.outstanding_balance).toBe(6500);
    expect(body.data.open_charge_count).toBe(1);
  });

  it('blocks leave now until the balance is settled, then records the early departure', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);
    sqlite.exec(`
      UPDATE applications
      SET leave_request_status = 'approved',
          leave_request_date = '2026-10-01 08:00:00',
          leave_request_reason = 'Moving closer to work',
          intended_leave_date = '2999-07-15',
          deleted_at = NULL
      WHERE id = 200;
    `);

    const request = () =>
      app.request(
        'http://localhost/api/boarder/leave-now',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': '2',
          },
          body: JSON.stringify({ application_id: 200 }),
        },
        createEnv(sqlite)
      );

    const blocked = await request();
    expect(blocked.status).toBe(409);
    expect(await blocked.json()).toEqual({
      error:
        'You have an outstanding balance of ₱6,500. Settle your fees before you can leave now.',
    });
    expect(sqlite.prepare('SELECT status FROM applications WHERE id = 200').get()).toEqual({
      status: 'confirmed',
    });

    sqlite.exec("UPDATE payments SET status = 'paid' WHERE id = 300");

    const allowed = await request();
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({
      success: true,
      message: "You've moved out. Your tenancy has ended.",
      data: {
        application_id: 200,
        property_name: 'Accepted House',
        room_number: 'A1',
        move_out_date: manilaToday(),
      },
    });

    expect(
      sqlite
        .prepare(
          `
            SELECT status, leave_request_status, intended_leave_date, deleted_at IS NOT NULL AS deleted
            FROM applications
            WHERE id = 200
          `
        )
        .get()
    ).toEqual({
      status: 'ended',
      leave_request_status: 'approved',
      intended_leave_date: '2999-07-15',
      deleted: 1,
    });
    expect(sqlite.prepare('SELECT boarder_status FROM users WHERE id = 2').get()).toEqual({
      boarder_status: 'new',
    });
    // The room was not decremented a second time.
    expect(sqlite.prepare('SELECT status FROM rooms WHERE id = 100').get()).toEqual({
      status: 'occupied',
    });

    const notification = sqlite
      .prepare('SELECT type, title, message, metadata FROM notifications WHERE user_id = 3')
      .get() as { type: string; title: string; message: string; metadata: string };
    expect(notification.type).toBe('boarder_left_early');
    expect(notification.title).toBe('Boarder moved out early');
    expect(notification.message).toBe(
      'Benny Boarder moved out of A1 at Accepted House today, earlier than the approved July 15, 2999.'
    );
    expect(JSON.parse(notification.metadata)).toEqual({
      application_id: 200,
      property_id: 10,
      room_id: 100,
      room_number: 'A1',
      approved_leave_date: '2999-07-15',
      actual_move_out_date: manilaToday(),
    });

    const activityResponse = await app.request(
      `http://localhost/api/landlord/activity?from=${addDays(manilaToday(), -30)}&to=${addDays(
        manilaToday(),
        1
      )}`,
      { headers: { 'X-User-ID': '3' } },
      createEnv(sqlite)
    );
    expect(activityResponse.status).toBe(200);
    const activity = (await activityResponse.json()) as {
      data: { events: Array<{ type: string; status: string; date: string; subject: string }> };
    };
    expect(
      activity.data.events.find(
        item => item.type === 'tenancy_move_out' && item.status === 'left_early'
      )
    ).toMatchObject({ date: manilaToday(), subject: 'Benny Boarder' });

    const again = await request();
    expect(again.status).toBe(404);
  });

  it('blocks leave now while a payment awaits verification', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);
    sqlite.exec(`
      UPDATE applications
      SET leave_request_status = 'approved',
          intended_leave_date = '2999-07-15',
          deleted_at = NULL
      WHERE id = 200;
      UPDATE payments SET status = 'awaiting_verification' WHERE id = 300;
    `);

    const response = await app.request(
      'http://localhost/api/boarder/leave-now',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({ application_id: 200 }),
      },
      createEnv(sqlite)
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        'You have an outstanding balance of ₱6,500. Settle your fees before you can leave now.',
    });
  });

  it('refuses leave now before the landlord approves the leave', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);
    sqlite.exec(`
      UPDATE applications
      SET leave_request_status = 'pending',
          intended_leave_date = '2999-07-15',
          deleted_at = NULL
      WHERE id = 200;
      UPDATE payments SET status = 'paid' WHERE id = 300;
    `);

    const response = await app.request(
      'http://localhost/api/boarder/leave-now',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({ application_id: 200 }),
      },
      createEnv(sqlite)
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'You can only leave now after your landlord approves your leave request.',
    });
  });

  it('requires an application id for leave now', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);

    const response = await app.request(
      'http://localhost/api/boarder/leave-now',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({}),
      },
      createEnv(sqlite)
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Application ID is required' });
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

  it('closes an approved leave on read once its date has passed', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);
    sqlite.exec(`
      UPDATE applications
      SET leave_request_status = 'approved',
          intended_leave_date = '2020-01-01'
      WHERE id = 200;
    `);

    const tenancy = await app.request(
      'http://localhost/api/boarder/tenancy',
      { headers: { 'X-User-ID': '2' } },
      createEnv(sqlite)
    );
    expect(tenancy.status).toBe(200);
    expect(await tenancy.json()).toEqual({
      success: true,
      data: null,
      message: 'No active tenancy found',
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
    expect(sqlite.prepare('SELECT boarder_status FROM users WHERE id = 2').get()).toEqual({
      boarder_status: 'new',
    });

    // The landlord's boarders list reconciles the same way.
    sqlite.exec(`
      UPDATE applications
      SET status = 'confirmed', deleted_at = NULL, leave_request_status = 'approved',
          intended_leave_date = '2020-01-01'
      WHERE id = 200;
      UPDATE users SET boarder_status = 'accepted' WHERE id = 2;
    `);
    const list = await app.request(
      'http://localhost/api/landlord/boarders?propertyId=10',
      { headers: { 'X-User-ID': '3' } },
      createEnv(sqlite)
    );
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual({
      success: true,
      data: { boarders: [], total_count: 0 },
    });
    expect(sqlite.prepare('SELECT status FROM applications WHERE id = 200').get()).toEqual({
      status: 'ended',
    });
  });

  it('rejects a second leave request while one is approved', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);
    sqlite.exec(`
      UPDATE applications
      SET leave_request_status = 'approved',
          intended_leave_date = '2999-07-15'
      WHERE id = 200;
    `);

    const response = await app.request(
      'http://localhost/api/boarder/leave-request',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({
          reason: 'Changed my mind',
          leave_date: '2999-08-01',
          message: 'Second attempt.',
        }),
      },
      createEnv(sqlite)
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Your leave request has already been approved. Your tenancy ends on 2999-07-15.',
    });
  });

  it('no longer exposes the decline endpoint', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedTenancyData(sqlite);

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

    expect(response.status).toBe(404);
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
