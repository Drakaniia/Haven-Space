import { accessiblePropertyClause } from '../../property-access/helpers';
import { DEFAULT_GRACE_DAYS, manilaToday } from '../helpers';
import {
  formatCharge,
  formatSubmission,
  type ChargeDto,
  type ChargeRow,
  type SubmissionDto,
  type SubmissionRow,
} from '../types';

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
