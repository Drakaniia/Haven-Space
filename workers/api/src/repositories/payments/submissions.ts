import { accessiblePropertyClause } from '../property-access/helpers';
import { DEFAULT_GRACE_DAYS, roundMoney, toDateOnly } from './helpers';
import { insertNotification } from './notify';
import type { ChargeRow, SubmissionRow } from './types';

/**
 * Submission writes (spec `payments-feature` §6.3).
 *
 * A boarder submission never moves money — it records a claim (method +
 * reference + optional receipt) and parks the charge in
 * `awaiting_verification`. Only the landlord's decision (or their own recording,
 * D29) settles the charge.
 */

export interface SubmissionWithChargeRow extends SubmissionRow {
  boarder_id: number;
  landlord_id: number;
  charge_amount: number | string;
  charge_due_date: string;
  charge_type: string;
  charge_status: string;
  property_id: number;
  property_title: string | null;
}

export interface CreateSubmissionInput {
  chargeId: number;
  amount: number;
  submittedBy: number;
  method: string;
  /** Free-text label for `payment_method = 'other'` (D12). */
  methodLabel?: string | null;
  reference: string;
  proofUrl?: string | null;
  notes?: string | null;
  /** `pending` for a boarder claim, `verified` for a landlord recording (D29). */
  status?: string;
  verifiedBy?: number | null;
  verifiedAt?: string | null;
}

export async function hasPendingSubmission(db: D1Database, chargeId: number): Promise<boolean> {
  const row = await db
    .prepare(
      `
        SELECT 1 AS present
        FROM payment_submissions
        WHERE payment_id = ? AND status = 'pending'
        LIMIT 1
      `
    )
    .bind(chargeId)
    .first<{ present: number }>();

  return Boolean(row);
}

export async function createSubmission(
  db: D1Database,
  input: CreateSubmissionInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO payment_submissions (
          payment_id, submitted_by, amount, payment_method, payment_method_label,
          reference_number, proof_url, notes, status, verified_by, verified_at,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .bind(
      input.chargeId,
      input.submittedBy,
      roundMoney(input.amount),
      input.method,
      input.methodLabel ?? null,
      input.reference,
      input.proofUrl ?? null,
      input.notes ?? null,
      input.status ?? 'pending',
      input.verifiedBy ?? null,
      input.verifiedAt ?? null
    )
    .run();

  return Number(result.meta.last_row_id ?? 0);
}

export async function setChargeStatus(
  db: D1Database,
  chargeId: number,
  status: string
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE payments
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(status, chargeId)
    .run();
}

export async function settleCharge(
  db: D1Database,
  chargeId: number,
  input: {
    paymentMethod: string;
    /** Free-text label for `payment_method = 'other'` (D12). */
    methodLabel?: string | null;
    reference: string;
    paidDate: string;
    notes?: string | null;
  }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE payments
        SET status = 'paid',
            payment_method = ?,
            payment_method_label = COALESCE(?, payment_method_label),
            reference_number = ?,
            paid_date = ?,
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(
      input.paymentMethod,
      input.methodLabel ?? null,
      input.reference,
      input.paidDate,
      input.notes ?? null,
      chargeId
    )
    .run();
}

const SUBMISSION_SELECT = `
  ps.*,
  TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS submitted_by_name,
  pay.boarder_id AS boarder_id,
  pay.landlord_id AS landlord_id,
  pay.amount AS charge_amount,
  pay.due_date AS charge_due_date,
  COALESCE(pay.charge_type, 'rent') AS charge_type,
  pay.status AS charge_status,
  pay.property_id AS property_id,
  pr.title AS property_title
`;

export async function findSubmissionForLandlord(
  db: D1Database,
  submissionId: number,
  landlordId: number
): Promise<SubmissionWithChargeRow | null> {
  return await db
    .prepare(
      `
        SELECT ${SUBMISSION_SELECT}
        FROM payment_submissions ps
        JOIN payments pay ON ps.payment_id = pay.id
        JOIN properties pr ON pay.property_id = pr.id
        LEFT JOIN users u ON ps.submitted_by = u.id
        WHERE ps.id = ?
          AND pr.deleted_at IS NULL
          AND ${accessiblePropertyClause('pr')}
      `
    )
    .bind(submissionId, landlordId, landlordId)
    .first<SubmissionWithChargeRow>();
}

export async function updateSubmissionDecision(
  db: D1Database,
  submissionId: number,
  decision: { status: 'verified' | 'rejected'; verifiedBy: number; rejectionReason?: string | null }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE payment_submissions
        SET status = ?,
            verified_by = ?,
            verified_at = CURRENT_TIMESTAMP,
            rejection_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(decision.status, decision.verifiedBy, decision.rejectionReason ?? null, submissionId)
    .run();
}

/** A raw charge row the caller's landlord access allows them to write to. */
export async function findChargeForLandlordWrite(
  db: D1Database,
  chargeId: number,
  landlordId: number
): Promise<ChargeRow | null> {
  return await db
    .prepare(
      `
        SELECT
          pay.*,
          COALESCE(pr.late_fee_grace_days, ${DEFAULT_GRACE_DAYS}) AS grace_days,
          COALESCE(pr.late_fee_amount, 0) AS late_fee_amount,
          pr.title AS property_title,
          COALESCE(r.room_number, r.title) AS room_title,
          u.first_name AS boarder_first_name,
          u.last_name AS boarder_last_name
        FROM payments pay
        JOIN properties pr ON pay.property_id = pr.id
        LEFT JOIN rooms r ON pay.room_id = r.id
        LEFT JOIN users u ON pay.boarder_id = u.id
        WHERE pay.id = ?
          AND pr.deleted_at IS NULL
          AND ${accessiblePropertyClause('pr')}
      `
    )
    .bind(chargeId, landlordId, landlordId)
    .first<ChargeRow>();
}

export async function notifyLandlordOfSubmission(
  db: D1Database,
  input: {
    landlordId: number;
    chargeId: number;
    boarderName: string;
    total: number;
    dueDate: string;
  }
): Promise<void> {
  await insertNotification(db, {
    userId: input.landlordId,
    type: 'payment_submitted',
    title: 'Payment submitted for verification',
    message: `${
      input.boarderName || 'A boarder'
    } submitted ₱${input.total.toLocaleString()} for the charge due ${toDateOnly(input.dueDate)}.`,
    metadata: {
      charge_id: input.chargeId,
      amount: input.total,
      due_date: toDateOnly(input.dueDate),
    },
  });
}

export async function notifyBoarderOfDecision(
  db: D1Database,
  input: {
    boarderId: number;
    chargeId: number;
    total: number;
    approved: boolean;
    reason?: string | null;
    /** Overrides the default `payment_verified`/`payment_rejected` type. */
    type?: string;
  }
): Promise<void> {
  await insertNotification(db, {
    userId: input.boarderId,
    type: input.type ?? (input.approved ? 'payment_verified' : 'payment_rejected'),
    title: input.approved ? 'Payment verified' : 'Payment needs attention',
    message: input.approved
      ? `Your ₱${input.total.toLocaleString()} payment was verified.`
      : `Your ₱${input.total.toLocaleString()} payment was rejected: ${
          input.reason ?? 'see your landlord.'
        }`,
    metadata: { charge_id: input.chargeId, amount: input.total, reason: input.reason ?? null },
  });
}
