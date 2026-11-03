import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import app from '../src/index';
import type { Env } from '../src/env';
import type { SavedListingRow } from '../src/repositories/saved-listings';

interface D1Response {
  first?: unknown;
  all?: unknown[];
  run?: unknown;
}

function createSequenceDb(responses: D1Response[], capturedBinds: unknown[][] = []): D1Database {
  const responseQueue = [...responses];

  return {
    prepare: () =>
      ({
        bind: (...values: unknown[]) => {
          capturedBinds.push(values);
          const response = responseQueue.shift() ?? {};

          return {
            first: async () => response.first ?? null,
            all: async () => ({ results: response.all ?? [] }),
            run: async () =>
              response.run ?? {
                success: true,
                meta: { last_row_id: 0, changes: 0 },
                results: [],
              },
          };
        },
      } as unknown as D1PreparedStatement),
  } as unknown as D1Database;
}

function createSequenceEnv(responses: D1Response[], capturedBinds: unknown[][] = []): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    JWT_SECRET: 'test-secret',
    DB: createSequenceDb(responses, capturedBinds),
  };
}

const boarderUser = {
  id: 7,
  role: 'boarder',
  is_verified: 1,
  email_verified: 1,
  account_status: 'active',
};

describe('boarder saved-listing routes', () => {
  it('returns saved listings with the PHP response shape', async () => {
    const savedListing: SavedListingRow = {
      saved_listing_id: 15,
      saved_at: '2026-05-01 10:00:00',
      property_id: 10,
      property_title: 'Pine House',
      property_description: 'Near campus',
      address: '123 Mabini St',
      latitude: 14.5995,
      longitude: 120.9842,
      property_price: 4500,
      property_status: 'available',
      cover_image: '/uploads/cover.jpg',
      room_id: 100,
      room_title: 'Single Room',
      room_price: 5000,
      room_status: 'available',
      landlord_name: 'Ana Reyes',
      landlord_email: 'ana@example.com',
    };

    const response = await app.request(
      'http://localhost/api/boarder/saved-listings',
      { headers: { 'X-User-ID': '7' } },
      createSequenceEnv([{ first: boarderUser }, { all: [savedListing] }])
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: [
        {
          id: 15,
          saved_at: '2026-05-01 10:00:00',
          property: {
            id: 10,
            title: 'Pine House',
            description: 'Near campus',
            address: '123 Mabini St',
            latitude: 14.5995,
            longitude: 120.9842,
            price: 4500,
            status: 'available',
            cover_image: '/uploads/cover.jpg',
            landlord: {
              name: 'Ana Reyes',
              email: 'ana@example.com',
            },
          },
          room: {
            id: 100,
            title: 'Single Room',
            price: 5000,
            status: 'available',
          },
        },
      ],
      count: 1,
    });
  });

  it('checks whether a property is saved by the current boarder', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/boarder/saved-listings?property_id=10',
      { headers: { 'X-User-ID': '7' } },
      createSequenceEnv(
        [{ first: boarderUser }, { first: { id: 15, saved_at: '2026-05-01 10:00:00' } }],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      is_saved: true,
      saved_at: '2026-05-01 10:00:00',
    });
    expect(capturedBinds).toEqual([[7], [7, 10]]);
  });

  it('returns PHP-compatible auth errors for saved listings', async () => {
    const missingTokenResponse = await app.request(
      'http://localhost/api/boarder/saved-listings',
      {},
      createSequenceEnv([])
    );
    const landlordResponse = await app.request(
      'http://localhost/api/boarder/saved-listings',
      { headers: { 'X-User-ID': '9' } },
      createSequenceEnv([
        {
          first: {
            id: 9,
            role: 'landlord',
            is_verified: 1,
            email_verified: 1,
            account_status: 'active',
          },
        },
      ])
    );

    expect(missingTokenResponse.status).toBe(401);
    expect(await missingTokenResponse.json()).toEqual({ error: 'No token provided' });

    expect(landlordResponse.status).toBe(403);
    expect(await landlordResponse.json()).toEqual({ error: 'Access denied. Boarders only.' });
  });

  it('saves a property with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/boarder/saved-listings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ property_id: 10, room_id: 100 }),
      },
      createSequenceEnv(
        [
          { first: boarderUser },
          {
            first: {
              id: 10,
              title: 'Pine House',
              status: 'available',
              listing_moderation_status: 'published',
            },
          },
          { first: { id: 100, title: 'Single Room', status: 'available' } },
          { first: null },
          { run: { success: true, meta: { last_row_id: 0, changes: 0 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 22, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Property saved successfully');
    expect(body.data.id).toBe(22);
    expect(body.data.property_id).toBe(10);
    expect(body.data.room_id).toBe(100);
    expect(typeof body.data.saved_at).toBe('string');
    expect(capturedBinds.slice(0, 4)).toEqual([[7], [10], [100, 10], [7, 10]]);
    expect(capturedBinds[4].slice(2)).toEqual([7, 10]);
    expect(capturedBinds[5].slice(0, 3)).toEqual([7, 10, 100]);
  });

  it('returns PHP-compatible save validation errors', async () => {
    const missingPropertyResponse = await app.request(
      'http://localhost/api/boarder/saved-listings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({}),
      },
      createSequenceEnv([{ first: boarderUser }])
    );
    const notFoundResponse = await app.request(
      'http://localhost/api/boarder/saved-listings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ property_id: 404 }),
      },
      createSequenceEnv([{ first: boarderUser }, { first: null }])
    );
    const duplicateResponse = await app.request(
      'http://localhost/api/boarder/saved-listings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ property_id: 10 }),
      },
      createSequenceEnv([
        { first: boarderUser },
        {
          first: {
            id: 10,
            title: 'Pine House',
            status: 'available',
            listing_moderation_status: 'published',
          },
        },
        { first: { id: 15, saved_at: '2026-05-01 10:00:00' } },
      ])
    );

    expect(missingPropertyResponse.status).toBe(400);
    expect(await missingPropertyResponse.json()).toEqual({ error: 'Property ID is required' });

    expect(notFoundResponse.status).toBe(404);
    expect(await notFoundResponse.json()).toEqual({ error: 'Property not found' });

    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toEqual({ error: 'Property already saved' });
  });

  it('rejects unavailable properties and missing rooms when saving', async () => {
    const unavailablePropertyResponse = await app.request(
      'http://localhost/api/boarder/saved-listings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ property_id: 10 }),
      },
      createSequenceEnv([
        { first: boarderUser },
        {
          first: {
            id: 10,
            title: 'Pine House',
            status: 'hidden',
            listing_moderation_status: 'published',
          },
        },
      ])
    );
    const missingRoomResponse = await app.request(
      'http://localhost/api/boarder/saved-listings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ property_id: 10, room_id: 999 }),
      },
      createSequenceEnv([
        { first: boarderUser },
        {
          first: {
            id: 10,
            title: 'Pine House',
            status: 'available',
            listing_moderation_status: 'published',
          },
        },
        { first: null },
      ])
    );

    expect(unavailablePropertyResponse.status).toBe(400);
    expect(await unavailablePropertyResponse.json()).toEqual({
      error: 'Property is not available for saving',
    });

    expect(missingRoomResponse.status).toBe(404);
    expect(await missingRoomResponse.json()).toEqual({ error: 'Room not found' });
  });

  it('removes a saved property with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/boarder/saved-listings',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ property_id: 10 }),
      },
      createSequenceEnv(
        [
          { first: boarderUser },
          { first: { id: 15, saved_at: '2026-05-01 10:00:00' } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Property removed from saved listings',
    });
    expect(capturedBinds.slice(0, 2)).toEqual([[7], [7, 10]]);
    expect(capturedBinds[2].slice(1)).toEqual([7, 10]);
  });

  it('returns PHP-compatible remove validation errors', async () => {
    const missingPropertyResponse = await app.request(
      'http://localhost/api/boarder/saved-listings',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({}),
      },
      createSequenceEnv([{ first: boarderUser }])
    );
    const notFoundResponse = await app.request(
      'http://localhost/api/boarder/saved-listings',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ property_id: 404 }),
      },
      createSequenceEnv([{ first: boarderUser }, { first: null }])
    );

    expect(missingPropertyResponse.status).toBe(400);
    expect(await missingPropertyResponse.json()).toEqual({ error: 'Property ID is required' });

    expect(notFoundResponse.status).toBe(404);
    expect(await notFoundResponse.json()).toEqual({ error: 'Saved listing not found' });
  });
});

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

function createSqliteEnv(db: Database): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    JWT_SECRET: 'test-secret',
    DB: createSqliteD1(db),
  };
}

describe('boarder saved-listing soft-delete lifecycle', () => {
  it('revives a soft-deleted saved listing instead of violating the unique index', async () => {
    const db = new Database(':memory:');
    runMigrations(db);
    db.exec(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified)
       VALUES ('Bea', 'Boarder', 'bea.saved@example.com', 'x', 'boarder', 1, 1)`
    );
    db.exec(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified)
       VALUES ('Ana', 'Reyes', 'ana.saved@example.com', 'x', 'landlord', 1, 1)`
    );
    db.exec(
      `INSERT INTO addresses (address_line_1, city, province) VALUES ('1 Mabini St', 'Manila', 'Metro Manila')`
    );
    db.exec(
      `INSERT INTO properties (landlord_id, address_id, title, description, status, listing_moderation_status)
       VALUES (2, 1, 'Pine House', 'Near campus', 'available', 'published')`
    );
    const env = createSqliteEnv(db);
    const headers = { 'Content-Type': 'application/json', 'X-User-ID': '1' };
    const url = 'http://localhost/api/boarder/saved-listings';

    expect(
      (
        await app.request(
          url,
          { method: 'POST', headers, body: JSON.stringify({ property_id: 1 }) },
          env
        )
      ).status
    ).toBe(201);
    expect(
      (
        await app.request(
          url,
          { method: 'DELETE', headers, body: JSON.stringify({ property_id: 1 }) },
          env
        )
      ).status
    ).toBe(200);

    // Regression: re-saving after an unsave used to violate UNIQUE(boarder_id, property_id) → 500.
    const resave = await app.request(
      url,
      { method: 'POST', headers, body: JSON.stringify({ property_id: 1 }) },
      env
    );
    expect(resave.status).toBe(201);

    const list = await app.request(url, { headers }, env);
    expect((await list.json()).count).toBe(1);
    expect((db.prepare('SELECT COUNT(*) AS n FROM saved_listings').get() as { n: number }).n).toBe(
      1
    );
    expect(
      (db.prepare('SELECT deleted_at FROM saved_listings').get() as { deleted_at: string | null })
        .deleted_at
    ).toBeNull();
  });
});
