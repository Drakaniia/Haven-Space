/**
 * The landlord calendar's aggregation layer (spec `landlord-calendar` §3/§5.3).
 *
 * Everything here is a **read**: eight event types derived from rows that already
 * exist (`payments`, `applications`, `announcements`). Nothing is stored, so there
 * is no migration and no write path — the page is a different lens on data the
 * ledger, the boarders page and the announcements page already own.
 *
 * Two deliberate departures from the spec's illustrative payload are documented
 * in the spec's "deviations" block: the charge query is windowed (so a landlord
 * with years of history never loads their whole ledger to render one month), and
 * an event carries a neutral `subject` plus its raw fields rather than a
 * pre-labelled `title`, because every label already lives in the web layer
 * (`apps/web/src/lib/payments.ts`) and the API returns raw vocabulary elsewhere.
 */

export const CALENDAR_EVENT_TYPES = [
  'charge_due',
  'payment_received',
  'application_received',
  'application_accepted',
  'application_confirmed',
  'tenancy_move_in',
  'tenancy_move_out',
  'leave_requested',
  'announcement_publish',
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const CALENDAR_FAMILIES = ['money', 'tenancy', 'applications', 'content'] as const;

export type CalendarFamily = (typeof CALENDAR_FAMILIES)[number];

/** Which family each event type belongs to. Drives the sort order and the filters. */
export const CALENDAR_EVENT_FAMILY: Record<CalendarEventType, CalendarFamily> = {
  charge_due: 'money',
  payment_received: 'money',
  application_received: 'applications',
  application_accepted: 'applications',
  application_confirmed: 'applications',
  tenancy_move_in: 'tenancy',
  tenancy_move_out: 'tenancy',
  leave_requested: 'tenancy',
  announcement_publish: 'content',
};

/**
 * Fixed family order, so a day's chips never reshuffle between refetches
 * (spec §5.2). Money is the most actionable, so it leads.
 */
export const CALENDAR_FAMILY_ORDER: readonly CalendarFamily[] = [
  'money',
  'tenancy',
  'applications',
  'content',
];

/**
 * One window's payload cap (spec D23). The response reports `truncated` and the
 * real `total` so the page can say "showing 500 of N" instead of silently
 * dropping a busy month's work.
 */
export const MAX_CALENDAR_EVENTS = 500;

/** Two adjacent months, which is every window the page ever asks for (D16). */
export const MAX_CALENDAR_WINDOW_DAYS = 62;

export interface CalendarParty {
  id: number;
  name: string;
}

export interface CalendarLink {
  to: string;
  label: string;
}

export interface CalendarEvent {
  /** Stable across refetches: `<source>:<row id>:<type>`. */
  id: string;
  type: CalendarEventType;
  family: CalendarFamily;
  /** All-day calendar date, `YYYY-MM-DD`, interpreted in Asia/Manila. */
  date: string;
  /**
   * Exact moment the event happened, ISO 8601 with a zone. The calendar itself
   * still renders `date`; the activity feed sorts and labels with this field
   * (spec `landlord-dashboard-redesign` §8.1).
   */
  occurred_at: string;
  /** The person or thing the event is about, unlabelled (see the file header). */
  subject: string;
  /** `StatusBadge` tone key — derived, never a stored column. */
  status: string;
  /** True when the date is a proxy rather than a dedicated timestamp (spec L2). */
  approximate: boolean;
  /** Total money on the event (`amount + late_fee`), or null when not a money event. */
  amount: number | null;
  late_fee: number | null;
  charge_type: string | null;
  description: string | null;
  period_start: string | null;
  period_end: string | null;
  reference_number: string | null;
  boarder: CalendarParty | null;
  room: CalendarParty | null;
  property: CalendarParty | null;
  link: CalendarLink;
  /** The application a tenancy/leave event belongs to (approve from the day panel). */
  application_id: number | null;
  /** Present on leave events so the approval dialog can show the request details. */
  leave_request: {
    reason: string | null;
    requested_on: string | null;
    leave_date: string;
  } | null;
  /**
   * Open charges on a leave event's application. The day panel needs this to
   * block approval before the landlord confirms (spec `approve-leave-request`
   * §3.5) — null on events that are not about leaving.
   */
  outstanding_amount?: number | null;
}

export interface CalendarCounts {
  money: number;
  tenancy: number;
  applications: number;
  content: number;
}

export interface CalendarSummary {
  due_amount: number;
  collected_amount: number;
  overdue_count: number;
  overdue_amount: number;
}

export interface CalendarWindow {
  from: string;
  to: string;
}

export interface CalendarResult {
  window: CalendarWindow;
  /** Manila "today" from the server, so the client never guesses (D20). */
  today: string;
  property_id: number | null;
  counts: CalendarCounts;
  total: number;
  truncated: boolean;
  summary: CalendarSummary;
  events: CalendarEvent[];
}

export interface CalendarQuery {
  from: string;
  to: string;
  propertyId?: number | null;
  types?: CalendarEventType[] | null;
}

export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const LINKS: Record<CalendarEventType, CalendarLink> = {
  charge_due: { to: '/landlord/payments', label: 'View ledger' },
  payment_received: { to: '/landlord/payments', label: 'View ledger' },
  application_received: { to: '/landlord/applications', label: 'View application' },
  application_accepted: { to: '/landlord/applications', label: 'View application' },
  application_confirmed: { to: '/landlord/applications', label: 'View application' },
  tenancy_move_in: { to: '/landlord/boarders', label: 'View boarder' },
  tenancy_move_out: { to: '/landlord/boarders', label: 'View boarder' },
  leave_requested: { to: '/landlord/boarders', label: 'View boarder' },
  announcement_publish: { to: '/landlord/announcements', label: 'View announcement' },
};
