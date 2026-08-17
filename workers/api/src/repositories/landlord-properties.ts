import {
  accessiblePropertyClause,
  listAuthorizedLandlords,
  type AuthorizedLandlordRow,
} from './property-access';

export interface LandlordPropertyListRow {
  id: number;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number;
  status: string;
  listing_moderation_status: string;
  role: 'owner' | 'shared';
  created_at: string | null;
  rooms_count: number;
  occupied_rooms: number;
  monthly_revenue: number;
  property_type: string | null;
  pending_applications: number;
}

export interface LandlordPropertyDetailRow {
  id: number;
  title: string;
  description: string | null;
  property_type: string | null;
  gender_preference: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  province: string | null;
  price: number;
  deposit: number | null;
  advance: string | null;
  min_stay: string | null;
  property_rules: string | null;
  status: string;
  listing_moderation_status: string;
  role: 'owner' | 'shared';
  created_at: string | null;
  rooms_count: number;
  occupied_rooms: number;
}

export interface LandlordPropertyIdentityRow {
  id: number;
  title: string;
}

export interface LandlordPropertyUpdateRow {
  id: number;
  address_id: number | null;
  title: string;
  description: string | null;
  price: number;
  deposit: number | null;
  advance: string | null;
  min_stay: string | null;
  property_rules: string | null;
  property_type: string | null;
  gender_preference: string | null;
}

export interface LandlordAddressRow {
  address_line_1: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface LandlordRoomCountRow {
  count: number;
}

export interface LandlordRoomIdRow {
  id: number;
}

export interface PropertyPhotoDisplayOrderRow {
  max_order: number | null;
}

export interface LandlordAmenityRow {
  property_id: number;
  amenity_name: string;
}

export interface LandlordPhotoRow {
  property_id: number;
  photo_url: string;
  is_cover?: number;
}

export interface LandlordPropertyPhotoUrlRow {
  photo_url: string;
}

export interface LandlordPropertiesResult {
  properties: LandlordPropertyListRow[];
  amenities: Map<number, string[]>;
  photos: Map<number, string[]>;
}

export interface LandlordPropertyDetailResult {
  property: LandlordPropertyDetailRow;
  amenities: string[];
  photos: string[];
  authorized_landlords: AuthorizedLandlordRow[];
}

export interface CreateLandlordPropertyInput {
  landlordId: number;
  title: string;
  propertyType: string;
  description: string;
  addressId: number;
  price: number;
  deposit: number;
  advance: string;
  minStay: string;
  houseRules: string;
  genderPreference: string;
  propertyRules: string | null;
}

export interface CreateLandlordPropertyAliasInput {
  landlordId: number;
  title: string;
  description: string;
  addressId: number;
  price: number;
  status: string;
}

export interface CreateLandlordRoomInput {
  propertyId: number;
  landlordId: number;
  title: string;
  price: number;
  description: string;
  roomNumber: string;
  roomType: string;
  capacity: number;
  deposit: number;
}

export interface UpdateLandlordAddressInput {
  addressId: number;
  address: string;
  city: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
}

export interface UpdateLandlordPropertyInput {
  propertyId: number;
  landlordId: number;
  title: string;
  description: string;
  price: number;
  deposit: number;
  advance: string;
  minStay: string;
  propertyRules: string;
  propertyType: string;
  genderPreference: string;
  status: string;
}

function placeholders(length: number): string {
  return Array.from({ length }, () => '?').join(', ');
}

function groupRows<Row, Key extends string | number>(
  rows: Row[],
  keyForRow: (row: Row) => Key
): Map<Key, Row[]> {
  const groups = new Map<Key, Row[]>();

  for (const row of rows) {
    const key = keyForRow(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return groups;
}

function normalizePropertyPhoto(propertyId: number, photoUrl: string): string {
  if (!photoUrl || photoUrl.startsWith('/') || photoUrl.startsWith('http')) {
    return photoUrl;
  }

  return `/storage/properties/${propertyId}/${photoUrl}`;
}

async function listLandlordAmenities(
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
  const groups = groupRows(result.results ?? [], row => Number(row.property_id));

  return new Map(
    Array.from(groups.entries()).map(([propertyId, rows]) => [
      propertyId,
      rows.map(row => row.amenity_name),
    ])
  );
}

async function listLandlordPhotos(
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
  const groups = groupRows(result.results ?? [], row => Number(row.property_id));

  return new Map(
    Array.from(groups.entries()).map(([propertyId, rows]) => [
      propertyId,
      rows.map(row => normalizePropertyPhoto(propertyId, row.photo_url)),
    ])
  );
}

export async function listLandlordProperties(
  db: D1Database,
  landlordId: number
): Promise<LandlordPropertiesResult> {
  const result = await db
    .prepare(
      `
        SELECT
          p.id,
          p.title,
          p.description,
          a.address_line_1 as address,
          a.city,
          a.province,
          a.latitude,
          a.longitude,
          p.price,
          p.status,
          p.listing_moderation_status,
          CASE WHEN p.landlord_id = ? THEN 'owner' ELSE 'shared' END as role,
          p.created_at,
          COUNT(DISTINCT r.id) as rooms_count,
          COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms,
          COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN r.price ELSE 0 END), 0) as monthly_revenue,
          lp.property_type as property_type,
          (
            SELECT COUNT(*)
            FROM applications app
            JOIN rooms rm ON app.room_id = rm.id
            WHERE rm.property_id = p.id
              AND app.status = 'pending'
              AND app.deleted_at IS NULL
              AND rm.deleted_at IS NULL
          ) as pending_applications
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN rooms r ON p.id = r.property_id
          AND r.deleted_at IS NULL
        LEFT JOIN landlord_profiles lp ON lp.user_id = p.landlord_id
        WHERE (
            p.landlord_id = ?
            OR p.id IN (
              SELECT pa.property_id
              FROM property_access pa
              WHERE pa.landlord_id = ?
                AND pa.removed_at IS NULL
            )
          )
          AND p.deleted_at IS NULL
        GROUP BY
          p.id,
          p.title,
          p.description,
          a.address_line_1,
          a.city,
          a.province,
          a.latitude,
          a.longitude,
          p.price,
          p.status,
          p.listing_moderation_status,
          p.created_at,
          lp.property_type
        ORDER BY p.created_at DESC
      `
    )
    .bind(landlordId, landlordId, landlordId)
    .all<LandlordPropertyListRow>();
  const properties = result.results ?? [];
  const propertyIds = properties.map(property => Number(property.id));
  const [amenities, photos] = await Promise.all([
    listLandlordAmenities(db, propertyIds),
    listLandlordPhotos(db, propertyIds),
  ]);

  return {
    properties,
    amenities,
    photos,
  };
}

function insertedId(result: D1Result, label: string): number {
  const id = Number(result.meta.last_row_id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`${label} insert did not return an ID`);
  }

  return id;
}

export async function createLandlordAddress(
  db: D1Database,
  address: string,
  city: string,
  province: string,
  latitude: number | null,
  longitude: number | null
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO addresses (address_line_1, city, province, latitude, longitude)
        VALUES (?, ?, ?, ?, ?)
      `
    )
    .bind(address, city, province, latitude, longitude)
    .run();

  return insertedId(result, 'Address');
}

export async function createLandlordProperty(
  db: D1Database,
  input: CreateLandlordPropertyInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO properties (
          landlord_id,
          title,
          property_type,
          description,
          address_id,
          price,
          deposit,
          advance,
          min_stay,
          house_rules,
          gender_preference,
          property_rules,
          status,
          listing_moderation_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 'published')
      `
    )
    .bind(
      input.landlordId,
      input.title,
      input.propertyType,
      input.description,
      input.addressId,
      input.price,
      input.deposit,
      input.advance,
      input.minStay,
      input.houseRules,
      input.genderPreference,
      input.propertyRules
    )
    .run();

  return insertedId(result, 'Property');
}

export async function createLandlordPropertyFromAlias(
  db: D1Database,
  input: CreateLandlordPropertyAliasInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO properties (
          landlord_id,
          title,
          description,
          address_id,
          price,
          status,
          listing_moderation_status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending_review')
      `
    )
    .bind(
      input.landlordId,
      input.title,
      input.description,
      input.addressId,
      input.price,
      input.status
    )
    .run();

  return insertedId(result, 'Property');
}

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

export async function findLandlordPropertyForUpdate(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<LandlordPropertyUpdateRow | null> {
  return await db
    .prepare(
      `
        SELECT
          id,
          address_id,
          title,
          description,
          price,
          deposit,
          advance,
          min_stay,
          property_rules,
          property_type,
          gender_preference
        FROM properties
        WHERE id = ?
          AND deleted_at IS NULL
          AND ${accessiblePropertyClause()}
        LIMIT 1
      `
    )
    .bind(propertyId, landlordId, landlordId)
    .first<LandlordPropertyUpdateRow>();
}

export async function getLandlordAddress(
  db: D1Database,
  addressId: number
): Promise<LandlordAddressRow | null> {
  return await db
    .prepare(
      `
        SELECT address_line_1, city, province, latitude, longitude
        FROM addresses
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(addressId)
    .first<LandlordAddressRow>();
}

export async function updateLandlordAddress(
  db: D1Database,
  input: UpdateLandlordAddressInput
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE addresses
        SET address_line_1 = ?,
            city = ?,
            province = ?,
            latitude = ?,
            longitude = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(
      input.address,
      input.city,
      input.province,
      input.latitude,
      input.longitude,
      input.addressId
    )
    .run();
}

export async function updateLandlordProperty(
  db: D1Database,
  input: UpdateLandlordPropertyInput
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE properties
        SET title = ?,
            description = ?,
            price = ?,
            deposit = ?,
            advance = ?,
            min_stay = ?,
            property_rules = ?,
            property_type = ?,
            gender_preference = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
          AND ${accessiblePropertyClause()}
      `
    )
    .bind(
      input.title,
      input.description,
      input.price,
      input.deposit,
      input.advance,
      input.minStay,
      input.propertyRules,
      input.propertyType,
      input.genderPreference,
      input.status,
      input.propertyId,
      input.landlordId,
      input.landlordId
    )
    .run();
}

export async function deleteLandlordAmenities(db: D1Database, propertyId: number): Promise<void> {
  await db.prepare('DELETE FROM amenities WHERE property_id = ?').bind(propertyId).run();
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

export async function findLandlordPropertyIdentity(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<LandlordPropertyIdentityRow | null> {
  // Owner-only: used to guard property deletion, which stays owner-only.
  return await db
    .prepare(
      `
        SELECT id, title
        FROM properties
        WHERE id = ?
          AND landlord_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(propertyId, landlordId)
    .first<LandlordPropertyIdentityRow>();
}

export async function findAccessibleLandlordPropertyIdentity(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<LandlordPropertyIdentityRow | null> {
  // Access-aware: used for property edits/photos that shared landlords may do.
  return await db
    .prepare(
      `
        SELECT id, title
        FROM properties
        WHERE id = ?
          AND deleted_at IS NULL
          AND ${accessiblePropertyClause()}
        LIMIT 1
      `
    )
    .bind(propertyId, landlordId, landlordId)
    .first<LandlordPropertyIdentityRow>();
}

export async function softDeleteLandlordProperty(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE properties
        SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted'
        WHERE id = ?
          AND landlord_id = ?
      `
    )
    .bind(propertyId, landlordId)
    .run();
}

export async function softDeleteLandlordPropertyRooms(
  db: D1Database,
  propertyId: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE rooms
        SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted'
        WHERE property_id = ?
      `
    )
    .bind(propertyId)
    .run();
}

export async function getLandlordPropertyDetail(
  db: D1Database,
  propertyId: number,
  landlordId: number
): Promise<LandlordPropertyDetailResult | null> {
  const property = await db
    .prepare(
      `
        SELECT
          p.id,
          p.title,
          p.description,
          p.property_type,
          p.gender_preference,
          a.address_line_1 as address,
          a.latitude,
          a.longitude,
          a.city,
          a.province,
          p.price,
          p.deposit,
          p.advance,
          p.min_stay,
          p.property_rules,
          p.status,
          p.listing_moderation_status,
          CASE WHEN p.landlord_id = ? THEN 'owner' ELSE 'shared' END as role,
          p.created_at,
          COUNT(DISTINCT r.id) as rooms_count,
          COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN rooms r ON p.id = r.property_id
          AND r.deleted_at IS NULL
        WHERE p.id = ?
          AND (
            p.landlord_id = ?
            OR p.id IN (
              SELECT pa.property_id
              FROM property_access pa
              WHERE pa.landlord_id = ?
                AND pa.removed_at IS NULL
            )
          )
          AND p.deleted_at IS NULL
        GROUP BY
          p.id,
          p.title,
          p.description,
          p.property_type,
          p.gender_preference,
          a.address_line_1,
          a.latitude,
          a.longitude,
          a.city,
          a.province,
          p.price,
          p.deposit,
          p.advance,
          p.min_stay,
          p.property_rules,
          p.status,
          p.listing_moderation_status,
          p.created_at
        LIMIT 1
      `
    )
    .bind(landlordId, propertyId, landlordId, landlordId)
    .first<LandlordPropertyDetailRow>();

  if (!property) {
    return null;
  }

  const isOwner = property.role === 'owner';
  const [amenities, photos, authorizedLandlords] = await Promise.all([
    listLandlordAmenities(db, [propertyId]),
    listLandlordPhotos(db, [propertyId]),
    isOwner ? listAuthorizedLandlords(db, propertyId) : Promise.resolve([]),
  ]);

  return {
    property,
    amenities: amenities.get(propertyId) ?? [],
    photos: photos.get(propertyId) ?? [],
    authorized_landlords: authorizedLandlords,
  };
}
