import {
  listCalendarEventSources,
  toIsoTimestamp,
  type CalendarEvent,
  type CalendarFamily,
  type CalendarLink,
  type CalendarParty,
} from './landlord-calendar';
import { daysBetween, manilaToday, toDateOnly } from './payments/helpers';
import { accessiblePropertyClause } from './property-access/helpers';

/**
 * The landlord activity feed (spec `landlord-dashboard-redesign` §8).
 *
 * The feed is the calendar's aggregation with three differences: `charge_due` is
 * not an activity (it is a scheduled date, not something that happened), future
 * dates are excluded, and listing publications are included even though they are
 * not calendar events. Every row carries an exact `occurred_at`, which the
 * calendar payload did not previously expose (D20/D40/D41).
 */
export const ACTIVITY_EVENT_TYPES = [
  'payment_received',
  'application_received',
  'application_accepted',
  'application_confirmed',
  'tenancy_move_in',
  'tenancy_move_out',
  'leave_requested',
  'announcement_publish',
  'listing_published',
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export const ACTIVITY_FAMILIES: readonly CalendarFamily[] = [
  'money',
  'tenancy',
  'applications',
  'content',
];

/**
 * One response's source-row cap. The activity page only offers 7/30/90-day
 * ranges, so this is a guard against a pathological window, not a normal limit.
 */
export const MAX_ACTIVITY_EVENTS = 1000;
export const MAX_ACTIVITY_WINDOW_DAYS = 366;

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  family: CalendarFamily;
  /** ISO 8601 with a zone; the feed sorts on this. */
  occurred_at: string;
  /** `YYYY-MM-DD` in Asia/Manila, for the fallback label. */
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

export interface ActivityQuery {
  from: string;
  to: string;
  propertyId?: number | null;
  types?: string[] | null;
  limit: number;
  offset: number;
}

export interface ActivityResult {
  window: { from: string; to: string };
  today: string;
  property_id: number | null;
  events: ActivityEvent[];
  total: number;
  has_more: boolean;
  next_offset: number | null;
  truncated: boolean;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Same `from`/`to` contract as the calendar, but a year-wide ceiling (D8). */
export function isActivityWindowValid(from: unknown, to: unknown): boolean {
  if (typeof from !== 'string' || typeof to !== 'string') {
    return false;
  }

  if (!DATE_ONLY.test(from) || !DATE_ONLY.test(to)) {
    return false;
  }

  const length = daysBetween(from, to);

  return length > 0 && length <= MAX_ACTIVITY_WINDOW_DAYS;
}

/** True when an event type or its family is in the requested filter. */
function matchesTypes(event: ActivityEvent, wanted: Set<string> | null): boolean {
  if (!wanted) {
    return true;
  }

  return wanted.has(event.type) || wanted.has(event.family);
}

function isPast(event: ActivityEvent, now: Date): boolean {
  const at = Date.parse(event.occurred_at);

  return Number.isFinite(at) && at <= now.getTime();
}

function fromCalendarEvent(event: CalendarEvent): ActivityEvent {
  return {
    id: event.id,
    type: event.type as ActivityEventType,
    family: event.family,
    occurred_at: event.occurred_at,
    date: event.date,
    subject: event.subject,
    status: event.status,
    approximate: event.approximate,
    amount: event.amount,
    property: event.property,
    room: event.room,
    boarder: event.boarder,
    link: event.link,
  };
}

interface ListingRow {
  id: number;
  title: string;
  created_at: string;
}

/**
 * A listing publication is not on the calendar (D40). `properties` has no
 * published-at column, so `created_at` is the closest honest timestamp; drafts and
 * unpublished listings never appear.
 */
async function listListingEvents(
  db: D1Database,
  landlordId: number,
  query: ActivityQuery
): Promise<ActivityEvent[]> {
  const clauses = [
    'pr.deleted_at IS NULL',
    "pr.status <> 'draft'",
    "pr.listing_moderation_status = 'published'",
    accessiblePropertyClause('pr'),
  ];
  const binds: unknown[] = [landlordId, landlordId];

  if (query.propertyId) {
    clauses.push('pr.id = ?');
    binds.push(query.propertyId);
  }

  const result = await db
    .prepare(
      `
        SELECT pr.id, pr.title, pr.created_at
        FROM properties pr
        WHERE ${clauses.join(' AND ')}
          AND pr.created_at >= ?
          AND pr.created_at < ?
        ORDER BY pr.created_at DESC, pr.id DESC
      `
    )
    .bind(...binds, query.from, query.to)
    .all<ListingRow>();

  return (result.results ?? []).map(row => {
    const date = toDateOnly(row.created_at);

    return {
      id: `property:${Number(row.id)}:listing_published`,
      type: 'listing_published' as const,
      family: 'content' as const,
      occurred_at: toIsoTimestamp(row.created_at, date),
      date,
      subject: row.title,
      status: 'published',
      // The row records when the listing was created, not when it was approved.
      approximate: true,
      amount: null,
      property: { id: Number(row.id), name: row.title },
      room: null,
      boarder: null,
      link: { to: '/landlord/properties', label: 'View property' },
    };
  });
}

export async function listLandlordActivity(
  db: D1Database,
  landlordId: number,
  query: ActivityQuery,
  today: string = manilaToday(),
  now: Date = new Date()
): Promise<ActivityResult> {
  const eventTypes = query.types?.filter(type => type !== 'charge_due') ?? null;
  const wanted = eventTypes && eventTypes.length > 0 ? new Set<string>(eventTypes) : null;

  const [sources, listings] = await Promise.all([
    listCalendarEventSources(
      db,
      landlordId,
      {
        from: query.from,
        to: query.to,
        propertyId: query.propertyId,
        types: null,
      },
      today,
      { includeSettledReceived: true }
    ),
    listListingEvents(db, landlordId, query),
  ]);

  const events = [
    ...sources
      .filter(event => event.type !== 'charge_due')
      .map(fromCalendarEvent)
      .filter(event => isPast(event, now))
      .filter(event => matchesTypes(event, wanted)),
    ...listings.filter(event => isPast(event, now)).filter(event => matchesTypes(event, wanted)),
  ].sort((a, b) => {
    const difference = Date.parse(b.occurred_at) - Date.parse(a.occurred_at);

    return difference !== 0 ? difference : b.id.localeCompare(a.id);
  });

  const truncated = events.length > MAX_ACTIVITY_EVENTS;
  const capped = truncated ? events.slice(0, MAX_ACTIVITY_EVENTS) : events;
  const page = capped.slice(query.offset, query.offset + query.limit);
  const nextOffset = query.offset + page.length;

  return {
    window: { from: query.from, to: query.to },
    today,
    property_id: query.propertyId ?? null,
    events: page,
    total: capped.length,
    has_more: nextOffset < capped.length,
    next_offset: nextOffset < capped.length ? nextOffset : null,
    truncated,
  };
}
