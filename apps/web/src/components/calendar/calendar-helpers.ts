import { chargeTypeLabel, formatPeso, monthLabel } from '../../lib/payments';
import type { CalendarEvent, CalendarEventType, CalendarFamily } from '../../lib/types';

/**
 * Pure date/label helpers for the landlord calendar (spec `landlord-calendar` §6).
 *
 * All month arithmetic is done on `YYYY-MM` / `YYYY-MM-DD` **strings** through
 * UTC-anchored `Date` objects, never by parsing a date-only string with the local
 * `Date` constructor — that is how a calendar ends up showing a day early or late
 * in every timezone west of Manila.
 */

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Chips shown per day cell before the day hands the rest to the detail panel (D8). */
export const MAX_DAY_CHIPS = 3;

export interface CalendarDay {
  date: string;
  /** Day of the month as displayed in the cell. */
  dayNumber: number;
  /** False for the adjacent-month days that pad the first and last weeks. */
  inMonth: boolean;
}

export interface CalendarWindow {
  /** Inclusive. */
  from: string;
  /** Exclusive. */
  to: string;
}

export interface CalendarSummaryInput {
  due: number;
  collected: number;
  overdueCount: number;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function isoFromUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** A date-only string as a UTC-anchored `Date` — safe for getUTCDay/getUTCDate. */
export function parseDate(date: string): Date {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);

  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

export function addDays(date: string, days: number): string {
  const shifted = parseDate(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);

  return isoFromUtc(shifted);
}

/** `2026-10-13` → `2026-10`. */
export function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}

/** The month a validated `YYYY-MM-DD` string belongs to. */
export function monthKeyFromDate(date: string): string {
  return monthKeyOf(date);
}

/** Moves a `YYYY-MM` key by whole months, clamping nothing (months are uniform). */
export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const moved = new Date(Date.UTC(year, month - 1 + delta, 1));

  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}`;
}

/**
 * The window the page asks the API for: the month's **full week matrix**, Sunday
 * to Saturday, so every rendered cell has its events (D16/§7.3 — adjacent-month
 * days render greyed with their own events).
 */
export function monthWindow(monthKey: string): CalendarWindow {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const start = new Date(first);
  const end = new Date(last);

  start.setUTCDate(first.getUTCDate() - first.getUTCDay());
  end.setUTCDate(last.getUTCDate() + (6 - last.getUTCDay()));

  return { from: isoFromUtc(start), to: addDays(isoFromUtc(end), 1) };
}

/** Every cell of the month grid: 35 or 42 days depending on the month (D26). */
export function monthDays(monthKey: string): CalendarDay[] {
  const { from, to } = monthWindow(monthKey);
  const days: CalendarDay[] = [];

  for (let date = from; date < to; date = addDays(date, 1)) {
    days.push({
      date,
      dayNumber: parseDate(date).getUTCDate(),
      inMonth: monthKeyOf(date) === monthKey,
    });
  }

  return days;
}

/** `2026-10` → `October 2026` (the ledger's own formatter, so both read alike). */
export function monthLabelOf(monthKey: string): string {
  return monthLabel(monthKey);
}

/** `2026-10-13` → `Tuesday, October 13`. */
export function formatDayLabel(date: string): string {
  return parseDate(date).toLocaleDateString('en-PH', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** `2026-10-13` → `Tue, Oct 13`. */
export function formatShortDayLabel(date: string): string {
  return parseDate(date).toLocaleDateString('en-PH', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Events keyed by date, each day keeping the server's order (spec §5.2). */
export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const grouped: Record<string, CalendarEvent[]> = {};

  for (const event of events) {
    const day = event.date.slice(0, 10);

    grouped[day] = grouped[day] ? [...grouped[day], event] : [event];
  }

  return grouped;
}

/** The chips a cell shows, plus how many were left for the panel (D8). */
export function packDayEvents(
  events: CalendarEvent[],
  max: number = MAX_DAY_CHIPS
): { visible: CalendarEvent[]; hiddenCount: number } {
  if (events.length <= max) {
    return { visible: events, hiddenCount: 0 };
  }

  return { visible: events.slice(0, max), hiddenCount: events.length - max };
}

const TYPE_LABELS: Record<CalendarEventType, string> = {
  charge_due: 'Due',
  payment_received: 'Payment received',
  application_received: 'Application',
  application_accepted: 'Application accepted',
  application_confirmed: 'Tenancy confirmed',
  tenancy_move_in: 'Move-in',
  tenancy_move_out: 'Leaving',
  leave_requested: 'Leave requested',
  announcement_publish: 'Announcement',
};

const TYPE_ICONS: Record<CalendarEventType, string> = {
  charge_due: 'payment',
  payment_received: 'currencyDollar',
  application_received: 'application',
  application_accepted: 'application',
  application_confirmed: 'application',
  tenancy_move_in: 'users',
  tenancy_move_out: 'logout',
  leave_requested: 'document',
  announcement_publish: 'announcement',
};

/** The event's own name, before the person it is about is appended. */
export function eventTypeLabel(event: CalendarEvent): string {
  if (event.type === 'charge_due') {
    return chargeTypeLabel(event.charge_type ?? 'rent');
  }

  return TYPE_LABELS[event.type];
}

export function eventIcon(event: CalendarEvent): string {
  return TYPE_ICONS[event.type];
}

/**
 * `Ana Reyes` → `Reyes`: the chips are narrow, so they lead with the surname.
 *
 * A subject with no surname to take — a single word, or the `Boarder 12`
 * fallback the API uses when a boarder's name is missing — is left whole, so a
 * chip never degrades into a bare number.
 */
export function shortSubject(subject: string): string {
  const parts = subject.trim().split(/\s+/);
  const last = parts[parts.length - 1];

  return parts.length > 1 && !/^\d+$/.test(last) ? last : subject;
}

/** The day panel's label: `Rent · Ana Reyes`, or the announcement's own title. */
export function eventLabel(event: CalendarEvent): string {
  if (event.type === 'announcement_publish') {
    return event.subject;
  }

  return `${eventTypeLabel(event)} · ${event.subject}`;
}

/** The chip's label: the same thing, surname only. */
export function eventChipLabel(event: CalendarEvent): string {
  if (event.type === 'announcement_publish') {
    return event.subject;
  }

  return `${eventTypeLabel(event)} · ${shortSubject(event.subject)}`;
}

export interface FamilyFilter {
  value: 'all' | CalendarFamily;
  label: string;
  /** The `types` parameter this pill sends; `null` means "no filter". */
  types: string[] | null;
}

/**
 * The toolbar's family pills (§8). `Content` is deliberately absent — an
 * announcement only ever arrives under `All`, so the row keeps the three
 * families the page is about.
 */
export const FAMILY_FILTERS: readonly FamilyFilter[] = [
  { value: 'all', label: 'All', types: null },
  { value: 'money', label: 'Money', types: ['money'] },
  { value: 'tenancy', label: 'Tenancy', types: ['tenancy'] },
  { value: 'applications', label: 'Applications', types: ['applications'] },
];

function sumAmounts(events: CalendarEvent[]): number {
  return events.reduce((total, event) => total + Number(event.amount ?? 0), 0);
}

/** One day's money, for the panel (spec §4/D13). */
export function daySummary(events: CalendarEvent[]): CalendarSummaryInput {
  const chargeEvents = events.filter(event => event.type === 'charge_due');
  const received = events.filter(event => event.type === 'payment_received');

  return {
    due: sumAmounts(chargeEvents),
    collected: sumAmounts(received),
    overdueCount: chargeEvents.filter(event => event.status === 'overdue').length,
  };
}

/** The month strip's figures in display form (D27). */
export function monthSummaryLabel(summary: {
  due_amount: number;
  collected_amount: number;
  overdue_count: number;
}): { due: string; collected: string; overdue: string } {
  return {
    due: formatPeso(summary.due_amount),
    collected: formatPeso(summary.collected_amount),
    overdue: `${summary.overdue_count} overdue`,
  };
}

/** A day cell's accessible name, e.g. `Tuesday, October 13 — 2 events, 1 overdue`. */
export function dayAriaLabel(date: string, events: CalendarEvent[]): string {
  const overdue = events.filter(event => event.status === 'overdue').length;
  const parts = [`${events.length} ${events.length === 1 ? 'event' : 'events'}`];

  if (overdue > 0) {
    parts.push(`${overdue} overdue`);
  }

  return `${formatDayLabel(date)} — ${parts.join(', ')}`;
}

export { formatPeso };
