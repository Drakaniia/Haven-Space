import {
  DEFAULT_GRACE_DAYS,
  DEFAULT_HORIZON_MONTHS,
  addDays,
  lateFeeFor,
  manilaToday,
  roundMoney,
  toDateOnly,
} from './helpers';
import { insertNotification } from './notify';
import { extendSchedulesForActiveTenancies } from './schedule';
import type { ChargeRow } from './types';

/**
 * The nightly billing run (spec `payments-feature` §8.2, reshaped by
 * `payments-tracker-redesign` §6 and D17/R7–R9).
 *
 * Every step is idempotent — `generation_key` for the schedule and late fees,
 * `overdue_notified_at` for the landlord notice — so a cron retry or a double
 * invocation cannot duplicate a fee or a notification.
 *
 * The run no longer notifies boarders at all: the only automatic notice is one
 * in-app message to the landlord when a charge passes its grace period. The
 * landlord's own “Send reminder” action is the one boarder-facing nudge (D14).
 */

export interface BillingRunResult {
  today: string;
  ran_at: string;
  schedules_extended: number;
  marked_overdue: number;
  late_fees_applied: number;
  /** Charges that crossed their grace period and notified their landlord once. */
  overdue_notices: number;
}

interface CandidateRow extends ChargeRow {
  grace_days?: number | string | null;
  late_fee_enabled?: number | string | null;
  late_fee_type?: string | null;
  late_fee_percent?: number | string | null;
  boarder_name?: string | null;
}

async function markOverdue(db: D1Database, today: string): Promise<number> {
  const rows = await db
    .prepare(
      `
        SELECT pay.id, pay.due_date, COALESCE(pr.late_fee_grace_days, ${DEFAULT_GRACE_DAYS}) AS grace_days
        FROM payments pay
        LEFT JOIN properties pr ON pay.property_id = pr.id
        WHERE pay.status IN ('pending', 'awaiting_verification')
          AND pay.due_date <= ?
      `
    )
    .bind(today)
    .all<CandidateRow>();

  let count = 0;

  for (const row of rows.results ?? []) {
    const dueDate = toDateOnly(row.due_date);
    const grace = Number(row.grace_days ?? DEFAULT_GRACE_DAYS);

    if (today <= addDays(dueDate, grace)) {
      continue;
    }

    await db
      .prepare(
        `
          UPDATE payments
          SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      )
      .bind(Number(row.id))
      .run();
    count += 1;
  }

  return count;
}

/** The percentage base for one cycle: its rent plus the cycle's other open charges (D10). */
async function cycleBase(db: D1Database, row: CandidateRow): Promise<number> {
  const amount = roundMoney(Number(row.amount ?? 0));

  if (String(row.charge_type) !== 'rent' || !row.period_start || !row.period_end) {
    return amount;
  }

  const extra = await db
    .prepare(
      `
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE application_id = ?
          AND id <> ?
          AND charge_type <> 'late_fee'
          AND status IN ('pending', 'awaiting_verification', 'overdue')
          AND due_date >= ?
          AND due_date <= ?
      `
    )
    .bind(
      Number(row.application_id ?? 0),
      Number(row.id),
      toDateOnly(row.period_start),
      toDateOnly(row.period_end)
    )
    .first<{ total: number | string | null }>();

  return roundMoney(amount + Number(extra?.total ?? 0));
}

async function applyLateFees(db: D1Database, today: string): Promise<number> {
  const rows = await db
    .prepare(
      `
        SELECT
          pay.id, pay.boarder_id, pay.landlord_id, pay.room_id, pay.property_id,
          pay.application_id, pay.charge_type, pay.description, pay.due_date, pay.amount,
          pay.period_start, pay.period_end,
          COALESCE(pr.late_fee_enabled, 1) AS late_fee_enabled,
          COALESCE(pr.late_fee_amount, 0) AS late_fee_amount,
          COALESCE(pr.late_fee_type, 'fixed') AS late_fee_type,
          COALESCE(pr.late_fee_percent, 0) AS late_fee_percent
        FROM payments pay
        LEFT JOIN properties pr ON pay.property_id = pr.id
        WHERE pay.status = 'overdue'
          AND pay.charge_type <> 'late_fee'
      `
    )
    .bind()
    .all<CandidateRow>();

  let count = 0;

  for (const row of rows.results ?? []) {
    const base = await cycleBase(db, row);
    const amount = lateFeeFor({
      enabled: Number(row.late_fee_enabled ?? 1) === 1,
      type: String(row.late_fee_type ?? 'fixed'),
      amount: Number(row.late_fee_amount ?? 0),
      percent: Number(row.late_fee_percent ?? 0),
      base,
    });

    if (amount <= 0) {
      continue;
    }

    const result = await db
      .prepare(
        `
          INSERT OR IGNORE INTO payments (
            boarder_id, landlord_id, room_id, property_id, application_id,
            charge_type, description, amount, due_date, status, generation_key,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, 'late_fee', ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `
      )
      .bind(
        Number(row.boarder_id),
        Number(row.landlord_id),
        Number(row.room_id),
        Number(row.property_id),
        row.application_id === null || row.application_id === undefined
          ? null
          : Number(row.application_id),
        `Late fee — ${String(row.charge_type ?? 'rent').replaceAll('_', ' ')} due ${toDateOnly(
          row.due_date
        )}`,
        amount,
        today,
        `late_fee:${Number(row.id)}`
      )
      .run();

    if (Number(result.meta.changes ?? 0) > 0) {
      count += 1;
    }
  }

  return count;
}

/**
 * One notice to the landlord per charge, after the grace period (D17) — never a
 * daily reminder, and never anything to the boarder.
 */
async function emitLandlordOverdueNotices(db: D1Database, today: string): Promise<number> {
  const rows = await db
    .prepare(
      `
        SELECT
          pay.id, pay.boarder_id, pay.landlord_id, pay.amount, pay.late_fee,
          pay.due_date, pay.charge_type, pay.description,
          COALESCE(pr.late_fee_grace_days, ${DEFAULT_GRACE_DAYS}) AS grace_days,
          TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS boarder_name
        FROM payments pay
        LEFT JOIN properties pr ON pay.property_id = pr.id
        LEFT JOIN users u ON pay.boarder_id = u.id
        WHERE pay.status = 'overdue'
          AND pay.overdue_notified_at IS NULL
      `
    )
    .bind()
    .all<CandidateRow>();

  let count = 0;

  for (const row of rows.results ?? []) {
    const dueDate = toDateOnly(row.due_date);
    const grace = Number(row.grace_days ?? DEFAULT_GRACE_DAYS);

    if (today <= addDays(dueDate, grace)) {
      continue;
    }

    const total = roundMoney(Number(row.amount ?? 0) + Number(row.late_fee ?? 0));
    const label = row.description || String(row.charge_type ?? 'rent').replaceAll('_', ' ');

    await insertNotification(db, {
      userId: Number(row.landlord_id),
      type: 'payment_overdue_landlord',
      title: 'A boarder payment is overdue',
      message: `${
        row.boarder_name || 'A boarder'
      }'s ${label} (₱${total.toLocaleString()}) was due ${dueDate} and is past its grace period.`,
      metadata: {
        charge_id: Number(row.id),
        boarder_id: Number(row.boarder_id),
        amount: total,
        due_date: dueDate,
      },
    });

    await db
      .prepare(
        `
          UPDATE payments
          SET overdue_notified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      )
      .bind(Number(row.id))
      .run();
    count += 1;
  }

  return count;
}

export async function runBillingJob(
  db: D1Database,
  now: Date = new Date()
): Promise<BillingRunResult> {
  const today = manilaToday(now);

  const schedulesExtended = await extendSchedulesForActiveTenancies(
    db,
    DEFAULT_HORIZON_MONTHS,
    today
  );
  const markedOverdue = await markOverdue(db, today);
  const lateFeesApplied = await applyLateFees(db, today);
  const overdueNotices = await emitLandlordOverdueNotices(db, today);

  return {
    today,
    ran_at: now.toISOString(),
    schedules_extended: schedulesExtended,
    marked_overdue: markedOverdue,
    late_fees_applied: lateFeesApplied,
    overdue_notices: overdueNotices,
  };
}
