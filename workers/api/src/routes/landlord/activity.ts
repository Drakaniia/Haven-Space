import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import {
  ACTIVITY_EVENT_TYPES,
  ACTIVITY_FAMILIES,
  isActivityWindowValid,
  listLandlordActivity,
} from '../../repositories/landlord-activity';
import { addDays, manilaToday } from '../../repositories/payments/helpers';
import { parsePositiveInt, requireLandlord } from './shared';

/**
 * `GET /api/landlord/activity` — the dashboard feed and the activity page
 * (spec `landlord-dashboard-redesign` §8.5).
 *
 * Defaults to the trailing 30 days so the dashboard never has to compute a
 * window. `to` is exclusive, matching the calendar's date contract.
 */
async function handleLandlordActivity(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const today = manilaToday();
  const from = c.req.query('from') ?? addDays(today, -29);
  const to = c.req.query('to') ?? addDays(today, 1);

  if (!isActivityWindowValid(from, to)) {
    return errorResponse(
      400,
      '`from` and `to` must be YYYY-MM-DD dates spanning between 1 and 366 days, with `to` exclusive'
    );
  }

  const propertyQuery = c.req.query('propertyId');
  const propertyId = parsePositiveInt(propertyQuery);

  if (propertyQuery !== undefined && propertyId === null) {
    return errorResponse(400, 'propertyId must be a positive integer');
  }

  const rawTypes = c.req.query('types');
  const known = new Set<string>([...ACTIVITY_EVENT_TYPES, ...ACTIVITY_FAMILIES]);

  if (rawTypes) {
    const unknown = rawTypes
      .split(',')
      .map(part => part.trim().toLowerCase())
      .filter(Boolean)
      .find(part => !known.has(part));

    if (unknown) {
      return errorResponse(400, `Unknown activity event type: ${unknown}`);
    }
  }

  const rawLimit = Number.parseInt(c.req.query('limit') ?? '', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;
  const rawOffset = Number.parseInt(c.req.query('offset') ?? '', 10);
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  const types = rawTypes
    ? rawTypes
        .split(',')
        .map(part => part.trim().toLowerCase())
        .filter(Boolean)
    : null;

  const result = await listLandlordActivity(
    db,
    user.user_id,
    { from, to, propertyId, types, limit, offset },
    today
  );

  return jsonResponse({ success: true, data: result });
}

const activityRoutes = new Hono<{ Bindings: Env }>();

activityRoutes.get('/activity', handleLandlordActivity);

export default activityRoutes;
