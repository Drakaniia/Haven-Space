import type { Context } from 'hono';
import type { Env } from '../../env';
import { cookieValue, signJwt, verifyJwt } from '../../lib/auth';
import { errorResponse, jsonResponse } from '../../lib/http';
import type { JsonRecord } from '../../lib/validation';
import type { UserAccountRow } from '../../repositories/users';

export const accessTokenSeconds = 60 * 60;
export const refreshTokenSeconds = 60 * 60 * 24 * 30;
export const googleStateCookieName = 'google_oauth_state';
export const googleStateSeconds = 10 * 60;
export const googlePendingSeconds = 10 * 60;
export const googleAuthEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
export const googleTokenEndpoint = 'https://oauth2.googleapis.com/token';
export const googleUserInfoEndpoint = 'https://openidconnect.googleapis.com/v1/userinfo';

export type OAuthAction = 'login' | 'signup';
export type OAuthRole = 'boarder' | 'landlord';

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const email = value.trim();
  return email ? email.toLowerCase() : null;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Allow only same-origin relative paths (a single leading '/', no '//') so a
 * `redirect` carried through OAuth state can never become an open redirect.
 */
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export function stringField(body: JsonRecord, field: string): string {
  const value = body[field];

  return typeof value === 'string' ? value.trim() : '';
}

export function missingRequired(body: JsonRecord, fields: string[]): boolean {
  return fields.some(field => !stringField(body, field));
}

export function userPayload(user: UserAccountRow): Record<string, unknown> {
  return {
    user_id: Number(user.id),
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    is_verified: Boolean(user.is_verified),
    account_status: user.account_status,
    verification_status:
      user.role === 'landlord' ? (user.is_verified ? 'approved' : 'pending') : null,
  };
}

export async function authTokens(user: UserAccountRow, secret?: string) {
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }

  const payload = userPayload(user);
  const accessToken = await signJwt(payload, secret, accessTokenSeconds);
  const refreshToken = await signJwt(payload, secret, refreshTokenSeconds);

  return { accessToken, refreshToken };
}

export function authCookie(name: string, value: string, maxAge: number, env: Env): string {
  const secure = env.APP_ENV === 'production' ? '; Secure' : '';

  return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function authResponse(
  env: Env,
  body: unknown,
  accessToken: string,
  refreshToken: string,
  status = 200
): Response {
  const response = jsonResponse(body, status);
  response.headers.append(
    'Set-Cookie',
    authCookie('access_token', accessToken, accessTokenSeconds, env)
  );
  response.headers.append(
    'Set-Cookie',
    authCookie('refresh_token', refreshToken, refreshTokenSeconds, env)
  );

  return response;
}

/**
 * Cookie carrying the Google OAuth state nonce. It must survive the
 * cross-site redirect chain (frontend -> API -> accounts.google.com -> API
 * callback), so on https it is set as `SameSite=None; Secure` — the standard
 * for OAuth state cookies — while the nonce check in `verifiedGoogleState`
 * keeps the callback bound to the original authorize request. Over plain http
 * (local dev on http://localhost) the Secure flag is omitted so browsers that
 * don't treat localhost as a secure context don't silently reject the cookie,
 * which otherwise surfaces as a "Google login session expired" bounce-back
 * before the role chooser ever loads.
 */
export function googleStateCookie(
  requestUrl: string,
  name: string,
  value: string,
  maxAge: number
): string {
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : '';
  const sameSite = secure ? 'None' : 'Lax';

  return `${name}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=${sameSite}${secure}`;
}

export function redirectResponse(location: string, headers?: Headers): Response {
  const responseHeaders = headers ? new Headers(headers) : new Headers();
  responseHeaders.set('Location', location);

  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  });
}

export function randomToken(bytes = 24): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);

  let binary = '';
  for (const value of values) {
    binary += String.fromCharCode(value);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function configuredOrigins(env: Env): string[] {
  return (env.APP_ORIGIN || env.ALLOWED_ORIGINS || env.APP_BASE_URL || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

export function parseOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isLocalhostOrigin(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

export function allowFrontendOrigin(
  env: Env,
  requestedOrigin: string,
  allowedOrigins: string[]
): boolean {
  if (allowedOrigins.includes(requestedOrigin)) {
    return true;
  }

  const isProduction = env.APP_ENV === 'production';
  return (
    !isProduction &&
    isLocalhostOrigin(requestedOrigin) &&
    allowedOrigins.some(origin => isLocalhostOrigin(origin))
  );
}

export function frontendOrigin(c: Context<{ Bindings: Env }>): string {
  const allowedOrigins = configuredOrigins(c.env);
  const requestedOrigin =
    parseOrigin(c.req.query('origin') ?? null) ?? parseOrigin(c.req.header('Referer') ?? null);

  if (requestedOrigin && allowFrontendOrigin(c.env, requestedOrigin, allowedOrigins)) {
    return requestedOrigin;
  }

  // If no allowed origin was requested, prefer the first localhost origin when
  // the request itself came in locally, so fallback/error redirects during
  // local development don't bounce the user to the production site.
  if (isLocalhostOrigin(c.req.url)) {
    const localhost = allowedOrigins.find(origin => isLocalhostOrigin(origin));
    if (localhost) {
      return localhost;
    }
  }

  return allowedOrigins[0] ?? 'http://localhost:3000';
}

export function frontendUrl(origin: string, path: string): string {
  return new URL(path, origin.endsWith('/') ? origin : `${origin}/`).toString();
}

export function authErrorRedirect(
  c: Context<{ Bindings: Env }>,
  origin: string,
  action: OAuthAction,
  message: string
): Response {
  const path = action === 'signup' ? '/auth/signup' : '/auth/login';
  const url = new URL(path, origin.endsWith('/') ? origin : `${origin}/`);
  url.searchParams.set('error', message);

  return redirectResponse(url.toString(), clearGoogleStateHeaders(c));
}

export function clearGoogleStateHeaders(c: Context<{ Bindings: Env }>): Headers {
  const headers = new Headers();
  headers.append('Set-Cookie', googleStateCookie(c.req.url, googleStateCookieName, '', 0));
  return headers;
}

export function oauthAction(value: string | undefined): OAuthAction {
  return value === 'signup' ? 'signup' : 'login';
}

export function oauthRole(value: string | undefined): OAuthRole {
  return value === 'landlord' ? 'landlord' : 'boarder';
}

export function googleRedirectUri(c: Context<{ Bindings: Env }>): string {
  return c.env.GOOGLE_REDIRECT_URI || new URL('/api/auth/google/callback', c.req.url).toString();
}

export function requireGoogleConfig(c: Context<{ Bindings: Env }>) {
  if (!c.env.JWT_SECRET) {
    throw new Error('JWT secret is not configured');
  }

  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured');
  }

  return {
    clientId: c.env.GOOGLE_CLIENT_ID,
    clientSecret: c.env.GOOGLE_CLIENT_SECRET,
    jwtSecret: c.env.JWT_SECRET,
  };
}

export function userHashPayload(
  user: Record<string, unknown>,
  accessToken: string,
  refreshToken: string
): string {
  return encodeURIComponent(
    JSON.stringify({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
      ...user,
    })
  );
}

export function boarderRedirectPath(user: Record<string, unknown>): string {
  const status = String(user.boarder_status || user.boarderStatus || 'new');

  switch (status) {
    case 'accepted':
      return '/boarder/confirm-booking';
    case 'confirmed':
      return '/boarder';
    case 'applied_pending':
    case 'pending_confirmation':
    case 'rejected':
      return '/boarder/applications';
    case 'new':
    case 'browsing':
    default:
      return '/boarder/find-a-room';
  }
}

export function redirectPathForUser(user: Record<string, unknown>): string {
  switch (user.role) {
    case 'admin':
      return '/admin';
    case 'landlord':
      return '/landlord';
    case 'boarder':
    default:
      return boarderRedirectPath(user);
  }
}
