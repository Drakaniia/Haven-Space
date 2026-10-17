import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { authorizeUser, type AuthenticatedUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { readJsonObject, type JsonRecord } from '../lib/validation';
import { uploadFilesToUploadThing } from '../lib/uploadthing';
import { findLandlordBoarderApplication } from '../repositories/landlord-boarders';
import { findLandlordRoomProperty } from '../repositories/landlord-rooms';
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
} from '../repositories/payments';
import { requireLandlord } from './landlord/shared';

/**
 * Payments routes (spec `payments-feature` §5).
 *
 * Boarder routes are scoped to `boarder_id` from the token; landlord routes are
 * scoped by property access. No route accepts a caller-supplied owner id as
 * authority, and admins are not granted any of them (D14).
 */

const paymentsRoutes = new Hono<{ Bindings: Env }>();

const allowedProofTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_PROOF_BYTES = 2 * 1024 * 1024;

function routeId(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function positiveNumber(value: unknown): number | null {
  const parsed = Number.parseFloat(String(value ?? ''));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function nonNegativeNumber(value: unknown): number | null {
  const parsed = Number.parseFloat(String(value ?? ''));

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function trimmed(body: JsonRecord | null, field: string): string {
  const value = body?.[field];

  return typeof value === 'string' ? value.trim() : '';
}

function isoDate(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

async function requireBoarder(c: Context<{ Bindings: Env }>): Promise<AuthenticatedUser> {
  const db = requireD1(c.env);

  return await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
}

async function landlordUser(c: Context<{ Bindings: Env }>): Promise<AuthenticatedUser | Response> {
  return await requireLandlord(c);
}

// ---------------------------------------------------------------- boarder ----

paymentsRoutes.get('/api/boarder/payments', async c => {
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

paymentsRoutes.get('/api/boarder/payments/:chargeId', async c => {
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

paymentsRoutes.post('/api/boarder/payments/:chargeId/submissions', async c => {
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

paymentsRoutes.post('/api/boarder/payments/:chargeId/proof', async c => {
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
paymentsRoutes.get('/api/landlord/payments', async c => {
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
paymentsRoutes.get('/api/landlord/payments/report', async c => {
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
paymentsRoutes.get('/api/landlord/payments/export.csv', async c => {
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

paymentsRoutes.post('/api/landlord/tenancies/:applicationId/billing', async c => {
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
    horizonMonths: horizonMonths ? Math.min(Math.max(Math.round(horizonMonths), 1), 12) : undefined,
  });

  return jsonResponse({
    success: true,
    message:
      result.created > 0 ? 'Billing schedule created' : 'Billing schedule already up to date',
    data: result,
  });
});

paymentsRoutes.get('/api/landlord/properties/:propertyId/billing-settings', async c => {
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

paymentsRoutes.patch('/api/landlord/properties/:propertyId/billing-settings', async c => {
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

paymentsRoutes.post('/api/landlord/properties/:propertyId/charges', async c => {
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

  const application = await findLandlordBoarderApplication(db, boarderId, user.user_id, propertyId);

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

paymentsRoutes.patch('/api/landlord/charges/:chargeId', async c => {
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

paymentsRoutes.post('/api/landlord/charges/:chargeId/cancel', async c => {
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

paymentsRoutes.get('/api/landlord/charges/:chargeId', async c => {
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

paymentsRoutes.post('/api/landlord/charges/:chargeId/record', async c => {
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

paymentsRoutes.post('/api/landlord/charges/:chargeId/deposit-resolution', async c => {
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

paymentsRoutes.post('/api/landlord/submissions/:submissionId/verify', async c => {
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

paymentsRoutes.post('/api/landlord/submissions/:submissionId/reject', async c => {
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
paymentsRoutes.get('/api/landlord/payments/tracker', async c => {
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
paymentsRoutes.get('/api/landlord/tenancies/:applicationId/payment-history', async c => {
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
paymentsRoutes.patch('/api/landlord/tenancies/:applicationId/next-due-date', async c => {
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
paymentsRoutes.post('/api/landlord/charges/:chargeId/remind', async c => {
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
paymentsRoutes.post('/api/landlord/charges/:chargeId/proof', async c => {
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

export default paymentsRoutes;
