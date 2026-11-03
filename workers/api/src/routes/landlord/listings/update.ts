import type { Context } from 'hono';

import type { Env } from '../../../env';
import { requireD1 } from '../../../lib/d1';
import { errorResponse, jsonResponse } from '../../../lib/http';
import { deleteUploadThingFileByUrl } from '../../../lib/uploadthing';
import { readJsonObject, type JsonRecord } from '../../../lib/validation';
import {
  countLandlordRooms,
  createLandlordAmenity,
  createLandlordPropertyPhoto,
  createLandlordRoom,
  deleteLandlordAmenities,
  deleteLandlordPropertyPhotoByUrl,
  findLandlordPropertyForUpdate,
  getLandlordAddress,
  listLandlordPropertyPhotoUrls,
  listLandlordRoomIdsForRemoval,
  resetListingModerationForReview,
  softDeleteLandlordRoomsById,
  updateLandlordActiveRooms,
  updateLandlordAddress,
  updateLandlordProperty,
  updateLandlordPropertyPhotoOrder,
  type LandlordPropertyUpdateRow,
} from '../../../repositories/landlord-properties';
import {
  firstBodyValue,
  hasAnyBodyField,
  intValue,
  locationNumberFromFields,
  numberFromFields,
  requireLandlord,
  stringFromFields,
  updatePropertyId,
} from '../shared';
import { minStayFromBody, normalizeListingStatus, updateRoomTitle } from './drafts';

async function updateListingAddressIfNeeded(
  db: D1Database,
  body: JsonRecord,
  property: LandlordPropertyUpdateRow
): Promise<void> {
  if (
    !property.address_id ||
    !hasAnyBodyField(body, [
      'address',
      'propertyAddress',
      'latitude',
      'propertyLatitude',
      'longitude',
      'propertyLongitude',
      'city',
      'propertyCity',
      'province',
      'propertyProvince',
    ])
  ) {
    return;
  }

  const currentAddress = await getLandlordAddress(db, property.address_id);

  await updateLandlordAddress(db, {
    addressId: property.address_id,
    address: stringFromFields(
      body,
      ['address', 'propertyAddress'],
      currentAddress?.address_line_1 ?? ''
    ),
    city: stringFromFields(body, ['city', 'propertyCity'], currentAddress?.city ?? ''),
    province: stringFromFields(
      body,
      ['province', 'propertyProvince'],
      currentAddress?.province ?? ''
    ),
    latitude: locationNumberFromFields(
      body,
      ['latitude', 'propertyLatitude'],
      currentAddress?.latitude ?? null
    ),
    longitude: locationNumberFromFields(
      body,
      ['longitude', 'propertyLongitude'],
      currentAddress?.longitude ?? null
    ),
  });
}

async function updateListingAmenitiesIfNeeded(
  db: D1Database,
  body: JsonRecord,
  propertyId: number
): Promise<void> {
  if (!Array.isArray(body.amenities)) {
    return;
  }

  await deleteLandlordAmenities(db, propertyId);

  for (const amenity of body.amenities) {
    const amenityName = String(amenity ?? '').trim();

    if (amenityName) {
      await createLandlordAmenity(db, propertyId, amenityName);
    }
  }
}

async function updateListingRoomsIfNeeded(
  db: D1Database,
  body: JsonRecord,
  property: LandlordPropertyUpdateRow,
  landlordId: number
): Promise<void> {
  const hasRoomUpdate = hasAnyBodyField(body, [
    'total_rooms',
    'propertyRooms',
    'capacity',
    'propertyCapacity',
  ]);

  if (!hasRoomUpdate) {
    return;
  }

  const propertyId = Number(property.id);
  const currentRoomCount = await countLandlordRooms(db, propertyId);
  const roomCountValue = firstBodyValue(body, ['total_rooms', 'propertyRooms']);
  const roomCapacityValue = firstBodyValue(body, ['capacity', 'propertyCapacity']);
  const newRoomCount =
    roomCountValue === undefined ? currentRoomCount : Math.max(0, intValue(roomCountValue));
  const roomCapacity =
    roomCapacityValue === undefined ? null : Math.max(0, intValue(roomCapacityValue));
  const roomType = roomCapacity === 1 ? 'private' : 'shared';
  const roomPrice = numberFromFields(
    body,
    ['price', 'propertyPrice', 'monthlyPayment'],
    Number(property.price)
  );

  if (newRoomCount > currentRoomCount) {
    for (let roomIndex = currentRoomCount + 1; roomIndex <= newRoomCount; roomIndex += 1) {
      const roomNumber = `Room ${roomIndex}`;
      await createLandlordRoom(db, {
        propertyId,
        landlordId,
        title: updateRoomTitle(roomNumber, roomCapacity),
        price: roomPrice,
        description: '',
        roomNumber,
        roomType,
        capacity: roomCapacity ?? 1,
        deposit: Number(property.deposit ?? 0),
      });
    }
  } else if (newRoomCount < currentRoomCount) {
    const roomIds = await listLandlordRoomIdsForRemoval(
      db,
      propertyId,
      currentRoomCount - newRoomCount
    );
    await softDeleteLandlordRoomsById(db, roomIds);
  }

  if (roomCapacity !== null) {
    await updateLandlordActiveRooms(db, propertyId, roomCapacity, roomType, roomPrice);
  }
}

async function updateListingPhotosIfNeeded(
  env: Env,
  db: D1Database,
  body: JsonRecord,
  propertyId: number
): Promise<void> {
  if (!Array.isArray(body.photos)) {
    return;
  }

  if (Array.isArray(body.photos_to_delete)) {
    for (const photoUrlValue of body.photos_to_delete) {
      const photoUrl = String(photoUrlValue ?? '').trim();

      if (!photoUrl) {
        continue;
      }

      await deleteLandlordPropertyPhotoByUrl(db, propertyId, photoUrl);

      try {
        await deleteUploadThingFileByUrl(env, photoUrl);
      } catch (error) {
        console.warn('Failed to delete UploadThing property photo', error);
      }
    }
  }

  const existingPhotoUrls = new Set(await listLandlordPropertyPhotoUrls(db, propertyId));

  for (const [index, photoUrlValue] of body.photos.entries()) {
    const photoUrl = String(photoUrlValue ?? '').trim();

    if (!photoUrl) {
      continue;
    }

    const isCover = index === 0 ? 1 : 0;

    if (existingPhotoUrls.has(photoUrl)) {
      await updateLandlordPropertyPhotoOrder(db, propertyId, photoUrl, isCover, index);
    } else {
      await createLandlordPropertyPhoto(db, propertyId, photoUrl, isCover, index);
      existingPhotoUrls.add(photoUrl);
    }
  }
}

export async function handleUpdateListing(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonObject(c.req.raw);
  const propertyId = updatePropertyId(c, body);

  if (!propertyId) {
    return errorResponse(400, 'Property ID is required');
  }

  const property = await findLandlordPropertyForUpdate(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(403, 'Property not found or access denied');
  }

  await updateListingAddressIfNeeded(db, body, property);

  const advancePayment = firstBodyValue(body, ['advancePayment', 'propertyAdvance']);
  const advance =
    advancePayment !== undefined && String(advancePayment) !== ''
      ? String(advancePayment)
      : property.advance ?? 'None';
  const status = normalizeListingStatus(
    stringFromFields(body, ['status', 'propertyStatus'], 'available')
  );

  await updateLandlordProperty(db, {
    propertyId,
    landlordId: user.user_id,
    title: stringFromFields(body, ['name', 'propertyName'], property.title),
    description: stringFromFields(
      body,
      ['description', 'propertyDescription'],
      property.description ?? ''
    ),
    price: numberFromFields(
      body,
      ['monthlyPayment', 'price', 'propertyPrice'],
      Number(property.price)
    ),
    deposit: numberFromFields(
      body,
      ['monthlyDeposit', 'deposit', 'propertyDeposit'],
      Number(property.deposit ?? 0)
    ),
    advance,
    minStay: minStayFromBody(body, property.min_stay ?? ''),
    propertyRules: stringFromFields(
      body,
      ['rules', 'propertyRules'],
      property.property_rules ?? ''
    ),
    propertyType: stringFromFields(body, ['type', 'propertyType'], property.property_type ?? ''),
    genderPreference: stringFromFields(
      body,
      ['gender_preference', 'genderPreference'],
      property.gender_preference ?? 'any'
    ),
    status,
  });

  // Publishing a rejected listing is the landlord asking for another review; every
  // other save leaves moderation exactly where the admin left it (D11/R8). The
  // repository query guards on `rejected` too, so this is belt and braces.
  if (status === 'available' && property.listing_moderation_status === 'rejected') {
    await resetListingModerationForReview(db, { propertyId, landlordId: user.user_id });
  }

  await updateListingAmenitiesIfNeeded(db, body, propertyId);
  await updateListingRoomsIfNeeded(db, body, property, user.user_id);
  await updateListingPhotosIfNeeded(c.env, db, body, propertyId);

  return jsonResponse({
    message: 'Listing updated successfully',
    data: { id: propertyId },
  });
}
