import { accessiblePropertyClause } from '../property-access/helpers';
import { manilaMidnight } from './helpers';
import { LINKS } from './types';
import { toDateOnly } from '../payments/helpers';
import { manageableAnnouncementClause, listAnnouncementTargets } from '../announcements';
import { manilaDateOf, toIsoTimestamp } from './helpers';
import type { CalendarEvent, CalendarQuery } from './types';

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

export async function listAnnouncementEvents(
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
      occurred_at: manilaMidnight(publishDate),
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
      application_id: null,
      leave_request: null,
    });
  }

  return events;
}
