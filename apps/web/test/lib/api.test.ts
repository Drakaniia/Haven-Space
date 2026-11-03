import { test, expect } from 'bun:test';
import { ApiRequestError, apiFetch } from '../src/lib/api/http';
import { listPublicRooms } from '../src/lib/api/public';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../src/lib/auth-store';
import type { AuthUser } from '../src/lib/types';

const SESSION_USER = {
  id: 1,
  user_id: 1,
  first_name: 'QA',
  last_name: 'Boarder',
  email: 'qa.boarder@example.com',
  role: 'boarder',
  is_verified: true,
  email_verified: true,
  account_status: 'active',
  avatar_url: null,
  phone_number: null,
  verification_status: null,
} satisfies AuthUser;

function stubFetch(status: number, body: unknown = {}): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}
test('apiFetch parses a JSON envelope', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data: { ok: true } }), {
      status: 200,
    })) as unknown as typeof fetch;

  const result = await apiFetch<{ data: { ok: boolean } }>('http://test', '/x');
  expect(result.data.ok).toBe(true);
});

test('apiFetch throws ApiRequestError with the API message on non-2xx', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: 'Property not found' }), {
      status: 404,
    })) as unknown as typeof fetch;

  const err = await apiFetch<unknown>('http://test', '/x').then(
    () => null,
    e => e
  );

  expect(err).toBeInstanceOf(ApiRequestError);
  expect((err as ApiRequestError).status).toBe(404);
  expect((err as ApiRequestError).message).toBe('Property not found');
});

test('listPublicRooms builds the full query string', async () => {
  let captured = '';
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    captured = String(input);
    return new Response(
      JSON.stringify({ data: { properties: [], total_count: 0, limit: 20, offset: 0 } }),
      { status: 200 }
    );
  }) as unknown as typeof fetch;

  await listPublicRooms(
    { search: 'Manila', price_max: 5000, sort_by: 'price_asc', limit: 20, offset: 0 },
    'http://test'
  );

  expect(captured).toBe(
    'http://test/api/rooms/public?search=Manila&price_max=5000&sort_by=price_asc&limit=20&offset=0'
  );
});

// Regression (W3-U28): a stale/invalid stored token used to leave the signed-in shell
// rendered while every request 401'd, with no way back to /auth/login. A 401 on a call
// that carried a stored session now drops that session so `Protected` redirects.
test('apiFetch clears the stored session when a call is rejected with 401', async () => {
  clearStoredAuth();
  setStoredAuth('stale.jwt.token', 'stale.refresh.token', SESSION_USER);
  stubFetch(401, { error: 'No token provided' });

  const err = await apiFetch<unknown>('http://test', '/api/boarder/tenancy').catch(e => e);

  expect(err).toBeInstanceOf(ApiRequestError);
  expect((err as ApiRequestError).status).toBe(401);
  expect(getStoredAuth()).toEqual({ token: null, refreshToken: null, user: null });
});

test('apiFetch keeps the session on non-401 errors', async () => {
  clearStoredAuth();
  setStoredAuth('still.valid.token', 'still.valid.refresh', SESSION_USER);
  stubFetch(500, { error: 'Internal server error' });

  await apiFetch<unknown>('http://test', '/api/boarder/tenancy').catch(() => null);

  expect(getStoredAuth().token).toBe('still.valid.token');
});

test('apiFetch tolerates a 401 when no session is stored', async () => {
  clearStoredAuth();
  stubFetch(401, { error: 'Invalid credentials' });

  const err = await apiFetch<unknown>('http://test', '/api/auth/login').catch(e => e);

  expect((err as ApiRequestError).status).toBe(401);
  expect(getStoredAuth().token).toBeNull();
});
