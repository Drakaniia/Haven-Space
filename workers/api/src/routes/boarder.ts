import { Hono } from 'hono';

import type { Env } from '../env';
import { authorizeUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { readJsonObject } from '../lib/validation';
import {
  createSavedListing,
  findRoomForProperty,
  findSavedListingStatus,
  findSaveableProperty,
  listSavedListingsForBoarder,
  softDeleteSavedListing,
  type SavedListingRow,
} from '../repositories/saved-listings';

const boarderRoutes = new Hono<{ Bindings: Env }>();

function formatSavedListing(listing: SavedListingRow) {
  return {
    id: Number(listing.saved_listing_id),
    saved_at: listing.saved_at,
    property: {
      id: Number(listing.property_id),
      title: listing.property_title,
      description: listing.property_description,
      address: listing.address,
      latitude: listing.latitude === null ? null : Number(listing.latitude),
      longitude: listing.longitude === null ? null : Number(listing.longitude),
      price: Number(listing.property_price),
      status: listing.property_status,
      cover_image: listing.cover_image || null,
      landlord: {
        name: listing.landlord_name,
        email: listing.landlord_email,
      },
    },
    room: listing.room_id
      ? {
          id: Number(listing.room_id),
          title: listing.room_title,
          price: Number(listing.room_price),
          status: listing.room_status,
        }
      : null,
  };
}

function optionalPositiveInt(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function requiredPositiveInt(value: unknown): number | null {
  const parsed = optionalPositiveInt(value);
  return parsed && parsed > 0 ? parsed : null;
}

boarderRoutes.get('/api/boarder/saved-listings', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const propertyId = c.req.query('property_id');

  if (propertyId) {
    const parsedPropertyId = Number.parseInt(propertyId, 10);

    if (!Number.isFinite(parsedPropertyId) || parsedPropertyId <= 0) {
      return errorResponse(400, 'Property ID is required');
    }

    const savedListing = await findSavedListingStatus(db, user.user_id, parsedPropertyId);

    return jsonResponse({
      success: true,
      is_saved: Boolean(savedListing),
      saved_at: savedListing ? savedListing.saved_at : null,
    });
  }

  const listings = await listSavedListingsForBoarder(db, user.user_id);
  const formattedListings = listings.map(formatSavedListing);

  return jsonResponse({
    success: true,
    data: formattedListings,
    count: formattedListings.length,
  });
});

boarderRoutes.post('/api/boarder/saved-listings', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const body = await readJsonObject(c.req.raw);
  const propertyId = requiredPositiveInt(body.property_id);

  if (!propertyId) {
    return errorResponse(400, 'Property ID is required');
  }

  const roomId = optionalPositiveInt(body.room_id);
  const property = await findSaveableProperty(db, propertyId);

  if (!property) {
    return errorResponse(404, 'Property not found');
  }

  // Both axes (`edit-listing-property-info` D17/R13): a draft or an unpublished
  // listing is not saveable, and `active` is tolerated for legacy rows.
  const listingIsLive = property.status === 'available' || property.status === 'active';

  if (!listingIsLive || property.listing_moderation_status !== 'published') {
    return errorResponse(400, 'Property is not available for saving');
  }

  if (roomId) {
    const room = await findRoomForProperty(db, roomId, propertyId);

    if (!room) {
      return errorResponse(404, 'Room not found');
    }
  }

  const existing = await findSavedListingStatus(db, user.user_id, propertyId);

  if (existing) {
    return errorResponse(409, 'Property already saved');
  }

  const savedListing = await createSavedListing(db, user.user_id, propertyId, roomId);

  return jsonResponse(
    {
      success: true,
      message: 'Property saved successfully',
      data: {
        id: savedListing.id,
        property_id: propertyId,
        room_id: roomId,
        saved_at: savedListing.savedAt,
      },
    },
    201
  );
});

boarderRoutes.delete('/api/boarder/saved-listings', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const body = await readJsonObject(c.req.raw);
  const propertyId = requiredPositiveInt(body.property_id);

  if (!propertyId) {
    return errorResponse(400, 'Property ID is required');
  }

  const savedListing = await findSavedListingStatus(db, user.user_id, propertyId);

  if (!savedListing) {
    return errorResponse(404, 'Saved listing not found');
  }

  await softDeleteSavedListing(db, user.user_id, propertyId);

  return jsonResponse({
    success: true,
    message: 'Property removed from saved listings',
  });
});

export default boarderRoutes;
