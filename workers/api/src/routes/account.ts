import { compare, hash } from 'bcryptjs';
import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import {
  authenticateUser,
  cookieValue,
  signJwt,
  verifyJwt,
  type AuthenticatedUser,
} from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { uploadFilesToUploadThing } from '../lib/uploadthing';
import { isJsonRecord, readJsonObject, type JsonRecord } from '../lib/validation';
import { z } from 'zod';
import {
  ensureBoarderProfile,
  findPasswordResetByCode,
  findPasswordResetByIdAndEmail,
  findPasswordUserByEmail,
  findPasswordUserById,
  findUserProfileById,
  hasAcceptedApplication,
  incrementPasswordResetAttempts,
  markPasswordResetUsed,
  upsertPasswordResetRequest,
  updateBoarderOnboardingAction,
  updateBoarderOnboardingData,
  updateLandlordOnboardingData,
  updatePasswordHash,
  updateUserAvatarUrl,
  updateUserProfile,
  ensureLandlordProfile,
} from '../repositories/account';
import {
  determineBoarderStatus,
  findUserAccountById,
  type UserAccountRow,
} from '../repositories/users';

const accountRoutes = new Hono<{ Bindings: Env }>();
const accessTokenSeconds = 60 * 60;
const refreshTokenSeconds = 60 * 60 * 24 * 30;
const passwordResetTtlSeconds = 15 * 60;
const allowedAvatarTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function stringField(body: JsonRecord, field: string): string {
  const value = body[field];

  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const email = value.trim();

  return email ? email.toLowerCase() : null;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePhilippinePhone(value: string): boolean {
  const clean = value.replace(/\D/g, '');

  return /^(63|0)?9\d{9}$/.test(clean);
}

function userPayload(user: UserAccountRow): Record<string, unknown> {
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

async function authTokens(user: UserAccountRow, secret?: string) {
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }

  const payload = userPayload(user);
  const accessToken = await signJwt(payload, secret, accessTokenSeconds);
  const refreshToken = await signJwt(payload, secret, refreshTokenSeconds);

  return { accessToken, refreshToken };
}

function authCookie(name: string, value: string, maxAge: number, env: Env): string {
  const secure = env.APP_ENV === 'production' ? '; Secure' : '';

  return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function authResponse(
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

function clearAuthResponse(env: Env): Response {
  const response = jsonResponse({
    success: true,
    message: 'Logged out successfully',
  });

  response.headers.append('Set-Cookie', authCookie('access_token', '', 0, env));
  response.headers.append('Set-Cookie', authCookie('refresh_token', '', 0, env));

  return response;
}

function resetCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);

  return String(values[0] % 1_000_000).padStart(6, '0');
}

async function requireUser(c: Context<{ Bindings: Env }>): Promise<AuthenticatedUser> {
  return authenticateUser(requireD1(c.env), c.req.raw, c.env.JWT_SECRET);
}

async function handleProfile(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const authUser = await requireUser(c);
  const user = await findUserProfileById(db, authUser.user_id);

  if (!user) {
    return errorResponse(404, 'User not found');
  }

  if (user.role === 'boarder') {
    user.boarder_status = await determineBoarderStatus(db, Number(user.id));
  }

  return jsonResponse({ user });
}

async function handleUpdateProfile(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const authUser = await requireUser(c);
  const body = await readJsonObject(c.req.raw);
  const firstName = stringField(body, 'first_name');
  const lastName = stringField(body, 'last_name');
  const phoneNumber = stringField(body, 'phone_number') || null;
  const city = stringField(body, 'city') || null;
  const province = stringField(body, 'province') || null;

  if (!firstName || !lastName) {
    return errorResponse(400, 'First name and last name are required');
  }

  if (phoneNumber && !validatePhilippinePhone(phoneNumber)) {
    return errorResponse(400, 'Invalid Philippine mobile number format');
  }

  await updateUserProfile(db, authUser.user_id, authUser.role, {
    firstName,
    lastName,
    phoneNumber,
    city,
    province,
  });

  const updated = await findUserProfileById(db, authUser.user_id);

  return jsonResponse({
    message: 'Profile updated successfully',
    user: updated,
  });
}

async function handleAvatarUpload(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const authUser = await requireUser(c);
  const form = await c.req.formData();
  const entry = form.get('avatar') as unknown;

  if (
    !entry ||
    typeof entry === 'string' ||
    typeof (entry as { size?: unknown }).size !== 'number' ||
    typeof (entry as { type?: unknown }).type !== 'string'
  ) {
    return errorResponse(400, 'No valid file uploaded');
  }

  const file = entry as File;

  if (file.size > 2 * 1024 * 1024) {
    return errorResponse(400, 'File size must be less than 2MB');
  }

  if (!allowedAvatarTypes.has(file.type)) {
    return errorResponse(400, 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
  }

  const [uploaded] = await uploadFilesToUploadThing(c.env, [file], {
    userId: authUser.user_id,
    purpose: 'avatar',
  });

  if (!uploaded?.data || uploaded.error) {
    return errorResponse(502, uploaded?.error?.message || 'Failed to upload avatar');
  }

  const avatarUrl = uploaded.data.ufsUrl || uploaded.data.url || uploaded.data.appUrl;

  if (!avatarUrl) {
    return errorResponse(502, 'UploadThing did not return an avatar URL');
  }

  await updateUserAvatarUrl(db, authUser.user_id, avatarUrl);

  return jsonResponse({
    message: 'Avatar uploaded successfully',
    avatar_url: avatarUrl,
  });
}

async function handleChangePassword(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const authUser = await requireUser(c);
  const body = await readJsonObject(c.req.raw);
  const currentPassword = stringField(body, 'current_password');
  const newPassword = stringField(body, 'new_password');

  if (!currentPassword || !newPassword) {
    return errorResponse(400, 'Current password and new password are required');
  }

  if (newPassword.length < 8) {
    return errorResponse(400, 'New password must be at least 8 characters');
  }

  const user = await findPasswordUserById(db, authUser.user_id);

  if (!user) {
    return errorResponse(404, 'User not found');
  }

  if (!user.password_hash && user.google_id) {
    return errorResponse(400, 'Google accounts cannot change password here');
  }

  if (!user.password_hash || !(await compare(currentPassword, user.password_hash))) {
    return errorResponse(401, 'Current password is incorrect');
  }

  await updatePasswordHash(db, authUser.user_id, await hash(newPassword, 10));

  return jsonResponse({ message: 'Password updated successfully' });
}

async function handleForgotPassword(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const body = await readJsonObject(c.req.raw);
  const email = normalizeEmail(body.email);

  if (!email) {
    return errorResponse(400, 'Email is required');
  }

  if (!isEmail(email)) {
    return errorResponse(400, 'Invalid email format');
  }

  const user = await findPasswordUserByEmail(db, email);

  if (!user) {
    return jsonResponse(
      {
        error: 'No account found with this email address. Please check your email or sign up.',
        error_code: 'EMAIL_NOT_FOUND',
      },
      404
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const code = resetCode();
  const requestId = await upsertPasswordResetRequest(db, {
    userId: Number(user.id),
    email,
    resetCode: code,
    expiresAt: now + passwordResetTtlSeconds,
    now,
  });
  const bodyOut: Record<string, unknown> = {
    message:
      user.google_id && !user.password_hash
        ? 'Password setup instructions sent to your email'
        : 'Reset code has been sent to your email',
    request_id: requestId,
  };

  if (user.google_id && !user.password_hash) {
    bodyOut.is_google_user = true;
    bodyOut.action = 'password_setup';
  }

  if (c.env.APP_ENV === 'test') {
    bodyOut.reset_code = code;
  }

  return jsonResponse(bodyOut);
}

async function handleVerifyResetCode(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const body = await readJsonObject(c.req.raw);
  const email = normalizeEmail(body.email);
  const code = stringField(body, 'code');

  if (!email || !code) {
    return errorResponse(400, 'Email and code are required');
  }

  if (!isEmail(email)) {
    return errorResponse(400, 'Invalid email format');
  }

  if (!/^\d{6}$/.test(code)) {
    return errorResponse(400, 'Invalid code format');
  }

  const request = await findPasswordResetByCode(db, email, code);

  if (!request) {
    return errorResponse(404, 'Invalid or expired reset code');
  }

  if (request.expires_at < Math.floor(Date.now() / 1000)) {
    return errorResponse(400, 'Reset code has expired');
  }

  if (request.attempts >= 5) {
    return errorResponse(400, 'Too many attempts. Please request a new code');
  }

  await incrementPasswordResetAttempts(db, request.id);

  return jsonResponse({
    message: 'Reset code verified successfully',
    valid: true,
    user_id: request.user_id,
    request_id: request.id,
  });
}

async function handleResendResetCode(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const body = await readJsonObject(c.req.raw);
  const email = normalizeEmail(body.email);

  if (!email) {
    return errorResponse(400, 'Email is required');
  }

  if (!isEmail(email)) {
    return errorResponse(400, 'Invalid email format');
  }

  const user = await findPasswordUserByEmail(db, email);

  if (!user) {
    return jsonResponse({ message: 'If this email exists, a reset code has been sent' });
  }

  const now = Math.floor(Date.now() / 1000);
  const code = resetCode();
  const requestId = await upsertPasswordResetRequest(db, {
    userId: Number(user.id),
    email,
    resetCode: code,
    expiresAt: now + passwordResetTtlSeconds,
    now,
  });
  const bodyOut: Record<string, unknown> = {
    message: 'A new reset code has been sent to your email',
    request_id: requestId,
  };

  if (c.env.APP_ENV === 'test') {
    bodyOut.reset_code = code;
  }

  return jsonResponse(bodyOut);
}

async function handleResetPassword(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const body = await readJsonObject(c.req.raw);
  const email = normalizeEmail(body.email);
  const requestId = Number.parseInt(String(body.request_id ?? ''), 10);
  const newPassword = stringField(body, 'new_password');

  if (!email || !Number.isFinite(requestId) || requestId <= 0 || !newPassword) {
    return errorResponse(400, 'Email, request ID, and new password are required');
  }

  if (!isEmail(email)) {
    return errorResponse(400, 'Invalid email format');
  }

  if (newPassword.length < 8) {
    return errorResponse(400, 'Password must be at least 8 characters long');
  }

  const request = await findPasswordResetByIdAndEmail(db, requestId, email);

  if (!request) {
    return errorResponse(404, 'Invalid or expired reset request');
  }

  const now = Math.floor(Date.now() / 1000);

  if (request.expires_at < now) {
    return errorResponse(400, 'Reset request has expired');
  }

  const changes = await updatePasswordHash(db, request.user_id, await hash(newPassword, 10));

  if (changes === 0) {
    return errorResponse(404, 'User not found');
  }

  await markPasswordResetUsed(db, request.id, now);

  return jsonResponse({ message: 'Password has been reset successfully' });
}

async function handleRefreshToken(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const token = cookieValue(c.req.raw, 'refresh_token');

  if (!token) {
    return errorResponse(401, 'No refresh token provided');
  }

  if (!c.env.JWT_SECRET) {
    return errorResponse(500, 'JWT secret is not configured');
  }

  const payload = await verifyJwt(token, c.env.JWT_SECRET);

  if (!payload) {
    return errorResponse(401, 'Invalid or expired refresh token');
  }

  const userId = Number(payload.user_id);

  if (!Number.isFinite(userId) || userId <= 0) {
    return errorResponse(401, 'Invalid refresh token');
  }

  const user = await findUserAccountById(db, userId);

  if (!user) {
    return errorResponse(401, 'User not found');
  }

  if (user.account_status !== 'active') {
    return errorResponse(403, 'Account is not active');
  }

  const { accessToken, refreshToken } = await authTokens(user, c.env.JWT_SECRET);

  return authResponse(
    c.env,
    {
      success: true,
      message: 'Token refreshed successfully',
      access_token: accessToken,
    },
    accessToken,
    refreshToken
  );
}

async function handleOnboardingStatus(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await authenticateUser(db, c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'boarder') {
    return errorResponse(403, 'Access denied. Boarders only.');
  }

  if (!(await hasAcceptedApplication(db, user.user_id))) {
    return jsonResponse({
      show_onboarding: false,
      reason: 'no_accepted_application',
    });
  }

  const profile = await ensureBoarderProfile(db, user.user_id);
  const checklist = {
    application_accepted: true,
    payment_method_added: false,
    profile_completed: Boolean(profile.bio && profile.occupation),
    house_rules_read: false,
  };
  const allCompleted = checklist.payment_method_added && checklist.profile_completed;

  return jsonResponse({
    show_onboarding: !allCompleted && !profile.onboarding_completed_at,
    checklist,
    onboarding_completed: Boolean(profile.onboarding_completed_at),
    dismissed_at: profile.onboarding_dismissed_at,
  });
}

async function handleUpdateOnboarding(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await authenticateUser(db, c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'boarder') {
    return errorResponse(403, 'Access denied. Boarders only.');
  }

  const body = await readJsonObject(c.req.raw);
  const action = stringField(body, 'action');

  if (!action) {
    return errorResponse(400, 'Action is required');
  }

  if (
    ![
      'mark_payment_method_added',
      'mark_profile_completed',
      'mark_house_rules_read',
      'dismiss',
      'complete',
    ].includes(action)
  ) {
    return errorResponse(400, 'Invalid action');
  }

  await ensureBoarderProfile(db, user.user_id);
  await updateBoarderOnboardingAction(db, user.user_id, action);

  return jsonResponse({
    success: true,
    message: 'Onboarding status updated',
  });
}

const BOARDER_ONBOARDING_STEPS = ['profile', 'preferences'] as const;
const LANDLORD_ONBOARDING_STEPS = ['profile', 'property', 'verification'] as const;

const BOARDER_ONBOARDING_SCHEMA = z.object({
  bio: z.string().optional(),
  occupation: z.string().optional(),
  moveInDate: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  searchPreferences: z.record(z.string(), z.unknown()).optional(),
});

const LANDLORD_ONBOARDING_SCHEMA = z.object({
  businessName: z.string().optional(),
  description: z.string().optional(),
  bio: z.string().optional(),
  contactNumber: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  totalRooms: z.number().int().nonnegative().optional(),
  availableRooms: z.number().int().nonnegative().optional(),
  stripeConnectId: z.string().optional(),
  verificationStatus: z.string().optional(),
});
async function handleOnboardingDataUpdate(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await authenticateUser(db, c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'boarder' && user.role !== 'landlord') {
    return errorResponse(403, 'Access denied. Boarders and landlords only.');
  }

  const schema = user.role === 'boarder' ? BOARDER_ONBOARDING_SCHEMA : LANDLORD_ONBOARDING_SCHEMA;
  const steps = user.role === 'boarder' ? BOARDER_ONBOARDING_STEPS : LANDLORD_ONBOARDING_STEPS;

  const body = await readJsonObject(c.req.raw);
  const step = stringField(body, 'step');

  if (!step || !(steps as readonly string[]).includes(step)) {
    return errorResponse(400, `Invalid step. Expected one of: ${steps.join(', ')}`);
  }

  const raw = body['data'];
  if (!isJsonRecord(raw)) {
    return errorResponse(400, 'A data object is required for onboarding steps');
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(400, 'Invalid onboarding data');
  }

  if (user.role === 'boarder') {
    await ensureBoarderProfile(db, user.user_id);
    await updateBoarderOnboardingData(db, user.user_id, step, parsed.data);
  } else {
    await ensureLandlordProfile(db, user.user_id);
    await updateLandlordOnboardingData(db, user.user_id, step, parsed.data);
  }

  return jsonResponse({
    success: true,
    message: 'Onboarding step saved',
  });
}

accountRoutes.get('/api/users/profile', handleProfile);
accountRoutes.put('/api/users/profile', handleUpdateProfile);
accountRoutes.patch('/api/users/profile', handleUpdateProfile);
accountRoutes.post('/api/users/avatar', handleAvatarUpload);
accountRoutes.post('/auth/change-password', handleChangePassword);
accountRoutes.post('/auth/forgot-password', handleForgotPassword);
accountRoutes.post('/auth/verify-reset-code', handleVerifyResetCode);
accountRoutes.post('/auth/resend-reset-code', handleResendResetCode);
accountRoutes.post('/auth/reset-password', handleResetPassword);
accountRoutes.post('/auth/refresh-token', handleRefreshToken);
accountRoutes.post('/auth/logout', c => clearAuthResponse(c.env));
accountRoutes.get('/api/boarder/onboarding-status', handleOnboardingStatus);
accountRoutes.post('/api/boarder/update-onboarding', handleUpdateOnboarding);
accountRoutes.post('/api/boarder/update-onboarding-data', handleOnboardingDataUpdate);
accountRoutes.post('/api/landlord/update-onboarding-data', handleOnboardingDataUpdate);

export default accountRoutes;
