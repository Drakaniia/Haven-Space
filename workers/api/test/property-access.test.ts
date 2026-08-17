import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Env } from '../src/env';
import app from '../src/index';
import {
  acceptPropertyInvitation,
  countLandlordCreatedData,
  createPropertyInvitation,
  createPropertyInvitationNotification,
  createPropertyAccessRemovedNotification,
  findActiveAccess,
  findInviteeLandlord,
  findPendingInvitation,
  findPropertyForAccess,
  grantPropertyAccess,
  listAccessiblePropertyIds,
  listAuthorizedLandlords,
  listInvitationsForInvitee,
  listPendingInvitationsForProperty,
  listPropertyAccessHistory,
  listPropertyAccessOverview,
  rejectPropertyInvitation,
  removePropertyAccess,
  revokeAllForLandlord,
  revokeAllForProperty,
  revokePropertyInvitation,
} from '../src/repositories/property-access';

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
    batch: async (statements: D1PreparedStatement[]) => {
      const results: D1Result[] = [];

      for (const statement of statements) {
        const result = await (
          statement as unknown as {
            run: () => Promise<D1Result>;
          }
        ).run();
        results.push(result);
      }

      return results;
    },
  } as unknown as D1Database;
}

function seedData(db: Database): void {
  db.exec(`
    INSERT INTO users (id, first_name, last_name, email, role, is_verified, email_verified, account_status, created_at)
    VALUES
      (1, 'Ada', 'Admin', 'admin@example.com', 'admin', 1, 1, 'active', '2026-05-01 08:00:00'),
      (2, 'Bea', 'Boarder', 'boarder@example.com', 'boarder', 1, 1, 'active', '2026-05-01 09:00:00'),
      (3, 'Lara', 'Landlord One', 'lara@example.com', 'landlord', 1, 1, 'active', '2026-05-02 08:00:00'),
      (4, 'Omar', 'Landlord Two', 'omar@example.com', 'landlord', 1, 1, 'active', '2026-05-03 08:00:00'),
      (5, 'Una', 'Unverified', 'una@example.com', 'landlord', 0, 0, 'pending_verification', '2026-05-04 08:00:00');

    INSERT INTO addresses (id, address_line_1, city, province, latitude, longitude)
    VALUES (5, '100 Flow Street', 'Manila', 'Metro Manila', 14.5995, 120.9842);

    INSERT INTO properties (id, landlord_id, address_id, title, price, listing_moderation_status, status, created_at)
    VALUES (10, 3, 5, 'Haven Space Boarding House', 6500, 'published', 'available', '2026-05-05 08:00:00');

    INSERT INTO rooms (id, property_id, landlord_id, title, price, status, created_at)
    VALUES
      (100, 10, 3, 'Room 101', 6500, 'available', '2026-05-06 08:00:00'),
      (101, 10, 4, 'Room 102', 6500, 'occupied', '2026-05-07 08:00:00');

    INSERT INTO applications (id, boarder_id, landlord_id, room_id, message, status, created_at)
    VALUES
      (200, 2, 4, 101, 'I want this room.', 'accepted', '2026-05-08 08:00:00'),
      (201, 2, 3, 100, 'Pending app.', 'pending', '2026-05-09 08:00:00');

    INSERT INTO payments (id, boarder_id, landlord_id, room_id, property_id, amount, due_date, status, created_at)
    VALUES
      (300, 2, 4, 101, 10, 6500, '2026-06-01', 'pending', '2026-05-10 08:00:00'),
      (301, 2, 3, 100, 10, 6500, '2026-06-01', 'paid', '2026-05-11 08:00:00');

    INSERT INTO announcements (id, landlord_id, title, description, publish_date, created_at)
    VALUES
      (400, 4, 'Notice', 'Landlord 2 notice', '2026-05-12', '2026-05-12 08:00:00'),
      (401, 3, 'Owner notice', 'Landlord 1 notice', '2026-05-13', '2026-05-13 08:00:00');

    INSERT INTO announcement_properties (announcement_id, property_id)
    VALUES
      (400, 10),
      (401, 10);
  `);
}

function dbWithSeed(): Database {
  const sqlite = new Database(':memory:');
  runMigrations(sqlite);
  seedData(sqlite);
  return sqlite;
}

function createEnv(db: Database): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost:4173',
    JWT_SECRET: 'test-secret',
    DB: createSqliteD1(db),
  };
}

async function adminRequest(
  sqlite: Database,
  path: string,
  options: { method?: string; body?: unknown } = {}
) {
  const headers: Record<string, string> = { 'X-User-ID': '1' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  return await app.request(
    `http://localhost${path}`,
    {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    },
    createEnv(sqlite)
  );
}

async function landlordRequest(
  sqlite: Database,
  path: string,
  options: { method?: string; body?: unknown } = {}
) {
  const headers: Record<string, string> = { 'X-User-ID': '4' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  return await app.request(
    `http://localhost${path}`,
    {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    },
    createEnv(sqlite)
  );
}

describe('property invitations', () => {
  it('creates a pending invitation and finds it', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);

    const invitationId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 4,
      invitedBy: 1,
    });

    expect(invitationId).toBeGreaterThan(0);

    const pending = await findPendingInvitation(db, 10, 4);

    expect(pending).toMatchObject({
      id: invitationId,
      property_id: 10,
      invitee_id: 4,
      invited_by: 1,
      status: 'pending',
    });

    const invitee = await findInviteeLandlord(db, 4);

    expect(invitee).toMatchObject({ id: 4, role: 'landlord', is_verified: 1 });

    const unverified = await findInviteeLandlord(db, 5);

    expect(unverified?.is_verified).toBe(0);

    const property = await findPropertyForAccess(db, 10);

    expect(property).toMatchObject({ id: 10, landlord_id: 3 });

    const pendingList = await listPendingInvitationsForProperty(db, 10);

    expect(pendingList).toHaveLength(1);
    expect(pendingList[0]).toMatchObject({
      id: invitationId,
      invitee_id: 4,
      invitee_email: 'omar@example.com',
    });
  });

  it('lists invitations for an invitee with property and owner info', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);

    await createPropertyInvitation(db, { propertyId: 10, inviteeId: 4, invitedBy: 1 });

    const invitations = await listInvitationsForInvitee(db, 4);

    expect(invitations).toHaveLength(1);
    expect(invitations[0]).toMatchObject({
      property_id: 10,
      property_name: 'Haven Space Boarding House',
      owner_first_name: 'Lara',
      owner_last_name: 'Landlord One',
      status: 'pending',
    });
  });

  it('accepts an invitation and grants access', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);

    const invitationId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 4,
      invitedBy: 1,
    });

    const accessId = await acceptPropertyInvitation(db, {
      invitationId,
      grantedBy: 1,
    });

    expect(accessId).toBeGreaterThan(0);

    const access = await findActiveAccess(db, 10, 4);

    expect(access).toMatchObject({
      id: accessId,
      property_id: 10,
      landlord_id: 4,
      invitation_id: invitationId,
      removed_at: null,
    });

    const pending = await findPendingInvitation(db, 10, 4);

    expect(pending).toBeNull();

    expect(await listAccessiblePropertyIds(db, 4)).toEqual([10]);
    expect(await listAuthorizedLandlords(db, 10)).toMatchObject([
      { landlord_id: 4, email: 'omar@example.com' },
    ]);
  });

  it('rejects and revokes pending invitations', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);

    const rejectedId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 4,
      invitedBy: 1,
    });
    const rejectedChanges = await rejectPropertyInvitation(db, rejectedId);

    expect(rejectedChanges).toBe(1);
    expect(
      (
        sqlite
          .prepare('SELECT status, rejected_at FROM property_invitations WHERE id = ?')
          .get(rejectedId) as { status: string; rejected_at: string | null }
      ).status
    ).toBe('rejected');
    expect(await findActiveAccess(db, 10, 4)).toBeNull();

    const revokedId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 4,
      invitedBy: 1,
    });
    const revokedChanges = await revokePropertyInvitation(db, revokedId, 1);

    expect(revokedChanges).toBe(1);
    expect(
      (
        sqlite
          .prepare('SELECT status, revoked_by FROM property_invitations WHERE id = ?')
          .get(revokedId) as { status: string; revoked_by: number | null }
      ).status
    ).toBe('revoked');
    expect(
      (
        sqlite
          .prepare('SELECT revoked_by FROM property_invitations WHERE id = ?')
          .get(revokedId) as { revoked_by: number | null }
      ).revoked_by
    ).toBe(1);

    const doubleRevoke = await revokePropertyInvitation(db, revokedId, 1);

    expect(doubleRevoke).toBe(0);
  });

  it('removes active access but keeps the data with the property', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);

    const accessId = await grantPropertyAccess(db, {
      propertyId: 10,
      landlordId: 4,
      grantedBy: 1,
      invitationId: null,
    });

    expect(accessId).toBeGreaterThan(0);

    const changes = await removePropertyAccess(db, 10, 4, 1);

    expect(changes).toBe(1);
    expect(await findActiveAccess(db, 10, 4)).toBeNull();

    const counts = await countLandlordCreatedData(db, 10, 4);

    expect(counts).toEqual({ rooms: 1, tenants: 1, payments: 1, announcements: 1 });

    const again = await removePropertyAccess(db, 10, 4, 1);

    expect(again).toBe(0);
  });

  it('counts landlord-created data per property', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);

    const counts = await countLandlordCreatedData(db, 10, 4);

    expect(counts).toEqual({ rooms: 1, tenants: 1, payments: 1, announcements: 1 });

    const ownerCounts = await countLandlordCreatedData(db, 10, 3);

    expect(ownerCounts).toEqual({ rooms: 1, tenants: 0, payments: 1, announcements: 1 });
  });

  it('auto-revokes everything for a landlord and for a property', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);

    await createPropertyInvitation(db, { propertyId: 10, inviteeId: 4, invitedBy: 1 });
    await grantPropertyAccess(db, {
      propertyId: 10,
      landlordId: 4,
      grantedBy: 1,
      invitationId: null,
    });

    await revokeAllForLandlord(db, 4, 1);

    expect(
      (
        sqlite
          .prepare(
            "SELECT COUNT(*) AS count FROM property_invitations WHERE status = 'pending' AND invitee_id = 4"
          )
          .get() as { count: number }
      ).count
    ).toBe(0);
    expect(await findActiveAccess(db, 10, 4)).toBeNull();

    await createPropertyInvitation(db, { propertyId: 10, inviteeId: 4, invitedBy: 1 });
    await grantPropertyAccess(db, {
      propertyId: 10,
      landlordId: 4,
      grantedBy: 1,
      invitationId: null,
    });

    await revokeAllForProperty(db, 10, 1);

    expect(
      (
        sqlite
          .prepare(
            "SELECT COUNT(*) AS count FROM property_invitations WHERE status = 'pending' AND property_id = 10"
          )
          .get() as { count: number }
      ).count
    ).toBe(0);
    expect(await findActiveAccess(db, 10, 4)).toBeNull();
  });

  it('lists the audit history in chronological order', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);

    const invitationId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 4,
      invitedBy: 1,
    });
    await acceptPropertyInvitation(db, { invitationId, grantedBy: 1 });
    await removePropertyAccess(db, 10, 4, 1);

    const history = await listPropertyAccessHistory(db, { propertyId: 10 });

    const types = history.map(event => event.type);

    expect(types).toEqual([
      'invitation_sent',
      'invitation_accepted',
      'access_granted',
      'access_removed',
    ]);
    expect(history[0]).toMatchObject({
      type: 'invitation_sent',
      invitation_id: invitationId,
      property_id: 10,
      landlord_id: 4,
      actor_id: 1,
    });
    expect(history[history.length - 1]).toMatchObject({
      type: 'access_removed',
      landlord_id: 4,
      actor_id: 1,
    });
  });

  it('lists properties for the admin access overview', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);

    const overview = await listPropertyAccessOverview(db);

    expect(overview).toHaveLength(1);
    expect(overview[0]).toMatchObject({
      property_id: 10,
      property_title: 'Haven Space Boarding House',
      owner_id: 3,
      owner_first_name: 'Lara',
    });
  });

  it('creates invitation and removal notifications', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);

    await createPropertyInvitationNotification(db, {
      inviteeId: 4,
      invitationId: 77,
      propertyId: 10,
      propertyName: 'Haven Space Boarding House',
      invitedByName: 'Ada Admin',
    });
    await createPropertyAccessRemovedNotification(db, {
      landlordId: 4,
      propertyId: 10,
      propertyName: 'Haven Space Boarding House',
    });

    const rows = sqlite
      .prepare(
        'SELECT user_id, type, title, metadata FROM notifications WHERE user_id = 4 ORDER BY id ASC'
      )
      .all() as Array<{ user_id: number; type: string; title: string; metadata: string }>;

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      type: 'property_invitation',
      title: 'Property access invitation',
    });
    expect(JSON.parse(rows[0].metadata)).toMatchObject({
      invitation_id: 77,
      property_id: 10,
    });
    expect(rows[1]).toMatchObject({
      type: 'property_access_removed',
      title: 'Access removed',
    });
  });
});

describe('admin property-access routes', () => {
  it('sends an invitation and notifies the invitee', async () => {
    const sqlite = dbWithSeed();

    const response = await adminRequest(sqlite, '/api/admin/property-access/invitations', {
      method: 'POST',
      body: { landlordId: 4, propertyId: 10 },
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      message: string;
      data: { invitation: { id: number; status: string; property_name: string } };
    };

    expect(body.message).toBe('Invitation sent');
    expect(body.data.invitation).toMatchObject({
      property_name: 'Haven Space Boarding House',
      status: 'pending',
    });

    const notifications = sqlite
      .prepare("SELECT type, user_id FROM notifications WHERE type = 'property_invitation'")
      .all() as Array<{ type: string; user_id: number }>;

    expect(notifications).toHaveLength(1);
    expect(notifications[0].user_id).toBe(4);
  });

  it('rejects invalid invitations', async () => {
    const sqlite = dbWithSeed();

    const ownerInvite = await adminRequest(sqlite, '/api/admin/property-access/invitations', {
      method: 'POST',
      body: { landlordId: 3, propertyId: 10 },
    });

    expect(ownerInvite.status).toBe(400);
    expect(await ownerInvite.json()).toMatchObject({
      error: 'This landlord already owns this property.',
    });

    const unverifiedInvite = await adminRequest(sqlite, '/api/admin/property-access/invitations', {
      method: 'POST',
      body: { landlordId: 5, propertyId: 10 },
    });

    expect(unverifiedInvite.status).toBe(400);
    expect(await unverifiedInvite.json()).toMatchObject({
      error: 'Landlord must be verified and active to receive property access.',
    });

    const missingFields = await adminRequest(sqlite, '/api/admin/property-access/invitations', {
      method: 'POST',
      body: { landlordId: 4 },
    });

    expect(missingFields.status).toBe(400);
  });

  it('rejects duplicate pending invitations and invitations to landlords with access', async () => {
    const sqlite = dbWithSeed();

    const first = await adminRequest(sqlite, '/api/admin/property-access/invitations', {
      method: 'POST',
      body: { landlordId: 4, propertyId: 10 },
    });

    expect(first.status).toBe(201);

    const duplicate = await adminRequest(sqlite, '/api/admin/property-access/invitations', {
      method: 'POST',
      body: { landlordId: 4, propertyId: 10 },
    });

    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({
      error: 'This landlord already has a pending invitation to this property.',
    });

    const sqlite2 = dbWithSeed();
    const db = createSqliteD1(sqlite2);
    await grantPropertyAccess(db, {
      propertyId: 10,
      landlordId: 4,
      grantedBy: 1,
      invitationId: null,
    });

    const hasAccess = await adminRequest(sqlite2, '/api/admin/property-access/invitations', {
      method: 'POST',
      body: { landlordId: 4, propertyId: 10 },
    });

    expect(hasAccess.status).toBe(409);
    expect(await hasAccess.json()).toMatchObject({
      error: 'This landlord already has access to this property.',
    });
  });

  it('lists the property-access overview with authorized landlords and pending invitations', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    const invitationId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 4,
      invitedBy: 1,
    });
    await acceptPropertyInvitation(db, { invitationId, grantedBy: 1 });

    const response = await adminRequest(sqlite, '/api/admin/property-access');
    const body = (await response.json()) as {
      data: {
        properties: Array<{
          id: number;
          title: string;
          owner: { id: number; name: string };
          authorized_landlords: Array<{ id: number; email: string }>;
          pending_invitations: Array<{ id: number; invitee_id: number }>;
        }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.properties).toHaveLength(1);
    expect(body.data.properties[0]).toMatchObject({
      id: 10,
      title: 'Haven Space Boarding House',
      owner: { id: 3, name: 'Lara Landlord One' },
      authorized_landlords: [{ id: 4, email: 'omar@example.com' }],
      pending_invitations: [],
    });

    const filtered = await adminRequest(sqlite, '/api/admin/property-access?propertyId=10');
    const filteredBody = (await filtered.json()) as { data: { properties: unknown[] } };

    expect(filteredBody.data.properties).toHaveLength(1);
  });

  it('revokes a pending invitation and cleans up the notification', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    const invitationId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 4,
      invitedBy: 1,
    });
    await createPropertyInvitationNotification(db, {
      inviteeId: 4,
      invitationId,
      propertyId: 10,
      propertyName: 'Haven Space Boarding House',
      invitedByName: 'Ada Admin',
    });

    const response = await adminRequest(
      sqlite,
      `/api/admin/property-access/invitations/${invitationId}/revoke`,
      { method: 'POST' }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Invitation revoked' });
    expect(
      (
        sqlite
          .prepare('SELECT status FROM property_invitations WHERE id = ?')
          .get(invitationId) as { status: string }
      ).status
    ).toBe('revoked');
    expect(
      sqlite
        .prepare(
          'SELECT COUNT(*) AS count FROM notifications WHERE user_id = 4 AND deleted_at IS NULL'
        )
        .get() as { count: number }
    ).toEqual({ count: 0 });

    const double = await adminRequest(
      sqlite,
      `/api/admin/property-access/invitations/${invitationId}/revoke`,
      { method: 'POST' }
    );

    expect(double.status).toBe(409);
  });

  it('removes active access and notifies the landlord while keeping their data', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    await grantPropertyAccess(db, {
      propertyId: 10,
      landlordId: 4,
      grantedBy: 1,
      invitationId: null,
    });

    const response = await adminRequest(sqlite, '/api/admin/property-access/remove', {
      method: 'POST',
      body: { propertyId: 10, landlordId: 4 },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      message: 'Access removed',
      data: { property_id: 10, landlord_id: 4 },
    });
    expect(await findActiveAccess(db, 10, 4)).toBeNull();

    const notifications = sqlite
      .prepare("SELECT user_id, type FROM notifications WHERE type = 'property_access_removed'")
      .all() as Array<{ user_id: number; type: string }>;

    expect(notifications).toHaveLength(1);
    expect(notifications[0].user_id).toBe(4);
    expect(await countLandlordCreatedData(db, 10, 4)).toEqual({
      rooms: 1,
      tenants: 1,
      payments: 1,
      announcements: 1,
    });

    const again = await adminRequest(sqlite, '/api/admin/property-access/remove', {
      method: 'POST',
      body: { propertyId: 10, landlordId: 4 },
    });

    expect(again.status).toBe(409);
  });

  it('returns landlord-created data counts for the removal warning', async () => {
    const sqlite = dbWithSeed();
    await grantPropertyAccess(createSqliteD1(sqlite), {
      propertyId: 10,
      landlordId: 4,
      grantedBy: 1,
      invitationId: null,
    });

    const response = await adminRequest(
      sqlite,
      '/api/admin/property-access/10/landlord-data?landlordId=4'
    );
    const body = (await response.json()) as {
      data: {
        landlord_id: number;
        landlord_name: string;
        property_name: string;
        created: { rooms: number; tenants: number; payments: number; announcements: number };
      };
    };

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      landlord_id: 4,
      landlord_name: 'Omar Landlord Two',
      property_name: 'Haven Space Boarding House',
      created: { rooms: 1, tenants: 1, payments: 1, announcements: 1 },
    });
  });

  it('returns the enriched audit history', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    const invitationId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 4,
      invitedBy: 1,
    });
    await acceptPropertyInvitation(db, { invitationId, grantedBy: 1 });

    const response = await adminRequest(sqlite, '/api/admin/property-access/history?propertyId=10');
    const body = (await response.json()) as {
      data: {
        events: Array<{
          type: string;
          property_name: string;
          landlord_name: string;
          actor_name: string;
        }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.events.map(event => event.type)).toEqual([
      'invitation_sent',
      'invitation_accepted',
      'access_granted',
    ]);
    expect(body.data.events[0]).toMatchObject({
      property_name: 'Haven Space Boarding House',
      landlord_name: 'Omar Landlord Two',
      actor_name: 'Ada Admin',
    });
  });

  it('auto-revokes pending invitations and access when a landlord is suspended', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    await createPropertyInvitation(db, { propertyId: 10, inviteeId: 4, invitedBy: 1 });
    await grantPropertyAccess(db, {
      propertyId: 10,
      landlordId: 4,
      grantedBy: 1,
      invitationId: null,
    });

    const response = await adminRequest(sqlite, '/api/admin/users', {
      method: 'PATCH',
      body: { userId: 4, account_status: 'suspended' },
    });

    expect(response.status).toBe(200);
    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM property_invitations WHERE status = 'pending' AND invitee_id = 4"
        )
        .get() as { count: number }
    ).toEqual({ count: 0 });
    expect(await findActiveAccess(db, 10, 4)).toBeNull();
  });

  it('denies non-admin access', async () => {
    const sqlite = dbWithSeed();

    const response = await landlordRequest(sqlite, '/api/admin/property-access');

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Access denied. Admins only.' });
  });
});

describe('landlord invitation routes', () => {
  it("lists the caller's invitations with property and owner info", async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    await createPropertyInvitation(db, { propertyId: 10, inviteeId: 4, invitedBy: 1 });

    const response = await landlordRequest(sqlite, '/api/landlord/invitations');
    const body = (await response.json()) as {
      data: {
        invitations: Array<{
          id: number;
          property_id: number;
          property_name: string;
          owner_name: string;
          status: string;
        }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.invitations).toHaveLength(1);
    expect(body.data.invitations[0]).toMatchObject({
      property_id: 10,
      property_name: 'Haven Space Boarding House',
      owner_name: 'Lara Landlord One',
      status: 'pending',
    });
  });

  it('accepts a pending invitation and grants access', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    const invitationId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 4,
      invitedBy: 1,
    });
    await createPropertyInvitationNotification(db, {
      inviteeId: 4,
      invitationId,
      propertyId: 10,
      propertyName: 'Haven Space Boarding House',
      invitedByName: 'Ada Admin',
    });

    const response = await landlordRequest(
      sqlite,
      `/api/landlord/invitations/${invitationId}/accept`,
      { method: 'POST' }
    );
    const body = (await response.json()) as {
      message: string;
      data: { access: { property_id: number; property_name: string; role: string } };
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: 'Invitation accepted',
      data: {
        access: {
          property_id: 10,
          property_name: 'Haven Space Boarding House',
          role: 'shared',
        },
      },
    });

    const access = await findActiveAccess(db, 10, 4);

    expect(access).toMatchObject({ property_id: 10, landlord_id: 4, granted_by: 1 });

    const notificationCount = sqlite
      .prepare(
        'SELECT COUNT(*) AS count FROM notifications WHERE user_id = 4 AND deleted_at IS NULL'
      )
      .get() as { count: number };

    expect(notificationCount.count).toBe(0);
  });

  it('rejects a pending invitation', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    const invitationId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 4,
      invitedBy: 1,
    });

    const response = await landlordRequest(
      sqlite,
      `/api/landlord/invitations/${invitationId}/reject`,
      { method: 'POST' }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Invitation rejected' });
    expect(
      (
        sqlite
          .prepare('SELECT status FROM property_invitations WHERE id = ?')
          .get(invitationId) as { status: string }
      ).status
    ).toBe('rejected');
    expect(await findActiveAccess(db, 10, 4)).toBeNull();
  });

  it('blocks accepting or rejecting invitations addressed to someone else', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    const invitationId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 3,
      invitedBy: 1,
    });

    const accept = await landlordRequest(
      sqlite,
      `/api/landlord/invitations/${invitationId}/accept`,
      { method: 'POST' }
    );

    expect(accept.status).toBe(404);
    expect(await accept.json()).toEqual({ error: 'Invitation not found' });

    const reject = await landlordRequest(
      sqlite,
      `/api/landlord/invitations/${invitationId}/reject`,
      { method: 'POST' }
    );

    expect(reject.status).toBe(404);
  });

  it('blocks acting on a non-pending invitation', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    const invitationId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 4,
      invitedBy: 1,
    });
    await acceptPropertyInvitation(db, { invitationId, grantedBy: 1 });

    const response = await landlordRequest(
      sqlite,
      `/api/landlord/invitations/${invitationId}/accept`,
      { method: 'POST' }
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'This invitation can no longer be accepted.',
    });
  });

  it('blocks unverified landlords from accepting', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    const invitationId = await createPropertyInvitation(db, {
      propertyId: 10,
      inviteeId: 5,
      invitedBy: 1,
    });

    const response = await app.request(
      `http://localhost/api/landlord/invitations/${invitationId}/accept`,
      { method: 'POST', headers: { 'X-User-ID': '5' } },
      createEnv(sqlite)
    );

    expect(response.status).toBe(403);
  });

  it('denies non-landlord roles', async () => {
    const sqlite = dbWithSeed();

    const response = await adminRequest(sqlite, '/api/landlord/invitations');

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Forbidden: You do not have permission to access this resource',
    });
  });
});

describe('access-aware landlord properties list', () => {
  it('shows shared properties to authorized landlords with role shared', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    await grantPropertyAccess(db, {
      propertyId: 10,
      landlordId: 4,
      grantedBy: 1,
      invitationId: null,
    });

    const response = await landlordRequest(sqlite, '/api/landlord/properties');
    const body = (await response.json()) as {
      data: { properties: Array<{ id: number; name: string; role: string }> };
    };

    expect(response.status).toBe(200);
    expect(body.data.properties).toHaveLength(1);
    expect(body.data.properties[0]).toMatchObject({
      id: 10,
      name: 'Haven Space Boarding House',
      role: 'shared',
    });
  });

  it('shows owned properties with role owner to the primary landlord', async () => {
    const sqlite = dbWithSeed();

    const response = await app.request(
      'http://localhost/api/landlord/properties',
      { headers: { 'X-User-ID': '3' } },
      createEnv(sqlite)
    );
    const body = (await response.json()) as {
      data: { properties: Array<{ id: number; role: string }> };
    };

    expect(response.status).toBe(200);
    expect(body.data.properties).toHaveLength(1);
    expect(body.data.properties[0]).toMatchObject({ id: 10, role: 'owner' });
  });

  it('does not leak properties the landlord has no access to', async () => {
    const sqlite = dbWithSeed();

    const response = await app.request(
      'http://localhost/api/landlord/properties',
      { headers: { 'X-User-ID': '5' } },
      createEnv(sqlite)
    );
    const body = (await response.json()) as { data: { properties: unknown[] } };

    expect(response.status).toBe(200);
    expect(body.data.properties).toHaveLength(0);
  });
});

describe('access-aware landlord property detail', () => {
  it('lets the owner see the read-only authorized landlords list', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    await grantPropertyAccess(db, {
      propertyId: 10,
      landlordId: 4,
      grantedBy: 1,
      invitationId: null,
    });

    const response = await app.request(
      'http://localhost/api/landlord/properties?id=10',
      { headers: { 'X-User-ID': '3' } },
      createEnv(sqlite)
    );
    const body = (await response.json()) as {
      data: {
        role: string;
        authorized_landlords: Array<{ id: number; email: string; granted_at: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.role).toBe('owner');
    expect(body.data.authorized_landlords).toHaveLength(1);
    expect(body.data.authorized_landlords[0]).toMatchObject({
      id: 4,
      email: 'omar@example.com',
    });
  });

  it('lets a shared landlord view the detail without the authorized list', async () => {
    const sqlite = dbWithSeed();
    const db = createSqliteD1(sqlite);
    await grantPropertyAccess(db, {
      propertyId: 10,
      landlordId: 4,
      grantedBy: 1,
      invitationId: null,
    });

    const response = await landlordRequest(sqlite, '/api/landlord/properties?id=10');
    const body = (await response.json()) as {
      data: { role: string; authorized_landlords?: unknown };
    };

    expect(response.status).toBe(200);
    expect(body.data.role).toBe('shared');
    expect(body.data.authorized_landlords).toBeUndefined();
  });

  it('keeps the detail hidden from landlords without access', async () => {
    const sqlite = dbWithSeed();

    const response = await app.request(
      'http://localhost/api/landlord/properties?id=10',
      { headers: { 'X-User-ID': '5' } },
      createEnv(sqlite)
    );

    expect(response.status).toBe(404);
  });
});
