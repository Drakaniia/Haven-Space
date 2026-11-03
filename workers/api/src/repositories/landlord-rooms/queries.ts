import { accessiblePropertyClause } from '../property-access';
import type {
  LandlordRoomIdentityRow,
  LandlordRoomPhotoRow,
  LandlordRoomPhotoStatsRow,
  LandlordRoomPropertyRow,
  LandlordRoomRow,
} from './types';

function placeholders(length: number): string {
  return Array.from({ length }, () => '?').join(', ');
}

export async function findLandlordRoomProperty(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<LandlordRoomPropertyRow | null> {
  return await db
    .prepare(
      `
        SELECT id, title, status
        FROM properties
        WHERE id = ?
          AND deleted_at IS NULL
          AND ${accessiblePropertyClause()}
        LIMIT 1
      `
    )
    .bind(propertyId, landlordId, landlordId)
    .first<LandlordRoomPropertyRow>();
}

export async function listLandlordManagedRooms(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<LandlordRoomRow[]> {
  // Rooms are property-scoped: every landlord with access to the property sees
  // and manages all of its rooms (rooms.landlord_id is only the creator).
  const result = await db
    .prepare(
      `
        SELECT r.*
        FROM rooms r
        WHERE r.property_id = ?
          AND r.deleted_at IS NULL
        ORDER BY r.room_number ASC, r.id ASC
      `
    )
    .bind(propertyId)
    .all<LandlordRoomRow>();

  return result.results ?? [];
}

export async function getLandlordManagedRoom(
  db: D1Database,
  roomId: number,
  propertyId: number,
  landlordId: number
): Promise<LandlordRoomRow | null> {
  return await db
    .prepare(
      `
        SELECT r.*
        FROM rooms r
        WHERE r.id = ?
          AND r.property_id = ?
          AND r.deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(roomId, propertyId)
    .first<LandlordRoomRow>();
}

export async function getLandlordManagedRoomById(
  db: D1Database,
  roomId: number
): Promise<LandlordRoomRow | null> {
  return await db
    .prepare('SELECT r.* FROM rooms r WHERE r.id = ? LIMIT 1')
    .bind(roomId)
    .first<LandlordRoomRow>();
}

export async function listLandlordRoomPhotos(
  db: D1Database,
  roomIds: number[]
): Promise<Map<number, LandlordRoomPhotoRow[]>> {
  if (roomIds.length === 0) {
    return new Map();
  }

  const result = await db
    .prepare(
      `
        SELECT id, room_id, photo_url, is_cover, display_order
        FROM room_photos
        WHERE room_id IN (${placeholders(roomIds.length)})
        ORDER BY room_id ASC, is_cover DESC, display_order ASC
      `
    )
    .bind(...roomIds)
    .all<LandlordRoomPhotoRow>();
  const groups = new Map<number, LandlordRoomPhotoRow[]>();

  for (const row of result.results ?? []) {
    const roomId = Number(row.room_id);
    groups.set(roomId, [...(groups.get(roomId) ?? []), row]);
  }

  return groups;
}

export async function getLandlordRoomPhotoStats(
  db: D1Database,
  roomId: number
): Promise<{ photoCount: number; maxOrder: number }> {
  const row = await db
    .prepare(
      `
        SELECT COUNT(*) as photo_count, COALESCE(MAX(display_order), -1) as max_order
        FROM room_photos
        WHERE room_id = ?
      `
    )
    .bind(roomId)
    .first<LandlordRoomPhotoStatsRow>();

  return {
    photoCount: Number(row?.photo_count ?? 0),
    maxOrder: Number(row?.max_order ?? -1),
  };
}

export async function findLandlordRoomPhoto(
  db: D1Database,
  roomId: number,
  photoId: number
): Promise<LandlordRoomPhotoRow | null> {
  return await db
    .prepare(
      `
        SELECT id, room_id, photo_url, is_cover, display_order
        FROM room_photos
        WHERE id = ?
          AND room_id = ?
        LIMIT 1
      `
    )
    .bind(photoId, roomId)
    .first<LandlordRoomPhotoRow>();
}

export async function findNextLandlordRoomPhoto(
  db: D1Database,
  roomId: number
): Promise<{ id: number } | null> {
  return await db
    .prepare(
      `
        SELECT id
        FROM room_photos
        WHERE room_id = ?
        ORDER BY display_order ASC, id ASC
        LIMIT 1
      `
    )
    .bind(roomId)
    .first<{ id: number }>();
}

export async function findDuplicateLandlordRoomNumber(
  db: D1Database,
  propertyId: number,
  roomNumber: string,
  excludedRoomId?: number
): Promise<{ id: number } | null> {
  if (excludedRoomId) {
    return await db
      .prepare(
        `
          SELECT id
          FROM rooms
          WHERE property_id = ?
            AND room_number = ?
            AND id != ?
            AND deleted_at IS NULL
          LIMIT 1
        `
      )
      .bind(propertyId, roomNumber, excludedRoomId)
      .first<{ id: number }>();
  }

  return await db
    .prepare(
      `
        SELECT id
        FROM rooms
        WHERE property_id = ?
          AND room_number = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(propertyId, roomNumber)
    .first<{ id: number }>();
}

export async function findLandlordManagedRoomIdentity(
  db: D1Database,
  roomId: number,
  landlordId: number
): Promise<LandlordRoomIdentityRow | null> {
  // Room-id-only lookups (update/delete/photo ops) resolve the room's property
  // and require the caller to own it or hold active shared access.
  return await db
    .prepare(
      `
        SELECT r.id, r.property_id, r.room_number
        FROM rooms r
        JOIN properties p ON r.property_id = p.id
        WHERE r.id = ?
          AND r.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND ${accessiblePropertyClause('p')}
        LIMIT 1
      `
    )
    .bind(roomId, landlordId, landlordId)
    .first<LandlordRoomIdentityRow>();
}
