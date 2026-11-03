const PLACEHOLDER_IMAGE = '/assets/images/placeholder-room.svg';

export interface PublicListingFilters {
  search: string;
  priceMin: number | null;
  priceMax: number | null;
  sortBy: string;
  limit: number;
  offset: number;
}

export interface PublicPropertyRow {
  id: number;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  price: number;
  latitude: number | null;
  longitude: number | null;
  listing_moderation_status: string;
  created_at: string | null;
  landlord_id: number;
  landlord_first_name: string | null;
  landlord_last_name: string | null;
}

export interface AmenityRow {
  property_id: number;
  amenity_name: string;
}

export interface PropertyPhotoRow {
  property_id: number;
  photo_url: string;
  is_cover: number;
}

export interface RoomRow {
  property_id: number;
  id: number;
  room_number: string | null;
  room_type: string | null;
  deposit?: number | null;
  capacity: number | null;
  occupied?: number | null;
  status: string | null;
  room_price: number | null;
  title: string | null;
  description?: string | null;
  size?: number | null;
}

export interface DetailPropertyRow extends PublicPropertyRow {
  property_type: string | null;
  deposit: number | string | null;
  advance: string | null;
  min_stay: string | null;
  house_rules: string | null;
  gender_preference: string | null;
  property_rules: string | null;
}

export interface RoomPhotoRow {
  room_id: number;
  photo_url: string;
}

export interface SimilarPropertyReferenceRow {
  price: number;
  city: string | null;
  province: string | null;
  landlord_id: number;
}

export interface SimilarPropertyRow {
  id: number;
  title: string;
  description: string | null;
  price: number;
  address: string | null;
  city: string | null;
  province: string | null;
  rating: number;
  review_count: number;
  cover_image: string | null;
}

export interface MapPropertyRow {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  price: number;
  status: string;
  listing_moderation_status: string;
  created_at: string | null;
  landlord_id: number;
  city: string | null;
  province: string | null;
  rooms_count: number;
  occupied_rooms: number;
  landlord_first_name: string | null;
  landlord_last_name: string | null;
  landlord_business_name: string | null;
}

export interface PublicListingsResult {
  properties: PublicPropertyRow[];
  amenities: Map<number, string[]>;
  propertyPhotos: Map<number, PropertyPhotoRow[]>;
  rooms: Map<number, RoomRow[]>;
  roomPhotos: Map<number, string[]>;
  totalCount: number;
}

export interface PublicListingDetailResult {
  property: DetailPropertyRow;
  amenities: string[];
  propertyPhotos: PropertyPhotoRow[];
  rooms: RoomRow[];
  roomPhotos: Map<number, string[]>;
  landlordProperties: number;
}

export interface MapPropertiesResult {
  properties: MapPropertyRow[];
  amenities: Map<number, string[]>;
  propertyPhotos: Map<number, PropertyPhotoRow[]>;
}

function publicListingsWhere(filters: PublicListingFilters): {
  clause: string;
  params: Array<string | number>;
} {
  // Both axes, not just moderation (`edit-listing-property-info` D17/R13): a
  // publicly approved listing the landlord has since unpublished (or left as a
  // draft) must not be browsable. `active` is tolerated for legacy rows, matching
  // the map query.
  const conditions = [
    'p.deleted_at IS NULL',
    "p.listing_moderation_status = 'published'",
    "p.status IN ('available', 'active')",
  ];
  const params: Array<string | number> = [];

  if (filters.search) {
    // Match against the location columns too (city/province), and treat commas as
    // separate terms so "Sampaloc, Manila" (as sent by the popular-location chips)
    // matches a property whose city is Sampaloc and province is Manila.
    const terms = filters.search
      .split(',')
      .map(term => term.trim())
      .filter(Boolean);

    for (const term of terms) {
      conditions.push(
        '(p.title LIKE ? OR a.address_line_1 LIKE ? OR p.description LIKE ? OR a.city LIKE ? OR a.province LIKE ?)'
      );
      const searchParam = `%${term}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }
  }

  if (filters.priceMin !== null) {
    conditions.push('p.price >= ?');
    params.push(filters.priceMin);
  }

  if (filters.priceMax !== null) {
    conditions.push('p.price <= ?');
    params.push(filters.priceMax);
  }

  return {
    clause: `WHERE ${conditions.join(' AND ')}`,
    params,
  };
}

function sortClause(sortBy: string): string {
  switch (sortBy) {
    case 'price-low':
      return 'ORDER BY p.price ASC';
    case 'price-high':
      return 'ORDER BY p.price DESC';
    case 'newest':
    default:
      return 'ORDER BY p.created_at DESC';
  }
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

async function listAmenities(
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
        ORDER BY amenity_name ASC
      `
    )
    .bind(...propertyIds)
    .all<AmenityRow>();

  const groups = groupRows(result.results ?? [], row => Number(row.property_id));
  return new Map(
    Array.from(groups.entries()).map(([propertyId, rows]) => [
      propertyId,
      rows.map(row => row.amenity_name),
    ])
  );
}

async function listPropertyPhotos(
  db: D1Database,
  propertyIds: number[]
): Promise<Map<number, PropertyPhotoRow[]>> {
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
    .all<PropertyPhotoRow>();

  return groupRows(result.results ?? [], row => Number(row.property_id));
}

async function listRooms(db: D1Database, propertyIds: number[]): Promise<RoomRow[]> {
  if (propertyIds.length === 0) {
    return [];
  }

  const result = await db
    .prepare(
      `
        SELECT
          property_id,
          id,
          room_number,
          room_type,
          capacity,
          occupied,
          deposit,
          description,
          size,
          status,
          price as room_price,
          title
        FROM rooms
        WHERE property_id IN (${placeholders(propertyIds.length)})
          AND deleted_at IS NULL
        ORDER BY property_id ASC, room_number ASC
      `
    )
    .bind(...propertyIds)
    .all<RoomRow>();

  return result.results ?? [];
}

async function listRoomPhotos(db: D1Database, roomIds: number[]): Promise<Map<number, string[]>> {
  if (roomIds.length === 0) {
    return new Map();
  }

  const result = await db
    .prepare(
      `
        SELECT room_id, photo_url
        FROM room_photos
        WHERE room_id IN (${placeholders(roomIds.length)})
        ORDER BY room_id ASC, display_order ASC, id ASC
      `
    )
    .bind(...roomIds)
    .all<RoomPhotoRow>();

  const groups = groupRows(result.results ?? [], row => Number(row.room_id));
  return new Map(
    Array.from(groups.entries()).map(([roomId, rows]) => [roomId, rows.map(row => row.photo_url)])
  );
}

export async function listPublicListings(
  db: D1Database,
  filters: PublicListingFilters
): Promise<PublicListingsResult> {
  const where = publicListingsWhere(filters);
  const count = await db
    .prepare(
      `
        SELECT COUNT(*) as total_count
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        ${where.clause}
      `
    )
    .bind(...where.params)
    .first<{ total_count: number }>();

  const propertiesResult = await db
    .prepare(
      `
        SELECT
          p.id,
          p.title,
          p.description,
          a.address_line_1 as address,
          a.city,
          a.province,
          p.price,
          a.latitude,
          a.longitude,
          p.listing_moderation_status,
          p.created_at,
          p.landlord_id,
          u.first_name as landlord_first_name,
          u.last_name as landlord_last_name
        FROM properties p
        LEFT JOIN users u ON p.landlord_id = u.id
        LEFT JOIN addresses a ON p.address_id = a.id
        ${where.clause}
        ${sortClause(filters.sortBy)}
        LIMIT ? OFFSET ?
      `
    )
    .bind(...where.params, filters.limit, filters.offset)
    .all<PublicPropertyRow>();

  const properties = propertiesResult.results ?? [];
  const propertyIds = properties.map(property => Number(property.id));
  const [amenities, propertyPhotos, roomRows] = await Promise.all([
    listAmenities(db, propertyIds),
    listPropertyPhotos(db, propertyIds),
    listRooms(db, propertyIds),
  ]);
  const rooms = groupRows(roomRows, row => Number(row.property_id));
  const roomPhotos = await listRoomPhotos(
    db,
    roomRows.map(room => Number(room.id))
  );

  return {
    properties,
    amenities,
    propertyPhotos,
    rooms,
    roomPhotos,
    totalCount: Number(count?.total_count ?? 0),
  };
}

export async function getPublicListingDetail(
  db: D1Database,
  propertyId: number
): Promise<PublicListingDetailResult | null> {
  const property = await db
    .prepare(
      `
        SELECT
          p.id,
          p.title,
          p.description,
          p.property_type,
          a.address_line_1 as address,
          a.city,
          a.province,
          a.latitude,
          a.longitude,
          p.price,
          p.listing_moderation_status,
          p.created_at,
          p.landlord_id,
          p.deposit,
          p.advance,
          p.min_stay,
          p.house_rules,
          p.gender_preference,
          p.property_rules,
          u.first_name as landlord_first_name,
          u.last_name as landlord_last_name
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN users u ON p.landlord_id = u.id
        WHERE p.id = ?
          AND p.deleted_at IS NULL
          AND p.listing_moderation_status = 'published'
          AND p.status IN ('available', 'active')
        LIMIT 1
      `
    )
    .bind(propertyId)
    .first<DetailPropertyRow>();

  if (!property) {
    return null;
  }

  const [amenities, propertyPhotos, rooms, landlordProperties] = await Promise.all([
    listAmenities(db, [propertyId]),
    listPropertyPhotos(db, [propertyId]),
    listRooms(db, [propertyId]),
    db
      .prepare(
        `
          SELECT COUNT(*) as property_count
          FROM properties
          WHERE landlord_id = ?
            AND deleted_at IS NULL
            AND listing_moderation_status = 'published'
        `
      )
      .bind(property.landlord_id)
      .first<{ property_count: number }>(),
  ]);
  const roomPhotos = await listRoomPhotos(
    db,
    rooms.map(room => Number(room.id))
  );

  return {
    property,
    amenities: amenities.get(propertyId) ?? [],
    propertyPhotos: propertyPhotos.get(propertyId) ?? [],
    rooms,
    roomPhotos,
    landlordProperties: Number(landlordProperties?.property_count ?? 0),
  };
}

export async function listAllMapProperties(db: D1Database): Promise<MapPropertiesResult> {
  const propertiesResult = await db
    .prepare(
      `
        SELECT
          p.id,
          p.title as name,
          p.description,
          a.address_line_1 as address,
          a.latitude,
          a.longitude,
          p.price,
          p.status,
          p.listing_moderation_status,
          p.created_at,
          p.landlord_id,
          a.city,
          a.province,
          COUNT(DISTINCT r.id) as rooms_count,
          COALESCE(SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_rooms,
          u.first_name as landlord_first_name,
          u.last_name as landlord_last_name,
          lp.boarding_house_name as landlord_business_name
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        LEFT JOIN rooms r ON p.id = r.property_id
          AND r.deleted_at IS NULL
        LEFT JOIN users u ON u.id = p.landlord_id
        LEFT JOIN landlord_profiles lp ON lp.user_id = p.landlord_id
        WHERE p.deleted_at IS NULL
          AND p.status IN ('available', 'active')
          AND p.listing_moderation_status = 'published'
          AND a.latitude IS NOT NULL
          AND a.longitude IS NOT NULL
        GROUP BY
          p.id,
          p.title,
          p.description,
          a.address_line_1,
          a.latitude,
          a.longitude,
          p.price,
          p.status,
          p.listing_moderation_status,
          p.created_at,
          p.landlord_id,
          a.city,
          a.province,
          u.first_name,
          u.last_name,
          lp.boarding_house_name
        ORDER BY p.created_at DESC
      `
    )
    .all<MapPropertyRow>();

  const properties = propertiesResult.results ?? [];
  const propertyIds = properties.map(property => Number(property.id));
  const [amenities, propertyPhotos] = await Promise.all([
    listAmenities(db, propertyIds),
    listPropertyPhotos(db, propertyIds),
  ]);

  return {
    properties,
    amenities,
    propertyPhotos,
  };
}

export async function listSimilarPublicListings(
  db: D1Database,
  propertyId: number,
  limit: number
): Promise<SimilarPropertyRow[] | null> {
  const currentProperty = await db
    .prepare(
      `
        SELECT
          p.price,
          a.city,
          a.province,
          p.landlord_id
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        WHERE p.id = ?
          AND p.deleted_at IS NULL
          AND p.listing_moderation_status = 'published'
          AND p.status IN ('available', 'active')
        LIMIT 1
      `
    )
    .bind(propertyId)
    .first<SimilarPropertyReferenceRow>();

  if (!currentProperty) {
    return null;
  }

  const price = Number(currentProperty.price);
  const minPrice = price * 0.4;
  const maxPrice = price * 2.5;

  const result = await db
    .prepare(
      `
        SELECT
          p.id,
          p.title,
          p.description,
          p.price,
          a.address_line_1 as address,
          a.city,
          a.province,
          0 as rating,
          0 as review_count,
          (
            SELECT photo_url
            FROM property_photos
            WHERE property_id = p.id
              AND is_cover = 1
            LIMIT 1
          ) as cover_image
        FROM properties p
        LEFT JOIN addresses a ON p.address_id = a.id
        WHERE p.id != ?
          AND p.deleted_at IS NULL
          AND p.listing_moderation_status = 'published'
          AND p.status IN ('available', 'active')
          AND p.price BETWEEN ? AND ?
          AND (
            a.city = ? OR
            a.province = ?
          )
        ORDER BY
          CASE WHEN a.city = ? THEN 0 ELSE 1 END,
          rating DESC,
          ABS(p.price - ?) ASC
        LIMIT ?
      `
    )
    .bind(
      propertyId,
      minPrice,
      maxPrice,
      currentProperty.city,
      currentProperty.province,
      currentProperty.city,
      price,
      limit
    )
    .all<SimilarPropertyRow>();

  return result.results ?? [];
}

export { PLACEHOLDER_IMAGE };
