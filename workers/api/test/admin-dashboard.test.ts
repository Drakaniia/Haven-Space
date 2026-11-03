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

function seedAdminDashboardData(db: Database): void {
  db.exec(`
    INSERT INTO users (id, first_name, last_name, email, role, is_verified, email_verified, account_status, created_at)
    VALUES
      (1, 'Ada', 'Admin', 'admin@example.com', 'admin', 1, 1, 'active', '2026-05-01 08:00:00'),
      (2, 'Benny', 'Boarder', 'boarder@example.com', 'boarder', 1, 1, 'active', '2026-05-02 08:00:00'),
      (3, 'Lara', 'Landlord', 'landlord@example.com', 'landlord', 0, 1, 'pending_verification', '2026-05-03 08:00:00');

    INSERT INTO properties (id, landlord_id, title, price, listing_moderation_status, status, created_at)
    VALUES
      (10, 3, 'Pending House', 4500, 'pending_review', 'available', '2026-05-04 08:00:00'),
      (11, 3, 'Published House', 6500, 'published', 'available', '2026-05-05 08:00:00');

    INSERT INTO rooms (id, property_id, landlord_id, title, price, status, created_at)
    VALUES
      (100, 10, 3, 'Pending Room', 4500, 'available', '2026-05-06 08:00:00'),
      (101, 11, 3, 'Published Room', 6500, 'available', '2026-05-07 08:00:00');

    INSERT INTO applications (id, boarder_id, landlord_id, room_id, message, status, created_at)
    VALUES
      (200, 2, 3, 100, 'I want this room.', 'pending', '2026-05-08 08:00:00'),
      (201, 2, 3, 101, 'I want this other room.', 'approved', '2026-05-09 08:00:00');

    UPDATE platform_settings
    SET setting_value = '7.50'
    WHERE setting_key = 'platform_fee_percent';
  `);
}

function adminHeaders(): HeadersInit {
  return {
    'X-User-ID': '1',
    'Content-Type': 'application/json',
  };
}

describe('admin dashboard routes', () => {
  it('returns summary and applications data with the PHP response shape', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAdminDashboardData(sqlite);
    const env = createEnv(sqlite);

    const summary = await app.request(
      'http://localhost/api/admin/summary',
      { headers: { 'X-User-ID': '1' } },
      env
    );
    const summaryBody = (await summary.json()) as {
      data: {
        counts: Record<string, number>;
        revenue: { platform_fee_percent: number; currency: string };
      };
    };

    expect(summary.status).toBe(200);
    expect(summaryBody.data.counts).toEqual({
      users_total: 3,
      users_boarder: 1,
      users_landlord: 1,
      users_admin: 1,
      landlords_pending_verification: 1,
      properties_total: 2,
      properties_pending_moderation: 1,
      applications_total: 2,
    });
    expect(summaryBody.data.revenue.platform_fee_percent).toBe(7.5);
    expect(summaryBody.data.revenue.currency).toBe('PHP');

    const applications = await app.request(
      'http://localhost/api/admin/applications',
      { headers: { 'X-User-ID': '1' } },
      env
    );
    const applicationsBody = (await applications.json()) as {
      data: {
        stats: {
          total: number;
          pending: number;
          approved: number;
          rejected: number;
          processed_rate_percent: number;
          by_status: Record<string, number>;
        };
        applications: Array<{ id: number; boarder_email: string; room_title: string }>;
      };
    };

    expect(applications.status).toBe(200);
    expect(applicationsBody.data.stats).toEqual({
      total: 2,
      pending: 1,
      approved: 1,
      rejected: 0,
      processed_rate_percent: 50,
      by_status: {
        approved: 1,
        pending: 1,
      },
    });
    expect(applicationsBody.data.applications).toHaveLength(2);
    expect(applicationsBody.data.applications[0]).toMatchObject({
      id: 201,
      boarder_email: 'boarder@example.com',
      room_title: 'Published Room',
    });
  });

  it('lists and updates admin-managed users', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAdminDashboardData(sqlite);
    const env = createEnv(sqlite);

    const list = await app.request(
      'http://localhost/api/admin/users?role=landlord&q=lara',
      { headers: { 'X-User-ID': '1' } },
      env
    );
    const listBody = (await list.json()) as {
      data: Array<{ id: number; role: string; email: string }>;
      meta: { total: number; limit: number; offset: number };
    };

    expect(list.status).toBe(200);
    expect(listBody.data).toEqual([
      expect.objectContaining({
        id: 3,
        role: 'landlord',
        email: 'landlord@example.com',
      }),
    ]);
    expect(listBody.meta).toEqual({ total: 1, limit: 40, offset: 0 });

    const update = await app.request(
      'http://localhost/api/admin/users',
      {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ userId: 3, account_status: 'suspended' }),
      },
      env
    );

    expect(update.status).toBe(200);
    expect(await update.json()).toEqual({
      message: 'User status updated successfully',
      data: { updated: [3], failed: [], skippedSelf: false },
    });
    expect(
      sqlite.prepare('SELECT account_status FROM users WHERE id = 3').get() as {
        account_status: string;
      }
    ).toEqual({ account_status: 'suspended' });
  });

  it('lists and updates property moderation queues', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAdminDashboardData(sqlite);
    const env = createEnv(sqlite);

    const list = await app.request(
      'http://localhost/api/admin/properties?moderation=pending_review',
      { headers: { 'X-User-ID': '1' } },
      env
    );
    const listBody = (await list.json()) as {
      data: Array<{ id: number; title: string; listing_moderation_status: string }>;
    };

    expect(list.status).toBe(200);
    expect(listBody.data).toEqual([
      expect.objectContaining({
        id: 10,
        title: 'Pending House',
        listing_moderation_status: 'pending_review',
        // Card facts ride along with the queue (`landlord-properties-card-layout` D21).
        created_at: '2026-05-04 08:00:00',
        address: null,
        city: null,
        province: null,
        rooms_count: 1,
        occupied_rooms: 0,
        monthly_revenue: 0,
        cover_photo: null,
      }),
    ]);

    const update = await app.request(
      'http://localhost/api/admin/properties',
      {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ propertyId: 10, action: 'publish' }),
      },
      env
    );

    expect(update.status).toBe(200);
    expect(await update.json()).toEqual({
      message: 'Property moderation status updated successfully',
      data: { updated: [10], failed: [] },
    });
    expect(
      sqlite.prepare('SELECT listing_moderation_status FROM properties WHERE id = 10').get() as {
        listing_moderation_status: string;
      }
    ).toEqual({ listing_moderation_status: 'published' });
  });

  it('enriches the moderation queue with occupancy, revenue, address and cover photo', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAdminDashboardData(sqlite);
    const env = createEnv(sqlite);

    sqlite.exec(`
      UPDATE rooms SET status = 'occupied' WHERE id = 100;

      INSERT INTO addresses (id, address_line_1, city, province)
      VALUES (5, '4140 Parker Rd', 'Allentown', 'New Mexico');

      UPDATE properties SET address_id = 5 WHERE id = 10;

      INSERT INTO property_photos (property_id, photo_url, is_cover, display_order)
      VALUES
        (10, '/storage/properties/10/side.jpg', 0, 1),
        (10, '/storage/properties/10/cover.jpg', 1, 0);
    `);

    // `moderation=all` is the queue the admin console itself requests; a bare
    // request defaults to `pending_review`.
    const response = await app.request(
      'http://localhost/api/admin/properties?moderation=all',
      { headers: { 'X-User-ID': '1' } },
      env
    );
    const body = (await response.json()) as { data: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(body.data.find(row => row.id === 10)).toEqual(
      expect.objectContaining({
        created_at: '2026-05-04 08:00:00',
        address: '4140 Parker Rd',
        city: 'Allentown',
        province: 'New Mexico',
        rooms_count: 1,
        occupied_rooms: 1,
        monthly_revenue: 4500,
        // `is_cover` wins over display order, the same rule the room endpoints use.
        cover_photo: '/storage/properties/10/cover.jpg',
      })
    );

    // A property with no photos still resolves, with a null cover.
    expect(body.data.find(row => row.id === 11)?.cover_photo).toBeNull();
  });

  it('returns a read-only per-room view with capacity and occupancy', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAdminDashboardData(sqlite);
    const env = createEnv(sqlite);

    sqlite.exec("UPDATE rooms SET capacity = 4, occupied = 2, room_type = 'shared' WHERE id = 100");

    const response = await app.request(
      'http://localhost/api/admin/properties/rooms?id=10',
      { headers: { 'X-User-ID': '1' } },
      env
    );
    const body = (await response.json()) as { data: unknown[] };

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({
        id: 100,
        room_number: '',
        room_type: 'shared',
        capacity: 4,
        occupied: 2,
        free_slots: 2,
        status: 'available',
        photo_count: 0,
      }),
    ]);

    const missingId = await app.request(
      'http://localhost/api/admin/properties/rooms',
      { headers: { 'X-User-ID': '1' } },
      env
    );
    expect(missingId.status).toBe(400);

    const denied = await app.request(
      'http://localhost/api/admin/properties/rooms?id=10',
      { headers: { 'X-User-ID': '2' } },
      env
    );
    expect(denied.status).toBe(403);
  });

  it('returns and updates platform settings', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAdminDashboardData(sqlite);
    const env = createEnv(sqlite);

    const settings = await app.request(
      'http://localhost/api/admin/settings',
      { headers: { 'X-User-ID': '1' } },
      env
    );
    const settingsBody = (await settings.json()) as {
      data: Record<string, string>;
    };

    expect(settings.status).toBe(200);
    expect(settingsBody.data.platform_fee_percent).toBe('7.50');
    expect(settingsBody.data.terms_version).toBe('1.0');

    const update = await app.request(
      'http://localhost/api/admin/settings',
      {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({
          settings: {
            maintenance_message: 'Maintenance tonight',
            notify_admin_new_landlord: '1',
            unknown_key: 'ignored',
          },
        }),
      },
      env
    );

    expect(update.status).toBe(200);
    expect(await update.json()).toEqual({ message: 'Settings updated successfully' });
    expect(
      sqlite
        .prepare(
          `
            SELECT setting_key, setting_value
            FROM platform_settings
            WHERE setting_key IN ('maintenance_message', 'notify_admin_new_landlord')
            ORDER BY setting_key
          `
        )
        .all()
    ).toEqual([
      { setting_key: 'maintenance_message', setting_value: 'Maintenance tonight' },
      { setting_key: 'notify_admin_new_landlord', setting_value: '1' },
    ]);
  });

  // Regression (BUG-10 / W5-A9): the audit table was write-only — no route served it,
  // so admins could not see who performed which admin action.
  it('serves the admin audit log newest-first with actor details and parsed ids', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAdminDashboardData(sqlite);
    sqlite.exec(`
      INSERT INTO admin_audit_log (actor_id, entity, ids_json, action, created_at)
      VALUES
        (1, 'properties', '[10]', 'reject', '2026-05-10 09:00:00'),
        (1, 'users', '[2,3]', 'suspended', '2026-05-11 09:00:00');
    `);

    const response = await app.request(
      'http://localhost/api/admin/audit-log',
      { headers: adminHeaders() },
      createEnv(sqlite)
    );
    const body = (await response.json()) as {
      data: Array<{
        entity: string;
        action: string;
        ids: number[];
        actor_name: string | null;
        actor_email: string | null;
      }>;
      meta: { total: number };
    };

    expect(response.status).toBe(200);
    expect(body.meta.total).toBe(2);
    expect(body.data[0]).toMatchObject({
      entity: 'users',
      action: 'suspended',
      ids: [2, 3],
      actor_name: 'Ada Admin',
      actor_email: 'admin@example.com',
    });
    expect(body.data[1]).toMatchObject({ entity: 'properties', action: 'reject', ids: [10] });
  });

  it('returns an empty audit log instead of failing when nothing happened yet', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAdminDashboardData(sqlite);

    const response = await app.request(
      'http://localhost/api/admin/audit-log',
      { headers: adminHeaders() },
      createEnv(sqlite)
    );
    const body = (await response.json()) as { data: unknown[]; meta: { total: number } };

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it('requires admin role for admin dashboard routes', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAdminDashboardData(sqlite);

    const response = await app.request(
      'http://localhost/api/admin/summary',
      { headers: { 'X-User-ID': '2' } },
      createEnv(sqlite)
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Access denied. Admins only.' });
  });

  it('requires admin role for the audit log', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAdminDashboardData(sqlite);

    const response = await app.request(
      'http://localhost/api/admin/audit-log',
      { headers: { 'X-User-ID': '3' } },
      createEnv(sqlite)
    );

    expect(response.status).toBe(403);
  });
});
