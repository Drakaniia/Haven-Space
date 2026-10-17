import { accessiblePropertyClause } from '../property-access/helpers';
import {
  DEFAULT_GRACE_DAYS,
  TRACKER_STATUS_ORDER,
  addMonthsClamped,
  daysBetween,
  manilaToday,
  monthKey,
  nextDueAfter,
  roundMoney,
  toDateOnly,
  trackerStatus,
  trackerStatusLabel,
  type TrackerStatus,
} from './helpers';
import { listSubmissionsForCharges } from './ledger';
import { formatCharge, type ChargeDto, type ChargeRow } from './types';

/**
 * The monthly boarder tracker (spec `payments-tracker-redesign` §3/§5.1).
 *
 * One row per confirmed tenancy, not per charge: the row's cycle is the tenancy's
 * open **rent** charge (D6) and its state is derived, so a stale billing job can
 * never leave a wrong badge. Deposit, advance, utility and late-fee charges stay
 * in that tenancy's history (D16).
 */

export interface TrackerFilters {
  propertyId?: number;
  roomId?: number;
  /** `YYYY-MM`; narrows rows to tenancies with a rent cycle due or paid that month (D1). */
  month?: string;
  status?: string;
  dueFrom?: string;
  dueTo?: string;
  overdue?: boolean;
  needsReview?: boolean;
  search?: string;
}

export interface TrackerLastPayment {
  date: string;
  amount: number;
  method: string;
  method_label: string | null;
}

export interface TrackerRow {
  application_id: number;
  boarder_id: number;
  boarder_name: string;
  room_id: number;
  room_number: string;
  room_occupied: number;
  room_capacity: number;
  move_in_date: string;
  monthly_rent: number;
  next_due_date: string | null;
  days_remaining: number | null;
  days_overdue: number | null;
  status: TrackerStatus;
  status_label: string;
  current_charge_id: number | null;
  amount_due: number;
  last_payment: TrackerLastPayment | null;
  has_pending_claim: boolean;
  other_open_charges: number;
  can_remind: boolean;
}

export interface TrackerSummary {
  expected: number;
  paid: number;
  due_today: number;
  in_grace: number;
  overdue: number;
}

export interface TrackerResponse {
  rows: TrackerRow[];
  summary: TrackerSummary;
  counts: { rows: number; needs_review: number };
}

interface TenancyRow {
  application_id: number;
  boarder_id: number;
  room_id: number;
  property_id: number;
  move_in_date: string;
  next_due_date: string | null;
  room_number: string | null;
  room_occupied: number | string | null;
  room_capacity: number | string | null;
  room_price: number | string | null;
  grace_days: number | string | null;
  property_title: string | null;
  boarder_first_name: string | null;
  boarder_last_name: string | null;
}

interface TrackerChargeRow extends ChargeRow {
  pending_claims?: number | string | null;
}

interface TrackerEntry {
  row: TrackerRow;
  rents: ChargeDto[];
  lastPaidTotal: number;
}

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function boarderName(row: TenancyRow): string {
  return [row.boarder_first_name, row.boarder_last_name].filter(Boolean).join(' ').trim();
}

function monthOf(date: string | null | undefined): string | null {
  return date ? monthKey(date) : null;
}

/**
 * The tenancy's next due date, in precedence order:
 *
 * 1. the **open rent cycle** — the row that actually carries the money, so the
 *    column can never contradict the charge a payment would settle;
 * 2. the stored anchor (D3), which is the truth between cycles and what the
 *    landlord's manual edit writes;
 * 3. the move-in rule rolled forward past today — the same rule the backfill
 *    uses (D20), so an unbilled tenancy never shows a past “next” date.
 *
 * In the normal case (1) and (2) are identical: every recorded payment re-anchors
 * the tenancy and shifts the open row onto it (§3.3).
 */
function deriveNextDueDate(
  row: TenancyRow,
  openRent: ChargeDto | null,
  today: string
): string | null {
  if (openRent) {
    return toDateOnly(openRent.due_date);
  }

  if (row.next_due_date) {
    return toDateOnly(row.next_due_date);
  }

  const moveIn = toDateOnly(row.move_in_date);

  if (!moveIn) {
    return null;
  }

  const dueDay = Number(moveIn.slice(8, 10));
  let next = nextDueAfter(moveIn, dueDay);
  let guard = 0;

  while (next < today && guard < 240) {
    next = addMonthsClamped(next, 1, dueDay);
    guard += 1;
  }

  return next;
}

/**
 * The rent charge that belongs to the selected month: due that month, or paid
 * that month when the money landed early or late.
 */
function cycleForMonth(rents: ChargeDto[], month: string | undefined): ChargeDto | null {
  if (!month) {
    return null;
  }

  const byDue = rents.find(charge => monthOf(charge.due_date) === month);

  if (byDue) {
    return byDue;
  }

  return (
    rents.find(charge => charge.stored_status === 'paid' && monthOf(charge.paid_date) === month) ??
    null
  );
}

function searchableText(row: TenancyRow, charges: ChargeDto[]): string {
  return [
    boarderName(row),
    row.room_number ?? '',
    ...charges.map(charge => charge.reference_number ?? ''),
    ...charges.flatMap(charge => charge.submissions.map(submission => submission.reference_number)),
  ]
    .join(' ')
    .toLowerCase();
}

function recentDue(charge: ChargeDto | null): number {
  return charge ? roundMoney(charge.amount + charge.late_fee) : 0;
}

function lastPaymentOf(charges: ChargeDto[]): TrackerLastPayment | null {
  const paid = charges
    .filter(charge => charge.stored_status === 'paid' && charge.paid_date)
    .sort((left, right) => String(left.paid_date).localeCompare(String(right.paid_date)));
  const latest = paid.at(-1);

  if (!latest) {
    return null;
  }

  return {
    date: toDateOnly(latest.paid_date ?? latest.due_date),
    amount: latest.total_due,
    method: latest.payment_method ?? '',
    method_label: latest.payment_method_label ?? null,
  };
}

export async function listTrackerRows(
  db: D1Database,
  landlordId: number,
  filters: TrackerFilters = {},
  today: string = manilaToday()
): Promise<TrackerResponse> {
  const clauses = [
    "app.status = 'confirmed'",
    'app.deleted_at IS NULL',
    'pr.deleted_at IS NULL',
    accessiblePropertyClause('pr'),
  ];
  const binds: unknown[] = [landlordId, landlordId];

  if (filters.propertyId) {
    clauses.push('r.property_id = ?');
    binds.push(filters.propertyId);
  }

  if (filters.roomId) {
    clauses.push('app.room_id = ?');
    binds.push(filters.roomId);
  }

  const search = (filters.search ?? '').trim().toLowerCase();

  if (search) {
    clauses.push(
      `(LOWER(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))) LIKE ?
        OR LOWER(COALESCE(r.room_number, r.title, '')) LIKE ?)`
    );
    binds.push(`%${search}%`, `%${search}%`);
  }

  const tenancies = await db
    .prepare(
      `
        SELECT
          app.id AS application_id,
          app.boarder_id,
          app.room_id,
          r.property_id AS property_id,
          COALESCE(app.confirmed_at, app.created_at) AS move_in_date,
          app.next_due_date,
          COALESCE(r.room_number, r.title) AS room_number,
          r.occupied AS room_occupied,
          r.capacity AS room_capacity,
          r.price AS room_price,
          pr.title AS property_title,
          COALESCE(pr.late_fee_grace_days, ${DEFAULT_GRACE_DAYS}) AS grace_days,
          u.first_name AS boarder_first_name,
          u.last_name AS boarder_last_name
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties pr ON r.property_id = pr.id
        JOIN users u ON app.boarder_id = u.id
        WHERE ${clauses.join(' AND ')}
        ORDER BY app.id ASC
      `
    )
    .bind(...binds)
    .all<TenancyRow>();

  const tenancyRows = tenancies.results ?? [];
  const applicationIds = tenancyRows.map(row => Number(row.application_id));
  const chargesByApplication = new Map<number, ChargeDto[]>();

  if (applicationIds.length > 0) {
    const placeholders = applicationIds.map(() => '?').join(', ');
    const chargeRows = await db
      .prepare(
        `
          SELECT
            pay.*,
            pr.title AS property_title,
            COALESCE(pr.late_fee_grace_days, ${DEFAULT_GRACE_DAYS}) AS grace_days,
            COALESCE(pr.late_fee_amount, 0) AS late_fee_amount,
            COALESCE(r.room_number, r.title) AS room_title,
            (
              SELECT COUNT(*) FROM payment_submissions ps
              WHERE ps.payment_id = pay.id AND ps.status = 'pending'
            ) AS pending_claims
          FROM payments pay
          JOIN properties pr ON pay.property_id = pr.id
          LEFT JOIN rooms r ON pay.room_id = r.id
          WHERE pay.application_id IN (${placeholders})
          ORDER BY pay.due_date ASC, pay.id ASC
        `
      )
      .bind(...applicationIds)
      .all<TrackerChargeRow>();

    const raw = chargeRows.results ?? [];
    const submissions = await listSubmissionsForCharges(
      db,
      raw.map(charge => Number(charge.id))
    );

    for (const charge of raw) {
      const applicationId = Number(charge.application_id);
      const list = chargesByApplication.get(applicationId) ?? [];
      list.push(formatCharge(charge, today, submissions.get(Number(charge.id)) ?? []));
      chargesByApplication.set(applicationId, list);
    }
  }

  const entries: TrackerEntry[] = [];

  for (const tenancy of tenancyRows) {
    const applicationId = Number(tenancy.application_id);
    const charges = chargesByApplication.get(applicationId) ?? [];
    const rents = charges.filter(charge => charge.charge_type === 'rent');
    const openRent =
      rents.filter(
        charge => charge.status !== 'paid' && charge.stored_status !== 'cancelled'
      )[0] ?? null;
    const paidRent = rents
      .filter(charge => charge.stored_status === 'paid' && charge.paid_date)
      .sort((left, right) => String(left.paid_date).localeCompare(String(right.paid_date)));

    // D1: the month narrows the rows to tenancies with a cycle due or paid then.
    if (filters.month && !cycleForMonth(rents, filters.month)) {
      continue;
    }

    if (search && !searchableText(tenancy, charges).includes(search)) {
      continue;
    }

    const graceDays = Math.max(numeric(tenancy.grace_days), 0);
    const dueDate = deriveNextDueDate(tenancy, openRent, today);
    const settled = !openRent && paidRent.length > 0;
    const status = trackerStatus({
      dueDate: openRent ? dueDate : null,
      graceDays,
      today,
      settled,
    });
    const remaining = openRent && dueDate ? daysBetween(today, dueDate) : null;
    const hasPendingClaim = charges.some(charge =>
      charge.submissions.some(item => item.status === 'pending')
    );

    const row: TrackerRow = {
      application_id: applicationId,
      boarder_id: Number(tenancy.boarder_id),
      boarder_name: boarderName(tenancy),
      room_id: Number(tenancy.room_id),
      room_number: tenancy.room_number ?? '',
      room_occupied: numeric(tenancy.room_occupied),
      room_capacity: Math.max(numeric(tenancy.room_capacity), 1),
      move_in_date: toDateOnly(tenancy.move_in_date),
      monthly_rent: roundMoney(
        numeric(openRent?.amount ?? paidRent.at(-1)?.amount ?? tenancy.room_price)
      ),
      next_due_date: dueDate,
      days_remaining: remaining !== null && remaining >= 0 ? remaining : null,
      days_overdue:
        status === 'overdue' || status === 'in_grace' ? Math.abs(remaining ?? 0) : null,
      status,
      status_label: trackerStatusLabel(status, remaining ?? 0),
      current_charge_id: openRent ? openRent.id : null,
      amount_due: recentDue(openRent),
      last_payment: lastPaymentOf(charges),
      has_pending_claim: hasPendingClaim,
      other_open_charges: charges.filter(
        charge =>
          charge.charge_type !== 'rent' &&
          charge.status !== 'paid' &&
          charge.stored_status !== 'cancelled'
      ).length,
      can_remind: Boolean(openRent) && !hasPendingClaim && !openRent?.reminder_sent_at,
    };

    if (filters.status && row.status !== filters.status) {
      continue;
    }

    if (filters.overdue && row.status !== 'overdue') {
      continue;
    }

    if (filters.needsReview && !row.has_pending_claim) {
      continue;
    }

    if (filters.dueFrom && (!row.next_due_date || row.next_due_date < filters.dueFrom)) {
      continue;
    }

    if (filters.dueTo && (!row.next_due_date || row.next_due_date > filters.dueTo)) {
      continue;
    }

    entries.push({ row, rents, lastPaidTotal: paidRent.at(-1)?.total_due ?? 0 });
  }

  const severity = (status: TrackerStatus) => TRACKER_STATUS_ORDER.indexOf(status);

  entries.sort((left, right) => {
    const bySeverity = severity(left.row.status) - severity(right.row.status);

    if (bySeverity !== 0) {
      return bySeverity;
    }

    if (left.row.next_due_date && right.row.next_due_date) {
      return left.row.next_due_date.localeCompare(right.row.next_due_date);
    }

    return left.row.boarder_name.localeCompare(right.row.boarder_name);
  });

  const summary: TrackerSummary = {
    expected: 0,
    paid: 0,
    due_today: 0,
    in_grace: 0,
    overdue: 0,
  };

  for (const entry of entries) {
    const cycle = cycleForMonth(entry.rents, filters.month);

    summary.expected += cycle ? cycle.amount : entry.row.monthly_rent;
    summary.paid +=
      cycle && cycle.stored_status === 'paid'
        ? cycle.total_due
        : filters.month
          ? 0
          : entry.lastPaidTotal;

    if (entry.row.status === 'due_today') {
      summary.due_today += entry.row.amount_due;
    } else if (entry.row.status === 'in_grace') {
      summary.in_grace += entry.row.amount_due;
    } else if (entry.row.status === 'overdue') {
      summary.overdue += entry.row.amount_due;
    }
  }

  return {
    rows: entries.map(entry => entry.row),
    summary: {
      expected: roundMoney(summary.expected),
      paid: roundMoney(summary.paid),
      due_today: roundMoney(summary.due_today),
      in_grace: roundMoney(summary.in_grace),
      overdue: roundMoney(summary.overdue),
    },
    counts: {
      rows: entries.length,
      needs_review: entries.filter(entry => entry.row.has_pending_claim).length,
    },
  };
}

export interface TenancyPaymentHistory {
  tenancy: {
    application_id: number;
    boarder_id: number;
    boarder_name: string;
    room_number: string;
    property_title: string;
    move_in_date: string;
    next_due_date: string | null;
    monthly_rent: number;
  };
  charges: ChargeDto[];
}

/** Full charge history for one tenancy, newest first (the row's expansion, D16). */
export async function listTenancyPaymentHistory(
  db: D1Database,
  landlordId: number,
  applicationId: number,
  today: string = manilaToday()
): Promise<TenancyPaymentHistory | null> {
  const tenancy = await db
    .prepare(
      `
        SELECT
          app.id AS application_id,
          app.boarder_id,
          app.next_due_date,
          COALESCE(app.confirmed_at, app.created_at) AS move_in_date,
          COALESCE(r.room_number, r.title) AS room_number,
          r.price AS room_price,
          pr.title AS property_title,
          u.first_name AS boarder_first_name,
          u.last_name AS boarder_last_name
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties pr ON r.property_id = pr.id
        JOIN users u ON app.boarder_id = u.id
        WHERE app.id = ?
          AND app.deleted_at IS NULL
          AND pr.deleted_at IS NULL
          AND ${accessiblePropertyClause('pr')}
      `
    )
    .bind(applicationId, landlordId, landlordId)
    .first<TenancyRow>();

  if (!tenancy) {
    return null;
  }

  const rows = await db
    .prepare(
      `
        SELECT
          pay.*,
          pr.title AS property_title,
          COALESCE(pr.late_fee_grace_days, ${DEFAULT_GRACE_DAYS}) AS grace_days,
          COALESCE(pr.late_fee_amount, 0) AS late_fee_amount,
          COALESCE(r.room_number, r.title) AS room_title
        FROM payments pay
        JOIN properties pr ON pay.property_id = pr.id
        LEFT JOIN rooms r ON pay.room_id = r.id
        WHERE pay.application_id = ?
          AND pr.deleted_at IS NULL
          AND ${accessiblePropertyClause('pr')}
        ORDER BY pay.due_date DESC, pay.id DESC
      `
    )
    .bind(applicationId, landlordId, landlordId)
    .all<ChargeRow>();

  const raw = rows.results ?? [];
  const submissions = await listSubmissionsForCharges(
    db,
    raw.map(charge => Number(charge.id))
  );

  return {
    tenancy: {
      application_id: Number(tenancy.application_id),
      boarder_id: Number(tenancy.boarder_id),
      boarder_name: boarderName(tenancy),
      room_number: tenancy.room_number ?? '',
      property_title: tenancy.property_title ?? '',
      move_in_date: toDateOnly(tenancy.move_in_date),
      next_due_date: tenancy.next_due_date ? toDateOnly(tenancy.next_due_date) : null,
      monthly_rent: roundMoney(numeric(tenancy.room_price)),
    },
    charges: raw.map(charge =>
      formatCharge(charge, today, submissions.get(Number(charge.id)) ?? [])
    ),
  };
}
