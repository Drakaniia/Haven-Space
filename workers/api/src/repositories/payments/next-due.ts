import { accessiblePropertyClause } from '../property-access/helpers';
import { addMonthsClamped, manilaToday, previousDay, toDateOnly } from './helpers';

/**
 * The tenancy's next due date, and the one row that follows it
 * (spec `payments-tracker-redesign` §3.2/§3.3, D3/D4/D33).
 *
 * `applications.next_due_date` is the source of truth. The fixed schedule
 * pre-generates rent months ahead, so when a payment re-anchors the date the
 * **next not-yet-due** rent row is shifted onto it (keyed by `generation_key`);
 * settled, cancelled and already-due rows are never rewritten.
 */

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function monthLabel(date: string): string {
  const [year, month] = toDateOnly(date).split('-').map(Number);

  return `${MONTH_LABELS[month - 1] ?? month} ${year}`;
}

export interface ReanchorResult {
  next_due_date: string;
  previous_due_date: string | null;
  /** True when a not-yet-due rent row was moved onto the new date. */
  shifted: boolean;
}

interface PendingRentRow {
  id: number;
  due_date: string;
  generation_key: string | null;
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
  today: string = manilaToday()
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

  const periodEnd = previousDay(addMonthsClamped(target, 1));

  await db
    .prepare(
      `
        UPDATE payments
        SET due_date = ?,
            period_start = ?,
            period_end = ?,
            description = ?,
            generation_key = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(target, target, periodEnd, `Monthly rent — ${monthLabel(target)}`, newKey, Number(row.id))
    .run();

  return true;
}

/**
 * The one write path for “the rent cycle moved”: used by a recorded payment (R4)
 * and by the landlord's manual edit (R5), so the anchor and the open row can
 * never drift apart. Access must already be verified by the caller.
 */
export async function reanchorNextDue(
  db: D1Database,
  input: {
    applicationId: number;
    /** `YYYY-MM-DD` the next date is anchored on — the payment date (R4). */
    anchorDate?: string;
    /** Explicit next due date (R5); defaults to one month after the anchor date. */
    nextDueDate?: string | null;
    today?: string;
  }
): Promise<ReanchorResult | null> {
  const today = input.today ?? manilaToday();
  const explicit = input.nextDueDate ? toDateOnly(input.nextDueDate) : null;
  const nextDue = explicit ?? addMonthsClamped(toDateOnly(input.anchorDate ?? today), 1);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue)) {
    return null;
  }

  const existing = await db
    .prepare('SELECT next_due_date FROM applications WHERE id = ?')
    .bind(input.applicationId)
    .first<{ next_due_date: string | null }>();
  const previous = existing?.next_due_date ? toDateOnly(existing.next_due_date) : null;

  await writeAnchor(db, input.applicationId, nextDue);

  const shifted = await shiftPendingRentCharge(db, input.applicationId, nextDue, today);

  return { next_due_date: nextDue, previous_due_date: previous, shifted };
}
