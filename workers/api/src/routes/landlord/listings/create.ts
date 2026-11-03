import type { Context } from 'hono';

import type { Env } from '../../../env';
import { requireD1 } from '../../../lib/d1';
import { errorResponse, jsonResponse } from '../../../lib/http';
import { readJsonObject } from '../../../lib/validation';
import {
  createLandlordAddress,
  createLandlordAmenity,
  createLandlordProperty,
  createLandlordPropertyFromAlias,
  createLandlordRoom,
} from '../../../repositories/landlord-properties';
import {
  hasBodyField,
  isPhpEmpty,
  numberValue,
  requireLandlord,
  requireVerifiedLandlordWrite,
  stringValue,
} from '../shared';
import { listingRooms, requiredFieldErrors } from './drafts';

export async function handleCreateListing(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const verificationError = requireVerifiedLandlordWrite(user);

  if (verificationError) {
    return verificationError;
  }

  const body = await readJsonObject(c.req.raw);
  const errors = requiredFieldErrors(body);

  if (Object.keys(errors).length > 0) {
    return jsonResponse({ errors }, 400);
  }

  // Rooms are validated before anything is written so a bad room payload cannot
  // leave an orphan property behind.
  const listingRoomDrafts = listingRooms(body);

  if (listingRoomDrafts.errors.length > 0) {
    return jsonResponse({ errors: listingRoomDrafts.errors }, 400);
  }

  const latitude = isPhpEmpty(body.propertyLatitude) ? null : numberValue(body, 'propertyLatitude');
  const longitude = isPhpEmpty(body.propertyLongitude)
    ? null
    : numberValue(body, 'propertyLongitude');
  const addressId = await createLandlordAddress(
    db,
    stringValue(body, 'propertyAddress'),
    stringValue(body, 'propertyCity'),
    stringValue(body, 'propertyProvince'),
    latitude,
    longitude
  );
  const propertyName = stringValue(body, 'propertyName');
  const propertyPrice = numberValue(body, 'propertyPrice');
  const propertyId = await createLandlordProperty(db, {
    landlordId: user.user_id,
    title: propertyName,
    propertyType: stringValue(body, 'propertyType', 'boarding-house'),
    description: stringValue(body, 'propertyDescription'),
    addressId,
    price: propertyPrice,
    deposit: numberValue(body, 'propertyDeposit'),
    advance: stringValue(body, 'propertyAdvance', '1 month') || '1 month',
    // Spec `create-listing-room-details` D4/D19: the create form no longer asks
    // for a minimum stay, so new listings are written without one (the column
    // default applies). The edit page still sets it via `minStayFromBody`.
    minStay: '',
    houseRules: JSON.stringify([]),
    genderPreference: stringValue(body, 'genderPreference', 'any') || 'any',
    propertyRules: stringValue(body, 'propertyRules'),
  });
  const roomIds: number[] = [];

  for (const room of listingRoomDrafts.rooms) {
    // `room_ids` is returned in creation order, which is also the order the
    // client sends `rooms` in — the create page attaches photos with it.
    const roomId = await createLandlordRoom(db, {
      propertyId,
      landlordId: user.user_id,
      title: room.title,
      price: room.price,
      description: room.description,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      capacity: room.capacity,
      deposit: room.deposit,
      size: room.size,
      status: room.status,
      occupied: room.occupied,
    });

    roomIds.push(roomId);
  }

  if (Array.isArray(body.amenities)) {
    for (const amenity of body.amenities) {
      const amenityName = String(amenity ?? '').trim();

      if (amenityName) {
        await createLandlordAmenity(db, propertyId, amenityName);
      }
    }
  }

  return jsonResponse(
    {
      message: 'Listing created successfully',
      data: {
        id: propertyId,
        title: propertyName,
        // Created as a draft (`edit-listing-property-info` R14) — the landlord
        // publishes it from the edit page, and an admin still approves it.
        status: 'draft',
        room_ids: roomIds,
      },
    },
    201
  );
}

export async function handleCreateLandlordPropertyAlias(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const verificationError = requireVerifiedLandlordWrite(user);

  if (verificationError) {
    return verificationError;
  }

  const body = await readJsonObject(c.req.raw);

  if (
    !hasBodyField(body, 'propertyName') ||
    !hasBodyField(body, 'propertyAddress') ||
    !hasBodyField(body, 'propertyPrice')
  ) {
    return errorResponse(
      400,
      'Missing required fields: propertyName, propertyAddress, propertyPrice'
    );
  }

  const latitude = isPhpEmpty(body.propertyLatitude) ? null : numberValue(body, 'propertyLatitude');
  const longitude = isPhpEmpty(body.propertyLongitude)
    ? null
    : numberValue(body, 'propertyLongitude');
  const addressId = await createLandlordAddress(
    db,
    stringValue(body, 'propertyAddress'),
    stringValue(body, 'propertyCity', 'Unknown') || 'Unknown',
    stringValue(body, 'propertyProvince', 'Unknown') || 'Unknown',
    latitude,
    longitude
  );
  const propertyId = await createLandlordPropertyFromAlias(db, {
    landlordId: user.user_id,
    title: stringValue(body, 'propertyName'),
    description: stringValue(body, 'propertyDescription'),
    addressId,
    price: numberValue(body, 'propertyPrice'),
    status: stringValue(body, 'propertyStatus', 'available') || 'available',
  });

  if (Array.isArray(body.amenities)) {
    for (const amenity of body.amenities) {
      const amenityName = String(amenity ?? '').trim();

      if (amenityName) {
        await createLandlordAmenity(db, propertyId, amenityName);
      }
    }
  }

  return jsonResponse(
    {
      success: true,
      data: {
        property_id: propertyId,
        message: 'Property created successfully',
      },
    },
    201
  );
}
