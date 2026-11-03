import { LINKS } from './types';
import { toDateOnly } from '../payments/helpers';
import { accessiblePropertyClause } from '../property-access/helpers';
import { manilaDateOf, partyName, roomLabel, toIsoTimestamp } from './helpers';
import type { CalendarEvent, CalendarQuery } from './types';

interface EarlyDepartureRow {
  id: number;
  boarder_id: number;
  deleted_at: string;
  leave_request_date: string | null;
  leave_request_reason: string | null;
  intended_leave_date: string;
  room_id: number;
  room_title: string | null;
  property_id: number;
  property_title: string | null;
  first_name: string | null;
  last_name: string | null;
}

/**
 * Approved tenancies that ended before their agreed leave date (spec
 * `leave-now` §4.6). Ended applications are excluded from `listApplicationEvents`
 * (`deleted_at IS NULL`), so they need their own source. The event lands on the
 * real move-out day and is reused by the activity feed through
 * `listCalendarEventSources`.
 */
export async function listEarlyDepartureEvents(
  db: D1Database,
  landlordId: number,
  query: CalendarQuery
): Promise<CalendarEvent[]> {
  const clauses = [
    "app.status = 'ended'",
    "app.leave_request_status = 'approved'",
    'app.deleted_at IS NOT NULL',
    'app.intended_leave_date IS NOT NULL',
    "date(app.deleted_at, '+8 hours') >= ?",
    "date(app.deleted_at, '+8 hours') < ?",
    "date(app.deleted_at, '+8 hours') < app.intended_leave_date",
    'pr.deleted_at IS NULL',
    'r.deleted_at IS NULL',
    'u.deleted_at IS NULL',
    accessiblePropertyClause('pr'),
  ];
  const binds: unknown[] = [query.from, query.to, landlordId, landlordId];

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
          app.deleted_at,
          app.leave_request_date,
          app.leave_request_reason,
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
        ORDER BY app.deleted_at ASC
      `
    )
    .bind(...binds)
    .all<EarlyDepartureRow>();

  const events: CalendarEvent[] = [];

  for (const row of result.results ?? []) {
    const moveOutDate = manilaDateOf(row.deleted_at);

    if (!moveOutDate) {
      continue;
    }

    const subject = partyName(row.first_name, row.last_name) || `Boarder ${row.boarder_id}`;

    events.push({
      id: `application:${row.id}:tenancy_left_early`,
      type: 'tenancy_move_out',
      family: 'tenancy',
      date: moveOutDate,
      occurred_at: toIsoTimestamp(row.deleted_at, moveOutDate),
      status: 'left_early',
      approximate: false,
      subject,
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
      link: LINKS.tenancy_move_out,
      application_id: Number(row.id),
      leave_request: {
        reason: row.leave_request_reason ?? null,
        requested_on: row.leave_request_date ? toDateOnly(row.leave_request_date) : null,
        leave_date: toDateOnly(row.intended_leave_date),
      },
    });
  }

  return events;
}
