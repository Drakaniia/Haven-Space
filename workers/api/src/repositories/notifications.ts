export interface NotificationRow {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  metadata: string | null;
  is_read: number;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FormattedNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  metadata: unknown;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AcceptedApplicationRow {
  application_id: number;
  status: string;
  applied_at: string;
  room_title: string | null;
  room_price: number;
  property_id: number;
  property_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  landlord_first_name: string;
  landlord_last_name: string;
}

function parseLimit(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50;
  }

  return Math.min(parsed, 100);
}

function parseOffset(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function roleVisibleTypes(role: string): string[] | null {
  if (role === 'admin') {
    return [];
  }

  if (role === 'landlord') {
    return [
      'new_application',
      'application_accepted',
      'application_rejected',
      'booking_confirmed',
      'property_invitation',
      'property_access_removed',
    ];
  }

  if (role === 'boarder') {
    return ['application_accepted', 'announcement'];
  }

  return null;
}

function parseMetadata(value: string | null): unknown {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function formatNotification(row: NotificationRow): FormattedNotification {
  return {
    ...row,
    metadata: parseMetadata(row.metadata),
    is_read: Boolean(row.is_read),
  };
}

export async function listNotifications(
  db: D1Database,
  input: { userId: number; role: string; limit?: string; offset?: string }
): Promise<FormattedNotification[]> {
  const limit = parseLimit(input.limit);
  const offset = parseOffset(input.offset);
  const visibleTypes = roleVisibleTypes(input.role);

  if (visibleTypes?.length === 0) {
    return [];
  }

  const conditions = ['user_id = ?', 'deleted_at IS NULL'];
  const binds: unknown[] = [input.userId];

  if (visibleTypes) {
    conditions.push(`type IN (${visibleTypes.map(() => '?').join(', ')})`);
    binds.push(...visibleTypes);
  }

  const rows = await db
    .prepare(
      `
        SELECT *
        FROM notifications
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
    )
    .bind(...binds, limit, offset)
    .all<NotificationRow>();

  return rows.results.map(formatNotification);
}

export async function countUnreadNotifications(db: D1Database, userId: number): Promise<number> {
  const row = await db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM notifications
        WHERE user_id = ?
          AND is_read = 0
          AND deleted_at IS NULL
      `
    )
    .bind(userId)
    .first<{ count: number }>();

  return Number(row?.count ?? 0);
}

export async function markNotificationRead(
  db: D1Database,
  notificationId: number,
  userId: number
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE notifications
        SET is_read = 1,
            read_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND user_id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(notificationId, userId)
    .run();

  return result.meta.changes ?? 0;
}

export async function markAllNotificationsRead(db: D1Database, userId: number): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE notifications
        SET is_read = 1,
            read_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND is_read = 0
          AND deleted_at IS NULL
      `
    )
    .bind(userId)
    .run();

  return result.meta.changes ?? 0;
}

export async function deleteNotification(
  db: D1Database,
  notificationId: number,
  userId: number
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE notifications
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND user_id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(notificationId, userId)
    .run();

  return result.meta.changes ?? 0;
}

export async function listAcceptedApplications(
  db: D1Database,
  boarderId: number
): Promise<AcceptedApplicationRow[]> {
  const rows = await db
    .prepare(
      `
        SELECT
          app.id AS application_id,
          app.status,
          app.created_at AS applied_at,
          r.title AS room_title,
          r.price AS room_price,
          p.id AS property_id,
          p.title AS property_name,
          addr.address_line_1 AS address,
          addr.latitude,
          addr.longitude,
          u.first_name AS landlord_first_name,
          u.last_name AS landlord_last_name
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        LEFT JOIN addresses addr ON p.address_id = addr.id
        JOIN users u ON app.landlord_id = u.id
        WHERE app.boarder_id = ?
          AND app.status = 'accepted'
          AND app.deleted_at IS NULL
        ORDER BY app.created_at DESC
      `
    )
    .bind(boarderId)
    .all<AcceptedApplicationRow>();

  return rows.results;
}

export async function getAcceptedApplicationStatus(
  db: D1Database,
  boarderId: number
): Promise<{ has_accepted: boolean; property_ids: number[] }> {
  const rows = await db
    .prepare(
      `
        SELECT DISTINCT r.property_id
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        WHERE app.boarder_id = ?
          AND app.status = 'accepted'
          AND app.deleted_at IS NULL
      `
    )
    .bind(boarderId)
    .all<{ property_id: number }>();
  const propertyIds = rows.results.map(row => Number(row.property_id)).filter(Number.isFinite);

  return {
    has_accepted: propertyIds.length > 0,
    property_ids: propertyIds,
  };
}
