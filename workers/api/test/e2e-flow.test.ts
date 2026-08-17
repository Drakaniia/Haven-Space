import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hash } from 'bcryptjs';

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

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

const listingPayload = {
  propertyName: 'Flow House',
  propertyType: 'apartment',
  genderPreference: 'any',
  propertyDescription: 'End-to-end flow listing',
  propertyPrice: 5500,
  propertyDeposit: 1500,
  propertyRooms: 1,
  propertyCapacity: 1,
  propertyAddress: '100 Flow Street',
  propertyCity: 'Manila',
  propertyProvince: 'Metro Manila',
  propertyLatitude: 14.5995,
  propertyLongitude: 120.9842,
  propertyAdvance: '1 month',
  propertyMinStay: '1-month',
  propertyRules: 'No smoking',
  amenities: ['WiFi'],
  rooms: [{ name: 'Flow Room 1', capacity: 1, roomType: 'single' }],
};

describe('phase 7 flow smoke test', () => {
  it('covers landlord approval, listing visibility, and boarder application flow', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);

    const landlordSignup = await app.request(
      'http://localhost/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Lara',
          lastName: 'Owner',
          email: 'lara.owner@example.com',
          password: 'StrongPass123',
          role: 'landlord',
          businessName: 'Flow Rentals',
          businessDescription: 'Managed rooms for students',
          phoneNumber: '09171234567',
          city: 'Manila',
          province: 'Metro Manila',
          experienceLevel: 'new',
          idType: 'passport',
          idNumber: 'P1234567',
        }),
      },
      env
    );
    const landlordSignupBody = (await landlordSignup.json()) as {
      access_token: string;
      user: { id: number; account_status: string; verification_status: string };
    };

    expect(landlordSignup.status).toBe(200);
    expect(landlordSignupBody.user.account_status).toBe('pending_verification');
    expect(landlordSignupBody.user.verification_status).toBe('pending');

    const blockedListing = await app.request(
      'http://localhost/api/landlord/listings',
      {
        method: 'POST',
        headers: authHeaders(landlordSignupBody.access_token),
        body: JSON.stringify(listingPayload),
      },
      env
    );

    expect(blockedListing.status).toBe(403);
    expect(await blockedListing.json()).toEqual({
      error: 'Email verification required',
      message: 'Please verify your email address before accessing landlord features.',
    });

    const adminPasswordHash = await hash('AdminPass123', 10);
    sqlite
      .prepare(
        `
          INSERT INTO users (
            first_name,
            last_name,
            email,
            password_hash,
            role,
            is_verified,
            email_verified,
            account_status
          )
          VALUES (?, ?, ?, ?, 'admin', 1, 1, 'active')
        `
      )
      .run('Ada', 'Admin', 'admin@example.com', adminPasswordHash);

    const adminLogin = await app.request(
      'http://localhost/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com', password: 'AdminPass123' }),
      },
      env
    );
    const adminLoginBody = (await adminLogin.json()) as { access_token: string };

    expect(adminLogin.status).toBe(200);

    const pendingLandlords = await app.request(
      'http://localhost/api/admin/landlords?status=pending',
      {
        headers: { Authorization: `Bearer ${adminLoginBody.access_token}` },
      },
      env
    );
    const pendingLandlordsBody = (await pendingLandlords.json()) as {
      data: Array<{ id: number; email: string }>;
    };

    expect(pendingLandlords.status).toBe(200);
    expect(pendingLandlordsBody.data.map(landlord => landlord.email)).toContain(
      'lara.owner@example.com'
    );

    const approval = await app.request(
      'http://localhost/api/admin/landlords',
      {
        method: 'POST',
        headers: authHeaders(adminLoginBody.access_token),
        body: JSON.stringify({ landlordId: landlordSignupBody.user.id, action: 'approve' }),
      },
      env
    );

    expect(approval.status).toBe(200);
    expect(await approval.json()).toEqual({
      message: 'Landlord verification updated successfully',
    });

    const landlordMe = await app.request(
      'http://localhost/auth/me',
      {
        headers: { Authorization: `Bearer ${landlordSignupBody.access_token}` },
      },
      env
    );
    const landlordMeBody = (await landlordMe.json()) as {
      user: { account_status: string; verification_status: string; is_verified: boolean };
    };

    expect(landlordMe.status).toBe(200);
    expect(landlordMeBody.user.account_status).toBe('active');
    expect(landlordMeBody.user.verification_status).toBe('approved');
    expect(landlordMeBody.user.is_verified).toBe(true);

    const listing = await app.request(
      'http://localhost/api/landlord/listings',
      {
        method: 'POST',
        headers: authHeaders(landlordSignupBody.access_token),
        body: JSON.stringify(listingPayload),
      },
      env
    );
    const listingBody = (await listing.json()) as { data: { id: number; room_ids: number[] } };

    expect(listing.status).toBe(201);
    expect(listingBody.data.id).toBeGreaterThan(0);
    expect(listingBody.data.room_ids).toHaveLength(1);

    const publicRooms = await app.request(
      'http://localhost/api/rooms/public?search=Flow%20House',
      {},
      env
    );
    const publicRoomsBody = (await publicRooms.json()) as {
      data: { properties: Array<{ id: number; title: string }> };
    };

    expect(publicRooms.status).toBe(200);
    expect(publicRoomsBody.data.properties.some(property => property.title === 'Flow House')).toBe(
      true
    );

    const boarderSignup = await app.request(
      'http://localhost/api/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Benny',
          lastName: 'Boarder',
          email: 'benny.boarder@example.com',
          password: 'StrongPass123',
          role: 'boarder',
        }),
      },
      env
    );
    const boarderSignupBody = (await boarderSignup.json()) as {
      access_token: string;
      user: { boarder_status: string };
    };

    expect(boarderSignup.status).toBe(200);
    expect(boarderSignupBody.user.boarder_status).toBe('new');

    const application = await app.request(
      'http://localhost/api/boarder/applications',
      {
        method: 'POST',
        headers: authHeaders(boarderSignupBody.access_token),
        body: JSON.stringify({
          room_id: listingBody.data.room_ids[0],
          landlord_id: landlordSignupBody.user.id,
          message: 'I would like to apply for this room.',
        }),
      },
      env
    );
    const applicationBody = (await application.json()) as {
      success: boolean;
      data: { status: string };
    };

    expect(application.status).toBe(201);
    expect(applicationBody.success).toBe(true);
    expect(applicationBody.data.status).toBe('pending');

    const boarderApplications = await app.request(
      'http://localhost/api/boarder/applications',
      {
        headers: { Authorization: `Bearer ${boarderSignupBody.access_token}` },
      },
      env
    );
    const boarderApplicationsBody = (await boarderApplications.json()) as {
      data: Array<{ status: string; property_title: string }>;
    };

    expect(boarderApplications.status).toBe(200);
    expect(boarderApplicationsBody.data).toHaveLength(1);
    expect(boarderApplicationsBody.data[0].status).toBe('pending');
    expect(boarderApplicationsBody.data[0].property_title).toBe('Flow House');

    const boarderLoginAfterApply = await app.request(
      'http://localhost/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'benny.boarder@example.com',
          password: 'StrongPass123',
        }),
      },
      env
    );
    const boarderLoginAfterApplyBody = (await boarderLoginAfterApply.json()) as {
      user: { boarder_status: string };
    };

    expect(boarderLoginAfterApply.status).toBe(200);
    expect(boarderLoginAfterApplyBody.user.boarder_status).toBe('applied_pending');
  });
});
