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

export function registerLedgerRoutes(router: Hono<{ Bindings: Env }>) {
  router.get('/api/landlord/payments', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const propertyId = routeId(c.req.query('propertyId') ?? undefined);
    const charges = await listChargesForLandlord(db, user.user_id, {
      propertyId: propertyId ?? undefined,
      status: c.req.query('status'),
      month: c.req.query('month'),
      boarderId: routeId(c.req.query('boarderId') ?? undefined) ?? undefined,
    });

    return jsonResponse({ success: true, data: buildLedgerResponse(charges) });
  });

  /** Legacy aging/collection report — see the ledger note above. */
  router.get('/api/landlord/payments/report', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const month = c.req.query('month') ?? monthKey(manilaToday());
    const propertyId = routeId(c.req.query('propertyId') ?? undefined);
    const charges = await listChargesForLandlord(db, user.user_id, {
      propertyId: propertyId ?? undefined,
      month,
    });

    return jsonResponse({
      success: true,
      data: buildLedgerResponse(charges, month),
    });
  });

  /** The tracker's export: the per-boarder rows then the per-charge detail (D29). */
  router.get('/api/landlord/payments/export.csv', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const propertyId = routeId(c.req.query('propertyId') ?? undefined);
    const month = c.req.query('month');
    const charges = await listChargesForLandlord(db, user.user_id, {
      propertyId: propertyId ?? undefined,
      month,
    });
    const tracker = await listTrackerRows(db, user.user_id, {
      propertyId: propertyId ?? undefined,
      month: month ?? undefined,
    });
    const title = `${charges[0]?.property_title ?? 'All properties'} — ${month ?? 'all months'}`;

    return new Response(trackerToCsv({ rows: tracker.rows, charges, title }), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="payments.csv"',
      },
    });
  });
}
