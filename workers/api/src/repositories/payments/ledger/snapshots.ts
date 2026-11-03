import { DEFAULT_GRACE_DAYS, isDueSoon, manilaToday, roundMoney, toDateOnly } from '../helpers';
import type { ChargeRow } from '../types';

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
