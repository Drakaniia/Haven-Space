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
export const MAX_PROOF_BYTES = 2 * 1024 * 1024;

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
