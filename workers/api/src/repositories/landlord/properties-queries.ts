import type { D1Database, D1Result } from '@cloudflare/workers-types';
import {
  accessiblePropertyClause,
  listAuthorizedLandlords,
  type AuthorizedLandlordRow,
} from '../property-access.js';
import type {
  LandlordPropertyListRow,
  LandlordPropertyDetailRow,
  LandlordPropertyIdentityRow,
  LandlordPropertyUpdateRow,
  LandlordAddressRow,
  LandlordPropertiesResult,
  LandlordPropertyDetailResult,
  CreateLandlordPropertyInput,
  CreateLandlordPropertyAliasInput,
  UpdateLandlordAddressInput,
  UpdateLandlordPropertyInput,
} from './properties-types.js';
import {
  groupRows,
  placeholders,
  insertedId,
  normalizePropertyPhoto,
} from './properties-helpers.js';
import { listLandlordAmenities, listLandlordPhotos } from './properties-photos.js';

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
