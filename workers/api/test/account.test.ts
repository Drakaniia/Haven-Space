import { describe, expect, it } from 'bun:test';
import { compare, hash } from 'bcryptjs';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Env, UploadThingUploadResult } from '../src/env';
import { signJwt } from '../src/lib/auth';
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

function createEnv(
  db: Database,
  uploadFiles?: (files: File[]) => Promise<UploadThingUploadResult[]>
): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost:4173',
    JWT_SECRET: 'test-secret',
    DB: createSqliteD1(db),
    UPLOADTHING_UPLOAD_FILES: uploadFiles,
  };
}

async function seedAccountData(db: Database): Promise<void> {
  const boarderHash = await hash('OldPass123', 10);
  const landlordHash = await hash('LandlordPass123', 10);

  db.run(
    `
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
        (2, 'Benny', 'Boarder', 'boarder@example.com', ?, 'boarder', 1, 1, 'active', 'new', '09171234567', NULL, '2026-05-02 08:00:00'),
        (3, 'Lara', 'Landlord', 'landlord@example.com', ?, 'landlord', 1, 1, 'active', NULL, NULL, NULL, '2026-05-03 08:00:00')
    `,
    [boarderHash, landlordHash]
  );

  db.exec(`
    INSERT INTO addresses (id, address_line_1, city, province, latitude, longitude)
    VALUES (5, '100 Flow Street', 'Manila', 'Metro Manila', 14.5995, 120.9842);

    INSERT INTO properties (id, landlord_id, address_id, title, price, listing_moderation_status, status)
    VALUES (10, 3, 5, 'Accepted House', 6500, 'published', 'available');

    INSERT INTO rooms (id, property_id, landlord_id, title, price, status)
    VALUES (100, 10, 3, 'Accepted Room', 6500, 'available');

    INSERT INTO applications (id, boarder_id, landlord_id, room_id, message, status)
    VALUES (200, 2, 3, 100, 'I want this room.', 'accepted');
  `);
}

describe('account, profile, password, and onboarding routes', () => {
  it('gets and updates the current user profile', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    await seedAccountData(sqlite);
    const env = createEnv(sqlite);

    const profile = await app.request(
      'http://localhost/api/users/profile',
      { headers: { 'X-User-ID': '2' } },
      env
    );
    const profileBody = (await profile.json()) as {
      user: { email: string; phone_number: string; boarder_status: string };
    };

    expect(profile.status).toBe(200);
    expect(profileBody.user.email).toBe('boarder@example.com');
    expect(profileBody.user.phone_number).toBe('09171234567');
    expect(profileBody.user.boarder_status).toBe('accepted');

    const update = await app.request(
      'http://localhost/api/users/profile',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({
          first_name: 'Ben',
          last_name: 'Boarder',
          phone_number: '09175551234',
        }),
      },
      env
    );
    const updateBody = (await update.json()) as {
      message: string;
      user: { first_name: string; phone_number: string };
    };

    expect(update.status).toBe(200);
    expect(updateBody.message).toBe('Profile updated successfully');
    expect(updateBody.user.first_name).toBe('Ben');
    expect(updateBody.user.phone_number).toBe('09175551234');
  });

  it('stores city and province on the landlord profile via profile update', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    await seedAccountData(sqlite);
    const env = createEnv(sqlite);

    const update = await app.request(
      'http://localhost/api/users/profile',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          first_name: 'Lara',
          last_name: 'Landlord',
          phone_number: '09171234567',
          city: 'Quezon City',
          province: 'Metro Manila',
        }),
      },
      env
    );
    const updateBody = (await update.json()) as {
      user: { city: string | null; province: string | null };
    };

    expect(update.status).toBe(200);
    expect(updateBody.user.city).toBe('Quezon City');
    expect(updateBody.user.province).toBe('Metro Manila');

    const profile = sqlite
      .prepare('SELECT city, province FROM landlord_profiles WHERE user_id = 3')
      .get() as { city: string; province: string };

    expect(profile).toEqual({ city: 'Quezon City', province: 'Metro Manila' });
  });

  it('does not create a landlord profile row for a boarder profile update', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    await seedAccountData(sqlite);
    const env = createEnv(sqlite);

    const update = await app.request(
      'http://localhost/api/users/profile',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({
          first_name: 'Ben',
          last_name: 'Boarder',
          phone_number: '09175551234',
          city: 'Manila',
          province: 'Metro Manila',
        }),
      },
      env
    );

    expect(update.status).toBe(200);
    expect(
      sqlite.prepare('SELECT COUNT(*) AS c FROM landlord_profiles WHERE user_id = 2').get() as {
        c: number;
      }
    ).toEqual({ c: 0 });
  });

  it('uploads an avatar through UploadThing and stores the URL', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    await seedAccountData(sqlite);
    const env = createEnv(sqlite, async files => [
      {
        data: {
          key: 'avatar-key',
          name: files[0].name,
          size: files[0].size,
          ufsUrl: 'https://utfs.io/f/avatar-key',
        },
        error: null,
      },
    ]);
    const form = new FormData();
    form.append('avatar', new File(['avatar-bytes'], 'avatar.png', { type: 'image/png' }));

    const response = await app.request(
      'http://localhost/api/users/avatar',
      {
        method: 'POST',
        headers: { 'X-User-ID': '2' },
        body: form,
      },
      env
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Avatar uploaded successfully',
      avatar_url: 'https://utfs.io/f/avatar-key',
    });
    expect(
      sqlite.prepare('SELECT avatar_url FROM users WHERE id = 2').get() as { avatar_url: string }
    ).toEqual({ avatar_url: 'https://utfs.io/f/avatar-key' });
  });

  it('changes an authenticated user password', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    await seedAccountData(sqlite);

    const response = await app.request(
      'http://localhost/auth/change-password',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({
          current_password: 'OldPass123',
          new_password: 'NewPass123',
        }),
      },
      createEnv(sqlite)
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Password updated successfully' });

    const row = sqlite.prepare('SELECT password_hash FROM users WHERE id = 2').get() as {
      password_hash: string;
    };
    expect(await compare('NewPass123', row.password_hash)).toBe(true);
  });

  it('stores, verifies, resends, and consumes password reset requests', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    await seedAccountData(sqlite);
    const env = createEnv(sqlite);

    const forgot = await app.request(
      'http://localhost/auth/forgot-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'boarder@example.com' }),
      },
      env
    );
    const forgotBody = (await forgot.json()) as { request_id: number; reset_code: string };

    expect(forgot.status).toBe(200);
    expect(forgotBody.reset_code).toMatch(/^\d{6}$/);

    const verify = await app.request(
      'http://localhost/auth/verify-reset-code',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'boarder@example.com', code: forgotBody.reset_code }),
      },
      env
    );

    expect(verify.status).toBe(200);
    expect(await verify.json()).toEqual({
      message: 'Reset code verified successfully',
      valid: true,
      user_id: 2,
      request_id: forgotBody.request_id,
    });

    const resend = await app.request(
      'http://localhost/auth/resend-reset-code',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'boarder@example.com' }),
      },
      env
    );
    const resendBody = (await resend.json()) as { request_id: number; reset_code: string };

    expect(resend.status).toBe(200);
    expect(resendBody.request_id).toBe(forgotBody.request_id);
    expect(resendBody.reset_code).toMatch(/^\d{6}$/);

    const reset = await app.request(
      'http://localhost/auth/reset-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'boarder@example.com',
          request_id: resendBody.request_id,
          new_password: 'ResetPass123',
        }),
      },
      env
    );

    expect(reset.status).toBe(200);
    expect(await reset.json()).toEqual({ message: 'Password has been reset successfully' });

    const row = sqlite.prepare('SELECT password_hash FROM users WHERE id = 2').get() as {
      password_hash: string;
    };
    expect(await compare('ResetPass123', row.password_hash)).toBe(true);
    expect(
      sqlite
        .prepare('SELECT is_used FROM password_reset_requests WHERE id = ?')
        .get(resendBody.request_id) as { is_used: number }
    ).toEqual({ is_used: 1 });
  });

  it('refreshes auth cookies and clears them on logout', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    await seedAccountData(sqlite);
    const refreshToken = await signJwt({ user_id: 2 }, 'test-secret', 60 * 60);

    const refresh = await app.request(
      'http://localhost/auth/refresh-token',
      {
        method: 'POST',
        headers: { Cookie: `refresh_token=${refreshToken}` },
      },
      createEnv(sqlite)
    );
    const refreshBody = (await refresh.json()) as { success: boolean; access_token: string };

    expect(refresh.status).toBe(200);
    expect(refreshBody.success).toBe(true);
    expect(refreshBody.access_token).toBeTruthy();
    expect(refresh.headers.get('Set-Cookie')).toContain('access_token=');

    const logout = await app.request(
      'http://localhost/auth/logout',
      { method: 'POST' },
      createEnv(sqlite)
    );

    expect(logout.status).toBe(200);
    expect(await logout.json()).toEqual({
      success: true,
      message: 'Logged out successfully',
    });
    expect(logout.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it('returns and updates boarder onboarding status', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    await seedAccountData(sqlite);
    const env = createEnv(sqlite);

    const status = await app.request(
      'http://localhost/api/boarder/onboarding-status',
      { headers: { 'X-User-ID': '2' } },
      env
    );
    const statusBody = (await status.json()) as {
      show_onboarding: boolean;
      checklist: { application_accepted: boolean; payment_method_added: boolean };
    };

    expect(status.status).toBe(200);
    expect(statusBody.show_onboarding).toBe(true);
    expect(statusBody.checklist.application_accepted).toBe(true);
    expect(statusBody.checklist.payment_method_added).toBe(false);

    const dismiss = await app.request(
      'http://localhost/api/boarder/update-onboarding',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '2',
        },
        body: JSON.stringify({ action: 'dismiss' }),
      },
      env
    );

    expect(dismiss.status).toBe(200);
    expect(await dismiss.json()).toEqual({
      success: true,
      message: 'Onboarding status updated',
    });
    expect(
      sqlite
        .prepare(
          'SELECT onboarding_dismissed_at IS NOT NULL AS dismissed FROM boarder_profiles WHERE user_id = 2'
        )
        .get() as { dismissed: number }
    ).toEqual({ dismissed: 1 });
  });
});
