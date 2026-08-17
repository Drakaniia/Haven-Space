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

function seedNotificationData(db: Database): void {
  db.exec(`
    INSERT INTO users (id, first_name, last_name, email, role, is_verified, email_verified, account_status, created_at)
    VALUES
      (1, 'Ada', 'Admin', 'admin@example.com', 'admin', 1, 1, 'active', '2026-05-01 08:00:00'),
      (2, 'Benny', 'Boarder', 'boarder@example.com', 'boarder', 1, 1, 'active', '2026-05-02 08:00:00'),
      (3, 'Lara', 'Landlord', 'landlord@example.com', 'landlord', 1, 1, 'active', '2026-05-03 08:00:00');

    INSERT INTO addresses (id, address_line_1, city, province, latitude, longitude)
    VALUES (5, '100 Flow Street', 'Manila', 'Metro Manila', 14.5995, 120.9842);

    INSERT INTO properties (id, landlord_id, address_id, title, price, listing_moderation_status, status, created_at)
    VALUES (10, 3, 5, 'Accepted House', 6500, 'published', 'available', '2026-05-04 08:00:00');

    INSERT INTO rooms (id, property_id, landlord_id, title, price, status, created_at)
    VALUES (100, 10, 3, 'Accepted Room', 6500, 'available', '2026-05-05 08:00:00');

    INSERT INTO applications (id, boarder_id, landlord_id, room_id, message, status, created_at)
    VALUES
      (200, 2, 3, 100, 'I want this room.', 'accepted', '2026-05-08 08:00:00'),
      (201, 2, 3, 100, 'I want this room again.', 'pending', '2026-05-09 08:00:00');

    INSERT INTO notifications (id, user_id, type, title, message, metadata, is_read, created_at)
    VALUES
      (300, 2, 'application_accepted', 'Accepted', 'Your application was accepted.', '{"application_id":200}', 0, '2026-05-10 08:00:00'),
      (301, 2, 'announcement', 'Announcement', 'Move-in reminder.', '{"property_id":10}', 1, '2026-05-11 08:00:00'),
      (302, 3, 'new_application', 'New application', 'Benny applied.', '{"application_id":201}', 0, '2026-05-12 08:00:00');
  `);
}

describe('notification routes', () => {
  it('lists notifications, parses metadata, and returns unread count', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedNotificationData(sqlite);
    const env = createEnv(sqlite);

    const response = await app.request(
      'http://localhost/api/notifications?limit=10&offset=0',
      { headers: { 'X-User-ID': '2' } },
      env
    );
    const body = (await response.json()) as {
      data: Array<{ id: number; metadata: unknown; is_read: boolean }>;
      unread_count: number;
    };

    expect(response.status).toBe(200);
    expect(body.unread_count).toBe(1);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toMatchObject({
      id: 301,
      metadata: { property_id: 10 },
      is_read: true,
    });
    expect(body.data[1]).toMatchObject({
      id: 300,
      metadata: { application_id: 200 },
      is_read: false,
    });

    const countResponse = await app.request(
      'http://localhost/api/notifications/unread-count',
      { headers: { 'X-User-ID': '2' } },
      env
    );

    expect(countResponse.status).toBe(200);
    expect(await countResponse.json()).toEqual({ data: { unread_count: 1 } });
  });

  it('marks notifications as read and soft deletes them', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedNotificationData(sqlite);
    const env = createEnv(sqlite);

    const markOne = await app.request(
      'http://localhost/api/notifications/300/read',
      { method: 'PATCH', headers: { 'X-User-ID': '2' } },
      env
    );

    expect(markOne.status).toBe(200);
    expect(await markOne.json()).toEqual({ message: 'Notification marked as read' });
    expect(
      sqlite.prepare('SELECT is_read FROM notifications WHERE id = 300').get() as {
        is_read: number;
      }
    ).toEqual({ is_read: 1 });

    const markAll = await app.request(
      'http://localhost/api/notifications/read-all',
      { method: 'PATCH', headers: { 'X-User-ID': '2' } },
      env
    );

    expect(markAll.status).toBe(200);
    expect(await markAll.json()).toEqual({ message: 'All notifications marked as read' });

    const remove = await app.request(
      'http://localhost/api/notifications/301',
      { method: 'DELETE', headers: { 'X-User-ID': '2' } },
      env
    );

    expect(remove.status).toBe(200);
    expect(await remove.json()).toEqual({ message: 'Notification deleted' });
    expect(
      sqlite
        .prepare('SELECT deleted_at IS NOT NULL AS deleted FROM notifications WHERE id = 301')
        .get() as {
        deleted: number;
      }
    ).toEqual({ deleted: 1 });
  });

  it('returns accepted applications and compatibility status shapes for boarders', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedNotificationData(sqlite);
    const env = createEnv(sqlite);

    const accepted = await app.request(
      'http://localhost/api/boarder/accepted-applications',
      { headers: { 'X-User-ID': '2' } },
      env
    );
    const acceptedBody = (await accepted.json()) as {
      data: Array<{ application_id: number; property_name: string; address: string }>;
    };

    expect(accepted.status).toBe(200);
    expect(acceptedBody.data).toEqual([
      expect.objectContaining({
        application_id: 200,
        property_name: 'Accepted House',
        address: '100 Flow Street',
      }),
    ]);

    const hasAccepted = await app.request(
      'http://localhost/api/boarder/has-accepted-applications',
      { headers: { 'X-User-ID': '2' } },
      env
    );

    expect(hasAccepted.status).toBe(200);
    expect(await hasAccepted.json()).toEqual({
      has_accepted: true,
      property_ids: [10],
      data: {
        has_accepted: true,
        property_ids: [10],
      },
    });
  });

  it('rejects non-boarders from accepted-application helpers', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedNotificationData(sqlite);

    const response = await app.request(
      'http://localhost/api/boarder/accepted-applications',
      { headers: { 'X-User-ID': '3' } },
      createEnv(sqlite)
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Access denied. Boarders only.',
    });
  });

  it('shows property-access notifications to landlords', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedNotificationData(sqlite);
    sqlite.exec(`
      INSERT INTO notifications (id, user_id, type, title, message, metadata, is_read, created_at)
      VALUES
        (401, 3, 'property_invitation', 'Property access invitation', 'Ada Admin invited you to manage \"Pine House\".', '{"invitation_id":55,"property_id":10}', 0, '2026-05-13 08:00:00'),
        (402, 3, 'property_access_removed', 'Access removed', 'Your access to \"Pine House\" has been removed.', '{"property_id":10}', 1, '2026-05-14 08:00:00');
    `);
    const env = createEnv(sqlite);

    const response = await app.request(
      'http://localhost/api/notifications?limit=20&offset=0',
      { headers: { 'X-User-ID': '3' } },
      env
    );
    const body = (await response.json()) as {
      data: Array<{ id: number; type: string; metadata: unknown }>;
      unread_count: number;
    };

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(3);
    expect(body.data[0]).toMatchObject({
      id: 402,
      type: 'property_access_removed',
      metadata: { property_id: 10 },
    });
    expect(body.data[1]).toMatchObject({
      id: 401,
      type: 'property_invitation',
      metadata: { invitation_id: 55, property_id: 10 },
    });
    expect(body.unread_count).toBe(2);
  });
});
