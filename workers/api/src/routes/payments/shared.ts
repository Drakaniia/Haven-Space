import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { authorizeUser, type AuthenticatedUser } from '../../lib/auth';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { readJsonObject, type JsonRecord } from '../../lib/validation';
import { uploadFilesToUploadThing } from '../../lib/uploadthing';
import { findLandlordBoarderApplication } from '../../repositories/landlord-boarders';
import { findLandlordRoomProperty } from '../../repositories/landlord-rooms';
import {
  buildLedgerResponse,
  cancelCharge,
  createManualCharge,
  createSubmission,
  findChargeForBoarder,
  findChargeForLandlordWrite,
  findPropertyBillingSettings,
  findScheduleInput,
  findSubmissionForLandlord,
  formatCharge,
  generateScheduleForApplication,
  hasPendingSubmission,
  insertNotification,
  isChargeType,
  isOpenStatus,
  isPaymentMethod,
  listChargesForBoarder,
  listChargesForLandlord,
  listTenancyPaymentHistory,
  listTrackerRows,
  manilaToday,
  methodRequiresReceipt,
  methodRequiresReference,
  monthKey,
  notifyBoarderOfDecision,
  notifyLandlordOfSubmission,
  outstandingFor,
  resolveDeposit,
  reanchorNextDue,
  roundMoney,
  setApplicationAdvanceAmount,
  setChargeStatus,
  setTenancyNextDueDate,
  settleCharge,
  shiftPendingRentCharge,
  summarizeCharges,
  trackerToCsv,
  updateCharge,
  updatePropertyBillingSettings,
  updateSubmissionDecision,
} from '../../repositories/payments';
import { requireLandlord } from '../landlord/shared';

export const allowedProofTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
/** Phone screenshots routinely pass 2MB; the web app also downsizes before upload. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

/**
 * The image type from the file's magic bytes. Browsers send an empty or odd
 * `File.type` for some picks (renamed files, some Android galleries), which used
 * to reject a perfectly valid screenshot.
 */
export async function sniffImageType(file: Blob): Promise<string | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'GIF8') return 'image/gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';

  return null;
}

/**
 * Validates and uploads one receipt image from a multipart `proof` field, shared
 * by the boarder and landlord proof routes. Returns the stored URL or an error response.
 */
export async function uploadProofFromRequest(
  c: Context<{ Bindings: Env }>,
  meta: { userId: number; chargeId: number }
): Promise<{ proofUrl: string } | Response> {
  let form: FormData;

  try {
    form = await c.req.formData();
  } catch {
    return errorResponse(400, 'No valid receipt image uploaded');
  }

  const entry = form.get('proof') as unknown;

  if (
    !entry ||
    typeof entry === 'string' ||
    typeof (entry as { size?: unknown }).size !== 'number' ||
    typeof (entry as { arrayBuffer?: unknown }).arrayBuffer !== 'function'
  ) {
    return errorResponse(400, 'No valid receipt image uploaded');
  }

  const file = entry as File;

  if (file.size === 0) {
    return errorResponse(400, 'The receipt image is empty');
  }

  if (file.size > MAX_PROOF_BYTES) {
    return errorResponse(400, 'Receipt image must be less than 5MB');
  }

  // Trust the bytes, not the browser's label.
  const type = await sniffImageType(file);

  if (!type || !allowedProofTypes.has(type)) {
    return errorResponse(400, 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
  }

  const extension = type.split('/')[1];
  const baseName = (file.name || 'receipt').replace(/\.[^.]*$/, '') || 'receipt';
  const upload = file.type === type ? file : new File([file], `${baseName}.${extension}`, { type });

  const [uploaded] = await uploadFilesToUploadThing(c.env, [upload], {
    userId: meta.userId,
    purpose: 'payment-proof',
    chargeId: meta.chargeId,
  });

  if (!uploaded?.data || uploaded.error) {
    return errorResponse(502, uploaded?.error?.message || 'Failed to upload receipt');
  }

  const proofUrl = uploaded.data.ufsUrl || uploaded.data.url || uploaded.data.appUrl;

  if (!proofUrl) {
    return errorResponse(502, 'UploadThing did not return a receipt URL');
  }

  return { proofUrl };
}

export function routeId(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function positiveNumber(value: unknown): number | null {
  const parsed = Number.parseFloat(String(value ?? ''));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function nonNegativeNumber(value: unknown): number | null {
  const parsed = Number.parseFloat(String(value ?? ''));

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function trimmed(body: JsonRecord | null, field: string): string {
  const value = body?.[field];

  return typeof value === 'string' ? value.trim() : '';
}

export function isoDate(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function requireBoarder(c: Context<{ Bindings: Env }>): Promise<AuthenticatedUser> {
  const db = requireD1(c.env);

  return await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
}

export async function landlordUser(
  c: Context<{ Bindings: Env }>
): Promise<AuthenticatedUser | Response> {
  return await requireLandlord(c);
}

// ---------------------------------------------------------------- boarder ----
