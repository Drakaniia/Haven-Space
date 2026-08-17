import { accessiblePropertyClause } from './property-access';

export interface AnnouncementRow {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  publish_date: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface BoarderAnnouncementRow extends AnnouncementRow {
  first_name: string | null;
  last_name: string | null;
}

export interface AnnouncementPropertyRow {
  announcement_id: number;
  id: number;
  title: string;
}

export interface AnnouncementTargetProperty {
  id: number;
  title: string;
}

export interface LandlordAnnouncementItem {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  publish_date: string;
  view_count: number;
  target_property: string;
  target_properties: AnnouncementTargetProperty[];
  created_at: string;
  updated_at: string;
}

export interface BoarderAnnouncementItem {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  publish_date: string;
  view_count: number;
  landlord_name: string;
  is_viewed: boolean;
  viewed_at: string | null;
  created_at: string;
}

export interface AnnouncementInput {
  landlordId: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  publishDate: string;
}

// SQL fragment: true when the announcement row referenced by `announcementRef`
// (an alias for SELECT queries, or the `announcements` table name for
// UPDATE/DELETE — SQLite forbids aliases there) is manageable by the landlord:
// they created it, or it targets a property they own/share, or it is a global
// (untargeted) announcement from a landlord whose property they can access.
// Consumes five `?` binds, all bound to the landlord id.
function manageableAnnouncementClause(announcementRef: string): string {
  return `(
    ${announcementRef}.landlord_id = ?
    OR EXISTS (
      SELECT 1
      FROM announcement_properties ap
      JOIN properties p ON ap.property_id = p.id
      WHERE ap.announcement_id = ${announcementRef}.id
        AND p.deleted_at IS NULL
        AND ${accessiblePropertyClause('p')}
    )
    OR (
      NOT EXISTS (
        SELECT 1
        FROM announcement_properties ap_any
        WHERE ap_any.announcement_id = ${announcementRef}.id
      )
      AND EXISTS (
        SELECT 1
        FROM properties p_global
        WHERE p_global.landlord_id = ${announcementRef}.landlord_id
          AND p_global.deleted_at IS NULL
          AND ${accessiblePropertyClause('p_global')}
      )
    )
  )`;
}

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function placeholders(values: unknown[]): string {
  return values.map(() => '?').join(', ');
}

function insertedId(result: D1Result, label: string): number {
  const id = Number(result.meta.last_row_id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`${label} insert did not return an ID`);
  }

  return id;
}

export function todayDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function formatLandlordAnnouncement(
  row: AnnouncementRow,
  targets: AnnouncementTargetProperty[]
): LandlordAnnouncementItem {
  let targetProperty = 'All Properties';

  if (targets.length === 1) {
    targetProperty = targets[0].title;
  } else if (targets.length > 1) {
    targetProperty = `${targets.length} Properties`;
  }

  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    publish_date: row.publish_date,
    view_count: numeric(row.view_count),
    target_property: targetProperty,
    target_properties: targets,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function formatBoarderAnnouncement(row: BoarderAnnouncementRow): BoarderAnnouncementItem {
  const landlordName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();

  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    publish_date: row.publish_date,
    view_count: numeric(row.view_count),
    landlord_name: landlordName,
    is_viewed: false,
    viewed_at: null,
    created_at: row.created_at,
  };
}

export async function listLandlordAnnouncements(
  db: D1Database,
  landlordId: number
): Promise<AnnouncementRow[]> {
  const result = await db
    .prepare(
      `
        SELECT DISTINCT ann.id, ann.title, ann.description, ann.category, ann.priority, ann.publish_date, ann.view_count, ann.created_at, ann.updated_at
        FROM announcements ann
        WHERE ann.deleted_at IS NULL
          AND ${manageableAnnouncementClause('ann')}
        ORDER BY ann.publish_date DESC, ann.created_at DESC
      `
    )
    .bind(landlordId, landlordId, landlordId, landlordId, landlordId)
    .all<AnnouncementRow>();

  return result.results ?? [];
}

export async function listAnnouncementTargets(
  db: D1Database,
  announcementIds: number[]
): Promise<Map<number, AnnouncementTargetProperty[]>> {
  const targetMap = new Map<number, AnnouncementTargetProperty[]>();

  if (announcementIds.length === 0) {
    return targetMap;
  }

  const result = await db
    .prepare(
      `
        SELECT ap.announcement_id, p.id, p.title
        FROM announcement_properties ap
        JOIN properties p ON ap.property_id = p.id
        WHERE ap.announcement_id IN (${placeholders(announcementIds)})
        ORDER BY p.title ASC
      `
    )
    .bind(...announcementIds)
    .all<AnnouncementPropertyRow>();

  for (const row of result.results ?? []) {
    const announcementId = Number(row.announcement_id);
    const targets = targetMap.get(announcementId) ?? [];
    targets.push({
      id: Number(row.id),
      title: row.title,
    });
    targetMap.set(announcementId, targets);
  }

  return targetMap;
}

export async function listBoarderAnnouncements(
  db: D1Database,
  boarderId: number
): Promise<BoarderAnnouncementItem[]> {
  const result = await db
    .prepare(
      `
        SELECT DISTINCT
          ann.id,
          ann.title,
          ann.description,
          ann.category,
          ann.priority,
          ann.publish_date,
          ann.view_count,
          ann.created_at,
          ann.updated_at,
          u.first_name,
          u.last_name
        FROM announcements ann
        LEFT JOIN users u ON ann.landlord_id = u.id
        WHERE ann.deleted_at IS NULL
          AND ann.publish_date <= date('now')
          AND ann.landlord_id IN (
            SELECT DISTINCT p.landlord_id
            FROM applications app
            JOIN rooms r ON app.room_id = r.id
            JOIN properties p ON r.property_id = p.id
            WHERE app.boarder_id = ?
              AND app.status IN ('accepted', 'confirmed')
              AND app.deleted_at IS NULL
          )
          AND (
            NOT EXISTS (
              SELECT 1
              FROM announcement_properties ap_all
              WHERE ap_all.announcement_id = ann.id
            )
            OR EXISTS (
              SELECT 1
              FROM announcement_properties ap
              JOIN rooms r ON ap.property_id = r.property_id
              JOIN applications app ON app.room_id = r.id
              WHERE ap.announcement_id = ann.id
                AND app.boarder_id = ?
                AND app.status IN ('accepted', 'confirmed')
                AND app.deleted_at IS NULL
            )
          )
        ORDER BY ann.publish_date DESC, ann.created_at DESC
      `
    )
    .bind(boarderId, boarderId)
    .all<BoarderAnnouncementRow>();

  return (result.results ?? []).map(formatBoarderAnnouncement);
}

export async function createAnnouncement(
  db: D1Database,
  input: AnnouncementInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO announcements (landlord_id, title, description, category, priority, publish_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.landlordId,
      input.title,
      input.description,
      input.category,
      input.priority,
      input.publishDate
    )
    .run();

  return insertedId(result, 'Announcement');
}

export async function updateAnnouncement(
  db: D1Database,
  announcementId: number,
  input: AnnouncementInput
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE announcements
        SET title = ?,
            description = ?,
            category = ?,
            priority = ?,
            publish_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
          AND ${manageableAnnouncementClause('announcements')}
      `
    )
    .bind(
      input.title,
      input.description,
      input.category,
      input.priority,
      input.publishDate,
      announcementId,
      input.landlordId,
      input.landlordId,
      input.landlordId,
      input.landlordId,
      input.landlordId
    )
    .run();
}

export async function findLandlordAnnouncement(
  db: D1Database,
  announcementId: number,
  landlordId: number
): Promise<{ id: number } | null> {
  return await db
    .prepare(
      `
        SELECT ann.id
        FROM announcements ann
        WHERE ann.id = ?
          AND ann.deleted_at IS NULL
          AND ${manageableAnnouncementClause('ann')}
        LIMIT 1
      `
    )
    .bind(announcementId, landlordId, landlordId, landlordId, landlordId, landlordId)
    .first<{ id: number }>();
}

export async function replaceAnnouncementTargets(
  db: D1Database,
  announcementId: number,
  propertyIds: number[]
): Promise<void> {
  await db
    .prepare('DELETE FROM announcement_properties WHERE announcement_id = ?')
    .bind(announcementId)
    .run();

  for (const propertyId of propertyIds) {
    await db
      .prepare(
        `
          INSERT OR IGNORE INTO announcement_properties (announcement_id, property_id)
          VALUES (?, ?)
        `
      )
      .bind(announcementId, propertyId)
      .run();
  }
}

export async function listAccessiblePropertyIds(
  db: D1Database,
  landlordId: number,
  propertyIds: number[]
): Promise<number[]> {
  if (propertyIds.length === 0) {
    return [];
  }

  const result = await db
    .prepare(
      `
        SELECT id
        FROM properties
        WHERE deleted_at IS NULL
          AND id IN (${placeholders(propertyIds)})
          AND ${accessiblePropertyClause()}
      `
    )
    .bind(...propertyIds, landlordId, landlordId)
    .all<{ id: number }>();

  return (result.results ?? []).map(row => Number(row.id));
}

export async function softDeleteAnnouncement(
  db: D1Database,
  announcementId: number,
  landlordId: number
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE announcements
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
          AND ${manageableAnnouncementClause('announcements')}
      `
    )
    .bind(announcementId, landlordId, landlordId, landlordId, landlordId, landlordId)
    .run();

  return Number(result.meta.changes ?? 0);
}

export async function incrementAnnouncementView(
  db: D1Database,
  announcementId: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE announcements
        SET view_count = view_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(announcementId)
    .run();
}

export async function listAnnouncementBoarders(
  db: D1Database,
  landlordId: number,
  propertyIds: number[] | null
): Promise<number[]> {
  const propertyFilter =
    propertyIds && propertyIds.length > 0
      ? `AND r.property_id IN (${placeholders(propertyIds)})`
      : '';
  const binds =
    propertyIds && propertyIds.length > 0
      ? [landlordId, landlordId, ...propertyIds]
      : [landlordId, landlordId];
  const result = await db
    .prepare(
      `
        SELECT DISTINCT app.boarder_id
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        WHERE p.deleted_at IS NULL
          AND ${accessiblePropertyClause('p')}
          ${propertyFilter}
          AND app.status IN ('accepted', 'confirmed')
          AND app.deleted_at IS NULL
      `
    )
    .bind(...binds)
    .all<{ boarder_id: number }>();

  return (result.results ?? []).map(row => Number(row.boarder_id));
}

export async function createAnnouncementNotifications(
  db: D1Database,
  boarderIds: number[],
  announcementId: number,
  landlordId: number,
  title: string
): Promise<void> {
  const metadata = JSON.stringify({ announcement_id: announcementId, landlord_id: landlordId });

  for (const boarderId of boarderIds) {
    await db
      .prepare(
        `
          INSERT INTO notifications (user_id, type, title, message, metadata)
          VALUES (?, 'announcement', 'New Announcement', ?, ?)
        `
      )
      .bind(boarderId, title, metadata)
      .run();
  }
}
