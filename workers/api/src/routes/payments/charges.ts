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

export function registerChargeRoutes(router: Hono<{ Bindings: Env }>) {
  router.post('/api/landlord/properties/:propertyId/charges', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const propertyId = routeId(c.req.param('propertyId'));

    if (!propertyId) {
      return errorResponse(404, 'Property not found');
    }

    const property = await findLandlordRoomProperty(db, propertyId, user.user_id);

    if (!property) {
      return errorResponse(404, 'Property not found');
    }

    const body = await readJsonObject(c.req.raw);
    const boarderId = routeId(String(body.boarder_id ?? ''));
    const chargeType = trimmed(body, 'charge_type') || 'utility';
    const amount = positiveNumber(body.amount);
    const dueDate = isoDate(trimmed(body, 'due_date'));
    const description = trimmed(body, 'description');

    if (!boarderId) {
      return errorResponse(400, 'boarder_id is required');
    }

    if (!isChargeType(chargeType) || chargeType === 'rent' || chargeType === 'late_fee') {
      // Rent is generated from the tenancy and late fees from the billing run;
      // this endpoint exists for utilities and ad-hoc fees (spec D3/D9).
      return errorResponse(400, 'charge_type must be utility or other');
    }

    if (!amount) {
      return errorResponse(400, 'amount is required');
    }

    if (!dueDate) {
      return errorResponse(400, 'due_date must be YYYY-MM-DD');
    }

    const application = await findLandlordBoarderApplication(
      db,
      boarderId,
      user.user_id,
      propertyId
    );

    if (!application) {
      return errorResponse(404, 'Boarder not found for this property');
    }

    const chargeId = await createManualCharge(db, {
      applicationId: Number(application.id),
      boarderId,
      landlordId: user.user_id,
      roomId: Number(application.room_id),
      propertyId,
      chargeType,
      amount,
      dueDate,
      description: description || (chargeType === 'utility' ? 'Utilities' : 'Additional charge'),
      createdBy: user.user_id,
    });

    return jsonResponse(
      {
        success: true,
        message: 'Charge created',
        data: { charge_id: chargeId },
      },
      201
    );
  });

  router.patch('/api/landlord/charges/:chargeId', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const chargeId = routeId(c.req.param('chargeId'));

    if (!chargeId) {
      return errorResponse(404, 'Charge not found');
    }

    const existing = await findChargeForLandlordWrite(db, chargeId, user.user_id);

    if (!existing) {
      return errorResponse(404, 'Charge not found');
    }

    if (existing.status === 'paid' || existing.status === 'cancelled') {
      return errorResponse(409, 'Only open charges can be edited');
    }

    if (existing.status === 'awaiting_verification' && (await hasPendingSubmission(db, chargeId))) {
      // Editing the amount while a claim is pending would invalidate it (spec R6).
      return errorResponse(409, 'Resolve the pending payment before editing this charge');
    }

    const body = await readJsonObject(c.req.raw);
    const dueDate = trimmed(body, 'due_date');

    if (dueDate && !isoDate(dueDate)) {
      return errorResponse(400, 'due_date must be YYYY-MM-DD');
    }

    const changes = await updateCharge(db, chargeId, user.user_id, {
      amount: 'amount' in body ? positiveNumber(body.amount) ?? undefined : undefined,
      dueDate: dueDate || undefined,
      description: trimmed(body, 'description') || undefined,
    });

    if (changes === 0) {
      return errorResponse(404, 'Charge not found');
    }

    return jsonResponse({ success: true, message: 'Charge updated' });
  });

  router.post('/api/landlord/charges/:chargeId/cancel', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const chargeId = routeId(c.req.param('chargeId'));

    if (!chargeId) {
      return errorResponse(404, 'Charge not found');
    }

    const changes = await cancelCharge(db, chargeId, user.user_id);

    if (changes === 0) {
      return errorResponse(404, 'Charge not found');
    }

    return jsonResponse({ success: true, message: 'Charge cancelled' });
  });

  router.get('/api/landlord/charges/:chargeId', async c => {
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

    return jsonResponse({ success: true, data: formatCharge(charge) });
  });
}
