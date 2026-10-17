/**
 * Pure helpers for the payments feature (spec `payments-feature` §6).
 *
 * Everything here is date/money arithmetic with no database access, so the
 * billing rules (due-day clamping, grace period, late-fee thresholds) are
 * unit-testable on their own.
 */

export const PAYMENT_METHODS = ['gcash', 'bank_transfer', 'cash', 'card', 'other'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Methods that do not carry a bank/e-wallet reference (spec `payments-tracker-redesign`
 * D12/D13): cash in hand and a custom method both settle on the landlord's word.
 */
export const METHOD_WITHOUT_REFERENCE: readonly string[] = ['cash', 'other'];

/** Methods that must attach a receipt — everything except cash (D13). */
export const METHOD_WITHOUT_RECEIPT: readonly string[] = ['cash'];

export const CHARGE_TYPES = ['rent', 'deposit', 'advance', 'utility', 'late_fee', 'other'] as const;

export type ChargeType = (typeof CHARGE_TYPES)[number];

/** Charge statuses. `overdue` is derived, the rest are stored (spec §1.7). */
export const PAYMENT_STATUSES = [
  'pending',
  'awaiting_verification',
  'overdue',
  'paid',
  'cancelled',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Statuses a charge can still be settled from. */
export const OPEN_STATUSES: readonly string[] = ['pending', 'awaiting_verification', 'overdue'];

export const DEFAULT_GRACE_DAYS = 3;
export const DEFAULT_LATE_FEE = 500;
export const DUE_SOON_DAYS = 3;
export const DEFAULT_HORIZON_MONTHS = 3;

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isChargeType(value: unknown): value is ChargeType {
  return typeof value === 'string' && (CHARGE_TYPES as readonly string[]).includes(value);
}

export function methodRequiresReference(method: string): boolean {
  return !METHOD_WITHOUT_REFERENCE.includes(method);
}

export function methodRequiresReceipt(method: string): boolean {
  return !METHOD_WITHOUT_RECEIPT.includes(method);
}

/**
 * Money is stored as SQLite REAL, so every amount that is written or compared is
 * rounded to centavos here rather than trusted (spec R3).
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

/** Centavo-safe equality, used for "is this charge fully paid". */
export function moneyEquals(left: number, right: number): boolean {
  return Math.abs(roundMoney(left) - roundMoney(right)) < 0.005;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Today's date in Asia/Manila (UTC+8) as `YYYY-MM-DD`.
 *
 * Due dates are calendar dates, so comparing them against a UTC "today" would
 * flip a charge to overdue eight hours late (or early) — the whole billing
 * calendar is Philippine local time (spec §8.2).
 */
export function manilaToday(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  return shifted.toISOString().slice(0, 10);
}

/** Normalises a SQL timestamp (`2026-05-10 08:00:00`) or ISO string to `YYYY-MM-DD`. */
export function toDateOnly(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.trim().replace('T', ' ').slice(0, 10);
}

function parseDateOnly(value: string): [number, number, number] {
  const [year, month, day] = toDateOnly(value).split('-').map(Number);

  return [year, month, day];
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The due day for one month, clamped to that month's length (spec D26). */
export function dueDateFor(year: number, month: number, dueDay: number): string {
  const normalizedMonth = ((month - 1) % 12) + 1;
  const normalizedYear = year + Math.floor((month - 1) / 12);
  const day = Math.min(Math.max(dueDay, 1), daysInMonth(normalizedYear, normalizedMonth));

  return isoDate(normalizedYear, normalizedMonth, day);
}

/**
 * The first due date strictly after `anchor`, using the anchor's day-of-month as
 * the due day (spec D16/D27): moving in on the 20th means the first charge is
 * due on the 20th of the following month, never pro-rated.
 */
export function nextDueAfter(anchor: string, dueDay: number): string {
  const anchorDate = toDateOnly(anchor);
  const [year, month] = parseDateOnly(anchorDate);
  const sameMonth = dueDateFor(year, month, dueDay);

  if (sameMonth > anchorDate) {
    return sameMonth;
  }

  return dueDateFor(year, month + 1, dueDay);
}

/** Adds whole months, clamping the day to the target month (spec D26). */
export function addMonthsClamped(date: string, months: number, preferredDay?: number): string {
  const [year, month, day] = parseDateOnly(date);

  return dueDateFor(year, month + months, preferredDay ?? day);
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = parseDateOnly(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return shifted.toISOString().slice(0, 10);
}

export function previousDay(date: string): string {
  return addDays(date, -1);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = parseDateOnly(from);
  const [ty, tm, td] = parseDateOnly(to);

  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / (24 * 60 * 60 * 1000));
}

export function daysOverdue(dueDate: string, today: string): number {
  return Math.max(daysBetween(dueDate, today), 0);
}

/**
 * The status a charge actually presents as right now. Stored `overdue` is never
 * written by the schedule generator — it is derived from the due date plus the
 * property's grace period, so a missed billing job cannot leave a stale badge.
 */
export function effectiveStatus(
  stored: string,
  dueDate: string,
  graceDays: number,
  today: string
): PaymentStatus {
  if (stored === 'paid' || stored === 'cancelled') {
    return stored;
  }

  if (stored === 'awaiting_verification') {
    return today > addDays(dueDate, graceDays) ? 'overdue' : 'awaiting_verification';
  }

  return today > addDays(dueDate, graceDays) ? 'overdue' : 'pending';
}

export function isOpenStatus(status: string): boolean {
  return OPEN_STATUSES.includes(status);
}

/**
 * The tracker's display vocabulary (spec `payments-tracker-redesign` §3.4).
 *
 * Derived, never stored — exactly like `effectiveStatus`, so a missed billing job
 * cannot leave a stale badge on a boarder's row.
 */
export type TrackerStatus =
  | 'paid'
  | 'due_today'
  | 'due_soon'
  | 'in_grace'
  | 'overdue'
  | 'upcoming'
  | 'no_charge';

/** Severity order for the table (most actionable first). */
export const TRACKER_STATUS_ORDER: readonly TrackerStatus[] = [
  'overdue',
  'due_today',
  'in_grace',
  'due_soon',
  'upcoming',
  'paid',
  'no_charge',
];

export function trackerStatus(input: {
  /** The cycle's due date, or `null` when the tenancy has no open rent cycle. */
  dueDate: string | null;
  graceDays: number;
  today: string;
  /** True when the tenancy's last cycle is settled and nothing is open. */
  settled: boolean;
}): TrackerStatus {
  if (!input.dueDate) {
    return input.settled ? 'paid' : 'no_charge';
  }

  if (input.settled) {
    return 'paid';
  }

  const due = toDateOnly(input.dueDate);
  const remaining = daysBetween(input.today, due);

  if (remaining < 0) {
    return daysBetween(due, input.today) > Math.max(input.graceDays, 0) ? 'overdue' : 'in_grace';
  }

  if (remaining === 0) {
    return 'due_today';
  }

  return remaining <= DUE_SOON_DAYS ? 'due_soon' : 'upcoming';
}

/** Human label for a tracker state, including the timing (brief: “days remaining or days overdue”). */
export function trackerStatusLabel(status: TrackerStatus, days: number): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'due_today':
      return 'Due today';
    case 'due_soon':
      return `Due in ${days}d`;
    case 'in_grace':
      return `In grace · ${Math.abs(days)}d left`;
    case 'overdue':
      return `Overdue · ${Math.abs(days)}d`;
    case 'upcoming':
      return `Upcoming · ${days}d`;
    default:
      return 'No active charge';
  }
}

/**
 * The late fee for one cycle (R8). A percentage is charged on the cycle's base —
 * the rent plus the cycle's other unpaid charges (D10) — and rounded like every
 * other amount.
 */
export function lateFeeFor(input: {
  enabled: boolean;
  type: string;
  amount: number;
  percent: number;
  base: number;
}): number {
  if (!input.enabled) {
    return 0;
  }

  if (input.type === 'percent') {
    const percent = Math.min(Math.max(Number(input.percent) || 0, 0), 100);

    return roundMoney(Math.max(input.base, 0) * (percent / 100));
  }

  return roundMoney(Math.max(input.amount, 0));
}

/** True when the charge is 1–3 days from its due date (spec D18). */
export function isDueSoon(
  dueDate: string,
  today: string,
  withinDays: number = DUE_SOON_DAYS
): boolean {
  const remaining = daysBetween(today, dueDate);

  return remaining >= 1 && remaining <= withinDays;
}

export function formatMoney(value: number): string {
  return `₱${roundMoney(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Month bucket (`2026-10`) for grouping a ledger. */
export function monthKey(date: string): string {
  return toDateOnly(date).slice(0, 7);
}
