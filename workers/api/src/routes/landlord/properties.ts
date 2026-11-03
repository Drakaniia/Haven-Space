import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import {
  findLandlordPropertyIdentity,
  getLandlordPropertyDetail,
  listLandlordProperties,
  softDeleteLandlordProperty,
  softDeleteLandlordPropertyRooms,
  type LandlordPropertyDetailResult,
  type LandlordPropertyListRow,
} from '../../repositories/landlord-properties';
import { isPhpEmpty, parsePositiveInt, requireLandlord } from './shared';
function mapPropertyType(value: string | null | undefined): string {
  const typeMapping: Record<string, string> = {
    'Single unit': 'boarding-house',
    'Multi-unit': 'boarding-house',
    Apartment: 'apartment',
    Dormitory: 'dormitory',
  };

  if (!value) {
    return 'boarding-house';
  }

  return typeMapping[value] ?? value;
}

/*
 * No status translation here any more (`edit-listing-property-info` D15). The API
 * returns the stored value — `draft` / `available` / `hidden` — plus
 * `listing_moderation_status`, and the web owns the landlord's vocabulary
 * (Draft / Published / Unpublished) in one helper. Two translations in series were
 * what let the card and the edit form disagree, and the derived `full` state is
 * computed from `total_rooms`/`occupied_rooms`, which both payloads already carry.
 */

function formatLandlordPropertyListItem(
  property: LandlordPropertyListRow,
  amenities: string[],
  photos: string[]
) {
  const totalRooms = Number(property.rooms_count);
  const occupiedRooms = Number(property.occupied_rooms);

  return {
    id: Number(property.id),
    name: property.title,
    type: mapPropertyType(property.property_type),
    description: property.description ?? '',
    address: property.address ?? '',
    latitude: property.latitude === null ? null : Number(property.latitude),
    longitude: property.longitude === null ? null : Number(property.longitude),
    city: property.city ?? '',
    province: property.province ?? '',
    price: Number(property.price),
    status: property.status,
    // The admin axis is returned for the landlord's own surfaces too, so a rejected
    // listing reads as Unpublished rather than as a live one (D12).
    listing_moderation_status: property.listing_moderation_status,
    role: property.role ?? 'owner',
    total_rooms: totalRooms,
    occupied_rooms: occupiedRooms,
    monthly_revenue: Number(property.monthly_revenue),
    created_at: property.created_at,
    amenities,
    photos,
    pending_applications: Number(property.pending_applications ?? 0),
  };
}

function formatLandlordPropertyDetail(result: LandlordPropertyDetailResult) {
  const property = result.property;
  const isOwner = property.role === 'owner';

  return {
    id: Number(property.id),
    name: property.title,
    type: mapPropertyType(property.property_type),
    gender_preference: property.gender_preference ?? 'any',
    description: property.description ?? '',
    address: property.address ?? '',
    latitude: property.latitude === null ? '' : Number(property.latitude),
    longitude: property.longitude === null ? '' : Number(property.longitude),
    city: property.city ?? '',
    province: property.province ?? '',
    price: Number(property.price),
    deposit: property.deposit === null ? 0 : Number(property.deposit),
    capacity: '',
    min_stay: property.min_stay ?? '',
    availability: 'available-now',
    status: property.status,
    // Surfaced so the landlord detail page can label the listing's real publish
    // state (`landlord-property-detail-page` D15/R16). The column was already
    // selected by `getLandlordPropertyDetail` — it was simply not returned.
    listing_moderation_status: property.listing_moderation_status,
    role: property.role ?? 'owner',
    total_rooms: Number(property.rooms_count),
    rooms: Number(property.rooms_count),
    occupied_rooms: Number(property.occupied_rooms),
    created_at: property.created_at,
    amenities: result.amenities,
    photos: result.photos,
    rules: property.property_rules ?? '',
    monthlyPayment: Number(property.price),
    monthlyDeposit: property.deposit === null ? 0 : Number(property.deposit),
    advancePayment: property.advance ?? 'None',
    ...(isOwner
      ? {
          authorized_landlords: result.authorized_landlords.map(landlord => ({
            id: Number(landlord.landlord_id),
            first_name: landlord.first_name,
            last_name: landlord.last_name,
            email: landlord.email,
            granted_at: landlord.granted_at,
          })),
        }
      : {}),
  };
}

async function handleLandlordProperties(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const propertyIdParam = c.req.query('id');

  if (propertyIdParam) {
    const propertyId = parsePositiveInt(propertyIdParam);

    if (!propertyId) {
      return errorResponse(404, 'Property not found');
    }

    const property = await getLandlordPropertyDetail(db, propertyId, user.user_id);

    if (!property) {
      return errorResponse(404, 'Property not found');
    }

    return jsonResponse({ data: formatLandlordPropertyDetail(property) });
  }

  const result = await listLandlordProperties(db, user.user_id);
  const properties = result.properties.map(property =>
    formatLandlordPropertyListItem(
      property,
      result.amenities.get(Number(property.id)) ?? [],
      result.photos.get(Number(property.id)) ?? []
    )
  );

  return jsonResponse({
    data: {
      properties,
      total_count: properties.length,
    },
  });
}

async function handleDeleteLandlordProperty(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const propertyIdParam = c.req.query('id');

  if (isPhpEmpty(propertyIdParam)) {
    return errorResponse(400, 'Property ID is required');
  }

  const propertyId = parsePositiveInt(propertyIdParam);

  if (!propertyId) {
    return errorResponse(404, 'Property not found or access denied');
  }

  const property = await findLandlordPropertyIdentity(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found or access denied');
  }

  await softDeleteLandlordProperty(db, propertyId, user.user_id);
  await softDeleteLandlordPropertyRooms(db, propertyId);

  return jsonResponse({
    success: true,
    message: 'Property deleted successfully',
    data: {
      property_id: propertyId,
      property_name: property.title,
    },
  });
}

const propertiesRoutes = new Hono<{ Bindings: Env }>();

propertiesRoutes.get('/properties', handleLandlordProperties);
propertiesRoutes.delete('/properties', handleDeleteLandlordProperty);

export default propertiesRoutes;
