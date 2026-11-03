import { calendarReferenceDate } from './helpers';
import { manilaToday } from '../payments/helpers';
import { paymentSummariesForApplications } from '../payments/ledger';
import { listAnnouncementEvents } from './announcements';
import { listApplicationEvents } from './applications';
import { listChargeEvents } from './charges';
import { listEarlyDepartureEvents } from './early-departures';
import {
  buildCalendarSummary,
  capCalendarEvents,
  countCalendarFamilies,
  sortCalendarEvents,
} from './helpers';
import type { CalendarEvent, CalendarQuery, CalendarResult } from './types';

export * from './types';
export * from './helpers';

/* ------------------------------------------------------------------ entry ---- */

/**
 * Every event source in one window, before the calendar's payload cap.
 *
 * Extracted so the activity feed can reuse the exact same aggregation (spec
 * `landlord-dashboard-redesign` D20). The calendar keeps its 500-event guard in
 * `listCalendarEvents`; the activity repository applies its own cap after it has
 * removed scheduled `charge_due` rows and future dates.
 */
export async function listCalendarEventSources(
  db: D1Database,
  landlordId: number,
  query: CalendarQuery,
  today: string = manilaToday(),
  options: { includeSettledReceived?: boolean } = {}
): Promise<CalendarEvent[]> {
  const referenceDate = calendarReferenceDate(today, query.to);
  const [chargeEvents, applicationEvents, earlyDepartureEvents, announcementEvents] =
    await Promise.all([
      listChargeEvents(db, landlordId, query, referenceDate),
      listApplicationEvents(db, landlordId, query, options.includeSettledReceived === true),
      listEarlyDepartureEvents(db, landlordId, query),
      listAnnouncementEvents(db, landlordId, query, today),
    ]);

  const wanted = query.types && query.types.length > 0 ? new Set(query.types) : null;

  return sortCalendarEvents(
    [...chargeEvents, ...applicationEvents, ...earlyDepartureEvents, ...announcementEvents].filter(
      event => !wanted || wanted.has(event.type)
    )
  );
}

/**
 * Every calendar event in one window, for the properties a landlord can manage
 * (`property_access` grants included — the same predicate the ledger uses).
 */
/**
 * Each leave event carries the tenant's open balance, so approving from the day
 * panel can stop at the same gate as the Boarders table (spec
 * `approve-leave-request` §3.5).
 *
 * One query for the whole window: the events are already assembled, so the
 * balances are attached afterwards rather than joined into each source.
 */
async function attachOutstandingBalances(db: D1Database, events: CalendarEvent[]): Promise<void> {
  const leaveEvents = events.filter(
    event => event.type === 'leave_requested' || event.type === 'tenancy_move_out'
  );
  const applicationIds = [
    ...new Set(
      leaveEvents
        .map(event => event.application_id)
        .filter((id): id is number => typeof id === 'number' && id > 0)
    ),
  ];

  if (applicationIds.length === 0) {
    return;
  }

  const summaries = await paymentSummariesForApplications(db, applicationIds);

  for (const event of leaveEvents) {
    if (event.application_id === null) {
      continue;
    }

    event.outstanding_amount = summaries.get(event.application_id)?.outstanding_total ?? 0;
  }
}

export async function listCalendarEvents(
  db: D1Database,
  landlordId: number,
  query: CalendarQuery,
  today: string = manilaToday()
): Promise<CalendarResult> {
  const all = await listCalendarEventSources(db, landlordId, query, today);

  await attachOutstandingBalances(db, all);

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
