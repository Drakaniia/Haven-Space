import { accessiblePropertyClause } from '../property-access/helpers';
import {
  addMonthsClamped,
  manilaToday,
  monthLabel,
  previousDay,
  roundMoney,
  shortDisplayDate,
  toDateOnly,
} from './helpers';

/**
 * The tenancy's next due date, and the one rent row that follows it
 * (spec `payments-tracker-redesign` §3.2/§3.3, updated for pay-as-you-go billing).
 *
 * When a rent charge settles:
 * - On or before due date: next due = `paidDate + 1 month` (period `paidDate`..`nextDue`).
 * - Late (after due date): next due stays anchored = `scheduledDue + 1 month` with a reason note.
 * If an open future rent row already exists (from older pre-generated data), it is
 * shifted; otherwise the next month's rent charge is created immediately.
 */

export interface ReanchorResult {
  next_due_date: string;
  previous_due_date: string | null;
  /** True when a not-yet-due rent row was moved onto the new date. */
  shifted: boolean;
  /** True when a new next-month rent charge was created. */
  created: boolean;
}

export interface NextRentDueCalculation {
  nextDue: string;
  isLate: boolean;
  reasonNote: string | null;
  periodStart: string;
  periodEnd: string;
}

export function computeNextRentDue(input: {
  scheduledDueDate?: string | null;
  paidDate: string;
}): NextRentDueCalculation {
  const paid = toDateOnly(input.paidDate);
  const scheduled = input.scheduledDueDate ? toDateOnly(input.scheduledDueDate) : null;
  const isLate = Boolean(scheduled && paid > scheduled);

  if (isLate && scheduled) {
    const nextDue = addMonthsClamped(scheduled, 1);

    return {
      nextDue,
      isLate: true,
      periodStart: scheduled,
      periodEnd: nextDue,
      reasonNote: `Due date kept on ${shortDisplayDate(nextDue)} due to late payment on ${shortDisplayDate(
        paid
      )} (was due ${shortDisplayDate(scheduled)}).`,
    };
  }

  const paidNext = addMonthsClamped(paid, 1);

  // Paying a cycle a month+ early makes paid+1mo land on or before the settled
  // due date, so advance to scheduled+1mo instead of colliding on the same cycle.
  if (scheduled && paidNext <= scheduled) {
    const nextDue = addMonthsClamped(scheduled, 1);

    return {
      nextDue,
      isLate: false,
      periodStart: scheduled,
      periodEnd: nextDue,
      reasonNote: null,
    };
  }

  return {
    nextDue: paidNext,
    isLate: false,
    periodStart: paid,
    periodEnd: paidNext,
    reasonNote: null,
  };
}

interface PendingRentRow {
  id: number;
  due_date: string;
  generation_key: string | null;
}

interface ActiveTenancyBillingRow {
  id: number;
  boarder_id: number;
  landlord_id: number;
  room_id: number;
  property_id: number;
  room_price: number | string;
  leave_request_status: string | null;
  intended_leave_date: string | null;
}

async function writeAnchor(
  db: D1Database,
  applicationId: number,
  nextDueDate: string
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE applications
        SET next_due_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'confirmed' AND deleted_at IS NULL
      `
    )
    .bind(toDateOnly(nextDueDate), applicationId)
    .run();

  return Number(result.meta.changes ?? 0);
}

/**
 * Writes the tenancy's anchor, scoped by property access. Returns 0 when the
 * caller cannot manage that tenancy (the route answers 404 for that).
 */
export async function setTenancyNextDueDate(
  db: D1Database,
  landlordId: number,
  applicationId: number,
  nextDueDate: string
): Promise<number> {
  const allowed = await db
    .prepare(
      `
        SELECT app.id
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        WHERE app.id = ?
          AND app.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND ${accessiblePropertyClause('p')}
      `
    )
    .bind(applicationId, landlordId, landlordId)
    .first<{ id: number }>();

  if (!allowed) {
    return 0;
  }

  return await writeAnchor(db, applicationId, nextDueDate);
}

/**
 * Moves the earliest not-yet-due rent row onto `newDue` (§3.3).
 *
 * Idempotent: it skips when the row already sits on that date and when another
 * row already carries the target `generation_key`, so a retry cannot leave two
 * open rent cycles behind.
 */
export async function shiftPendingRentCharge(
  db: D1Database,
  applicationId: number,
  newDue: string,
  today: string = manilaToday(),
  options: { periodStart?: string; periodEnd?: string; notes?: string | null } = {}
): Promise<boolean> {
  const target = toDateOnly(newDue);
  const row = await db
    .prepare(
      `
        SELECT id, due_date, generation_key
        FROM payments
        WHERE application_id = ?
          AND charge_type = 'rent'
          AND status = 'pending'
          AND generation_key IS NOT NULL
          AND due_date > ?
        ORDER BY due_date ASC, id ASC
        LIMIT 1
      `
    )
    .bind(applicationId, today)
    .first<PendingRentRow>();

  if (!row || toDateOnly(row.due_date) === target) {
    return false;
  }

  const newKey = `rent:${applicationId}:${target}`;
  const clash = await db
    .prepare('SELECT 1 AS present FROM payments WHERE generation_key = ? AND id <> ? LIMIT 1')
    .bind(newKey, Number(row.id))
    .first<{ present: number }>();

  if (clash) {
    return false;
  }

  const periodStart = options.periodStart ?? target;
  const periodEnd = options.periodEnd ?? previousDay(addMonthsClamped(target, 1));

  await db
    .prepare(
      `
        UPDATE payments
        SET due_date = ?,
            period_start = ?,
            period_end = ?,
            description = ?,
            notes = COALESCE(?, notes),
            generation_key = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(
      target,
      periodStart,
      periodEnd,
      `Monthly rent — ${monthLabel(target)}`,
      options.notes ?? null,
      newKey,
      Number(row.id)
    )
    .run();

  return true;
}

/**
 * Creates the next month's rent charge after a rent settlement when no open
 * rent row already exists for that target cycle.
 */
async function createNextRentCharge(
  db: D1Database,
  input: {
    applicationId: number;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    notes: string | null;
  }
): Promise<boolean> {
  const tenancy = await db
    .prepare(
      `
        SELECT
          app.id,
          app.boarder_id,
          app.landlord_id,
          app.room_id,
          r.property_id,
          r.price AS room_price,
          app.leave_request_status,
          app.intended_leave_date
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        WHERE app.id = ?
          AND app.status = 'confirmed'
          AND app.deleted_at IS NULL
      `
    )
    .bind(input.applicationId)
    .first<ActiveTenancyBillingRow>();

  if (!tenancy) {
    return false;
  }

  const leaveDate =
    tenancy.leave_request_status === 'approved' && tenancy.intended_leave_date
      ? toDateOnly(tenancy.leave_request_status === 'approved' ? tenancy.intended_leave_date : '')
      : null;

  if (leaveDate && input.dueDate > leaveDate) {
    return false;
  }

  const rent = roundMoney(Number(tenancy.room_price));

  if (rent <= 0) {
    return false;
  }

  const existingOpen = await db
    .prepare(
      `
        SELECT 1 AS present
        FROM payments
        WHERE application_id = ?
          AND charge_type = 'rent'
          AND status IN ('pending', 'awaiting_verification', 'overdue')
          AND due_date >= ?
        LIMIT 1
      `
    )
    .bind(input.applicationId, input.dueDate)
    .first<{ present: number }>();

  if (existingOpen) {
    return false;
  }

  const result = await db
    .prepare(
      `
        INSERT OR IGNORE INTO payments (
          boarder_id, landlord_id, room_id, property_id, application_id,
          charge_type, description, notes, amount, due_date, period_start, period_end,
          status, generation_key, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'rent', ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .bind(
      Number(tenancy.boarder_id),
      Number(tenancy.landlord_id),
      Number(tenancy.room_id),
      Number(tenancy.property_id),
      input.applicationId,
      `Monthly rent — ${monthLabel(input.dueDate)}`,
      input.notes,
      rent,
      input.dueDate,
      input.periodStart,
      input.periodEnd,
      `rent:${input.applicationId}:${input.dueDate}`
    )
    .run();

  return Number(result.meta.changes ?? 0) > 0;
}

/**
 * The one write path for “the rent cycle moved”: used by landlord recording,
 * proof verification, and manual edits. Access must already be verified.
 */
export async function reanchorNextDue(
  db: D1Database,
  input: {
    applicationId: number;
    /** `YYYY-MM-DD` the payment occurred — determines early/on-time vs late. */
    anchorDate?: string;
    /** Scheduled `YYYY-MM-DD` due date of the settled rent charge. */
    scheduledDueDate?: string | null;
    /** Explicit next due date override. */
    nextDueDate?: string | null;
    today?: string;
  }
): Promise<ReanchorResult | null> {
  const today = input.today ?? manilaToday();
  const paidDate = toDateOnly(input.anchorDate ?? today);
  const computed = computeNextRentDue({
    scheduledDueDate: input.scheduledDueDate,
    paidDate,
  });
  const explicit = input.nextDueDate ? toDateOnly(input.nextDueDate) : null;
  const nextDue = explicit ?? computed.nextDue;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue)) {
    return null;
  }

  const useComputedDetails = !explicit || explicit === computed.nextDue;
  const periodStart = useComputedDetails ? computed.periodStart : paidDate;
  const periodEnd = nextDue;
  const notes = useComputedDetails ? computed.reasonNote : null;

  const existing = await db
    .prepare('SELECT next_due_date FROM applications WHERE id = ?')
    .bind(input.applicationId)
    .first<{ next_due_date: string | null }>();
  const previous = existing?.next_due_date ? toDateOnly(existing.next_due_date) : null;

  await writeAnchor(db, input.applicationId, nextDue);

  const shifted = await shiftPendingRentCharge(db, input.applicationId, nextDue, today, {
    periodStart,
    periodEnd,
    notes,
  });
  const created = shifted
    ? false
    : await createNextRentCharge(db, {
        applicationId: input.applicationId,
        dueDate: nextDue,
        periodStart,
        periodEnd,
        notes,
      });

  return { next_due_date: nextDue, previous_due_date: previous, shifted, created };
}
