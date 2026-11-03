import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_FAMILIES,
  isCalendarWindowValid,
  listCalendarEvents,
  parseCalendarTypes,
} from '../../repositories/landlord-calendar';
import { finalizeDueLeaveRequests } from '../../repositories/tenancy';
import { parsePositiveInt, requireLandlord } from './shared';

/**
 * `GET /api/landlord/calendar` — one window of aggregated operations events
 * (spec `landlord-calendar` §5.1).
 *
 * Read-only: the page is a different lens on charges, applications and
 * announcements, so there is nothing to validate beyond the window and the
 * filters. An inaccessible `propertyId` yields an empty list rather than a 404,
 * matching the ledger's scoping behaviour.
 */
async function handleLandlordCalendar(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const from = c.req.query('from') ?? '';
  const to = c.req.query('to') ?? '';

  if (!isCalendarWindowValid(from, to)) {
    return errorResponse(
      400,
      '`from` and `to` must be YYYY-MM-DD dates spanning between 1 and 62 days, with `to` exclusive'
    );
  }

  const propertyQuery = c.req.query('propertyId');
  const propertyId = parsePositiveInt(propertyQuery);

  if (propertyQuery !== undefined && propertyId === null) {
    return errorResponse(400, 'propertyId must be a positive integer');
  }

  const rawTypes = c.req.query('types');
  const known = new Set<string>([...CALENDAR_EVENT_TYPES, ...CALENDAR_FAMILIES]);

  if (rawTypes) {
    const unknown = rawTypes
      .split(',')
      .map(part => part.trim().toLowerCase())
      .filter(Boolean)
      .find(part => !known.has(part));

    if (unknown) {
      return errorResponse(400, `Unknown calendar event type: ${unknown}`);
    }
  }

  await finalizeDueLeaveRequests(db, { landlordId: user.user_id });
  const result = await listCalendarEvents(db, user.user_id, {
    from,
    to,
    propertyId,
    types: parseCalendarTypes(rawTypes),
  });

  return jsonResponse({ success: true, data: result });
}

const calendarRoutes = new Hono<{ Bindings: Env }>();

calendarRoutes.get('/calendar', handleLandlordCalendar);

export default calendarRoutes;
