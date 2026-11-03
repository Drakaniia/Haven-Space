export interface SavedListingRow {
  saved_listing_id: number;
  saved_at: string;
  property_id: number;
  property_title: string;
  property_description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  property_price: number;
  property_status: string;
  cover_image: string | null;
  room_id: number | null;
  room_title: string | null;
  room_price: number | null;
  room_status: string | null;
  landlord_name: string | null;
  landlord_email: string | null;
}

export interface SavedListingStatusRow {
  id: number;
  saved_at: string;
}

export interface SaveablePropertyRow {
  id: number;
  title: string;
  status: string;
  listing_moderation_status: string;
}

export interface SaveableRoomRow {
  id: number;
  title: string | null;
  status: string | null;
}

export async function listSavedListingsForBoarder(
  db: D1Database,
  boarderId: number
): Promise<SavedListingRow[]> {
  const result = await db
    .prepare(
      `
        SELECT
          sl.id as saved_listing_id,
          sl.saved_at,
          p.id as property_id,
          p.title as property_title,
          p.description as property_description,
          a.address_line_1 as address,
          a.latitude,
          a.longitude,
          p.price as property_price,
          p.status as property_status,
          (
            SELECT photo_url
            FROM property_photos
            WHERE property_id = p.id
              AND is_cover = 1
            LIMIT 1
          ) as cover_image,
          r.id as room_id,
          r.title as room_title,
          r.price as room_price,
          r.status as room_status,
          trim(u.first_name || ' ' || u.last_name) as landlord_name,
          u.email as landlord_email
        FROM saved_listings sl
        INNER JOIN properties p ON sl.property_id = p.id
        INNER JOIN addresses a ON p.address_id = a.id
        INNER JOIN users u ON p.landlord_id = u.id
        LEFT JOIN rooms r ON sl.room_id = r.id
        WHERE sl.boarder_id = ?
          AND sl.deleted_at IS NULL
          AND p.deleted_at IS NULL
          -- Available only (edit-listing-property-info D17/R13): a saved listing
          -- the landlord has since unpublished or left as a draft must disappear.
          AND p.status IN ('available', 'active')
          AND p.listing_moderation_status = 'published'
        ORDER BY sl.saved_at DESC
      `
    )
    .bind(boarderId)
    .all<SavedListingRow>();

  return result.results ?? [];
}

export async function findSavedListingStatus(
  db: D1Database,
  boarderId: number,
  propertyId: number
): Promise<SavedListingStatusRow | null> {
  return await db
    .prepare(
      `
        SELECT id, saved_at
        FROM saved_listings
        WHERE boarder_id = ?
          AND property_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(boarderId, propertyId)
    .first<SavedListingStatusRow>();
}

export async function findSaveableProperty(
  db: D1Database,
  propertyId: number
): Promise<SaveablePropertyRow | null> {
  return await db
    .prepare(
      `
        SELECT id, title, status, listing_moderation_status
        FROM properties
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(propertyId)
    .first<SaveablePropertyRow>();
}

export async function findRoomForProperty(
  db: D1Database,
  roomId: number,
  propertyId: number
): Promise<SaveableRoomRow | null> {
  return await db
    .prepare(
      `
        SELECT id, title, status
        FROM rooms
        WHERE id = ?
          AND property_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(roomId, propertyId)
    .first<SaveableRoomRow>();
}

export async function createSavedListing(
  db: D1Database,
  boarderId: number,
  propertyId: number,
  roomId: number | null
): Promise<{ id: number; savedAt: string }> {
  const savedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // saved_listings carries UNIQUE(boarder_id, property_id) but deletes are soft
  // (deleted_at), so re-saving an unsaved listing must revive the old row — a
  // plain INSERT would violate the unique index and surface as a 500.
  const revived = await db
    .prepare(
      `
        UPDATE saved_listings
        SET room_id = ?, saved_at = ?, deleted_at = NULL
        WHERE boarder_id = ?
          AND property_id = ?
          AND deleted_at IS NOT NULL
      `
    )
    .bind(roomId, savedAt, boarderId, propertyId)
    .run();

  if ((revived.meta.changes ?? 0) > 0) {
    const row = await db
      .prepare(
        `
          SELECT id
          FROM saved_listings
          WHERE boarder_id = ? AND property_id = ?
          LIMIT 1
        `
      )
      .bind(boarderId, propertyId)
      .first<{ id: number }>();

    return {
      id: Number(row?.id ?? 0),
      savedAt,
    };
  }

  const result = await db
    .prepare(
      `
        INSERT INTO saved_listings (boarder_id, property_id, room_id, saved_at)
        VALUES (?, ?, ?, ?)
      `
    )
    .bind(boarderId, propertyId, roomId, savedAt)
    .run();

  return {
    id: Number(result.meta.last_row_id ?? 0),
    savedAt,
  };
}

export async function softDeleteSavedListing(
  db: D1Database,
  boarderId: number,
  propertyId: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE saved_listings
        SET deleted_at = ?
        WHERE boarder_id = ?
          AND property_id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(new Date().toISOString().replace('T', ' ').slice(0, 19), boarderId, propertyId)
    .run();
}
