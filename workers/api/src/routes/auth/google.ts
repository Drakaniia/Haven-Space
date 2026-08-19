import type { Context } from 'hono';
import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { readJsonObject, type JsonRecord } from '../../lib/validation';
import {
  createLandlordProfile,
  createGoogleUserAccount,
  createUserAccount,
  determineBoarderStatus,
  findAuthUserByEmail,
  findUserAccountByEmail,
  findUserAccountByGoogleId,
  findUserAccountById,
  updateGoogleIdentity,
  type UserAccountRow,
} from '../../repositories/users';
import {
  accessTokenSeconds,
  refreshTokenSeconds,
  googleStateCookieName,
  googleStateSeconds,
  googlePendingSeconds,
  googleAuthEndpoint,
  googleTokenEndpoint,
  googleUserInfoEndpoint,
} from './helpers.js';
import {
  authCookie,
  authResponse,
  authTokens,
  clearGoogleStateHeaders,
  configuredOrigins,
  frontendOrigin,
  frontendUrl,
  googleRedirectUri,
  googleStateCookie,
  randomToken,
  redirectResponse,
  requireGoogleConfig,
  userHashPayload,
  boarderRedirectPath,
  redirectPathForUser,
  oauthAction,
  oauthRole,
  authErrorRedirect,
} from './helpers.js';
import {
  normalizeEmail,
  isEmail,
  safeRedirectPath,
  stringField,
  missingRequired,
  userPayload,
  type OAuthAction,
  type OAuthRole,
} from './helpers.js';
import { signJwt, verifyJwt, cookieValue, authenticateUser } from '../../lib/auth';

export interface GoogleStatePayload {
  type?: string;
  action?: string;
  role?: string;
  origin?: string;
  nonce?: string;
  redirect?: string;
  exp?: number;
}

export interface GoogleTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface GoogleProfileResponse {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
  error?: string;
  error_description?: string;
}

export interface GooglePendingPayload {
  type?: string;
  googleId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  picture?: string | null;
  action?: string;
  origin?: string;
  link?: boolean;
  exp?: number;
}

export async function formatUserResponse(db: D1Database, user: UserAccountRow) {
  const response: Record<string, unknown> = {
    id: Number(user.id),
    user_id: Number(user.id),
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    is_verified: Boolean(user.is_verified),
    email_verified: Boolean(user.email_verified),
    account_status: user.account_status,
    avatar_url: user.avatar_url,
    phone_number: user.phone_number,
    verification_status:
      user.role === 'landlord' ? (user.is_verified ? 'approved' : 'pending') : null,
  };

  if (user.role === 'boarder') {
    response.boarder_status = await determineBoarderStatus(db, Number(user.id));
  }

  return response;
}

export function validatePhilippinePhone(value: string): boolean {
  const clean = value.replace(/\D/g, '');

  return /^(63|0)?9\d{9}$/.test(clean);
}

export async function createGoogleState(
  secret: string,
  input: {
    action: OAuthAction;
    role: OAuthRole;
    origin: string;
    nonce: string;
    redirect?: string | null;
  }
): Promise<string> {
  const redirect = safeRedirectPath(input.redirect);

  return await signJwt(
    {
      type: 'google_oauth_state',
      action: input.action,
      role: input.role,
      origin: input.origin,
      nonce: input.nonce,
      ...(redirect ? { redirect } : {}),
    },
    secret,
    googleStateSeconds
  );
}

export async function verifiedGoogleState(
  c: Context<{ Bindings: Env }>,
  state: string | null
): Promise<GoogleStatePayload | null> {
  if (!state || !c.env.JWT_SECRET) {
    return null;
  }

  const payload = await verifyJwt(state, c.env.JWT_SECRET);

  if (
    !payload ||
    payload.type !== 'google_oauth_state' ||
    typeof payload.nonce !== 'string' ||
    typeof payload.origin !== 'string'
  ) {
    return null;
  }

  const cookieNonce = cookieValue(c.req.raw, googleStateCookieName);

  if (!cookieNonce || cookieNonce !== payload.nonce) {
    return null;
  }

  return payload;
}

export async function googleTokens(c: Context<{ Bindings: Env }>, code: string): Promise<string> {
  const { clientId, clientSecret } = requireGoogleConfig(c);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: googleRedirectUri(c),
  });

  const response = await fetch(googleTokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token exchange failed');
  }

  return data.access_token;
}

export async function googleProfile(accessToken: string): Promise<GoogleProfileResponse> {
  const response = await fetch(googleUserInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = (await response.json()) as GoogleProfileResponse;

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Google profile request failed');
  }

  return data;
}

export function profileEmailVerified(profile: GoogleProfileResponse): boolean {
  return profile.email_verified === true || profile.email_verified === 'true';
}

export function splitGoogleName(profile: GoogleProfileResponse): { firstName: string; lastName: string } {
  const given = profile.given_name?.trim() ?? '';
  const family = profile.family_name?.trim() ?? '';

  if (given || family) {
    return {
      firstName: given || 'Google',
      lastName: family || 'User',
    };
  }

  const parts = (profile.name || profile.email || 'Google User').trim().split(/\s+/);

  return {
    firstName: parts[0] || 'Google',
    lastName: parts.slice(1).join(' ') || 'User',
  };
}

export type GoogleUserResolution =
  | { kind: 'existing'; user: UserAccountRow }
  | { kind: 'link_required'; user: UserAccountRow }
  | { kind: 'new' };

/**
 * Resolve a Google profile against the user table WITHOUT creating or linking
 * anything. Account creation / Google-identity linking is deferred to the role
 * chooser (`POST /auth/google/complete`) so a brand-new email never silently
 * becomes a boarder and an existing email/password account is never silently
 * linked.
 */
export async function resolveGoogleUser(
  db: D1Database,
  profile: GoogleProfileResponse
): Promise<GoogleUserResolution> {
  const googleId = profile.sub?.trim();
  const email = normalizeEmail(profile.email);

  if (!googleId || !email) {
    throw new Error('Google did not return a usable profile');
  }

  if (!profileEmailVerified(profile)) {
    throw new Error('Google account email is not verified');
  }

  const byGoogleId = await findUserAccountByGoogleId(db, googleId);

  if (byGoogleId) {
    return { kind: 'existing', user: byGoogleId };
  }

  const byEmail = await findUserAccountByEmail(db, email);

  if (byEmail) {
    if (byEmail.google_id && byEmail.google_id !== googleId) {
      throw new Error('This email is already linked to another Google account');
    }

    return { kind: 'link_required', user: byEmail };
  }

  return { kind: 'new' };
}

export async function createGooglePendingToken(
  secret: string | undefined,
  input: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture: string | null;
    action: OAuthAction;
    origin: string;
    link: boolean;
    redirect?: string | null;
  }
): Promise<string> {
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }

  const redirect = safeRedirectPath(input.redirect);

  return await signJwt(
    {
      type: 'google_pending',
      googleId: input.googleId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      picture: input.picture,
      action: input.action,
      origin: input.origin,
      link: input.link,
      ...(redirect ? { redirect } : {}),
    },
    secret,
    googlePendingSeconds
  );
}

export function pendingSessionRedirect(origin: string, token: string): string {
  const url = new URL('/auth/choose-role', origin.endsWith('/') ? origin : `${origin}/`);
  url.hash = `google-pending=${encodeURIComponent(token)}`;

  return url.toString();
}

export async function handleGoogleAuthorize(c: Context<{ Bindings: Env }>): Promise<Response> {
  const action = oauthAction(c.req.query('action'));
  const role = oauthRole(c.req.query('role'));
  const origin = frontendOrigin(c);
  const redirect = safeRedirectPath(c.req.query('redirect'));
  let clientId: string;
  let jwtSecret: string;

  try {
    const config = requireGoogleConfig(c);
    clientId = config.clientId;
    jwtSecret = config.jwtSecret;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google OAuth is not configured';
    return authErrorRedirect(c, origin, action, message);
  }

  const nonce = randomToken();
  const state = await createGoogleState(jwtSecret, {
    action,
    role,
    origin,
    nonce,
    redirect,
  });
  const url = new URL(googleAuthEndpoint);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', googleRedirectUri(c));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'select_account');

  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    googleStateCookie(c.req.url, googleStateCookieName, nonce, googleStateSeconds)
  );

  return redirectResponse(url.toString(), headers);
}

export async function handleGoogleCallback(c: Context<{ Bindings: Env }>): Promise<Response> {
  const state = await verifiedGoogleState(c, c.req.query('state') ?? null);
  const fallbackOrigin = frontendOrigin(c);
  const origin =
    state?.origin && configuredOrigins(c.env).includes(state.origin)
      ? state.origin
      : fallbackOrigin;
  const action = oauthAction(state?.action);

  if (c.req.query('error')) {
    const message =
      c.req.query('error') === 'access_denied'
        ? 'Google login was cancelled.'
        : c.req.query('error_description') || 'Google login failed. Please try again.';
    return authErrorRedirect(c, origin, action, message);
  }

  if (!state) {
    return authErrorRedirect(c, origin, action, 'Google login session expired. Please try again.');
  }

  const code = c.req.query('code');

  if (!code) {
    return authErrorRedirect(c, origin, action, 'Google did not return an authorization code.');
  }

  try {
    const db = requireD1(c.env);
    const googleAccessToken = await googleTokens(c, code);
    const profile = await googleProfile(googleAccessToken);
    const resolution = await resolveGoogleUser(db, profile);

    if (resolution.kind === 'existing') {
      const user = resolution.user;

      if (['suspended', 'banned'].includes(user.account_status)) {
        return authErrorRedirect(
          c,
          origin,
          action,
          'This account is suspended or banned. Contact support if you believe this is a mistake.'
        );
      }

      const { accessToken, refreshToken } = await authTokens(user, c.env.JWT_SECRET);
      const formattedUser = await formatUserResponse(db, user);
      const redirectPath = safeRedirectPath(state?.redirect) ?? redirectPathForUser(formattedUser);
      const redirectUrl = new URL(redirectPath, `${origin}/`);
      // Carried so the frontend's global OAuth hash handler can send the user
      // back to the page they started from (e.g. /haven-ai) instead of the
      // default role home.
      redirectUrl.searchParams.set('redirect', redirectPath);
      redirectUrl.hash = `auth=${userHashPayload(formattedUser, accessToken, refreshToken)}`;

      const headers = clearGoogleStateHeaders(c);
      headers.append(
        'Set-Cookie',
        authCookie('access_token', accessToken, accessTokenSeconds, c.env)
      );
      headers.append(
        'Set-Cookie',
        authCookie('refresh_token', refreshToken, refreshTokenSeconds, c.env)
      );

      return redirectResponse(redirectUrl.toString(), headers);
    }

    // Brand-new email (or an existing email not yet linked to Google): do NOT
    // create an account or link identities here. Hand the user a short-lived
    // pending session and send them to the role chooser, which completes the
    // flow via POST /auth/google/complete.
    const googleId = profile.sub?.trim();
    const email = normalizeEmail(profile.email);

    if (!googleId || !email) {
      throw new Error('Google did not return a usable profile');
    }

    const { firstName, lastName } = splitGoogleName(profile);
    const pendingToken = await createGooglePendingToken(c.env.JWT_SECRET, {
      googleId,
      email,
      firstName,
      lastName,
      picture: profile.picture ?? null,
      action,
      origin,
      link: resolution.kind === 'link_required',
      redirect: safeRedirectPath(state?.redirect),
    });

    return redirectResponse(
      pendingSessionRedirect(origin, pendingToken),
      clearGoogleStateHeaders(c)
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Google login failed. Please try again.';

    return authErrorRedirect(c, origin, action, message);
  }
}

export async function handleGoogleComplete(c: Context<{ Bindings: Env }>): Promise<Response> {
  const db = requireD1(c.env);
  const body = await readJsonObject(c.req.raw);
  const pendingToken = stringField(body, 'pendingToken');

  if (!pendingToken || !c.env.JWT_SECRET) {
    return errorResponse(401, 'Invalid or expired Google session. Please try again.');
  }

  const payload = await verifyJwt(pendingToken, c.env.JWT_SECRET);

  if (
    !payload ||
    payload.type !== 'google_pending' ||
    typeof payload.googleId !== 'string' ||
    typeof payload.email !== 'string'
  ) {
    return errorResponse(401, 'Invalid or expired Google session. Please try again.');
  }

  const googleId = payload.googleId;
  const email = payload.email;

  const complete = async (user: UserAccountRow): Promise<Response> => {
    if (['suspended', 'banned'].includes(user.account_status)) {
      return errorResponse(
        403,
        'This account is suspended or banned. Contact support if you believe this is a mistake.'
      );
    }

    const { accessToken, refreshToken } = await authTokens(user, c.env.JWT_SECRET);
    const formattedUser = await formatUserResponse(db, user);

    return authResponse(
      c.env,
      {
        success: true,
        access_token: accessToken,
        refresh_token: refreshToken,
        user: formattedUser,
      },
      accessToken,
      refreshToken
    );
  };

  // Already linked to this Google account (e.g. a replayed or reused pending
  // token): treat as a normal login and skip creation/linking.
  const byGoogleId = await findUserAccountByGoogleId(db, googleId);

  if (byGoogleId) {
    return await complete(byGoogleId);
  }

  const byEmail = await findUserAccountByEmail(db, email);

  if (byEmail) {
    if (byEmail.google_id && byEmail.google_id !== googleId) {
      return errorResponse(409, 'This email is already linked to another Google account');
    }

    if (payload.link !== true) {
      return errorResponse(
        409,
        'An account already exists for this email. Please log in or link your Google account.'
      );
    }

    await updateGoogleIdentity(db, Number(byEmail.id), {
      googleId,
      googlePicture: typeof payload.picture === 'string' ? payload.picture : null,
    });
    const linked = await findUserAccountById(db, Number(byEmail.id));

    if (!linked) {
      return errorResponse(500, 'Unable to load linked Google account');
    }

    return await complete(linked);
  }

  // Brand-new email: create the account for the chosen role. Google's email
  // verification is trusted (email_verified = 1). Landlords start unverified
  // (is_verified = 0) and land on the dashboard with a pending banner; boarders
  // are created as status 'new'.
  const role = stringField(body, 'role');

  if (role !== 'boarder' && role !== 'landlord') {
    return errorResponse(400, 'Invalid role');
  }

  const firstName =
    stringField(body, 'firstName') ||
    (typeof payload.firstName === 'string' && payload.firstName ? payload.firstName : 'Google');
  const lastName =
    stringField(body, 'lastName') ||
    (typeof payload.lastName === 'string' && payload.lastName ? payload.lastName : 'User');

  const userId = await createGoogleUserAccount(db, {
    firstName,
    lastName,
    email,
    googleId,
    googlePicture: typeof payload.picture === 'string' ? payload.picture : null,
    role,
    accountStatus: 'active',
    isVerified: role === 'landlord' ? 0 : 1,
    emailVerified: 1,
    boarderStatus: role === 'boarder' ? 'new' : null,
    phoneNumber: stringField(body, 'phoneNumber') || null,
  });

  if (role === 'landlord') {
    await createLandlordProfile(db, {
      userId,
      boardingHouseName: stringField(body, 'businessName'),
      boardingHouseDescription: stringField(body, 'businessDescription'),
      city: stringField(body, 'city'),
      province: stringField(body, 'province'),
    });
  }

  const created = await findUserAccountById(db, userId);

  if (!created) {
    return errorResponse(500, 'Unexpected Google signup error');
  }

  return await complete(created);
}
