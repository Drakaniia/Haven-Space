import type { CalendarFamily, CalendarLink, CalendarParty } from './calendar';

/* ------------------------------------------------------------------ activity */

/**
 * The dashboard/activity feed's event union (spec `landlord-dashboard-redesign`
 * §8.1). `charge_due` is deliberately absent — a scheduled date is not an
 * activity — and `listing_published` is activity-only.
 */
export type ActivityEventType =
  | 'payment_received'
  | 'application_received'
  | 'application_accepted'
  | 'application_confirmed'
  | 'tenancy_move_in'
  | 'tenancy_move_out'
  | 'leave_requested'
  | 'announcement_publish'
  | 'listing_published';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  family: CalendarFamily;
  /** ISO 8601 with a zone; sorted newest first by the API. */
  occurred_at: string;
  /** `YYYY-MM-DD` Manila date, used as the label fallback. */
  date: string;
  subject: string;
  status: string;
  approximate: boolean;
  amount: number | null;
  property: CalendarParty | null;
  room: CalendarParty | null;
  boarder: CalendarParty | null;
  link: CalendarLink;
}

export interface ActivityPayload {
  window: { from: string; to: string };
  today: string;
  property_id: number | null;
  events: ActivityEvent[];
  total: number;
  has_more: boolean;
  next_offset: number | null;
  truncated: boolean;
}

export interface ActivityResponse {
  success: true;
  data: ActivityPayload;
}
