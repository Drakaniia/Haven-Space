import { test, expect } from 'bun:test';
import {
  authErrorSearch,
  clearGooglePendingHash,
  handleGooglePendingHash,
  handleOAuthHash,
  isForeignRolePath,
  parseGooglePendingToken,
  redirectPathForUser,
  resolvePostAuthPath,
} from '../src/lib/oauth';
import type { AuthUser } from '../src/lib/types';

const user = (role: AuthUser['role']): AuthUser => ({
  id: 1,
  user_id: 1,
  first_name: 'Test',
  last_name: 'User',
  email: 'test@example.com',
  role,
  is_verified: true,
  email_verified: true,
  account_status: 'active',
  avatar_url: null,
  phone_number: null,
  verification_status: null,
});

test('redirectPathForUser maps admin to /admin', () => {
  expect(redirectPathForUser(user('admin'))).toBe('/admin');
});

test('redirectPathForUser maps landlord to /landlord', () => {
  expect(redirectPathForUser(user('landlord'))).toBe('/landlord');
});

test('redirectPathForUser maps a new boarder to the public browse page', () => {
  expect(redirectPathForUser(user('boarder'))).toBe('/find-a-room');
  expect(redirectPathForUser({ ...user('boarder'), boarder_status: 'browsing' })).toBe(
    '/find-a-room'
  );
});

test('redirectPathForUser maps a confirmed boarder to the boarder dashboard', () => {
  expect(redirectPathForUser({ ...user('boarder'), boarder_status: 'confirmed' })).toBe('/boarder');
});

test('redirectPathForUser maps an accepted boarder to confirm-booking', () => {
  expect(redirectPathForUser({ ...user('boarder'), boarder_status: 'accepted' })).toBe(
    '/boarder/confirm-booking'
  );
});

test('redirectPathForUser maps a pending/rejected boarder to applications', () => {
  expect(redirectPathForUser({ ...user('boarder'), boarder_status: 'applied_pending' })).toBe(
    '/boarder/applications'
  );
  expect(redirectPathForUser({ ...user('boarder'), boarder_status: 'rejected' })).toBe(
    '/boarder/applications'
  );
});

test("resolvePostAuthPath honours a return path inside the user's own area", () => {
  expect(resolvePostAuthPath(user('boarder'), '/boarder/find-a-room/3/apply')).toBe(
    '/boarder/find-a-room/3/apply'
  );
  expect(resolvePostAuthPath(user('landlord'), '/landlord/listings')).toBe('/landlord/listings');
  // Public paths are reachable by anyone (e.g. returning from /haven-ai).
  expect(resolvePostAuthPath(user('landlord'), '/haven-ai')).toBe('/haven-ai');
});

test("resolvePostAuthPath falls back when the return path is another role's area", () => {
  // A landlord who followed a boarder apply link must not be dropped onto the
  // boarder shell only to be bounced straight back out by Protected.
  expect(resolvePostAuthPath(user('landlord'), '/boarder/find-a-room/3/apply')).toBe('/landlord');
  expect(resolvePostAuthPath(user('admin'), '/boarder/messages')).toBe('/admin');
  expect(resolvePostAuthPath(user('boarder'), '/landlord/settings')).toBe('/find-a-room');
});

test('resolvePostAuthPath ignores missing or unsafe return paths', () => {
  expect(resolvePostAuthPath(user('boarder'))).toBe('/find-a-room');
  expect(resolvePostAuthPath(user('boarder'), null)).toBe('/find-a-room');
  expect(resolvePostAuthPath(user('boarder'), '//evil.example.com')).toBe('/find-a-room');
});

test("isForeignRolePath only flags the other roles' areas", () => {
  expect(isForeignRolePath('boarder', '/boarder/find-a-room')).toBe(false);
  expect(isForeignRolePath('boarder', '/landlord')).toBe(true);
  expect(isForeignRolePath('landlord', '/haven-ai')).toBe(false);
  expect(isForeignRolePath('admin', '/admin/users')).toBe(false);
});

test('handleOAuthHash returns null when no auth hash is present', () => {
  window.location.hash = '';
  expect(handleOAuthHash()).toBeNull();
});

test('handleOAuthHash parses and persists a valid auth hash', () => {
  const payload = {
    access_token: 'token-123',
    refresh_token: 'refresh-456',
    user: user('boarder'),
  };
  window.location.hash = `#auth=${encodeURIComponent(JSON.stringify(payload))}`;

  const result = handleOAuthHash();
  expect(result?.id).toBe(1);
  expect(localStorage.getItem('token')).toBe('token-123');
  expect(localStorage.getItem('refresh_token')).toBe('refresh-456');
});

test('handleOAuthHash returns null for a malformed hash', () => {
  window.location.hash = '#auth=not-json';
  expect(handleOAuthHash()).toBeNull();
});

function makePendingToken(payload: Record<string, unknown>): string {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `header.${encoded}.signature`;
}

test('parseGooglePendingToken reads the claims of a google_pending token', () => {
  const token = makePendingToken({
    type: 'google_pending',
    googleId: 'google-sub-1',
    email: 'new@example.com',
    firstName: 'Gina',
    lastName: 'Google',
    picture: 'https://example.com/g.jpg',
    action: 'signup',
    link: false,
  });

  expect(parseGooglePendingToken(token)).toEqual({
    googleId: 'google-sub-1',
    email: 'new@example.com',
    firstName: 'Gina',
    lastName: 'Google',
    picture: 'https://example.com/g.jpg',
    action: 'signup',
    link: false,
    redirect: null,
  });
});

test('parseGooglePendingToken reads a sanitized redirect claim', () => {
  const token = makePendingToken({
    type: 'google_pending',
    googleId: 'google-sub-redirect',
    email: 'redirect@example.com',
    redirect: '/haven-ai',
    link: false,
  });

  expect(parseGooglePendingToken(token)?.redirect).toBe('/haven-ai');

  const malicious = makePendingToken({
    type: 'google_pending',
    googleId: 'google-sub-open',
    email: 'open@example.com',
    redirect: '//evil.example.com',
    link: false,
  });

  expect(parseGooglePendingToken(malicious)?.redirect).toBeNull();
});

test('parseGooglePendingToken detects link-confirm mode', () => {
  const token = makePendingToken({
    type: 'google_pending',
    googleId: 'google-sub-2',
    email: 'existing@example.com',
    link: true,
  });

  expect(parseGooglePendingToken(token)?.link).toBe(true);
});

test('parseGooglePendingToken returns null for malformed or wrong-type tokens', () => {
  expect(parseGooglePendingToken('not-a-jwt')).toBeNull();
  expect(parseGooglePendingToken('a.b.c')).toBeNull();
  expect(
    parseGooglePendingToken(makePendingToken({ type: 'other', googleId: 'x', email: 'y' }))
  ).toBeNull();
  expect(parseGooglePendingToken(makePendingToken({ type: 'google_pending' }))).toBeNull();
});

test('handleGooglePendingHash reads and exposes the pending session fragment', () => {
  const token = makePendingToken({
    type: 'google_pending',
    googleId: 'google-sub-3',
    email: 'chooser@example.com',
    firstName: 'Cho',
    lastName: 'Oser',
    action: 'login',
    link: false,
  });
  window.location.hash = `#google-pending=${encodeURIComponent(token)}`;

  const result = handleGooglePendingHash();
  expect(result?.token).toBe(token);
  expect(result?.session.email).toBe('chooser@example.com');
  expect(result?.session.firstName).toBe('Cho');
});

test('handleGooglePendingHash returns null when absent or malformed', () => {
  window.location.hash = '';
  expect(handleGooglePendingHash()).toBeNull();

  window.location.hash = '#google-pending=not-json'; // 1-part string, no payload
  expect(handleGooglePendingHash()).toBeNull();

  window.location.hash = '#auth=something-else';
  expect(handleGooglePendingHash()).toBeNull();
});

test('clearGooglePendingHash removes the pending fragment but keeps the path', () => {
  window.location.hash = '#google-pending=abc';
  clearGooglePendingHash();
  expect(window.location.hash).toBe('');
});

test('authErrorSearch surfaces a non-empty error search param', () => {
  expect(authErrorSearch({})).toEqual({});
  expect(authErrorSearch({ error: undefined })).toEqual({});
  expect(authErrorSearch({ error: 'Google login was cancelled.' })).toEqual({
    error: 'Google login was cancelled.',
  });
  expect(authErrorSearch({ error: '   ' })).toEqual({});
  expect(authErrorSearch({ error: 42 })).toEqual({});
});
