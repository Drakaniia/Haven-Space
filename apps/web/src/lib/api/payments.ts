import { getApiBaseUrl } from '../config';
import type {
  BillingSettingsResponse,
  BoarderChargeResponse,
  BoarderPaymentsResponse,
  LandlordPaymentsResponse,
  PaymentHistoryResponse,
  PaymentProofResponse,
  PaymentSubmissionResponse,
  PaymentTrackerResponse,
  PropertyBillingSettings,
} from '../types';
import { apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();

export interface LandlordLedgerQuery {
  propertyId?: number | null;
  status?: string | null;
  month?: string | null;
  boarderId?: number | null;
}

function ledgerQueryString(query: LandlordLedgerQuery): string {
  const params = new URLSearchParams();

  if (query.propertyId) params.set('propertyId', String(query.propertyId));
  if (query.status) params.set('status', query.status);
  if (query.month) params.set('month', query.month);
  if (query.boarderId) params.set('boarderId', String(query.boarderId));

  const queryString = params.toString();

  return queryString ? `?${queryString}` : '';
}

/* -------------------------------------------------------------------- boarder */

export function getBoarderPayments(
  token: string,
  month?: string | null
): Promise<BoarderPaymentsResponse> {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';

  return apiFetch<BoarderPaymentsResponse>(base(), `/api/boarder/payments${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getBoarderCharge(token: string, chargeId: number): Promise<BoarderChargeResponse> {
  return apiFetch<BoarderChargeResponse>(base(), `/api/boarder/payments/${chargeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function submitBoarderPayment(
  token: string,
  chargeId: number,
  input: {
    payment_method: string;
    reference_number: string;
    proof_url?: string | null;
    notes?: string;
  }
): Promise<PaymentSubmissionResponse> {
  return apiFetch<PaymentSubmissionResponse>(
    base(),
    `/api/boarder/payments/${chargeId}/submissions`,
    jsonOptions(token, { method: 'POST', body: JSON.stringify(input) })
  );
}

/**
 * Receipt upload goes straight to the Worker as multipart, because `apiFetch`
 * pins `Content-Type: application/json` (same shape as the avatar upload).
 */
export async function uploadPaymentProof(
  token: string,
  chargeId: number,
  file: File
): Promise<PaymentProofResponse> {
  const form = new FormData();
  form.append('proof', file);

  const response = await fetch(`${base()}/api/boarder/payments/${chargeId}/proof`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  return (await response.json()) as PaymentProofResponse;
}

/* ------------------------------------------------------------------- landlord */

export function getLandlordPayments(
  token: string,
  query: LandlordLedgerQuery = {}
): Promise<LandlordPaymentsResponse> {
  return apiFetch<LandlordPaymentsResponse>(
    base(),
    `/api/landlord/payments${ledgerQueryString(query)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export interface TrackerQuery {
  propertyId?: number | null;
  roomId?: number | null;
  month?: string | null;
  status?: string | null;
  dueFrom?: string | null;
  dueTo?: string | null;
  overdue?: boolean;
  needsReview?: boolean;
  search?: string | null;
}

function trackerQueryString(query: TrackerQuery): string {
  const params = new URLSearchParams();

  if (query.propertyId) params.set('propertyId', String(query.propertyId));
  if (query.roomId) params.set('roomId', String(query.roomId));
  if (query.month) params.set('month', query.month);
  if (query.status) params.set('status', query.status);
  if (query.dueFrom) params.set('dueFrom', query.dueFrom);
  if (query.dueTo) params.set('dueTo', query.dueTo);
  if (query.overdue) params.set('overdue', '1');
  if (query.needsReview) params.set('needsReview', '1');
  if (query.search) params.set('q', query.search);

  const queryString = params.toString();

  return queryString ? `?${queryString}` : '';
}

/** The monthly per-boarder tracker (spec `payments-tracker-redesign` §5.1). */
export function getPaymentTracker(
  token: string,
  query: TrackerQuery = {}
): Promise<PaymentTrackerResponse> {
  return apiFetch<PaymentTrackerResponse>(
    base(),
    `/api/landlord/payments/tracker${trackerQueryString(query)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

/** One boarder's full charge history, for the tracker row's expansion (D16). */
export function getPaymentHistory(
  token: string,
  applicationId: number
): Promise<PaymentHistoryResponse> {
  return apiFetch<PaymentHistoryResponse>(
    base(),
    `/api/landlord/tenancies/${applicationId}/payment-history`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

/** R5 — the landlord's manual next due date edit. */
export function updateNextDueDate(
  token: string,
  applicationId: number,
  input: { next_due_date: string; confirm_past?: boolean }
): Promise<{ success: true; message: string; data: { next_due_date: string; shifted: boolean } }> {
  return apiFetch(
    base(),
    `/api/landlord/tenancies/${applicationId}/next-due-date`,
    jsonOptions(token, { method: 'PATCH', body: JSON.stringify(input) })
  );
}

/** D14 — the landlord's manual reminder, once per cycle. */
export function sendPaymentReminder(
  token: string,
  chargeId: number
): Promise<{ success: true; message: string }> {
  return apiFetch(
    base(),
    `/api/landlord/charges/${chargeId}/remind`,
    jsonOptions(token, { method: 'POST' })
  );
}

/** Landlord-side receipt upload, mirroring the boarder route (D13). */
export async function uploadLandlordProof(
  token: string,
  chargeId: number,
  file: File
): Promise<PaymentProofResponse> {
  const form = new FormData();
  form.append('proof', file);

  const response = await fetch(`${base()}/api/landlord/charges/${chargeId}/proof`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  return (await response.json()) as PaymentProofResponse;
}

export function getLandlordCharge(
  token: string,
  chargeId: number
): Promise<{ success: true; data: import('../types').PaymentCharge }> {
  return apiFetch(base(), `/api/landlord/charges/${chargeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function verifyLandlordSubmission(
  token: string,
  submissionId: number
): Promise<{ success: true; message: string }> {
  return apiFetch(
    base(),
    `/api/landlord/submissions/${submissionId}/verify`,
    jsonOptions(token, { method: 'POST' })
  );
}

export function rejectLandlordSubmission(
  token: string,
  submissionId: number,
  rejectionReason: string
): Promise<{ success: true; message: string }> {
  return apiFetch(
    base(),
    `/api/landlord/submissions/${submissionId}/reject`,
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    })
  );
}

export function recordLandlordPayment(
  token: string,
  chargeId: number,
  input: {
    payment_method: string;
    /** Required when `payment_method` is `other` (D12). */
    payment_method_label?: string;
    reference_number?: string;
    proof_url?: string;
    paid_date?: string;
    notes?: string;
    /** The cycle's open charges to settle; defaults to the charged id alone (D11). */
    charge_ids?: number[];
    /** Optional manual next due date for the tenancy (R5). */
    next_due_date?: string;
    amount?: number;
  }
): Promise<PaymentSubmissionResponse> {
  return apiFetch<PaymentSubmissionResponse>(
    base(),
    `/api/landlord/charges/${chargeId}/record`,
    jsonOptions(token, { method: 'POST', body: JSON.stringify(input) })
  );
}

export function createLandlordCharge(
  token: string,
  propertyId: number,
  input: {
    boarder_id: number;
    charge_type: string;
    amount: number;
    due_date: string;
    description: string;
  }
): Promise<{ success: true; message: string; data: { charge_id: number } }> {
  return apiFetch(
    base(),
    `/api/landlord/properties/${propertyId}/charges`,
    jsonOptions(token, { method: 'POST', body: JSON.stringify(input) })
  );
}

export function cancelLandlordCharge(
  token: string,
  chargeId: number
): Promise<{ success: true; message: string }> {
  return apiFetch(
    base(),
    `/api/landlord/charges/${chargeId}/cancel`,
    jsonOptions(token, { method: 'POST' })
  );
}

export function resolveDeposit(
  token: string,
  chargeId: number,
  input: { resolution: 'refund' | 'forfeit' | 'partial'; amount: number; reason: string }
): Promise<{ success: true; message: string }> {
  return apiFetch(
    base(),
    `/api/landlord/charges/${chargeId}/deposit-resolution`,
    jsonOptions(token, { method: 'POST', body: JSON.stringify(input) })
  );
}

export function getBillingSettings(
  token: string,
  propertyId: number
): Promise<BillingSettingsResponse> {
  return apiFetch<BillingSettingsResponse>(
    base(),
    `/api/landlord/properties/${propertyId}/billing-settings`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function updateBillingSettings(
  token: string,
  propertyId: number,
  input: Partial<Omit<PropertyBillingSettings, 'property_id'>>
): Promise<BillingSettingsResponse> {
  return apiFetch<BillingSettingsResponse>(
    base(),
    `/api/landlord/properties/${propertyId}/billing-settings`,
    jsonOptions(token, { method: 'PATCH', body: JSON.stringify(input) })
  );
}

/** CSV is fetched as text so the browser can offer it as a download. */
export async function fetchLandlordPaymentsCsv(
  token: string,
  query: LandlordLedgerQuery = {}
): Promise<string> {
  const response = await fetch(
    `${base()}/api/landlord/payments/export.csv${ledgerQueryString(query)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error('Could not export the payments ledger');
  }

  return await response.text();
}
