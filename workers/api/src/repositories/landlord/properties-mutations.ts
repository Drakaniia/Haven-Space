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
