import { inWindow, manilaMidnight } from './helpers';
import { LINKS } from './types';
import { toDateOnly } from '../payments/helpers';
import { accessiblePropertyClause } from '../property-access/helpers';
import { manilaDateOf, partyName, roomLabel, toIsoTimestamp } from './helpers';
import type { CalendarEvent, CalendarQuery } from './types';

interface ApplicationCalendarRow {
  id: number;
  boarder_id: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  updated_at: string | null;
  leave_request_status: string | null;
  leave_request_date: string | null;
  leave_request_reason: string | null;
  intended_leave_date: string | null;
  room_id: number;
  room_title: string | null;
  property_id: number;
  property_title: string | null;
  first_name: string | null;
  last_name: string | null;
}

export async function listApplicationEvents(
  db: D1Database,
  landlordId: number,
  query: CalendarQuery,
  includeSettledReceived = false
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
      application_id: Number(row.id),
      leave_request: null,
    };
    const createdDate = toDateOnly(row.created_at);
    const confirmedDate = toDateOnly(row.confirmed_at);
    // A tenancy starts when the booking was confirmed; before that there is
    // nothing to move into (`payments/schedule.ts` uses the same rule — L1).
    const moveInDate = confirmedDate || createdDate;
    const leaveStatus = row.leave_request_status ?? 'none';

    // The calendar only shows a pending application as "received"; the activity
    // feed needs the original receipt date even after the application settles
    // (spec `landlord-dashboard-redesign` §8.1).
    if (
      (row.status === 'pending' || includeSettledReceived) &&
      inWindow(createdDate, query.from, query.to)
    ) {
      events.push({
        ...shared,
        id: `application:${row.id}:application_received`,
        type: 'application_received',
        family: 'applications',
        date: createdDate,
        occurred_at: toIsoTimestamp(row.created_at, createdDate),
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
        occurred_at: toIsoTimestamp(row.updated_at, toDateOnly(row.updated_at)),
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
        occurred_at: toIsoTimestamp(row.confirmed_at, confirmedDate),
        status: 'confirmed',
        link: LINKS.application_confirmed,
      });
    }

    if (['confirmed', 'ended'].includes(row.status) && inWindow(moveInDate, query.from, query.to)) {
      events.push({
        ...shared,
        id: `application:${row.id}:tenancy_move_in`,
        type: 'tenancy_move_in',
        family: 'tenancy',
        date: moveInDate,
        occurred_at: manilaMidnight(moveInDate),
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
        occurred_at: manilaMidnight(toDateOnly(row.leave_request_date)),
        status: leaveStatus === 'none' ? 'pending' : leaveStatus,
        link: LINKS.leave_requested,
        leave_request: {
          reason: row.leave_request_reason ?? null,
          requested_on: row.leave_request_date ? toDateOnly(row.leave_request_date) : null,
          leave_date: row.intended_leave_date
            ? toDateOnly(row.intended_leave_date)
            : toDateOnly(row.leave_request_date),
        },
      });
    }

    if (inWindow(row.intended_leave_date, query.from, query.to)) {
      const leaveDate = toDateOnly(row.intended_leave_date);
      // An intended leave date that has passed without a decision is the most
      // actionable thing on the page, so a pending request keeps its alarm tone.
      const status =
        row.status === 'ended' ? 'approved' : leaveStatus === 'none' ? 'pending' : leaveStatus;

      events.push({
        ...shared,
        id: `application:${row.id}:tenancy_move_out`,
        type: 'tenancy_move_out',
        family: 'tenancy',
        date: leaveDate,
        occurred_at: manilaMidnight(leaveDate),
        status,
        link: LINKS.tenancy_move_out,
        leave_request: {
          reason: row.leave_request_reason ?? null,
          requested_on: row.leave_request_date ? toDateOnly(row.leave_request_date) : null,
          leave_date: leaveDate,
        },
      });
    }
  }

  return events;
}
