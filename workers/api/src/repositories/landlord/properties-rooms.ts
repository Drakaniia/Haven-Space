import type { D1Database, D1Result } from '@cloudflare/workers-types';
import type {
  LandlordRoomCountRow,
  LandlordRoomIdRow,
  CreateLandlordRoomInput,
} from './properties-types.js';
import { placeholders, insertedId } from './properties-helpers.js';
export async function createLandlordRoom(
  db: D1Database,
  input: CreateLandlordRoomInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO rooms (
          property_id,
          landlord_id,
          title,
          price,
          description,
          deposit,
          status,
          room_number,
          room_type,
          capacity
        )
        VALUES (?, ?, ?, ?, ?, ?, 'available', ?, ?, ?)
      `
    )
    .bind(
      input.propertyId,
      input.landlordId,
      input.title,
      input.price,
      input.description,
      input.deposit,
      input.roomNumber,
      input.roomType,
      input.capacity
    )
    .run();

  return insertedId(result, 'Room');
}

export async function countLandlordRooms(db: D1Database, propertyId: number): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) as count FROM rooms WHERE property_id = ? AND deleted_at IS NULL')
    .bind(propertyId)
    .first<LandlordRoomCountRow>();

  return Number(row?.count ?? 0);
}

export async function listLandlordRoomIdsForRemoval(
  db: D1Database,
  propertyId: number,
  limit: number
): Promise<number[]> {
  if (limit <= 0) {
    return [];
  }

  const result = await db
    .prepare(
      `
        SELECT id
        FROM rooms
        WHERE property_id = ?
          AND deleted_at IS NULL
        ORDER BY id DESC
        LIMIT ?
      `
    )
    .bind(propertyId, limit)
    .all<LandlordRoomIdRow>();

  return (result.results ?? []).map(row => Number(row.id));
}

export async function softDeleteLandlordRoomsById(
  db: D1Database,
  roomIds: number[]
): Promise<void> {
  if (roomIds.length === 0) {
    return;
  }

  await db
    .prepare(
      `
        UPDATE rooms
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders(roomIds.length)})
      `
    )
    .bind(...roomIds)
    .run();
}

export async function updateLandlordActiveRooms(
  db: D1Database,
  propertyId: number,
  capacity: number,
  roomType: string,
  price: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE rooms
        SET capacity = ?,
            room_type = ?,
            price = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE property_id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(capacity, roomType, price, propertyId)
    .run();
}
