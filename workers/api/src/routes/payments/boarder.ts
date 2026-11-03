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

export function registerBoarderRoutes(router: Hono<{ Bindings: Env }>) {
  router.get('/api/boarder/payments', async c => {
    const db = requireD1(c.env);
    const user = await requireBoarder(c);
    const month = c.req.query('month');
    const charges = await listChargesForBoarder(db, user.user_id, { month });

    return jsonResponse({
      success: true,
      data: {
        charges,
        summary: summarizeCharges(charges),
      },
    });
  });

  router.get('/api/boarder/payments/:chargeId', async c => {
    const db = requireD1(c.env);
    const user = await requireBoarder(c);
    const chargeId = routeId(c.req.param('chargeId'));

    if (!chargeId) {
      return errorResponse(404, 'Charge not found');
    }

    const charge = await findChargeForBoarder(db, chargeId, user.user_id);

    if (!charge) {
      // 404 rather than 403 so charge ids cannot be enumerated (spec R15).
      return errorResponse(404, 'Charge not found');
    }

    return jsonResponse({ success: true, data: charge });
  });

  router.post('/api/boarder/payments/:chargeId/submissions', async c => {
    const db = requireD1(c.env);
    const user = await requireBoarder(c);
    const chargeId = routeId(c.req.param('chargeId'));

    if (!chargeId) {
      return errorResponse(404, 'Charge not found');
    }

    const charge = await findChargeForBoarder(db, chargeId, user.user_id);

    if (!charge) {
      return errorResponse(404, 'Charge not found');
    }

    if (!isOpenStatus(charge.stored_status)) {
      return errorResponse(409, 'This charge is already settled');
    }

    const body = await readJsonObject(c.req.raw);
    const method = trimmed(body, 'payment_method');
    const reference = trimmed(body, 'reference_number');

    if (!isPaymentMethod(method)) {
      return errorResponse(400, 'Payment method is required');
    }

    if (!reference) {
      // The reference is the only proof every method can provide (spec D10).
      return errorResponse(400, 'Reference number is required');
    }

    if (await hasPendingSubmission(db, chargeId)) {
      return errorResponse(409, 'A payment for this charge is already awaiting verification');
    }

    const amount = outstandingFor(charge);

    if (amount <= 0) {
      return errorResponse(409, 'This charge has nothing left to pay');
    }

    const proofUrl = trimmed(body, 'proof_url') || null;
    const notes = trimmed(body, 'notes') || null;
    const submissionId = await createSubmission(db, {
      chargeId,
      amount,
      submittedBy: user.user_id,
      method,
      reference,
      proofUrl,
      notes,
    });

    await setChargeStatus(db, chargeId, 'awaiting_verification');
    await notifyLandlordOfSubmission(db, {
      landlordId: charge.landlord_id,
      chargeId,
      boarderName: charge.boarder_name ?? '',
      total: amount,
      dueDate: charge.due_date,
    });

    return jsonResponse(
      {
        success: true,
        message: 'Payment submitted for verification',
        data: { submission_id: submissionId, status: 'awaiting_verification', amount },
      },
      201
    );
  });

  router.post('/api/boarder/payments/:chargeId/proof', async c => {
    const db = requireD1(c.env);
    const user = await requireBoarder(c);
    const chargeId = routeId(c.req.param('chargeId'));

    if (!chargeId) {
      return errorResponse(404, 'Charge not found');
    }

    const charge = await findChargeForBoarder(db, chargeId, user.user_id);

    if (!charge) {
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

  // --------------------------------------------------------------- landlord ----

  /**
   * Legacy per-charge ledger.
   *
   * The payments page reads the tracker (`GET /api/landlord/payments/tracker`) since
   * spec `payments-tracker-redesign` D2 replaced its ledger table. This endpoint and
   * its `/report` sibling are kept for the dashboard/reporting paths and the existing
   * tests; nothing in the UI calls them.
   */
}
