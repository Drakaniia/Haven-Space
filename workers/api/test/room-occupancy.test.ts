import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import app from '../src/index';
import type { Env } from '../src/env';
import { freeRoom, occupyRoom } from '../src/repositories/applications';

/**
 * Per-room occupancy (spec `create-listing-room-details` R9) is SQL-level
 * behaviour — a delta count plus a status that only flips when the room is
 * actually full — so it is verified against a real SQLite database rather than
 * the sequence fake.
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

function createSqliteEnv(db: Database): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    JWT_SECRET: 'test-secret',
    DB: createSqliteD1(db),
  };
}

function seedPropertyWithRoom(db: Database, capacity: number): void {
  db.exec(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified)
     VALUES ('Ana', 'Reyes', 'ana.occupancy@example.com', 'x', 'landlord', 1, 1)`
  );
  db.exec(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified)
     VALUES ('Bea', 'Boarder', 'bea.occupancy@example.com', 'x', 'boarder', 1, 1)`
  );
  db.exec(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified)
     VALUES ('Cara', 'Boarder', 'cara.occupancy@example.com', 'x', 'boarder', 1, 1)`
  );
  db.exec(
    `INSERT INTO addresses (address_line_1, city, province) VALUES ('1 Mabini St', 'Manila', 'Metro Manila')`
  );
  db.exec(
    `INSERT INTO properties (landlord_id, address_id, title, description, status, listing_moderation_status)
     VALUES (1, 1, 'Pine House', 'Near campus', 'available', 'published')`
  );
  db.exec(
    `INSERT INTO rooms (property_id, landlord_id, room_number, room_type, title, price, capacity, occupied, status)
     VALUES (1, 1, 'Room 1', 'shared', 'Shared Room - Room 1', 3000, ${capacity}, 0, 'available')`
  );
}

function roomRow(db: Database): { occupied: number; status: string } {
  return db.prepare('SELECT occupied, status FROM rooms WHERE id = 1').get() as {
    occupied: number;
    status: string;
  };
}

describe('per-room occupancy', () => {
  it('fills slots one booking at a time and only marks the room occupied when full', async () => {
    const db = new Database(':memory:');
    runMigrations(db);
    seedPropertyWithRoom(db, 2);
    const d1 = createSqliteD1(db);

    await occupyRoom(d1, 1);
    expect(roomRow(db)).toEqual({ occupied: 1, status: 'available' });

    await occupyRoom(d1, 1);
    expect(roomRow(db)).toEqual({ occupied: 2, status: 'occupied' });

    await freeRoom(d1, 1);
    expect(roomRow(db)).toEqual({ occupied: 1, status: 'available' });

    await freeRoom(d1, 1);
    expect(roomRow(db)).toEqual({ occupied: 0, status: 'available' });

    // Never goes negative, even if a leave arrives twice.
    await freeRoom(d1, 1);
    expect(roomRow(db)).toEqual({ occupied: 0, status: 'available' });
  });

  it('keeps a maintenance room in maintenance when a booking is confirmed', async () => {
    const db = new Database(':memory:');
    runMigrations(db);
    seedPropertyWithRoom(db, 1);
    db.exec("UPDATE rooms SET status = 'maintenance' WHERE id = 1");
    const d1 = createSqliteD1(db);

    await occupyRoom(d1, 1);

    expect(roomRow(db)).toEqual({ occupied: 1, status: 'maintenance' });
  });

  it('accepts applications while slots remain and rejects once the room is full', async () => {
    const db = new Database(':memory:');
    runMigrations(db);
    seedPropertyWithRoom(db, 2);
    const env = createSqliteEnv(db);
    const url = 'http://localhost/api/boarder/applications';

    const apply = (userId: number) =>
      app.request(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-ID': String(userId) },
          body: JSON.stringify({ room_id: 1, landlord_id: 1, message: 'Please consider me.' }),
        },
        env
      );

    // Two slots: both boarders can apply to the same shared room.
    expect((await apply(2)).status).toBe(201);
    expect((await apply(3)).status).toBe(201);

    // One more occupant than capacity: the room is full.
    db.exec('UPDATE rooms SET occupied = 2 WHERE id = 1');
    const fullResponse = await apply(2);
    expect(fullResponse.status).toBe(400);
    expect(await fullResponse.json()).toEqual({
      error: 'This room is already full and can no longer be applied to',
    });

    // Maintenance takes the room out of the funnel entirely.
    db.exec("UPDATE rooms SET status = 'maintenance', occupied = 0 WHERE id = 1");
    const maintenanceResponse = await apply(2);
    expect(maintenanceResponse.status).toBe(400);
    expect(await maintenanceResponse.json()).toEqual({
      error: 'This room is under maintenance and can no longer be applied to',
    });
  });
});
