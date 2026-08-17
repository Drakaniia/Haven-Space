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

function seedAnnouncementData(db: Database): void {
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
      created_at
    )
    VALUES
      (2, 'Benny', 'Boarder', 'boarder@example.com', 'hash', 'boarder', 1, 1, 'active', 'accepted', '2026-05-02 08:00:00'),
      (3, 'Lara', 'Landlord', 'landlord@example.com', 'hash', 'landlord', 1, 1, 'active', NULL, '2026-05-03 08:00:00');

    INSERT INTO addresses (id, address_line_1, city, province)
    VALUES
      (5, '100 Flow Street', 'Manila', 'Metro Manila'),
      (6, '200 Side Street', 'Quezon City', 'Metro Manila');

    INSERT INTO properties (id, landlord_id, address_id, title, price, listing_moderation_status, status)
    VALUES
      (10, 3, 5, 'Accepted House', 6500, 'published', 'available'),
      (11, 3, 6, 'Other House', 7000, 'published', 'available');

    INSERT INTO rooms (id, property_id, landlord_id, title, price, status)
    VALUES
      (100, 10, 3, 'Accepted Room', 6500, 'occupied'),
      (101, 11, 3, 'Other Room', 7000, 'available');

    INSERT INTO applications (id, boarder_id, landlord_id, room_id, message, status, created_at)
    VALUES (200, 2, 3, 100, 'I want this room.', 'accepted', '2026-05-01 08:00:00');
  `);
}

describe('announcement routes', () => {
  it('creates and lists landlord announcements with property targets and notifications', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAnnouncementData(sqlite);
    const env = createEnv(sqlite);

    const create = await app.request(
      'http://localhost/api/landlord/announcements',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          title: 'Water interruption',
          description: 'Water will be unavailable tomorrow morning.',
          category: 'maintenance',
          priority: 'high',
          publish_date: '2026-05-01',
          properties: ['10'],
        }),
      },
      env
    );
    const createBody = (await create.json()) as {
      data: { announcement_id: number; message: string };
    };

    expect(create.status).toBe(201);
    expect(createBody.data.message).toBe('Announcement created successfully');
    expect(
      sqlite.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = 2').get()
    ).toEqual({ count: 1 });

    const list = await app.request(
      'http://localhost/api/landlord/announcements',
      { headers: { 'X-User-ID': '3' } },
      env
    );
    const listBody = (await list.json()) as {
      data: {
        announcements: Array<{
          id: number;
          target_property: string;
          target_properties: Array<{ id: number; title: string }>;
        }>;
      };
    };

    expect(list.status).toBe(200);
    expect(listBody.data.announcements).toHaveLength(1);
    expect(listBody.data.announcements[0].target_property).toBe('Accepted House');
    expect(listBody.data.announcements[0].target_properties).toEqual([
      { id: 10, title: 'Accepted House' },
    ]);
  });

  it('lists boarder announcements and marks them viewed with the PHP response shape', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAnnouncementData(sqlite);
    const env = createEnv(sqlite);

    sqlite.exec(`
      INSERT INTO announcements (id, landlord_id, title, description, category, priority, publish_date, view_count)
      VALUES
        (400, 3, 'All tenants', 'General update', 'general', 'medium', '2026-05-01', 0),
        (401, 3, 'Wrong house', 'Not for this boarder', 'event', 'low', '2026-05-01', 0);

      INSERT INTO announcement_properties (announcement_id, property_id)
      VALUES (401, 11);
    `);

    const list = await app.request(
      'http://localhost/api/boarder/announcements',
      { headers: { 'X-User-ID': '2' } },
      env
    );
    const listBody = (await list.json()) as {
      data: { announcements: Array<{ id: number; landlord_name: string; is_viewed: boolean }> };
    };

    expect(list.status).toBe(200);
    expect(listBody.data.announcements).toEqual([
      expect.objectContaining({
        id: 400,
        landlord_name: 'Lara Landlord',
        is_viewed: false,
      }),
    ]);

    const viewed = await app.request(
      'http://localhost/api/boarder/announcements/400/view',
      {
        method: 'POST',
        headers: { 'X-User-ID': '2' },
      },
      env
    );

    expect(viewed.status).toBe(200);
    expect(await viewed.json()).toEqual({
      success: true,
      data: {
        message: 'Announcement marked as viewed',
      },
    });
    expect(sqlite.prepare('SELECT view_count FROM announcements WHERE id = 400').get()).toEqual({
      view_count: 1,
    });
  });

  it('updates and deletes landlord-owned announcements', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAnnouncementData(sqlite);
    sqlite.exec(`
      INSERT INTO announcements (id, landlord_id, title, description, category, priority, publish_date)
      VALUES (400, 3, 'Old title', 'Old description', 'general', 'medium', '2026-05-01');
    `);
    const env = createEnv(sqlite);

    const update = await app.request(
      'http://localhost/api/landlord/announcements/400',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          title: 'Updated title',
          description: 'Updated description',
          category: 'urgent',
          priority: 'high',
          publish_date: '2026-05-02',
          properties: ['all'],
        }),
      },
      env
    );

    expect(update.status).toBe(200);
    expect(await update.json()).toEqual({
      success: true,
      data: {
        message: 'Announcement updated successfully',
      },
    });
    expect(
      sqlite.prepare('SELECT title, category, priority FROM announcements WHERE id = 400').get()
    ).toEqual({
      title: 'Updated title',
      category: 'urgent',
      priority: 'high',
    });

    const remove = await app.request(
      'http://localhost/api/landlord/announcements/400',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '3' },
      },
      env
    );

    expect(remove.status).toBe(200);
    expect(await remove.json()).toEqual({
      success: true,
      data: {
        message: 'Announcement deleted successfully',
      },
    });
    expect(
      sqlite
        .prepare('SELECT deleted_at IS NOT NULL AS deleted FROM announcements WHERE id = 400')
        .get()
    ).toEqual({ deleted: 1 });
  });

  it('returns PHP-compatible announcement validation and ownership errors', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedAnnouncementData(sqlite);
    const env = createEnv(sqlite);

    const missing = await app.request(
      'http://localhost/api/landlord/announcements',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ title: 'Missing description' }),
      },
      env
    );

    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({
      error: 'Missing required fields: title, description',
    });

    const updateMissing = await app.request(
      'http://localhost/api/landlord/announcements/999',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ title: 'Nope', description: 'Nope' }),
      },
      env
    );

    expect(updateMissing.status).toBe(404);
    expect(await updateMissing.json()).toEqual({ error: 'Announcement not found' });
  });
});
