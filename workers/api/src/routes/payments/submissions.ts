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

export function registerSubmissionRoutes(router: Hono<{ Bindings: Env }>) {
  router.post('/api/landlord/submissions/:submissionId/verify', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const submissionId = routeId(c.req.param('submissionId'));

    if (!submissionId) {
      return errorResponse(404, 'Submission not found');
    }

    const submission = await findSubmissionForLandlord(db, submissionId, user.user_id);

    if (!submission) {
      return errorResponse(404, 'Submission not found');
    }

    if (submission.status !== 'pending') {
      // Verification is final in v1 (spec R5).
      return errorResponse(409, 'This payment has already been reviewed');
    }

    await updateSubmissionDecision(db, submissionId, {
      status: 'verified',
      verifiedBy: user.user_id,
    });
    await settleCharge(db, Number(submission.payment_id), {
      paymentMethod: submission.payment_method,
      reference: submission.reference_number,
      paidDate: manilaToday(),
    });
    await notifyBoarderOfDecision(db, {
      boarderId: Number(submission.boarder_id),
      chargeId: Number(submission.payment_id),
      total: roundMoney(Number(submission.amount ?? 0)),
      approved: true,
    });

    return jsonResponse({ success: true, message: 'Payment verified' });
  });

  router.post('/api/landlord/submissions/:submissionId/reject', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const submissionId = routeId(c.req.param('submissionId'));

    if (!submissionId) {
      return errorResponse(404, 'Submission not found');
    }

    const body = await readJsonObject(c.req.raw);
    const reason = trimmed(body, 'rejection_reason');

    if (!reason) {
      return errorResponse(400, 'rejection_reason is required');
    }

    const submission = await findSubmissionForLandlord(db, submissionId, user.user_id);

    if (!submission) {
      return errorResponse(404, 'Submission not found');
    }

    if (submission.status !== 'pending') {
      return errorResponse(409, 'This payment has already been reviewed');
    }

    await updateSubmissionDecision(db, submissionId, {
      status: 'rejected',
      verifiedBy: user.user_id,
      rejectionReason: reason,
    });
    // The charge returns to the open state; `overdue` is re-derived from its due
    // date, so a rejected claim does not hide a late payment.
    await setChargeStatus(db, Number(submission.payment_id), 'pending');
    await notifyBoarderOfDecision(db, {
      boarderId: Number(submission.boarder_id),
      chargeId: Number(submission.payment_id),
      total: roundMoney(Number(submission.amount ?? 0)),
      approved: false,
      reason,
    });

    return jsonResponse({ success: true, message: 'Payment rejected' });
  });

  // ------------------------------------------------------- tracker (D1–D33) ----

  /** The monthly per-boarder tracker (spec `payments-tracker-redesign` §5.1). */
}
