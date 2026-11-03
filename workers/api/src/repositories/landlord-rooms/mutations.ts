import type { CreateLandlordManagedRoomInput, UpdateLandlordManagedRoomInput } from './types';

function insertedId(result: D1Result, label: string): number {
  const id = Number(result.meta.last_row_id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`${label} insert did not return an ID`);
  }

  return id;
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

export async function clearLandlordRoomCover(db: D1Database, roomId: number): Promise<void> {
  await db.prepare('UPDATE room_photos SET is_cover = 0 WHERE room_id = ?').bind(roomId).run();
}

export async function setLandlordRoomPhotoCover(db: D1Database, photoId: number): Promise<void> {
  await db.prepare('UPDATE room_photos SET is_cover = 1 WHERE id = ?').bind(photoId).run();
}

export async function deleteLandlordRoomPhoto(db: D1Database, photoId: number): Promise<void> {
  await db.prepare('DELETE FROM room_photos WHERE id = ?').bind(photoId).run();
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
          occupied,
          description,
          size,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
      input.occupied ?? 0,
      input.description,
      input.size
    )
    .run();

  return insertedId(result, 'Room');
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
    'occupied',
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
