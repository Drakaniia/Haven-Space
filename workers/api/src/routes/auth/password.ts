import { compare, hash } from 'bcryptjs';
import type { Context } from 'hono';
import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { readJsonObject, type JsonRecord } from '../../lib/validation';
import {
  createUserAccount,
  createLandlordProfile,
  findAuthUserByEmail,
  findUserAccountByEmail,
  findUserAccountById,
  type UserAccountRow,
} from '../../repositories/users';
import {
  accessTokenSeconds,
  refreshTokenSeconds,
  authCookie,
  authResponse,
  authTokens,
  isEmail,
  normalizeEmail,
  safeRedirectPath,
  stringField,
  missingRequired,
  userPayload,
} from './helpers.js';
import { authenticateUser } from '../../lib/auth';
import { formatUserResponse, validatePhilippinePhone } from './google.js';

export async function handleCheckEmail(c: Context<{ Bindings: Env }>) {
  const body = await readJsonObject(c.req.raw);
  const email = normalizeEmail(body.email);

  if (!email) {
    return errorResponse(400, 'Email is required');
  }

  if (!isEmail(email)) {
    return errorResponse(400, 'Invalid email format');
  }

  const user = await findAuthUserByEmail(requireD1(c.env), email);

  if (!user) {
    return jsonResponse({
      exists: false,
      is_google_account: false,
    });
  }

  return jsonResponse({
    exists: true,
    is_google_account: Boolean(user.google_id) && !user.password_hash,
  });
}

export async function handleRegister(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const body = await readJsonObject(c.req.raw);
  const firstName = stringField(body, 'firstName');
  const lastName = stringField(body, 'lastName');
  const email = normalizeEmail(body.email);
  const password = stringField(body, 'password');
  const role = stringField(body, 'role');

  if (!firstName || !lastName || !email || !password || !role) {
    return errorResponse(400, 'Missing required fields');
  }

  if (role !== 'boarder' && role !== 'landlord') {
    return errorResponse(400, 'Invalid role');
  }

  if (!isEmail(email)) {
    return errorResponse(400, 'Invalid email format');
  }

  if (password.length < 8) {
    return errorResponse(400, 'Password must be at least 8 characters long');
  }

  if (role === 'landlord') {
    if (
      missingRequired(body, [
        'businessName',
        'city',
        'province',
        'phoneNumber',
        'idType',
        'idNumber',
      ])
    ) {
      return errorResponse(400, 'Missing required landlord profile fields');
    }

    if (!validatePhilippinePhone(stringField(body, 'phoneNumber'))) {
      return errorResponse(400, 'Invalid Philippine mobile number format');
    }
  }

  const existing = await findUserAccountByEmail(db, email);

  if (existing) {
    return jsonResponse(
      {
        success: false,
        error: 'Email already exists',
        message:
          'This email address is already registered. Please use a different email or try logging in instead.',
      },
      409
    );
  }

  const passwordHash = await hash(password, 10);
  const userId = await createUserAccount(db, {
    firstName,
    lastName,
    email,
    passwordHash,
    role,
    accountStatus: role === 'landlord' ? 'pending_verification' : 'active',
    isVerified: role === 'landlord' ? 0 : 1,
    emailVerified: role === 'landlord' ? 0 : 1,
    boarderStatus: role === 'boarder' ? 'new' : null,
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

  const user = await findUserAccountById(db, userId);

  if (!user) {
    return errorResponse(500, 'Unexpected registration error');
  }

  const { accessToken, refreshToken } = await authTokens(user, c.env.JWT_SECRET);
  const responseData: Record<string, unknown> = {
    success: true,
    message:
      role === 'landlord'
        ? 'Landlord account created successfully. Please check your email to verify your account, then complete the verification process.'
        : 'Boarder account created successfully. Please check your email to verify your account.',
    access_token: accessToken,
    refresh_token: refreshToken,
    user: await formatUserResponse(db, user),
    nextSteps:
      role === 'landlord'
        ? [
            'Verify your email address',
            'Upload required verification documents',
            'Wait for admin approval (24-48 hours)',
            'Start listing your properties',
          ]
        : [
            'Verify your email address',
            'Complete your profile (optional)',
            'Start browsing available rooms',
          ],
  };

  return authResponse(c.env, responseData, accessToken, refreshToken);
}

export async function handleLogin(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const body = await readJsonObject(c.req.raw);
  const email = normalizeEmail(body.email);
  const password = stringField(body, 'password');

  if (!email || !password) {
    return errorResponse(400, 'Missing email or password');
  }

  const user = await findUserAccountByEmail(db, email);

  if (!user) {
    return jsonResponse(
      {
        error: 'Account does not exist',
        message: 'This account does not exist. Please sign up first.',
      },
      401
    );
  }

  if (!user.password_hash && user.google_id) {
    return errorResponse(401, 'This account was registered with Google. Please use Google login.');
  }

  if (!user.password_hash || !(await compare(password, user.password_hash))) {
    return jsonResponse(
      {
        error: 'Wrong password',
        message: 'The password you entered is incorrect. Please try again.',
      },
      401
    );
  }

  if (['suspended', 'banned'].includes(user.account_status)) {
    return errorResponse(
      403,
      'This account is suspended or banned. Contact support if you believe this is a mistake.'
    );
  }

  const { accessToken, refreshToken } = await authTokens(user, c.env.JWT_SECRET);

  return authResponse(
    c.env,
    {
      success: true,
      access_token: accessToken,
      user: await formatUserResponse(db, user),
    },
    accessToken,
    refreshToken
  );
}

export async function handleMe(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const authUser = await authenticateUser(db, c.req.raw, c.env.JWT_SECRET);
  const user = await findUserAccountById(db, authUser.user_id);

  if (!user) {
    return errorResponse(401, 'User not found');
  }

  return jsonResponse({
    success: true,
    user: await formatUserResponse(db, user),
  });
}
