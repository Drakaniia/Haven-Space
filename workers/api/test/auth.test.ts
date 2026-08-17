import { afterEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hash } from 'bcryptjs';

import app from '../src/index';
import type { Env } from '../src/env';
import { signJwt } from '../src/lib/auth';

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
    APP_ORIGIN: 'http://localhost:4173,http://localhost:8788',
    JWT_SECRET: 'test-secret',
    GOOGLE_CLIENT_ID: 'test-google-client',
    GOOGLE_CLIENT_SECRET: 'test-google-secret',
    DB: createSqliteD1(db),
  };
}

async function postCheckEmail(email: unknown, env: Env): Promise<Response> {
  return await app.request(
    'http://localhost/auth/check-email',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
    env
  );
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function stateFromRedirect(response: Response): string {
  const location = response.headers.get('Location');

  expect(location).toBeString();

  const state = new URL(location as string).searchParams.get('state');

  expect(state).toBeString();

  return state as string;
}

function cookieHeader(response: Response): string {
  const cookie = response.headers.get('Set-Cookie');

  expect(cookie).toBeString();

  return (cookie as string).split(';')[0];
}

async function authorizeGoogleSignup(env: Env): Promise<{ cookie: string; state: string }> {
  const authorize = await app.request(
    'http://localhost/auth/google/authorize?action=signup&role=boarder',
    { headers: { Referer: 'http://localhost:4173/auth/signup.html' } },
    env
  );

  expect(authorize.status).toBe(302);
  expect(authorize.headers.get('Location')).toStartWith(
    'https://accounts.google.com/o/oauth2/v2/auth?'
  );

  return {
    cookie: cookieHeader(authorize),
    state: stateFromRedirect(authorize),
  };
}

function pendingTokenFromRedirect(response: Response): string {
  const location = response.headers.get('Location');

  expect(location).toBeString();

  const url = new URL(location as string);
  expect(url.hash).toStartWith('#google-pending=');

  return decodeURIComponent(url.hash.slice('#google-pending='.length));
}

function jwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

function postJson(path: string, body: unknown, env: Env): Promise<Response> {
  return app.request(
    `http://localhost${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    env
  );
}

const originalFetch = globalThis.fetch;

function mockGoogleFetch(profile: Record<string, unknown>): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url === 'https://oauth2.googleapis.com/token') {
      const body = init?.body?.toString() || '';

      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('client_id=test-google-client');
      expect(body).toContain('client_secret=test-google-secret');

      return new Response(
        JSON.stringify({
          access_token: 'google-access-token',
          expires_in: 3600,
          scope: 'openid profile email',
          token_type: 'Bearer',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
      expect(init?.headers).toEqual({
        Authorization: 'Bearer google-access-token',
      });

      return new Response(JSON.stringify(profile), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('auth routes', () => {
  it('returns false when the email is not registered', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const response = await postCheckEmail('new@example.com', createEnv(sqlite));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      exists: false,
      is_google_account: false,
    });
  });

  it('returns a non-Google account when a password hash exists', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    sqlite
      .prepare(
        `
          INSERT INTO users (first_name, last_name, email, password_hash, role)
          VALUES ('Bea', 'Boarder', 'boarder@example.com', '$2y$10$hash', 'boarder')
        `
      )
      .run();

    const response = await postCheckEmail('boarder@example.com', createEnv(sqlite));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      exists: true,
      is_google_account: false,
    });
  });

  it('returns a Google-only account when google_id exists and password hash is empty', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    sqlite
      .prepare(
        `
          INSERT INTO users (first_name, last_name, email, password_hash, role, google_id)
          VALUES ('Gia', 'Google', 'google@example.com', '', 'boarder', 'google-user-id')
        `
      )
      .run();

    const response = await postCheckEmail('google@example.com', createEnv(sqlite));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      exists: true,
      is_google_account: true,
    });
  });

  it('matches PHP validation errors for missing and invalid email values', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    const missingResponse = await postCheckEmail('   ', env);
    const invalidResponse = await postCheckEmail('not-an-email', env);

    expect(missingResponse.status).toBe(400);
    expect(await missingResponse.json()).toEqual({ error: 'Email is required' });

    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toEqual({ error: 'Invalid email format' });
  });

  it('starts Google OAuth with a signed state cookie', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const response = await app.request(
      'http://localhost/api/auth/google/authorize?action=signup&role=boarder',
      { headers: { Referer: 'http://localhost:4173/auth/signup.html' } },
      createEnv(sqlite)
    );
    const location = response.headers.get('Location');
    const redirect = new URL(location as string);

    expect(response.status).toBe(302);
    expect(redirect.origin + redirect.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(redirect.searchParams.get('client_id')).toBe('test-google-client');
    expect(redirect.searchParams.get('scope')).toBe('openid profile email');
    expect(redirect.searchParams.get('response_type')).toBe('code');
    expect(redirect.searchParams.get('state')).toBeString();
    const stateCookie = response.headers.get('Set-Cookie');
    expect(stateCookie).toContain('google_oauth_state=');
    // Over plain http (local dev) the state cookie must not carry the Secure
    // flag (browsers can reject it on http://localhost), and it stays Lax.
    expect(stateCookie).toContain('SameSite=Lax');
    expect(stateCookie).not.toContain('Secure');
  });

  it('sets the OAuth state cookie to SameSite=None; Secure over https', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const response = await app.request(
      'https://localhost/api/auth/google/authorize?action=signup&role=boarder',
      { headers: { Referer: 'https://haven-space.pages.dev/auth/signup' } },
      createEnv(sqlite)
    );
    const stateCookie = response.headers.get('Set-Cookie');

    expect(response.status).toBe(302);
    expect(stateCookie).toContain('google_oauth_state=');
    expect(stateCookie).toContain('SameSite=None');
    expect(stateCookie).toContain('Secure');
  });

  it('redirects a brand-new Google email to the role chooser without creating an account', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    const { cookie, state } = await authorizeGoogleSignup(env);

    mockGoogleFetch({
      sub: 'google-sub-123',
      email: 'new.google@example.com',
      email_verified: true,
      given_name: 'Gina',
      family_name: 'Google',
      picture: 'https://example.com/gina.jpg',
    });

    const callback = await app.request(
      `http://localhost/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: cookie } },
      env
    );
    const location = new URL(callback.headers.get('Location') as string);
    const token = pendingTokenFromRedirect(callback);
    const payload = jwtPayload(token);

    expect(callback.status).toBe(302);
    expect(location.origin + location.pathname).toBe('http://localhost:4173/auth/choose-role');
    expect(location.hash).toStartWith('#google-pending=');
    expect(payload.type).toBe('google_pending');
    expect(payload.email).toBe('new.google@example.com');
    expect(payload.link).toBe(false);

    // No account row is created until the chooser completes the flow.
    expect(
      sqlite
        .prepare('SELECT COUNT(*) as count FROM users WHERE email = ?')
        .get('new.google@example.com')
    ).toEqual({ count: 0 });
  });

  it('completes a pending Google session as a boarder', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    const { cookie, state } = await authorizeGoogleSignup(env);

    mockGoogleFetch({
      sub: 'google-sub-boarder',
      email: 'boarder.google@example.com',
      email_verified: true,
      given_name: 'Bo',
      family_name: 'Boarder',
    });

    const callback = await app.request(
      `http://localhost/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: cookie } },
      env
    );
    const token = pendingTokenFromRedirect(callback);

    const complete = await postJson(
      '/auth/google/complete',
      { pendingToken: token, role: 'boarder' },
      env
    );
    const body = (await complete.json()) as {
      success: boolean;
      access_token: string;
      user: {
        email: string;
        role: string;
        boarder_status: string;
        is_verified: boolean;
        email_verified: boolean;
      };
    };

    expect(complete.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.access_token).toBeString();
    expect(body.user).toMatchObject({
      email: 'boarder.google@example.com',
      role: 'boarder',
      boarder_status: 'new',
      is_verified: true,
      email_verified: true,
    });

    const me = await app.request(
      'http://localhost/auth/me',
      { headers: authHeaders(body.access_token) },
      env
    );

    expect(me.status).toBe(200);
  });

  it('completes a pending Google session as a landlord with optional details', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    const { cookie, state } = await authorizeGoogleSignup(env);

    mockGoogleFetch({
      sub: 'google-sub-landlord',
      email: 'landlord.google@example.com',
      email_verified: true,
      given_name: 'Lina',
      family_name: 'Landlord',
    });

    const callback = await app.request(
      `http://localhost/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: cookie } },
      env
    );
    const token = pendingTokenFromRedirect(callback);

    const complete = await postJson(
      '/auth/google/complete',
      {
        pendingToken: token,
        role: 'landlord',
        businessName: 'Haven Dormitory',
        businessDescription: 'Cozy rooms near the university.',
        city: 'Quezon City',
        province: 'Metro Manila',
        phoneNumber: '09171234567',
      },
      env
    );
    const body = (await complete.json()) as {
      success: boolean;
      user: {
        email: string;
        role: string;
        is_verified: boolean;
        email_verified: boolean;
        account_status: string;
        verification_status: string | null;
      };
    };

    expect(complete.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user).toMatchObject({
      email: 'landlord.google@example.com',
      role: 'landlord',
      is_verified: false,
      email_verified: true,
      account_status: 'active',
      verification_status: 'pending',
    });

    const profile = sqlite
      .prepare(
        'SELECT boarding_house_name, boarding_house_description, city, province FROM landlord_profiles'
      )
      .get() as {
      boarding_house_name: string;
      boarding_house_description: string;
      city: string;
      province: string;
    };
    const user = sqlite
      .prepare('SELECT phone_number, google_id FROM users WHERE email = ?')
      .get('landlord.google@example.com') as { phone_number: string; google_id: string };

    expect(profile.boarding_house_name).toBe('Haven Dormitory');
    expect(profile.boarding_house_description).toBe('Cozy rooms near the university.');
    expect(profile.city).toBe('Quezon City');
    expect(profile.province).toBe('Metro Manila');
    expect(user.phone_number).toBe('09171234567');
    expect(user.google_id).toBe('google-sub-landlord');
  });

  it('routes an existing unlinked email to the chooser in link-confirm mode without linking', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
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
            account_status,
            boarder_status
          )
          VALUES ('Paula', 'Password', 'paula@example.com', '$2y$10$hash', 'boarder', 1, 1, 'active', 'new')
        `
      )
      .run();

    const authorize = await app.request(
      'http://localhost/auth/google/authorize?action=login',
      { headers: { Referer: 'http://localhost:4173/auth/login.html' } },
      env
    );
    const state = stateFromRedirect(authorize);
    const cookie = cookieHeader(authorize);

    mockGoogleFetch({
      sub: 'google-sub-linked',
      email: 'paula@example.com',
      email_verified: true,
      given_name: 'Paula',
      family_name: 'Password',
      picture: 'https://example.com/paula.jpg',
    });

    const callback = await app.request(
      `http://localhost/api/auth/google/callback?code=google-code&state=${encodeURIComponent(
        state
      )}`,
      { headers: { Cookie: cookie } },
      env
    );
    const location = new URL(callback.headers.get('Location') as string);
    const token = pendingTokenFromRedirect(callback);
    const payload = jwtPayload(token);

    expect(callback.status).toBe(302);
    expect(location.origin + location.pathname).toBe('http://localhost:4173/auth/choose-role');
    expect(payload.link).toBe(true);

    // Nothing is linked until the user confirms on the chooser.
    expect(
      sqlite.prepare('SELECT google_id FROM users WHERE email = ?').get('paula@example.com')
    ).toEqual({ google_id: null });
  });

  it('links the Google identity to an existing password account on complete', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    const passwordHash = await hash('correct-horse-battery', 4);

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
            account_status,
            boarder_status
          )
          VALUES ('Paula', 'Password', 'paula2@example.com', ?, 'boarder', 1, 1, 'active', 'new')
        `
      )
      .run(passwordHash);

    const authorize = await app.request(
      'http://localhost/auth/google/authorize?action=login',
      { headers: { Referer: 'http://localhost:4173/auth/login.html' } },
      env
    );
    const state = stateFromRedirect(authorize);
    const cookie = cookieHeader(authorize);

    mockGoogleFetch({
      sub: 'google-sub-linked2',
      email: 'paula2@example.com',
      email_verified: true,
      given_name: 'Paula',
      family_name: 'Password',
    });

    const callback = await app.request(
      `http://localhost/api/auth/google/callback?code=google-code&state=${encodeURIComponent(
        state
      )}`,
      { headers: { Cookie: cookie } },
      env
    );
    const token = pendingTokenFromRedirect(callback);

    const complete = await postJson('/auth/google/complete', { pendingToken: token }, env);

    expect(complete.status).toBe(200);
    expect(
      sqlite.prepare('SELECT google_id FROM users WHERE email = ?').get('paula2@example.com')
    ).toEqual({ google_id: 'google-sub-linked2' });

    // Password login still works after the identity is linked.
    const login = await postJson(
      '/auth/login',
      { email: 'paula2@example.com', password: 'correct-horse-battery' },
      env
    );

    expect(login.status).toBe(200);
  });

  it('rejects missing, invalid, and expired pending tokens on complete', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);

    const missing = await postJson('/auth/google/complete', { role: 'boarder' }, env);
    expect(missing.status).toBe(401);

    const invalid = await postJson(
      '/auth/google/complete',
      { pendingToken: 'not-a-jwt', role: 'boarder' },
      env
    );
    expect(invalid.status).toBe(401);

    const malformedSignature = await postJson(
      '/auth/google/complete',
      {
        pendingToken: 'header.' + btoa(JSON.stringify({ type: 'google_pending' })) + '.s',
        role: 'boarder',
      },
      env
    );
    expect(malformedSignature.status).toBe(401);

    const expiredToken = await signJwt(
      { type: 'google_pending', googleId: 'google-sub-expired', email: 'expired@example.com' },
      'test-secret',
      -60
    );
    const expired = await postJson(
      '/auth/google/complete',
      { pendingToken: expiredToken, role: 'boarder' },
      env
    );
    expect(expired.status).toBe(401);
  });

  it('skips the chooser and issues tokens for an already-linked Google user', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    sqlite
      .prepare(
        `
          INSERT INTO users (
            first_name,
            last_name,
            email,
            password_hash,
            google_id,
            role,
            is_verified,
            email_verified,
            account_status,
            boarder_status
          )
          VALUES ('Gia', 'Google', 'returning@example.com', '', 'google-sub-return', 'boarder', 1, 1, 'active', 'new')
        `
      )
      .run();

    const authorize = await app.request(
      'http://localhost/auth/google/authorize?action=login',
      { headers: { Referer: 'http://localhost:4173/auth/login.html' } },
      env
    );
    const state = stateFromRedirect(authorize);
    const cookie = cookieHeader(authorize);

    mockGoogleFetch({
      sub: 'google-sub-return',
      email: 'returning@example.com',
      email_verified: true,
      given_name: 'Gia',
      family_name: 'Google',
    });

    const callback = await app.request(
      `http://localhost/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: cookie } },
      env
    );
    const location = new URL(callback.headers.get('Location') as string);

    expect(callback.status).toBe(302);
    expect(location.hash).toStartWith('#auth=');
    expect(location.origin + location.pathname).toBe('http://localhost:4173/boarder/find-a-room');
  });
  it('redirects a cancelled Google consent back to login with a friendly banner', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    const authorize = await app.request(
      'http://localhost/auth/google/authorize?action=login',
      { headers: { Referer: 'http://localhost:4173/auth/login.html' } },
      env
    );
    const state = stateFromRedirect(authorize);
    const cookie = cookieHeader(authorize);

    const callback = await app.request(
      `http://localhost/auth/google/callback?error=access_denied&state=${encodeURIComponent(
        state
      )}`,
      { headers: { Cookie: cookie } },
      env
    );
    const location = new URL(callback.headers.get('Location') as string);

    expect(callback.status).toBe(302);
    expect(location.origin + location.pathname).toBe('http://localhost:4173/auth/login');
    expect(location.searchParams.get('error')).toBe('Google login was cancelled.');
  });

  it('redirects to login with a not-configured banner when OAuth credentials are missing', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    delete env.GOOGLE_CLIENT_ID;
    delete env.GOOGLE_CLIENT_SECRET;

    const authorize = await app.request(
      'http://localhost/auth/google/authorize?action=login',
      { headers: { Referer: 'http://localhost:4173/auth/login.html' } },
      env
    );
    const location = new URL(authorize.headers.get('Location') as string);

    expect(authorize.status).toBe(302);
    expect(location.origin + location.pathname).toBe('http://localhost:4173/auth/login');
    expect(location.searchParams.get('error')).toBe('Google OAuth is not configured');
  });

  it('rejects a Google email already linked to a different Google account', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    sqlite
      .prepare(
        `
          INSERT INTO users (
            first_name,
            last_name,
            email,
            password_hash,
            google_id,
            role,
            is_verified,
            email_verified,
            account_status,
            boarder_status
          )
          VALUES ('Other', 'Owner', 'claimed@example.com', '', 'other-google-sub', 'boarder', 1, 1, 'active', 'new')
        `
      )
      .run();

    const authorize = await app.request(
      'http://localhost/auth/google/authorize?action=login',
      { headers: { Referer: 'http://localhost:4173/auth/login.html' } },
      env
    );
    const state = stateFromRedirect(authorize);
    const cookie = cookieHeader(authorize);

    mockGoogleFetch({
      sub: 'different-google-sub',
      email: 'claimed@example.com',
      email_verified: true,
      given_name: 'Different',
      family_name: 'Google',
    });

    const callback = await app.request(
      `http://localhost/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: cookie } },
      env
    );
    const location = new URL(callback.headers.get('Location') as string);

    expect(callback.status).toBe(302);
    expect(location.origin + location.pathname).toBe('http://localhost:4173/auth/login');
    expect(location.searchParams.get('error')).toBe(
      'This email is already linked to another Google account'
    );
  });

  it('returns 409 on complete when the email is already linked to another Google account', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    sqlite
      .prepare(
        `
          INSERT INTO users (
            first_name,
            last_name,
            email,
            password_hash,
            google_id,
            role,
            is_verified,
            email_verified,
            account_status,
            boarder_status
          )
          VALUES ('Other', 'Owner', 'claimed2@example.com', '', 'other-google-sub', 'boarder', 1, 1, 'active', 'new')
        `
      )
      .run();

    const pendingToken = await signJwt(
      {
        type: 'google_pending',
        googleId: 'different-google-sub',
        email: 'claimed2@example.com',
        link: true,
      },
      'test-secret',
      300
    );
    const complete = await postJson(
      '/auth/google/complete',
      { pendingToken, role: 'boarder' },
      env
    );

    expect(complete.status).toBe(409);
    expect(((await complete.json()) as { error: string }).error).toBe(
      'This email is already linked to another Google account'
    );
  });

  it('returns an existing Google user to the redirect path from OAuth state', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    sqlite
      .prepare(
        `
          INSERT INTO users (
            first_name, last_name, email, password_hash, google_id,
            role, is_verified, email_verified, account_status, boarder_status
          )
          VALUES ('Gia', 'Google', 'returning-redirect@example.com', '', 'google-sub-redirect', 'boarder', 1, 1, 'active', 'new')
        `
      )
      .run();

    const authorize = await app.request(
      'http://localhost/auth/google/authorize?action=login&role=boarder&redirect=/haven-ai',
      { headers: { Referer: 'http://localhost:4173/auth/login' } },
      env
    );
    const state = stateFromRedirect(authorize);
    const cookie = cookieHeader(authorize);

    mockGoogleFetch({
      sub: 'google-sub-redirect',
      email: 'returning-redirect@example.com',
      email_verified: true,
      given_name: 'Gia',
      family_name: 'Google',
    });

    const callback = await app.request(
      `http://localhost/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: cookie } },
      env
    );
    const location = new URL(callback.headers.get('Location') as string);

    expect(callback.status).toBe(302);
    expect(location.origin + location.pathname).toBe('http://localhost:4173/haven-ai');
    expect(location.searchParams.get('redirect')).toBe('/haven-ai');
    expect(location.hash).toStartWith('#auth=');
  });

  it('carries the redirect path through a pending Google signup session', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);

    const authorize = await app.request(
      'http://localhost/auth/google/authorize?action=signup&role=boarder&redirect=/haven-ai',
      { headers: { Referer: 'http://localhost:4173/auth/signup' } },
      env
    );
    const state = stateFromRedirect(authorize);
    const cookie = cookieHeader(authorize);

    mockGoogleFetch({
      sub: 'google-sub-new-redirect',
      email: 'new.redirect@example.com',
      email_verified: true,
      given_name: 'New',
      family_name: 'Redirect',
    });

    const callback = await app.request(
      `http://localhost/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: cookie } },
      env
    );
    const token = pendingTokenFromRedirect(callback);

    expect(jwtPayload(token)).toMatchObject({ type: 'google_pending', redirect: '/haven-ai' });
  });

  it('rejects open-redirect values in the OAuth redirect claim', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    const env = createEnv(sqlite);
    sqlite
      .prepare(
        `
          INSERT INTO users (
            first_name, last_name, email, password_hash, google_id,
            role, is_verified, email_verified, account_status, boarder_status
          )
          VALUES ('Gia', 'Google', 'open-redirect@example.com', '', 'google-sub-open', 'boarder', 1, 1, 'active', 'new')
        `
      )
      .run();

    const authorize = await app.request(
      'http://localhost/auth/google/authorize?action=login&role=boarder&redirect=//evil.example.com',
      { headers: { Referer: 'http://localhost:4173/auth/login' } },
      env
    );
    const state = stateFromRedirect(authorize);
    const cookie = cookieHeader(authorize);

    mockGoogleFetch({
      sub: 'google-sub-open',
      email: 'open-redirect@example.com',
      email_verified: true,
      given_name: 'Gia',
      family_name: 'Google',
    });

    const callback = await app.request(
      `http://localhost/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: cookie } },
      env
    );
    const location = new URL(callback.headers.get('Location') as string);

    // The malicious value is dropped — the user lands on the role home instead.
    expect(location.origin + location.pathname).toBe('http://localhost:4173/boarder/find-a-room');
    expect(location.searchParams.get('redirect')).toBe('/boarder/find-a-room');
  });
});
