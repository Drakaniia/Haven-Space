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

export function registerRecordRoutes(router: Hono<{ Bindings: Env }>) {
  router.post('/api/landlord/charges/:chargeId/record', async c => {
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

    const body = await readJsonObject(c.req.raw);
    const method = trimmed(body, 'payment_method');
    const reference = trimmed(body, 'reference_number');
    const methodLabel = trimmed(body, 'payment_method_label');
    const proofUrl = trimmed(body, 'proof_url');
    const notes = trimmed(body, 'notes');

    if (!isPaymentMethod(method)) {
      return errorResponse(400, 'Payment method is required');
    }

    if (method === 'other' && !methodLabel) {
      return errorResponse(400, 'A name is required for a custom payment method');
    }

    if (methodRequiresReference(method) && !reference) {
      return errorResponse(400, 'Reference number is required');
    }

    // D13: everything except cash needs a receipt.
    if (methodRequiresReceipt(method) && !proofUrl) {
      return errorResponse(400, 'A receipt is required for this payment method');
    }

    const today = manilaToday();
    const paidDate = isoDate(trimmed(body, 'paid_date')) ?? today;
    const rawIds = Array.isArray(body.charge_ids) ? body.charge_ids : [];
    const extraIds = rawIds
      .map(value => routeId(String(value)))
      .filter((value): value is number => value !== null && value !== chargeId);
    const selected: Array<{ id: number; row: typeof charge }> = [{ id: chargeId, row: charge }];

    // Every selected charge must be open and belong to the tenancy being paid (D11).
    for (const id of [...new Set(extraIds)]) {
      const candidate = await findChargeForLandlordWrite(db, id, user.user_id);

      if (!candidate) {
        return errorResponse(404, `Charge ${id} not found`);
      }

      if (!isOpenStatus(candidate.status)) {
        return errorResponse(409, 'A selected charge is already settled');
      }

      if (Number(candidate.application_id ?? 0) !== Number(charge.application_id ?? 0)) {
        return errorResponse(409, 'All selected charges must belong to the same tenancy');
      }

      selected.push({ id, row: candidate });
    }

    const total = roundMoney(
      selected.reduce(
        (sum, item) => sum + Number(item.row.amount ?? 0) + Number(item.row.late_fee ?? 0),
        0
      )
    );
    const declared = body.amount === undefined || body.amount === null ? null : Number(body.amount);

    // D27: every selected charge settles in full; a lower amount is refused.
    if (declared !== null && Number.isFinite(declared) && roundMoney(declared) < total) {
      return errorResponse(422, 'A charge must be paid in full', {
        code: 'amount_below_selected_total',
        details: { expected: total, received: roundMoney(declared) },
      });
    }

    const recordedReference = reference || 'Cash';

    // A landlord recording is a verified submission from the start (spec D29), so
    // the boarder still sees who recorded it and when.
    for (const item of selected) {
      const itemAmount = roundMoney(Number(item.row.amount ?? 0) + Number(item.row.late_fee ?? 0));

      await createSubmission(db, {
        chargeId: item.id,
        amount: itemAmount,
        submittedBy: user.user_id,
        method,
        methodLabel: methodLabel || null,
        reference: recordedReference,
        proofUrl: proofUrl || null,
        notes: notes || 'Recorded by landlord',
        status: 'verified',
        verifiedBy: user.user_id,
        verifiedAt: today,
      });

      await settleCharge(db, item.id, {
        paymentMethod: method,
        methodLabel: methodLabel || null,
        reference: recordedReference,
        paidDate,
        notes: notes || null,
      });

      await notifyBoarderOfDecision(db, {
        boarderId: Number(item.row.boarder_id),
        chargeId: item.id,
        total: itemAmount,
        approved: true,
        type: 'payment_recorded',
      });
    }

    // R4: paying rent re-anchors the tenancy's next due date on the payment date,
    // and the not-yet-due rent row follows it (D33).
    const settledRent = selected.some(item => String(item.row.charge_type ?? 'rent') === 'rent');
    const applicationId = Number(charge.application_id ?? 0);
    let nextDueDate: string | null = null;

    if (settledRent && applicationId > 0) {
      const reanchored = await reanchorNextDue(db, {
        applicationId,
        anchorDate: paidDate,
        nextDueDate: isoDate(trimmed(body, 'next_due_date')),
        today,
      });

      nextDueDate = reanchored?.next_due_date ?? null;
    }

    return jsonResponse(
      {
        success: true,
        message: 'Payment recorded',
        data: {
          amount: total,
          settled: selected.map(item => item.id),
          next_due_date: nextDueDate,
        },
      },
      201
    );
  });

  router.post('/api/landlord/charges/:chargeId/deposit-resolution', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const chargeId = routeId(c.req.param('chargeId'));

    if (!chargeId) {
      return errorResponse(404, 'Charge not found');
    }

    const body = await readJsonObject(c.req.raw);
    const resolution = trimmed(body, 'resolution');
    const amount = nonNegativeNumber(body.amount);
    const reason = trimmed(body, 'reason');

    if (resolution !== 'refund' && resolution !== 'forfeit' && resolution !== 'partial') {
      return errorResponse(400, 'resolution must be refund, forfeit, or partial');
    }

    if (amount === null) {
      return errorResponse(400, 'amount is required');
    }

    if (!reason) {
      return errorResponse(400, 'reason is required');
    }

    const changes = await resolveDeposit(db, chargeId, user.user_id, {
      resolution,
      amount,
      reason,
    });

    if (changes === 0) {
      return errorResponse(404, 'Deposit charge not found');
    }

    return jsonResponse({ success: true, message: 'Deposit resolution recorded' });
  });
}
