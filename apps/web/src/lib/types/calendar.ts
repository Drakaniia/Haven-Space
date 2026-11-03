/* ------------------------------------------------------------------ calendar */

/**
 * The landlord calendar's event union (spec `landlord-calendar` §3/§5.2).
 *
 * Every event is an **all-day date** derived server-side from rows the ledger,
 * the applications page and the announcements page already own — the client
 * renders tones and labels, and never re-derives a status.
 */
export type CalendarEventType =
  | 'charge_due'
  | 'payment_received'
  | 'application_received'
  | 'application_accepted'
  | 'application_confirmed'
  | 'tenancy_move_in'
  | 'tenancy_move_out'
  | 'leave_requested'
  | 'announcement_publish';

export type CalendarFamily = 'money' | 'tenancy' | 'applications' | 'content';

export interface CalendarParty {
  id: number;
  name: string;
}

export interface CalendarLink {
  to: string;
  label: string;
}

export interface CalendarEvent {
  /** `<source>:<row id>:<type>` — stable across refetches, so it keys the chips. */
  id: string;
  type: CalendarEventType;
  family: CalendarFamily;
  /** `YYYY-MM-DD`, interpreted in Asia/Manila. */
  date: string;
  /** Exact moment the event happened, ISO 8601 with a zone (activity feed). */
  occurred_at: string;
  /** The person (or announcement title) the event is about, unlabelled. */
  subject: string;
  /** `StatusBadge` tone key, derived by the API. */
  status: string;
  /** True when the date is a proxy rather than a dedicated timestamp (spec L2). */
  approximate: boolean;
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
  /** Open charges on a leave event's application; blocks approval when above zero. */
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

export interface CalendarPayload {
  window: { from: string; to: string };
  /** Manila "today" from the server, so the client never guesses (D20). */
  today: string;
  property_id: number | null;
  counts: CalendarCounts;
  total: number;
  truncated: boolean;
  summary: CalendarSummary;
  events: CalendarEvent[];
}

export interface CalendarResponse {
  success: true;
  data: CalendarPayload;
}
