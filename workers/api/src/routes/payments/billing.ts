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

export function registerBillingRoutes(router: Hono<{ Bindings: Env }>) {
  router.post('/api/landlord/tenancies/:applicationId/billing', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const applicationId = routeId(c.req.param('applicationId'));

    if (!applicationId) {
      return errorResponse(404, 'Tenancy not found');
    }

    const input = await findScheduleInput(db, applicationId);

    if (!input) {
      return errorResponse(404, 'Tenancy not found');
    }

    // Access check first: a landlord (or co-landlord) may only bill a tenancy in a
    // property they can already manage.
    const settings = await findPropertyBillingSettings(db, Number(input.property_id), user.user_id);

    if (!settings) {
      return errorResponse(404, 'Tenancy not found');
    }

    const body = await readJsonObject(c.req.raw);
    const advance = nonNegativeNumber(body.advance_amount);

    if (advance !== null) {
      await setApplicationAdvanceAmount(db, applicationId, user.user_id, advance);
    }

    const horizonMonths = nonNegativeNumber(body.horizon_months);
    const result = await generateScheduleForApplication(db, applicationId, {
      horizonMonths: horizonMonths
        ? Math.min(Math.max(Math.round(horizonMonths), 1), 12)
        : undefined,
    });

    return jsonResponse({
      success: true,
      message:
        result.created > 0 ? 'Billing schedule created' : 'Billing schedule already up to date',
      data: result,
    });
  });

  router.get('/api/landlord/properties/:propertyId/billing-settings', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const propertyId = routeId(c.req.param('propertyId'));

    if (!propertyId) {
      return errorResponse(404, 'Property not found');
    }

    const settings = await findPropertyBillingSettings(db, propertyId, user.user_id);

    if (!settings) {
      return errorResponse(404, 'Property not found');
    }

    return jsonResponse({ success: true, data: settings });
  });

  router.patch('/api/landlord/properties/:propertyId/billing-settings', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const propertyId = routeId(c.req.param('propertyId'));

    if (!propertyId) {
      return errorResponse(404, 'Property not found');
    }

    const body = await readJsonObject(c.req.raw);
    const changes = await updatePropertyBillingSettings(db, propertyId, user.user_id, {
      late_fee_amount: nonNegativeNumber(body.late_fee_amount) ?? undefined,
      late_fee_grace_days: nonNegativeNumber(body.late_fee_grace_days) ?? undefined,
      electricity_cost: nonNegativeNumber(body.electricity_cost) ?? undefined,
      water_cost: nonNegativeNumber(body.water_cost) ?? undefined,
      internet_cost: nonNegativeNumber(body.internet_cost) ?? undefined,
    });

    if (changes === 0) {
      return errorResponse(404, 'Property not found');
    }

    const settings = await findPropertyBillingSettings(db, propertyId, user.user_id);

    return jsonResponse({ success: true, data: settings });
  });
}
