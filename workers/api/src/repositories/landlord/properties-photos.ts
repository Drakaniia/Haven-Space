import type { D1Database, D1Result } from '@cloudflare/workers-types';
import type {
  LandlordAmenityRow,
  LandlordPhotoRow,
  LandlordPropertyPhotoUrlRow,
  PropertyPhotoDisplayOrderRow,
} from './properties-types.js';
import {
  groupRows,
  normalizePropertyPhoto,
  placeholders,
  insertedId,
} from './properties-helpers.js';
export async function listLandlordAmenities(
  db: D1Database,
  propertyIds: number[]
): Promise<Map<number, string[]>> {
  if (propertyIds.length === 0) {
    return new Map();
  }

  const result = await db
    .prepare(
      `
        SELECT property_id, amenity_name
        FROM amenities
        WHERE property_id IN (${placeholders(propertyIds.length)})
        ORDER BY property_id ASC, amenity_name ASC
      `
    )
    .bind(...propertyIds)
    .all<LandlordAmenityRow>();
  const groups = groupRows(result.results ?? [], (row: LandlordAmenityRow) =>
    Number(row.property_id)
  );

  return new Map(
    Array.from(groups.entries()).map(([propertyId, rows]) => [
      propertyId,
      rows.map(row => row.amenity_name),
    ])
  );
}

export async function listLandlordPhotos(
  db: D1Database,
  propertyIds: number[]
): Promise<Map<number, string[]>> {
  if (propertyIds.length === 0) {
    return new Map();
  }

  const result = await db
    .prepare(
      `
        SELECT property_id, photo_url, is_cover
        FROM property_photos
        WHERE property_id IN (${placeholders(propertyIds.length)})
        ORDER BY property_id ASC, display_order ASC, id ASC
      `
    )
    .bind(...propertyIds)
    .all<LandlordPhotoRow>();
  const groups = groupRows(result.results ?? [], (row: LandlordPhotoRow) =>
    Number(row.property_id)
  );

  return new Map(
    Array.from(groups.entries()).map(([propertyId, rows]) => [
      propertyId,
      rows.map(row => normalizePropertyPhoto(propertyId, row.photo_url)),
    ])
  );
}

export async function createLandlordAmenity(
  db: D1Database,
  propertyId: number,
  amenityName: string
): Promise<void> {
  await db
    .prepare('INSERT INTO amenities (property_id, amenity_name) VALUES (?, ?)')
    .bind(propertyId, amenityName)
    .run();
}

export async function getMaxPropertyPhotoDisplayOrder(
  db: D1Database,
  propertyId: number
): Promise<number> {
  const row = await db
    .prepare(
      `
        SELECT COALESCE(MAX(display_order), -1) as max_order
        FROM property_photos
        WHERE property_id = ?
      `
    )
    .bind(propertyId)
    .first<PropertyPhotoDisplayOrderRow>();

  return Number(row?.max_order ?? -1);
}

export async function createLandlordPropertyPhoto(
  db: D1Database,
  propertyId: number,
  photoUrl: string,
  isCover: number,
  displayOrder: number
): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO property_photos (property_id, photo_url, is_cover, display_order, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
    )
    .bind(propertyId, photoUrl, isCover, displayOrder)
    .run();
}

export async function listLandlordPropertyPhotoUrls(
  db: D1Database,
  propertyId: number
): Promise<string[]> {
  const result = await db
    .prepare(
      `
        SELECT photo_url
        FROM property_photos
        WHERE property_id = ?
        ORDER BY display_order ASC, id ASC
      `
    )
    .bind(propertyId)
    .all<LandlordPropertyPhotoUrlRow>();

  return (result.results ?? []).map(row => row.photo_url);
}

export async function deleteLandlordPropertyPhotoByUrl(
  db: D1Database,
  propertyId: number,
  photoUrl: string
): Promise<void> {
  await db
    .prepare('DELETE FROM property_photos WHERE property_id = ? AND photo_url = ?')
    .bind(propertyId, photoUrl)
    .run();
}

export async function updateLandlordPropertyPhotoOrder(
  db: D1Database,
  propertyId: number,
  photoUrl: string,
  isCover: number,
  displayOrder: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE property_photos
        SET display_order = ?,
            is_cover = ?
        WHERE property_id = ?
          AND photo_url = ?
      `
    )
    .bind(displayOrder, isCover, propertyId, photoUrl)
    .run();
}

export async function deleteLandlordAmenities(db: D1Database, propertyId: number): Promise<void> {
  await db.prepare('DELETE FROM amenities WHERE property_id = ?').bind(propertyId).run();
}
