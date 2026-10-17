import { manageableAnnouncementClause, listAnnouncementTargets } from './announcements';
import {
  DEFAULT_GRACE_DAYS,
  addDays,
  daysBetween,
  isDueSoon,
  manilaToday,
  roundMoney,
  toDateOnly,
} from './payments/helpers';
import { formatCharge, type ChargeRow } from './payments/types';
import { accessiblePropertyClause } from './property-access/helpers';

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

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const LINKS: Record<CalendarEventType, CalendarLink> = {
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

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && DATE_ONLY.test(value);
}

function inWindow(date: string | null | undefined, from: string, to: string): boolean {
  if (!date) {
    return false;
  }

  const day = toDateOnly(date);

  return Boolean(day) && day >= from && day < to;
}

function partyName(first: string | null | undefined, last: string | null | undefined): string {
  return [first, last].filter(Boolean).join(' ').trim();
}

function roomLabel(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/* ------------------------------------------------------------------ pure ----- */

/** True when a window is a well-formed, non-empty, ≤62-day range (spec §5.1). */
export function isCalendarWindowValid(from: unknown, to: unknown): boolean {
  if (!isDateOnly(from) || !isDateOnly(to)) {
    return false;
  }

  const length = daysBetween(from, to);

  return length > 0 && length <= MAX_CALENDAR_WINDOW_DAYS;
}

/**
 * The day a charge's status is derived against (agent default §14-9).
 *
 * Browsing an old month must not repaint that month's chips with today's
 * overdue tint, so a past window is evaluated as of its own last day; the
 * current and future windows use today.
 */
export function calendarReferenceDate(today: string, to: string): string {
  const lastDay = addDays(to, -1);

  return today < lastDay ? today : lastDay;
}

/** Expands a `types` query parameter (families and/or event types) into event types. */
export function parseCalendarTypes(value: string | undefined | null): CalendarEventType[] | null {
  if (!value) {
    return null;
  }

  const wanted = new Set<string>(
    value
      .split(',')
      .map(part => part.trim().toLowerCase())
      .filter(Boolean)
  );

  if (wanted.size === 0) {
    return null;
  }

  const selected = CALENDAR_EVENT_TYPES.filter(type => {
    const family = CALENDAR_EVENT_FAMILY[type];

    return wanted.has(type) || wanted.has(family);
  });

  return selected.length > 0 ? [...selected] : [];
}

/** Date ascending, then the fixed family order, then id — a stable month render. */
export function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date < right.date ? -1 : 1;
    }

    const familyDelta =
      CALENDAR_FAMILY_ORDER.indexOf(left.family) - CALENDAR_FAMILY_ORDER.indexOf(right.family);

    if (familyDelta !== 0) {
      return familyDelta;
    }

    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}

/** Applies the payload cap, reporting the pre-cap total so the page can say so. */
export function capCalendarEvents(
  events: CalendarEvent[],
  max: number = MAX_CALENDAR_EVENTS
): { events: CalendarEvent[]; total: number; truncated: boolean } {
  const total = events.length;

  if (total <= max) {
    return { events, total, truncated: false };
  }

  return { events: events.slice(0, max), total, truncated: true };
}

export function countCalendarFamilies(events: CalendarEvent[]): CalendarCounts {
  const counts: CalendarCounts = { money: 0, tenancy: 0, applications: 0, content: 0 };

  for (const event of events) {
    counts[event.family] += 1;
  }

  return counts;
}

/** The month strip's four figures (spec §4), computed from the same events. */
export function buildCalendarSummary(events: CalendarEvent[]): CalendarSummary {
  const summary: CalendarSummary = {
    due_amount: 0,
    collected_amount: 0,
    overdue_count: 0,
    overdue_amount: 0,
  };

  for (const event of events) {
    const amount = roundMoney(numeric(event.amount));

    if (event.type === 'charge_due') {
      summary.due_amount = roundMoney(summary.due_amount + amount);

      if (event.status === 'overdue') {
        summary.overdue_count += 1;
        summary.overdue_amount = roundMoney(summary.overdue_amount + amount);
      }
    }

    if (event.type === 'payment_received') {
      summary.collected_amount = roundMoney(summary.collected_amount + amount);
    }
  }

  return summary;
}

/* ------------------------------------------------------------- queries ------- */

const CHARGE_CALENDAR_SELECT = `
  pay.*,
  pr.title AS property_title,
  COALESCE(pr.late_fee_grace_days, ${DEFAULT_GRACE_DAYS}) AS grace_days,
  COALESCE(r.room_number, r.title) AS room_title,
  u.first_name AS boarder_first_name,
  u.last_name AS boarder_last_name
`;

async function listChargeEvents(
  db: D1Database,
  landlordId: number,
  query: CalendarQuery,
  referenceDate: string
): Promise<CalendarEvent[]> {
  const clauses = [
    'pr.deleted_at IS NULL',
    accessiblePropertyClause('pr'),
    "pay.status <> 'cancelled'",
    `((pay.due_date >= ? AND pay.due_date < ?) OR (pay.paid_date IS NOT NULL AND pay.paid_date >= ? AND pay.paid_date < ?))`,
  ];
  const binds: unknown[] = [landlordId, landlordId, query.from, query.to, query.from, query.to];

  if (query.propertyId) {
    clauses.push('pay.property_id = ?');
    binds.push(query.propertyId);
  }

  const result = await db
    .prepare(
      `
        SELECT ${CHARGE_CALENDAR_SELECT}
        FROM payments pay
        JOIN properties pr ON pay.property_id = pr.id
        LEFT JOIN rooms r ON pay.room_id = r.id
        LEFT JOIN users u ON pay.boarder_id = u.id
        WHERE ${clauses.join(' AND ')}
        ORDER BY pay.due_date ASC, pay.id ASC
      `
    )
    .bind(...binds)
    .all<ChargeRow>();

  const events: CalendarEvent[] = [];

  for (const row of result.results ?? []) {
    // The ledger's own derivation — the calendar and `/landlord/payments` can
    // never disagree about whether a charge is overdue (spec §3.4/D6).
    const charge = formatCharge(row, referenceDate, []);
    const subject = charge.boarder_name ?? `Boarder ${charge.boarder_id}`;
    const boarder: CalendarParty | null = charge.boarder_name
      ? { id: charge.boarder_id, name: charge.boarder_name }
      : null;
    const shared = {
      family: 'money' as CalendarFamily,
      amount: charge.total_due,
      late_fee: charge.late_fee,
      charge_type: charge.charge_type,
      description: charge.description,
      period_start: charge.period_start,
      period_end: charge.period_end,
      boarder,
      room: { id: charge.room_id, name: charge.room_title ?? '' },
      property: { id: charge.property_id, name: charge.property_title ?? '' },
    };

    if (inWindow(charge.due_date, query.from, query.to)) {
      events.push({
        ...shared,
        id: `charge:${charge.id}:charge_due`,
        type: 'charge_due',
        date: charge.due_date,
        subject,
        status:
          charge.status === 'pending' && isDueSoon(charge.due_date, referenceDate)
            ? 'due_soon'
            : charge.status,
        approximate: false,
        reference_number: charge.reference_number,
        link: LINKS.charge_due,
      });
    }

    if (inWindow(charge.paid_date, query.from, query.to) && charge.paid_date) {
      events.push({
        ...shared,
        id: `charge:${charge.id}:payment_received`,
        type: 'payment_received',
        date: toDateOnly(charge.paid_date),
        subject,
        status: 'paid',
        approximate: false,
        reference_number: charge.reference_number,
        link: LINKS.payment_received,
      });
    }
  }

  return events;
}

interface ApplicationCalendarRow {
  id: number;
  boarder_id: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  updated_at: string | null;
  leave_request_status: string | null;
  leave_request_date: string | null;
  intended_leave_date: string | null;
  room_id: number;
  room_title: string | null;
  property_id: number;
  property_title: string | null;
  first_name: string | null;
  last_name: string | null;
}

async function listApplicationEvents(
  db: D1Database,
  landlordId: number,
  query: CalendarQuery
): Promise<CalendarEvent[]> {
  const clauses = [
    'app.deleted_at IS NULL',
    'pr.deleted_at IS NULL',
    'r.deleted_at IS NULL',
    'u.deleted_at IS NULL',
    // Rejected and withdrawn applications are not operations dates (D21).
    "app.status NOT IN ('rejected', 'cancelled')",
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
        SELECT
          app.id,
          app.boarder_id,
          app.status,
          app.created_at,
          app.confirmed_at,
          app.updated_at,
          app.leave_request_status,
          app.leave_request_date,
          app.intended_leave_date,
          r.id AS room_id,
          COALESCE(r.room_number, r.title) AS room_title,
          pr.id AS property_id,
          pr.title AS property_title,
          u.first_name,
          u.last_name
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties pr ON r.property_id = pr.id
        JOIN users u ON app.boarder_id = u.id
        WHERE ${clauses.join(' AND ')}
        ORDER BY app.id ASC
      `
    )
    .bind(...binds)
    .all<ApplicationCalendarRow>();

  const events: CalendarEvent[] = [];

  for (const row of result.results ?? []) {
    const subject = partyName(row.first_name, row.last_name) || `Boarder ${row.boarder_id}`;
    const shared = {
      subject,
      approximate: false,
      amount: null,
      late_fee: null,
      charge_type: null,
      description: null,
      period_start: null,
      period_end: null,
      reference_number: null,
      boarder: { id: Number(row.boarder_id), name: subject },
      room: { id: Number(row.room_id), name: roomLabel(row.room_title) ?? '' },
      property: { id: Number(row.property_id), name: row.property_title ?? '' },
    };
    const createdDate = toDateOnly(row.created_at);
    const confirmedDate = toDateOnly(row.confirmed_at);
    // A tenancy starts when the booking was confirmed; before that there is
    // nothing to move into (`payments/schedule.ts` uses the same rule — L1).
    const moveInDate = confirmedDate || createdDate;
    const leaveStatus = row.leave_request_status ?? 'none';

    if (row.status === 'pending' && inWindow(createdDate, query.from, query.to)) {
      events.push({
        ...shared,
        id: `application:${row.id}:application_received`,
        type: 'application_received',
        family: 'applications',
        date: createdDate,
        status: 'pending',
        link: LINKS.application_received,
      });
    }

    // No dedicated timestamp exists for `pending → accepted`, so `updated_at` is
    // the only proxy and the event is labelled approximate (spec L2).
    if (
      ['accepted', 'confirmed', 'ended'].includes(row.status) &&
      inWindow(row.updated_at, query.from, query.to)
    ) {
      events.push({
        ...shared,
        id: `application:${row.id}:application_accepted`,
        type: 'application_accepted',
        family: 'applications',
        date: toDateOnly(row.updated_at),
        status: 'accepted',
        approximate: true,
        link: LINKS.application_accepted,
      });
    }

    if (confirmedDate && inWindow(confirmedDate, query.from, query.to)) {
      events.push({
        ...shared,
        id: `application:${row.id}:application_confirmed`,
        type: 'application_confirmed',
        family: 'applications',
        date: confirmedDate,
        status: 'confirmed',
        link: LINKS.application_confirmed,
      });
    }

    if (
      ['confirmed', 'ended'].includes(row.status) &&
      inWindow(moveInDate, query.from, query.to)
    ) {
      events.push({
        ...shared,
        id: `application:${row.id}:tenancy_move_in`,
        type: 'tenancy_move_in',
        family: 'tenancy',
        date: moveInDate,
        status: row.status === 'ended' ? 'ended' : 'confirmed',
        link: LINKS.tenancy_move_in,
      });
    }

    if (inWindow(row.leave_request_date, query.from, query.to)) {
      events.push({
        ...shared,
        id: `application:${row.id}:leave_requested`,
        type: 'leave_requested',
        family: 'tenancy',
        date: toDateOnly(row.leave_request_date),
        status: leaveStatus === 'none' ? 'pending' : leaveStatus,
        link: LINKS.leave_requested,
      });
    }

    if (inWindow(row.intended_leave_date, query.from, query.to)) {
      const leaveDate = toDateOnly(row.intended_leave_date);
      // An intended leave date that has passed without a decision is the most
      // actionable thing on the page, so a pending request keeps its alarm tone.
      const status =
        row.status === 'ended'
          ? 'approved'
          : leaveStatus === 'none'
            ? 'pending'
            : leaveStatus;

      events.push({
        ...shared,
        id: `application:${row.id}:tenancy_move_out`,
        type: 'tenancy_move_out',
        family: 'tenancy',
        date: leaveDate,
        status,
        link: LINKS.tenancy_move_out,
      });
    }

  }

  return events;
}

interface AnnouncementCalendarRow {
  id: number;
  title: string;
  publish_date: string;
}

/**
 * True when this landlord owns the property or holds a `property_access` grant on
 * it — the same predicate the ledger and the property queries use.
 *
 * The charge and application queries enforce this in their own `WHERE`; the
 * announcements query needs it up front, because an announcement with no target
 * rows applies to all of the landlord's properties and would otherwise survive a
 * filter for a property they cannot see.
 */
async function canAccessProperty(
  db: D1Database,
  landlordId: number,
  propertyId: number
): Promise<boolean> {
  const row = await db
    .prepare(
      `
        SELECT pr.id
        FROM properties pr
        WHERE pr.id = ?
          AND pr.deleted_at IS NULL
          AND ${accessiblePropertyClause('pr')}
        LIMIT 1
      `
    )
    .bind(propertyId, landlordId, landlordId)
    .first<{ id: number }>();

  return Boolean(row);
}

async function listAnnouncementEvents(
  db: D1Database,
  landlordId: number,
  query: CalendarQuery,
  today: string
): Promise<CalendarEvent[]> {
  if (query.propertyId && !(await canAccessProperty(db, landlordId, query.propertyId))) {
    return [];
  }

  const result = await db
    .prepare(
      `
        SELECT ann.id, ann.title, ann.publish_date
        FROM announcements ann
        WHERE ann.deleted_at IS NULL
          AND ann.publish_date >= ?
          AND ann.publish_date < ?
          AND ${manageableAnnouncementClause('ann')}
        ORDER BY ann.publish_date ASC, ann.id ASC
      `
    )
    .bind(query.from, query.to, landlordId, landlordId, landlordId, landlordId, landlordId)
    .all<AnnouncementCalendarRow>();

  const rows = result.results ?? [];

  if (rows.length === 0) {
    return [];
  }

  const targets = await listAnnouncementTargets(
    db,
    rows.map(row => Number(row.id))
  );

  const events: CalendarEvent[] = [];

  for (const row of rows) {
    const publishDate = toDateOnly(row.publish_date);
    const rowTargets = targets.get(Number(row.id)) ?? [];

    // A property filter keeps announcements aimed at that property, plus the
    // "all my properties" ones that has no target rows at all.
    if (query.propertyId && rowTargets.length > 0) {
      const matches = rowTargets.some(target => Number(target.id) === query.propertyId);

      if (!matches) {
        continue;
      }
    }

    const firstTarget = rowTargets[0];
    const scheduled = publishDate > today;

    events.push({
      id: `announcement:${Number(row.id)}:announcement_publish`,
      type: 'announcement_publish',
      family: 'content',
      date: publishDate,
      subject: row.title,
      // A future publish date is a plan, not a record (D9).
      status: scheduled ? 'submitted' : 'published',
      approximate: false,
      amount: null,
      late_fee: null,
      charge_type: null,
      description: rowTargets.length > 0 ? 'Targeted announcement' : 'All properties',
      period_start: null,
      period_end: null,
      reference_number: null,
      boarder: null,
      room: null,
      property: firstTarget ? { id: Number(firstTarget.id), name: firstTarget.title } : null,
      link: LINKS.announcement_publish,
    });
  }

  return events;
}

/* ------------------------------------------------------------------ entry ---- */

/**
 * Every calendar event in one window, for the properties a landlord can manage
 * (`property_access` grants included — the same predicate the ledger uses).
 */
export async function listCalendarEvents(
  db: D1Database,
  landlordId: number,
  query: CalendarQuery,
  today: string = manilaToday()
): Promise<CalendarResult> {
  const referenceDate = calendarReferenceDate(today, query.to);
  const [chargeEvents, applicationEvents, announcementEvents] = await Promise.all([
    listChargeEvents(db, landlordId, query, referenceDate),
    listApplicationEvents(db, landlordId, query),
    listAnnouncementEvents(db, landlordId, query, today),
  ]);

  const wanted = query.types && query.types.length > 0 ? new Set(query.types) : null;
  const all = sortCalendarEvents(
    [...chargeEvents, ...applicationEvents, ...announcementEvents].filter(
      event => !wanted || wanted.has(event.type)
    )
  );
  const { events, total, truncated } = capCalendarEvents(all);

  return {
    window: { from: query.from, to: query.to },
    today,
    property_id: query.propertyId ?? null,
    counts: countCalendarFamilies(events),
    total,
    truncated,
    summary: buildCalendarSummary(events),
    events,
  };
}
