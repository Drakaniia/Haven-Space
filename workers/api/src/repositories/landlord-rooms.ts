import { accessiblePropertyClause } from './property-access';

export interface LandlordRoomPropertyRow {
  id: number;
  title: string;
  status: string;
}

export interface LandlordRoomRow {
  id: number;
  property_id: number;
  landlord_id: number | null;
  title: string | null;
  room_number: string | null;
  room_type: string | null;
  description: string | null;
  price: number;
  deposit: number | null;
  status: string | null;
  capacity: number | null;
  size: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LandlordRoomPhotoRow {
  id: number;
  room_id: number;
  photo_url: string;
  is_cover: number;
  display_order: number;
}

export interface LandlordRoomPhotoStatsRow {
  photo_count: number;
  max_order: number | null;
}

export interface LandlordRoomIdentityRow {
  id: number;
  property_id: number;
  room_number: string | null;
}

export interface CreateLandlordManagedRoomInput {
  propertyId: number;
  landlordId: number;
  roomNumber: string;
  roomType: string | null;
  price: number;
  deposit: number;
  status: string;
  capacity: number;
  description: string;
  size: number;
}

export interface UpdateLandlordManagedRoomInput {
  room_number?: string;
  room_type?: string | null;
  price?: number;
  deposit?: number;
  status?: string;
  capacity?: number;
  description?: string;
  size?: number;
}

function placeholders(length: number): string {
  return Array.from({ length }, () => '?').join(', ');
}

function insertedId(result: D1Result, label: string): number {
  const id = Number(result.meta.last_row_id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`${label} insert did not return an ID`);
  }

  return id;
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

export async function createLandlordRoomPhoto(
  db: D1Database,
  roomId: number,
  photoUrl: string,
  isCover: number,
  displayOrder: number
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO room_photos (room_id, photo_url, is_cover, display_order, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
    )
    .bind(roomId, photoUrl, isCover, displayOrder)
    .run();

  return insertedId(result, 'Room photo');
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

export async function clearLandlordRoomCover(db: D1Database, roomId: number): Promise<void> {
  await db.prepare('UPDATE room_photos SET is_cover = 0 WHERE room_id = ?').bind(roomId).run();
}

export async function setLandlordRoomPhotoCover(db: D1Database, photoId: number): Promise<void> {
  await db.prepare('UPDATE room_photos SET is_cover = 1 WHERE id = ?').bind(photoId).run();
}

export async function deleteLandlordRoomPhoto(db: D1Database, photoId: number): Promise<void> {
  await db.prepare('DELETE FROM room_photos WHERE id = ?').bind(photoId).run();
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

export async function createLandlordManagedRoom(
  db: D1Database,
  input: CreateLandlordManagedRoomInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO rooms (
          property_id,
          landlord_id,
          title,
          room_number,
          room_type,
          price,
          deposit,
          status,
          capacity,
          description,
          size,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .bind(
      input.propertyId,
      input.landlordId,
      input.roomNumber,
      input.roomNumber,
      input.roomType,
      input.price,
      input.deposit,
      input.status,
      input.capacity,
      input.description,
      input.size
    )
    .run();

  return insertedId(result, 'Room');
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

export async function updateLandlordManagedRoom(
  db: D1Database,
  roomId: number,
  input: UpdateLandlordManagedRoomInput
): Promise<void> {
  const fields = [
    'room_number',
    'room_type',
    'price',
    'deposit',
    'status',
    'capacity',
    'description',
    'size',
  ] as const;
  const sets = ['updated_at = CURRENT_TIMESTAMP'];
  const values: unknown[] = [];

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      sets.push(`${field} = ?`);
      values.push(input[field]);
    }
  }

  await db
    .prepare(`UPDATE rooms SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values, roomId)
    .run();
}

export async function softDeleteLandlordManagedRoom(db: D1Database, roomId: number): Promise<void> {
  await db
    .prepare("UPDATE rooms SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted' WHERE id = ?")
    .bind(roomId)
    .run();
}
