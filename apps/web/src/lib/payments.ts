import type { PaymentCharge, PropertyBillingSettings, TrackerRow } from './types';

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

/* --------------------------------------------- payments monitoring page */

/** One row's display state on the monitoring page (spec `landlord-payments-monitoring` §3). */
export interface MonitorStatus {
  /** `StatusBadge` tone key — always an existing key, never a new colour. */
  tone: string;
  label: string;
  action: 'view' | 'review' | 'remind' | 'none';
}

/** The fields the label derivation needs; every `TrackerRow` satisfies it. */
export type MonitorRow = Pick<
  TrackerRow,
  'status' | 'days_remaining' | 'has_pending_claim' | 'has_rejected_claim' | 'monthly_rent'
>;

export type MonitorFilterKey =
  | 'paid'
  | 'needs_review'
  | 'payment_issue'
  | 'due_today'
  | 'due_soon'
  | 'in_grace'
  | 'overdue'
  | 'no_charge';

/**
 * The status filter's options: the seven labels the page shows (D11).
 *
 * `due_soon` reads "Due in X days" because it covers both the tracker's
 * `due_soon` and its `upcoming` — same sentence, different tone (§3).
 */
export const MONITOR_STATUS_OPTIONS: Array<{ value: MonitorFilterKey; label: string }> = [
  { value: 'needs_review', label: 'Needs review' },
  { value: 'payment_issue', label: 'Payment issue' },
  { value: 'due_today', label: 'Due today' },
  { value: 'due_soon', label: 'Due in X days' },
  { value: 'in_grace', label: 'In grace' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'no_charge', label: 'No charge yet' },
];

/** Tones that need the landlord's attention (D35). */
const ATTENTION_TONES = new Set(['in_grace', 'overdue', 'awaiting_verification', 'rejected']);

/**
 * The row's label, tone and action.
 *
 * Precedence is deliberate: a pending claim leaves the ball with the landlord, a
 * rejected claim means the tenant resubmits, and only then do the dates speak.
 * The table, the metrics and the footer all read this one function, so they can
 * never disagree.
 */
export function monitorStatusMeta(row: MonitorRow): MonitorStatus {
  if (row.has_pending_claim) {
    return { tone: 'awaiting_verification', label: 'Needs review', action: 'review' };
  }

  if (row.has_rejected_claim) {
    return { tone: 'rejected', label: 'Payment issue', action: 'remind' };
  }

  switch (row.status) {
    case 'paid':
      return { tone: 'paid', label: 'Paid', action: 'view' };
    case 'due_today':
      return { tone: 'due_today', label: 'Due today', action: 'remind' };
    case 'in_grace':
      return { tone: 'in_grace', label: 'In grace', action: 'remind' };
    case 'overdue':
      return { tone: 'overdue', label: 'Overdue', action: 'remind' };
    case 'due_soon':
    case 'upcoming': {
      const days = row.days_remaining;

      return {
        // Same words, different urgency: the tone does the work (§3).
        tone: row.status === 'due_soon' ? 'due_soon' : 'upcoming',
        label:
          days === null || days === undefined
            ? 'Due soon'
            : `Due in ${days} ${days === 1 ? 'day' : 'days'}`,
        action: 'remind',
      };
    }
    case 'no_charge':
    default:
      return { tone: 'no_charge', label: 'No charge yet', action: 'none' };
  }
}

/** The status filter's key for a row, folding `due_soon` and `upcoming` together. */
export function monitorFilterKey(row: MonitorRow): MonitorFilterKey {
  switch (monitorStatusMeta(row).tone) {
    case 'awaiting_verification':
      return 'needs_review';
    case 'rejected':
      return 'payment_issue';
    case 'due_soon':
    case 'upcoming':
      return 'due_soon';
    case 'paid':
      return 'paid';
    case 'due_today':
      return 'due_today';
    case 'in_grace':
      return 'in_grace';
    case 'overdue':
      return 'overdue';
    default:
      return 'no_charge';
  }
}

/**
 * Whether a row belongs in "Needs attention" (D35): past due, inside grace, or
 * waiting on the landlord. "Due today" and "Due in X days" are business as usual.
 */
export function needsAttention(row: MonitorRow): boolean {
  return ATTENTION_TONES.has(monitorStatusMeta(row).tone);
}

export interface MonitorMetrics {
  tenants: number;
  expected: number;
  paid: number;
  needsAttention: number;
}

/**
 * The four metrics, scoped to the rows the table is showing (D14/RES-3).
 *
 * Every money figure uses the cycle's rent (`monthly_rent`) so the three amounts
 * share one basis: expected = everyone still owing, paid = everyone settled.
 */
export function monitorMetrics(rows: MonitorRow[]): MonitorMetrics {
  let expected = 0;
  let paid = 0;
  let attention = 0;

  for (const row of rows) {
    const { tone } = monitorStatusMeta(row);
    const rent = Number(row.monthly_rent) || 0;

    if (tone === 'paid') {
      paid += rent;
    } else if (tone !== 'no_charge') {
      expected += rent;
    }

    if (ATTENTION_TONES.has(tone)) {
      attention += 1;
    }
  }

  return {
    tenants: rows.length,
    expected: roundMoney(expected),
    paid: roundMoney(paid),
    needsAttention: attention,
  };
}

/** The monitoring page's filter state, carried in the URL (D16). */
export interface MonitorFilters {
  propertyId: string;
  month: string;
  search: string;
  status: string;
  room: string;
  dueFrom: string;
  dueTo: string;
  overdue: boolean;
  needsReview: boolean;
  method: string;
}

export function emptyMonitorFilters(month: string): MonitorFilters {
  return {
    propertyId: '',
    month,
    search: '',
    status: '',
    room: '',
    dueFrom: '',
    dueTo: '',
    overdue: false,
    needsReview: false,
    method: '',
  };
}

/**
 * The client-side half of the filtering (RES-3): property, month and search are
 * applied by the server; everything else narrows the rows it returned.
 */
export function matchesFilters(row: TrackerRow, filters: MonitorFilters): boolean {
  if (filters.status && monitorFilterKey(row) !== filters.status) {
    return false;
  }

  if (filters.room && row.room_number !== filters.room) {
    return false;
  }

  if (filters.overdue && monitorFilterKey(row) !== 'overdue') {
    return false;
  }

  if (filters.needsReview && monitorFilterKey(row) !== 'needs_review') {
    return false;
  }

  if (filters.method && row.last_payment?.method !== filters.method) {
    return false;
  }

  if (filters.dueFrom && (!row.next_due_date || row.next_due_date < filters.dueFrom)) {
    return false;
  }

  if (filters.dueTo && (!row.next_due_date || row.next_due_date > filters.dueTo)) {
    return false;
  }

  return true;
}

/** Whether any of the controls — property and month excepted — narrows the table. */
export function hasActiveFilters(filters: MonitorFilters): boolean {
  return Boolean(
    filters.search ||
      filters.status ||
      filters.room ||
      filters.dueFrom ||
      filters.dueTo ||
      filters.overdue ||
      filters.needsReview ||
      filters.method
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** The Remind composer's starting text (D21) — editable, never sent as-is silently. */
export function reminderMessage(
  row: Pick<TrackerRow, 'boarder_name' | 'monthly_rent' | 'next_due_date' | 'days_overdue'>,
  month: string
): string {
  const due = row.next_due_date ? ` on ${formatPaymentDate(row.next_due_date)}` : '';
  const past =
    row.days_overdue && row.days_overdue > 0
      ? ` It's now ${row.days_overdue} ${row.days_overdue === 1 ? 'day' : 'days'} past the due date.`
      : '';

  return (
    `Hi ${firstName(row.boarder_name)}, a gentle reminder that your ${formatPeso(row.monthly_rent)} ` +
    `rent for ${month} was due${due}.${past} You can send your payment proof here once you've paid.`
  );
}

/** The post-rejection message, offered after a rejection (D31). */
export function rejectionMessage(
  row: Pick<TrackerRow, 'boarder_name' | 'monthly_rent'>,
  month: string,
  reason: string
): string {
  return (
    `Your ${formatPeso(row.monthly_rent)} rent payment for ${month} was rejected: ` +
    `${reason.trim()}. Please send a new proof with the correct amount and reference number.`
  );
}

/** The brief's exact request-a-new-proof sentence (§8.6). */
export const REQUEST_NEW_PROOF_MESSAGE =
  'Please send a clearer payment proof showing the amount and reference number.';

export type TenantTimelineKind =
  | 'charge_created'
  | 'proof_submitted'
  | 'proof_approved'
  | 'proof_rejected'
  | 'reminder_sent';

export interface TenantTimelineEvent {
  id: string;
  kind: TenantTimelineKind;
  /** Raw timestamp — the sort key, and what the drawer formats for display. */
  at: string;
  title: string;
  detail: string | null;
  tone: 'neutral' | 'info' | 'success' | 'error';
  proof_url?: string | null;
}

/**
 * The tenant drawer's payment activity timeline, derived from the tenancy's own
 * charges and submissions (D32) — one event per real record, nothing invented.
 *
 * Returned newest first; a rejection reuses `verified_at` because the schema has
 * no separate rejected timestamp (spec §22 L3).
 */
export function buildTenantTimeline(
  charges: PaymentCharge[],
  options: { viewerId?: number | null } = {}
): TenantTimelineEvent[] {
  const viewerId = options.viewerId ?? null;
  const events: TenantTimelineEvent[] = [];

  for (const charge of charges) {
    const typeLabel = chargeTypeLabel(charge.charge_type);

    events.push({
      id: `charge:${charge.id}:created`,
      kind: 'charge_created',
      at: charge.created_at,
      title: charge.charge_type === 'rent' ? 'Rent charge created' : `${typeLabel} charge created`,
      detail: `${formatPeso(charge.amount)} · due ${formatPaymentDate(charge.due_date)}`,
      tone: 'neutral',
    });

    if (charge.reminder_sent_at) {
      events.push({
        id: `charge:${charge.id}:reminder`,
        kind: 'reminder_sent',
        at: charge.reminder_sent_at,
        title: 'Reminder sent',
        detail: `${typeLabel} for ${monthLabel(charge.due_date.slice(0, 7))}`,
        tone: 'neutral',
      });
    }

    for (const submission of charge.submissions ?? []) {
      const money = [
        formatPeso(submission.amount),
        paymentMethodLabel(submission.payment_method),
        submission.reference_number ? `Ref ${submission.reference_number}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      if (submission.status === 'pending') {
        events.push({
          id: `submission:${submission.id}:pending`,
          kind: 'proof_submitted',
          at: submission.created_at,
          title: 'Proof submitted',
          detail: money,
          tone: 'info',
          proof_url: submission.proof_url,
        });
      } else if (submission.status === 'verified') {
        events.push({
          id: `submission:${submission.id}:verified`,
          kind: 'proof_approved',
          at: submission.verified_at ?? submission.created_at,
          title: 'Payment approved',
          detail: viewerId && submission.verified_by === viewerId ? `${money} · by you` : money,
          tone: 'success',
          proof_url: submission.proof_url,
        });
      } else if (submission.status === 'rejected') {
        events.push({
          id: `submission:${submission.id}:rejected`,
          kind: 'proof_rejected',
          at: submission.verified_at ?? submission.created_at,
          title: 'Payment rejected',
          detail: submission.rejection_reason
            ? `Reason: ${submission.rejection_reason}`
            : money,
          tone: 'error',
        });
      }
    }
  }

  return events.sort((left, right) => {
    if (left.at === right.at) {
      return left.id < right.id ? 1 : -1;
    }

    return left.at < right.at ? 1 : -1;
  });
}

/**
 * `Room 04` for a stored `04` or an already-labelled `Room 04` — the seeded
 * rooms carry both shapes, and `Room Room 04` is the trap.
 */
export function roomLabel(value: string | null | undefined): string {
  const label = (value ?? '').trim();

  if (!label) {
    return '';
  }

  return /^room\b/i.test(label) ? label : `Room ${label}`;
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

/**
 * A stored timestamp as `October 8, 2026 · 10:42 AM`, in Asia/Manila.
 *
 * SQLite writes `YYYY-MM-DD HH:MM:SS` in UTC, so a zoneless value is parsed as
 * UTC before the Manila offset is applied — the same reasoning as `manilaToday`,
 * and never the browser's own zone (spec §13.4).
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const normalized = value.trim().replace(' ', 'T');
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const date = new Date(hasZone ? normalized : `${normalized}Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return `${day} · ${time}`;
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
