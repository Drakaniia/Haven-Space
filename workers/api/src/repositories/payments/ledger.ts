import { accessiblePropertyClause } from '../property-access/helpers';
import { DEFAULT_GRACE_DAYS, isDueSoon, manilaToday, roundMoney, toDateOnly } from './helpers';
import {
  formatCharge,
  formatSubmission,
  type ChargeDto,
  type ChargeRow,
  type SubmissionDto,
  type SubmissionRow,
} from './types';

/**
 * Ledger reads (spec `payments-feature` §5/D7).
 *
 * The boarder query is scoped by `boarder_id`; the landlord query is scoped by
 * property access (`accessiblePropertyClause`) so a co-landlord sees exactly the
 * properties they can already manage. Both attach submission history so a
 * pending verification is visible on the row it belongs to.
 */

const CHARGE_SELECT = `
  pay.*,
  pr.title AS property_title,
  COALESCE(pr.late_fee_grace_days, ${DEFAULT_GRACE_DAYS}) AS grace_days,
  COALESCE(pr.late_fee_amount, 0) AS late_fee_amount,
  COALESCE(r.room_number, r.title) AS room_title
`;

export interface LedgerFilters {
  /** Computed status (`pending` | `overdue` | `awaiting_verification` | `paid` | `cancelled`). */
  status?: string;
  /** `YYYY-MM`, matched against the due date. */
  month?: string;
  boarderId?: number;
  propertyId?: number;
  limit?: number;
}

function applyFilters(clauses: string[], binds: unknown[], filters: LedgerFilters): void {
  if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
    clauses.push('pay.due_date LIKE ?');
    binds.push(`${filters.month}%`);
  }

  if (filters.boarderId) {
    clauses.push('pay.boarder_id = ?');
    binds.push(filters.boarderId);
  }

  if (filters.propertyId) {
    clauses.push('pay.property_id = ?');
    binds.push(filters.propertyId);
  }
}

export async function listSubmissionsForCharges(
  db: D1Database,
  chargeIds: number[]
): Promise<Map<number, SubmissionDto[]>> {
  const grouped = new Map<number, SubmissionDto[]>();

  if (chargeIds.length === 0) {
    return grouped;
  }

  const placeholders = chargeIds.map(() => '?').join(', ');
  const rows = await db
    .prepare(
      `
        SELECT
          ps.*,
          TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS submitted_by_name
        FROM payment_submissions ps
        LEFT JOIN users u ON ps.submitted_by = u.id
        WHERE ps.payment_id IN (${placeholders})
        ORDER BY ps.created_at ASC, ps.id ASC
      `
    )
    .bind(...chargeIds)
    .all<SubmissionRow>();

  for (const row of rows.results ?? []) {
    const paymentId = Number(row.payment_id);
    const list = grouped.get(paymentId) ?? [];
    list.push(formatSubmission(row));
    grouped.set(paymentId, list);
  }

  return grouped;
}

async function toCharges(db: D1Database, rows: ChargeRow[], today: string): Promise<ChargeDto[]> {
  const ids = rows.map(row => Number(row.id));
  const submissions = await listSubmissionsForCharges(db, ids);

  return rows.map(row => formatCharge(row, today, submissions.get(Number(row.id)) ?? []));
}

function filterByComputedStatus(charges: ChargeDto[], status: string | undefined): ChargeDto[] {
  return status ? charges.filter(charge => charge.status === status) : charges;
}

export async function listChargesForBoarder(
  db: D1Database,
  boarderId: number,
  filters: LedgerFilters = {},
  today: string = manilaToday()
): Promise<ChargeDto[]> {
  const clauses = ['pay.boarder_id = ?'];
  const binds: unknown[] = [boarderId];
  applyFilters(clauses, binds, filters);

  const rows = await db
    .prepare(
      `
        SELECT ${CHARGE_SELECT}
        FROM payments pay
        LEFT JOIN properties pr ON pay.property_id = pr.id
        LEFT JOIN rooms r ON pay.room_id = r.id
        WHERE ${clauses.join(' AND ')}
        ORDER BY pay.due_date DESC, pay.id DESC
      `
    )
    .bind(...binds)
    .all<ChargeRow>();

  const charges = await toCharges(db, rows.results ?? [], today);

  return filterByComputedStatus(charges, filters.status);
}

export async function listChargesForLandlord(
  db: D1Database,
  landlordId: number,
  filters: LedgerFilters = {},
  today: string = manilaToday()
): Promise<ChargeDto[]> {
  const clauses = ['pr.deleted_at IS NULL', accessiblePropertyClause('pr')];
  const binds: unknown[] = [landlordId, landlordId];
  applyFilters(clauses, binds, filters);

  const rows = await db
    .prepare(
      `
        SELECT
          ${CHARGE_SELECT},
          u.first_name AS boarder_first_name,
          u.last_name AS boarder_last_name,
          u.email AS boarder_email
        FROM payments pay
        JOIN properties pr ON pay.property_id = pr.id
        LEFT JOIN rooms r ON pay.room_id = r.id
        LEFT JOIN users u ON pay.boarder_id = u.id
        WHERE ${clauses.join(' AND ')}
        ORDER BY pay.due_date ASC, pay.id ASC
      `
    )
    .bind(...binds)
    .all<ChargeRow>();

  const charges = await toCharges(db, rows.results ?? [], today);

  return filterByComputedStatus(charges, filters.status);
}

/** Convenience wrapper for one property's ledger (spec D7). */
export function listChargesForProperty(
  db: D1Database,
  propertyId: number,
  landlordId: number,
  filters: LedgerFilters = {},
  today: string = manilaToday()
): Promise<ChargeDto[]> {
  return listChargesForLandlord(db, landlordId, { ...filters, propertyId }, today);
}

export async function findChargeForBoarder(
  db: D1Database,
  chargeId: number,
  boarderId: number,
  today: string = manilaToday()
): Promise<ChargeDto | null> {
  const row = await db
    .prepare(
      `
        SELECT ${CHARGE_SELECT}
        FROM payments pay
        LEFT JOIN properties pr ON pay.property_id = pr.id
        LEFT JOIN rooms r ON pay.room_id = r.id
        WHERE pay.id = ? AND pay.boarder_id = ?
      `
    )
    .bind(chargeId, boarderId)
    .first<ChargeRow>();

  if (!row) {
    return null;
  }

  const [charge] = await toCharges(db, [row], today);

  return charge ?? null;
}

export async function findChargeForLandlord(
  db: D1Database,
  chargeId: number,
  landlordId: number,
  today: string = manilaToday()
): Promise<ChargeDto | null> {
  const row = await db
    .prepare(
      `
        SELECT
          ${CHARGE_SELECT},
          u.first_name AS boarder_first_name,
          u.last_name AS boarder_last_name,
          u.email AS boarder_email
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

  if (!row) {
    return null;
  }

  const [charge] = await toCharges(db, [row], today);

  return charge ?? null;
}

/** Every open charge for one tenancy, oldest first (used by the billing job). */
export async function listOpenChargesForApplication(
  db: D1Database,
  applicationId: number
): Promise<ChargeRow[]> {
  const rows = await db
    .prepare(
      `
        SELECT
          pay.*,
          COALESCE(pr.late_fee_grace_days, ${DEFAULT_GRACE_DAYS}) AS grace_days,
          COALESCE(pr.late_fee_amount, 0) AS late_fee_amount
        FROM payments pay
        LEFT JOIN properties pr ON pay.property_id = pr.id
        WHERE pay.application_id = ?
          AND pay.status IN ('pending', 'awaiting_verification', 'overdue')
        ORDER BY pay.due_date ASC, pay.id ASC
      `
    )
    .bind(applicationId)
    .all<ChargeRow>();

  return rows.results ?? [];
}

export interface BoarderPaymentSnapshot {
  application_id: number;
  payment_status: string;
  payment_due_day: number;
  last_payment_date: string | null;
  outstanding_total: number;
  next_due_date: string | null;
}

interface SnapshotAccumulator {
  application_id: number;
  has_open: boolean;
  overdue: boolean;
  due_soon: boolean;
  due_day: number;
  last_payment_date: string | null;
  outstanding_total: number;
  next_due_date: string | null;
}

/**
 * Real payment state for the landlord's tenant rows — replaces the previous
 * hard-coded `payment_status: 'paid'` / `payment_due_day: 15` (spec F5).
 */
export async function paymentSummariesForApplications(
  db: D1Database,
  applicationIds: number[],
  today: string = manilaToday()
): Promise<Map<number, BoarderPaymentSnapshot>> {
  const summaries = new Map<number, BoarderPaymentSnapshot>();

  if (applicationIds.length === 0) {
    return summaries;
  }

  const placeholders = applicationIds.map(() => '?').join(', ');
  const rows = await db
    .prepare(
      `
        SELECT
          pay.application_id,
          pay.status,
          pay.amount,
          pay.late_fee,
          pay.due_date,
          pay.paid_date,
          COALESCE(pr.late_fee_grace_days, ${DEFAULT_GRACE_DAYS}) AS grace_days
        FROM payments pay
        LEFT JOIN properties pr ON pay.property_id = pr.id
        WHERE pay.application_id IN (${placeholders})
        ORDER BY pay.due_date ASC, pay.id ASC
      `
    )
    .bind(...applicationIds)
    .all<ChargeRow>();

  const accumulators = new Map<number, SnapshotAccumulator>();

  for (const row of rows.results ?? []) {
    const applicationId = Number(row.application_id);

    if (!Number.isFinite(applicationId) || applicationId <= 0) {
      continue;
    }

    const accumulator = accumulators.get(applicationId) ?? {
      application_id: applicationId,
      has_open: false,
      overdue: false,
      due_soon: false,
      due_day: 0,
      last_payment_date: null,
      outstanding_total: 0,
      next_due_date: null,
    };

    const dueDate = toDateOnly(row.due_date);
    const dueDay = Number(dueDate.slice(8, 10));

    // The due day is a property of the tenancy's billing cycle, so a settled
    // charge still teaches the row what day rent falls on (spec F5).
    if (!accumulator.due_day && Number.isFinite(dueDay)) {
      accumulator.due_day = dueDay;
    }

    if (row.status === 'paid') {
      const paidDate = toDateOnly(row.paid_date);

      if (
        paidDate &&
        (!accumulator.last_payment_date || paidDate > accumulator.last_payment_date)
      ) {
        accumulator.last_payment_date = paidDate;
      }

      accumulators.set(applicationId, accumulator);
      continue;
    }

    if (row.status !== 'cancelled') {
      const grace = Number(row.grace_days ?? 0);

      accumulator.has_open = true;
      accumulator.outstanding_total = roundMoney(
        accumulator.outstanding_total + Number(row.amount ?? 0) + Number(row.late_fee ?? 0)
      );
      accumulator.next_due_date = accumulator.next_due_date ?? dueDate;

      if (today > addDaysSafe(dueDate, grace)) {
        accumulator.overdue = true;
      } else if (isDueSoon(dueDate, today)) {
        accumulator.due_soon = true;
      }
    }

    accumulators.set(applicationId, accumulator);
  }

  for (const accumulator of accumulators.values()) {
    summaries.set(accumulator.application_id, {
      application_id: accumulator.application_id,
      payment_status: accumulator.has_open
        ? accumulator.overdue
          ? 'overdue'
          : accumulator.due_soon
          ? 'due_soon'
          : 'pending'
        : accumulator.last_payment_date
        ? 'paid'
        : 'none',
      payment_due_day: accumulator.due_day,
      last_payment_date: accumulator.last_payment_date,
      outstanding_total: accumulator.outstanding_total,
      next_due_date: accumulator.next_due_date,
    });
  }

  return summaries;
}

function addDaysSafe(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return shifted.toISOString().slice(0, 10);
}
