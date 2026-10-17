import type { PaymentCharge, PropertyBillingSettings, TrackerRow, TrackerStatus } from './types';

/** Pure display helpers shared by the boarder and landlord payment screens. */

/**
 * Shown under a failed ledger request.
 *
 * A bare `Internal server error` from the payments routes nearly always means the
 * API is running against a database that predates migration `0021_payments` —
 * every query touches a column it added (spec `payments-page-regressions` D8).
 */
export const PAYMENTS_ERROR_HINT =
  'This usually means the API is running without the latest database migration. Run ' +
  '`bun run --cwd workers/api migrate:local`, then try again.';

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'gcash', label: 'GCash / e-wallet' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
] as const;

/** Cash settles on the landlord's word; every other method needs a receipt (D13). */
export function methodNeedsReceipt(value: string): boolean {
  return value !== 'cash';
}

/** Cash and a custom method carry no bank/e-wallet reference (D12). */
export function methodNeedsReference(value: string): boolean {
  return value !== 'cash' && value !== 'other';
}

export const CHARGE_TYPE_LABELS: Record<string, string> = {
  rent: 'Rent',
  deposit: 'Security deposit',
  advance: 'Advance payment',
  utility: 'Utilities',
  late_fee: 'Late fee',
  other: 'Other charge',
};

export function paymentMethodLabel(
  value: string | null | undefined,
  /** The stored custom name when the method is `other` (D12). */
  customLabel?: string | null
): string {
  if (!value) {
    return '—';
  }

  if (value === 'other' && customLabel) {
    return customLabel;
  }

  return (
    PAYMENT_METHODS.find(method => method.value === value)?.label ?? value.replaceAll('_', ' ')
  );
}

/**
 * Label, tone key and icon for the tracker's derived state — the icon and the
 * text label are what keep the state readable without colour (D25).
 */
export function trackerStatusMeta(row: Pick<TrackerRow, 'status' | 'status_label'>): {
  status: TrackerStatus;
  label: string;
  icon: string;
} {
  const icons: Record<TrackerStatus, string> = {
    paid: 'check',
    overdue: 'report',
    in_grace: 'clock',
    due_today: 'banknotes',
    due_soon: 'clock',
    upcoming: 'calendar',
    no_charge: 'minus',
  };

  return {
    status: row.status,
    label: row.status_label,
    icon: icons[row.status] ?? 'minus',
  };
}

/**
 * The tracker's “Room or bed” cell (D23): the room number plus its occupancy
 * share, e.g. `Room 4 · 2/4`.
 *
 * Seeded rooms already carry the word — `Room 1` — and the trap that produces
 * `Room Room 1` is avoided by only adding the prefix when it is missing.
 */
export function roomOrBedLabel(
  roomNumber: string | null | undefined,
  occupied: number,
  capacity: number
): string {
  const number = (roomNumber ?? '').trim();
  const label = /^room\b/i.test(number) ? number : `Room ${number}`.trim();

  return `${label} · ${occupied}/${capacity}`;
}

/** The on-page key for the five states the brief lists (plus the two quiet ones). */
export const TRACKER_STATUS_LEGEND: Array<{
  status: TrackerStatus;
  label: string;
  meaning: string;
}> = [
  { status: 'paid', label: 'Paid', meaning: 'Settled for the current cycle' },
  { status: 'due_soon', label: 'Due soon', meaning: 'Within 3 days of the due date' },
  { status: 'due_today', label: 'Due today', meaning: 'Due on today’s date' },
  { status: 'in_grace', label: 'In grace', meaning: 'Past the due date, inside the grace period' },
  { status: 'overdue', label: 'Overdue', meaning: 'Past the grace period — a fee may apply' },
  { status: 'upcoming', label: 'Upcoming', meaning: 'Due later than the due-soon window' },
  { status: 'no_charge', label: 'No active charge', meaning: 'Nothing billed to this boarder yet' },
];

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The late fee the billing run would add for a cycle, mirroring the server rule
 * (R8/D10) so the billing card can show a worked example before saving.
 */
export function lateFeePreview(
  settings: Pick<
    PropertyBillingSettings,
    'late_fee_enabled' | 'late_fee_type' | 'late_fee_amount' | 'late_fee_percent'
  >,
  base: number
): number {
  if (!settings.late_fee_enabled) {
    return 0;
  }

  if (settings.late_fee_type === 'percent') {
    const percent = Math.min(Math.max(Number(settings.late_fee_percent) || 0, 0), 100);

    return roundMoney(Math.max(base, 0) * (percent / 100));
  }

  return roundMoney(Math.max(Number(settings.late_fee_amount) || 0, 0));
}

export function chargeTypeLabel(value: string): string {
  return CHARGE_TYPE_LABELS[value] ?? value.replaceAll('_', ' ');
}

export function formatPeso(value: number): string {
  return `₱${Number(value ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPaymentDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthKey;
  }

  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Today in Asia/Manila as `YYYY-MM-DD`.
 *
 * Due dates are calendar dates in the Philippines' day, so the boarder's
 * "due today" badge must not flip eight hours early or late (`manilaToday` in
 * `payments/helpers.ts` is the server-side twin of this rule).
 */
export function manilaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Label + `StatusBadge` tone key for a charge.
 *
 * The tone key is the badge's vocabulary (`due_soon`, `due_today` and `in_grace`
 * are UI states, never stored statuses), so it is typed as a plain string rather
 * than `PaymentStatus`. The two date states are derived here rather than read
 * from the charge, because "in grace" is the server's `pending` until the grace
 * period runs out (spec `payments-tracker-redesign` §3.4 / Q7).
 */
export function paymentStatusMeta(
  charge: PaymentCharge,
  today: string = manilaToday()
): { status: string; label: string } {
  if (charge.stored_status === 'paid') {
    return { status: 'paid', label: 'Paid' };
  }

  if (charge.stored_status === 'cancelled') {
    return { status: 'cancelled', label: 'Cancelled' };
  }

  if (charge.status === 'overdue') {
    return {
      status: 'overdue',
      label: charge.days_overdue > 0 ? `Overdue · ${charge.days_overdue}d` : 'Overdue',
    };
  }

  // A submitted claim outranks the due-date states: the ball is with the landlord.
  if (charge.status === 'awaiting_verification') {
    return { status: 'awaiting_verification', label: 'Awaiting verification' };
  }

  const due = charge.due_date?.slice(0, 10) ?? '';

  if (due && due < today) {
    return { status: 'in_grace', label: 'In grace' };
  }

  if (due && due === today) {
    return { status: 'due_today', label: 'Due today' };
  }

  if (charge.is_due_soon) {
    return { status: 'due_soon', label: 'Due soon' };
  }

  return { status: 'pending', label: 'Unpaid' };
}

export function isChargeOpen(charge: PaymentCharge): boolean {
  return charge.stored_status !== 'paid' && charge.stored_status !== 'cancelled';
}

/** The most recent submission, or `null` when the boarder has never claimed it. */
export function latestSubmission(charge: PaymentCharge) {
  const submissions = charge.submissions ?? [];

  return submissions.length > 0 ? submissions[submissions.length - 1] : null;
}

export interface ChargeMonthGroup {
  month: string;
  label: string;
  charges: PaymentCharge[];
}

/** Groups the ledger by due-date month, newest month first. */
export function groupChargesByMonth(charges: PaymentCharge[]): ChargeMonthGroup[] {
  const groups = new Map<string, PaymentCharge[]>();

  for (const charge of charges) {
    const key = charge.due_date.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(charge);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .sort((left, right) => (left[0] < right[0] ? 1 : -1))
    .map(([month, list]) => ({
      month,
      label: monthLabel(month),
      charges: list.sort((left, right) => (left.due_date < right.due_date ? 1 : -1)),
    }));
}

/** Human summary of what the landlord still has to review. */
export function pendingReviewCount(charges: PaymentCharge[]): number {
  return charges.filter(
    charge => latestSubmission(charge)?.status === 'pending' && isChargeOpen(charge)
  ).length;
}
