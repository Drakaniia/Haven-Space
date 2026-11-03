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

import {
  MAX_PROOF_BYTES,
  allowedProofTypes,
  isoDate,
  landlordUser,
  nonNegativeNumber,
  positiveNumber,
  requireBoarder,
  routeId,
  trimmed,
} from './shared';

export function registerTrackerRoutes(router: Hono<{ Bindings: Env }>) {
  router.get('/api/landlord/payments/tracker', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const tracker = await listTrackerRows(db, user.user_id, {
      propertyId: routeId(c.req.query('propertyId') ?? undefined) ?? undefined,
      roomId: routeId(c.req.query('roomId') ?? undefined) ?? undefined,
      month: c.req.query('month') ?? undefined,
      status: c.req.query('status') ?? undefined,
      dueFrom: isoDate(c.req.query('dueFrom') ?? '') ?? undefined,
      dueTo: isoDate(c.req.query('dueTo') ?? '') ?? undefined,
      overdue: c.req.query('overdue') === '1' || c.req.query('overdue') === 'true',
      needsReview: c.req.query('needsReview') === '1' || c.req.query('needsReview') === 'true',
      search: c.req.query('q') ?? undefined,
    });

    return jsonResponse({ success: true, data: tracker });
  });

  /** One boarder's full charge history, for the tracker row's expansion (D16). */
  router.get('/api/landlord/tenancies/:applicationId/payment-history', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const applicationId = routeId(c.req.param('applicationId'));

    if (!applicationId) {
      return errorResponse(404, 'Tenancy not found');
    }

    const history = await listTenancyPaymentHistory(db, user.user_id, applicationId);

    if (!history) {
      return errorResponse(404, 'Tenancy not found');
    }

    return jsonResponse({ success: true, data: history });
  });

  /** R5 — the landlord edits the tenancy's next due date. */
  router.patch('/api/landlord/tenancies/:applicationId/next-due-date', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const applicationId = routeId(c.req.param('applicationId'));

    if (!applicationId) {
      return errorResponse(404, 'Tenancy not found');
    }

    const body = await readJsonObject(c.req.raw);
    const nextDueDate = isoDate(trimmed(body, 'next_due_date'));

    if (!nextDueDate) {
      return errorResponse(400, 'next_due_date must be YYYY-MM-DD');
    }

    const today = manilaToday();

    if (nextDueDate < today && body.confirm_past !== true) {
      return errorResponse(400, 'That date is in the past', { code: 'next_due_date_in_past' });
    }

    const changed = await setTenancyNextDueDate(db, user.user_id, applicationId, nextDueDate);

    if (changed === 0) {
      return errorResponse(404, 'Tenancy not found');
    }

    const shifted = await shiftPendingRentCharge(db, applicationId, nextDueDate, today);

    return jsonResponse({
      success: true,
      message: 'Next due date updated',
      data: { next_due_date: nextDueDate, shifted },
    });
  });

  /** D14 — the landlord's manual reminder, once per rent cycle. */
  router.post('/api/landlord/charges/:chargeId/remind', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const chargeId = routeId(c.req.param('chargeId'));

    if (!chargeId) {
      return errorResponse(404, 'Charge not found');
    }

    const charge = await findChargeForLandlordWrite(db, chargeId, user.user_id);

    if (!charge) {
      return errorResponse(404, 'Charge not found');
    }

    if (!isOpenStatus(charge.status)) {
      return errorResponse(409, 'This charge is already settled');
    }

    if (await hasPendingSubmission(db, chargeId)) {
      return errorResponse(409, 'This payment is already awaiting verification');
    }

    if (charge.reminder_sent_at) {
      return errorResponse(409, 'A reminder was already sent for this cycle', {
        code: 'reminder_already_sent',
      });
    }

    const total = roundMoney(Number(charge.amount ?? 0) + Number(charge.late_fee ?? 0));

    await insertNotification(db, {
      userId: Number(charge.boarder_id),
      type: 'payment_reminder',
      title: 'Payment reminder',
      message: `Your ${String(charge.charge_type ?? 'rent').replaceAll(
        '_',
        ' '
      )} of ₱${total.toLocaleString()} is due ${String(charge.due_date).slice(0, 10)}.`,
      metadata: {
        charge_id: chargeId,
        amount: total,
        due_date: String(charge.due_date).slice(0, 10),
      },
    });

    await db
      .prepare(
        'UPDATE payments SET reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
      .bind(chargeId)
      .run();

    return jsonResponse({ success: true, message: 'Reminder sent' }, 201);
  });

  /** Landlord-side receipt upload, mirroring the boarder route (D13). */
  router.post('/api/landlord/charges/:chargeId/proof', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const chargeId = routeId(c.req.param('chargeId'));

    if (!chargeId) {
      return errorResponse(404, 'Charge not found');
    }

    if (!(await findChargeForLandlordWrite(db, chargeId, user.user_id))) {
      return errorResponse(404, 'Charge not found');
    }

    const form = await c.req.formData();
    const entry = form.get('proof') as unknown;

    if (
      !entry ||
      typeof entry === 'string' ||
      typeof (entry as { size?: unknown }).size !== 'number' ||
      typeof (entry as { type?: unknown }).type !== 'string'
    ) {
      return errorResponse(400, 'No valid receipt image uploaded');
    }

    const file = entry as File;

    if (file.size > MAX_PROOF_BYTES) {
      return errorResponse(400, 'Receipt image must be less than 2MB');
    }

    if (!allowedProofTypes.has(file.type)) {
      return errorResponse(400, 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
    }

    const [uploaded] = await uploadFilesToUploadThing(c.env, [file], {
      userId: user.user_id,
      purpose: 'payment-proof',
      chargeId,
    });

    if (!uploaded?.data || uploaded.error) {
      return errorResponse(502, uploaded?.error?.message || 'Failed to upload receipt');
    }

    const proofUrl = uploaded.data.ufsUrl || uploaded.data.url || uploaded.data.appUrl;

    if (!proofUrl) {
      return errorResponse(502, 'UploadThing did not return a receipt URL');
    }

    return jsonResponse({ success: true, data: { proof_url: proofUrl } }, 201);
  });
}
