import { addDays, daysBetween } from '../payments/helpers';
import {
  CALENDAR_EVENT_FAMILY,
  CALENDAR_EVENT_TYPES,
  CALENDAR_FAMILY_ORDER,
  DATE_ONLY,
  MAX_CALENDAR_EVENTS,
  MAX_CALENDAR_WINDOW_DAYS,
  type CalendarEventType,
} from './types';
import { manilaToday, roundMoney, toDateOnly } from '../payments/helpers';
import type { CalendarCounts, CalendarEvent, CalendarSummary } from './types';

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * A calendar date as the first instant of that day in Asia/Manila.
 *
 * Date-only source columns (move-in dates, publish dates) have no time; the
 * activity feed still needs a comparable ISO string, and the app's calendar is
 * Manila-local everywhere (payments/helpers `manilaToday`).
 */
export function manilaMidnight(date: string): string {
  return `${toDateOnly(date)}T00:00:00+08:00`;
}

/**
 * Normalises a source timestamp to ISO 8601 with a zone.
 *
 * SQLite `CURRENT_TIMESTAMP` produces `YYYY-MM-DD HH:MM:SS` in UTC; date-only
 * fields are Manila calendar dates; already-zoned ISO strings pass through.
 */
export function toIsoTimestamp(
  value: string | null | undefined,
  fallbackDate?: string | null
): string {
  const trimmed = (value ?? '').trim();

  if (!trimmed) {
    return fallbackDate ? manilaMidnight(fallbackDate) : new Date(0).toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return manilaMidnight(trimmed);
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
    return `${trimmed.replace(' ', 'T')}Z`;
  }

  return trimmed;
}

/**
 * The Manila calendar date of a UTC SQL timestamp. `deleted_at` is written by
 * `CURRENT_TIMESTAMP` (UTC), while event dates are Manila days.
 */
export function manilaDateOf(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(toIsoTimestamp(trimmed));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(date);
}

function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && DATE_ONLY.test(value);
}

export function inWindow(date: string | null | undefined, from: string, to: string): boolean {
  if (!date) {
    return false;
  }

  const day = toDateOnly(date);

  return Boolean(day) && day >= from && day < to;
}

export function partyName(
  first: string | null | undefined,
  last: string | null | undefined
): string {
  return [first, last].filter(Boolean).join(' ').trim();
}

export function roomLabel(value: string | null | undefined): string | null {
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
