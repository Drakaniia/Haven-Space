import { accessiblePropertyClause } from '../property-access';

/**
 * Close any approved leaves whose intended date has arrived or passed.
 *
 * There is no cron for this: the reconciling reads (`/api/landlord/boarders`,
 * `/api/boarder/tenancy`, calendar, dashboard, notifications) run it scoped to
 * the caller before returning data (spec `approve-leave-request` §4.2).
 *
 * A scope is required — an unscoped call would sweep every landlord's tenancies.
 */
export async function finalizeDueLeaveRequests(
  db: D1Database,
  scope: { landlordId?: number; boarderId?: number }
): Promise<number> {
  if (scope.landlordId === undefined && scope.boarderId === undefined) {
    return 0;
  }

  const conditions = [
    "app.leave_request_status = 'approved'",
    "app.status = 'confirmed'",
    'app.deleted_at IS NULL',
    'app.intended_leave_date IS NOT NULL',
    "app.intended_leave_date <= date('now')",
  ];
  const binds: unknown[] = [];

  if (scope.boarderId !== undefined) {
    conditions.push('app.boarder_id = ?');
    binds.push(scope.boarderId);
  }

  if (scope.landlordId !== undefined) {
    conditions.push(accessiblePropertyClause('p'));
    binds.push(scope.landlordId, scope.landlordId);
  }

  const result = await db
    .prepare(
      `
        SELECT app.id AS id, app.boarder_id
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        WHERE ${conditions.join('\n          AND ')}
      `
    )
    .bind(...binds)
    .all<{ id: number; boarder_id: number }>();

  const rows = result.results ?? [];

  if (rows.length === 0) {
    return 0;
  }

  const applicationIds = rows.map(row => Number(row.id));
  const boarderIds = [...new Set(rows.map(row => Number(row.boarder_id)))];
  const applicationPlaceholders = applicationIds.map(() => '?').join(', ');
  const boarderPlaceholders = boarderIds.map(() => '?').join(', ');

  await db
    .prepare(
      `
        UPDATE applications
        SET status = 'ended',
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${applicationPlaceholders})
      `
    )
    .bind(...applicationIds)
    .run();

  await db
    .prepare(
      `
        UPDATE users
        SET boarder_status = 'new',
            updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${boarderPlaceholders})
      `
    )
    .bind(...boarderIds)
    .run();

  return applicationIds.length;
}
