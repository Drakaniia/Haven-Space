import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { deleteUploadThingFileByUrl, uploadFilesToUploadThing } from '../../lib/uploadthing';
import { readJsonObject, type JsonRecord } from '../../lib/validation';
import {
  countLandlordRooms,
  createLandlordAddress,
  createLandlordAmenity,
  createLandlordProperty,
  createLandlordPropertyFromAlias,
  createLandlordPropertyPhoto,
  createLandlordRoom,
  deleteLandlordAmenities,
  deleteLandlordPropertyPhotoByUrl,
  findAccessibleLandlordPropertyIdentity,
  findLandlordPropertyForUpdate,
  findLandlordPropertyIdentity,
  getLandlordAddress,
  getMaxPropertyPhotoDisplayOrder,
  listLandlordPropertyPhotoUrls,
  listLandlordRoomIdsForRemoval,
  softDeleteLandlordRoomsById,
  updateLandlordActiveRooms,
  updateLandlordAddress,
  updateLandlordProperty,
  updateLandlordPropertyPhotoOrder,
  type LandlordPropertyUpdateRow,
} from '../../repositories/landlord-properties';
import {
  fileExtension,
  firstBodyValue,
  hasAnyBodyField,
  hasBodyField,
  intValue,
  isPhpEmpty,
  listingPhotoFiles,
  locationNumberFromFields,
  maxPhotoSizeBytes,
  numberFromFields,
  numberValue,
  parsePositiveInt,
  requireLandlord,
  requireVerifiedLandlordWrite,
  stringFromFields,
  stringValue,
  temporaryPropertyPhotoFiles,
  updatePropertyId,
} from './shared';
const createListingRequiredFields = [
  'propertyName',
  'propertyType',
  'genderPreference',
  'propertyDescription',
  'propertyPrice',
  'propertyDeposit',
  'propertyRooms',
  'propertyCapacity',
  'propertyAddress',
  'propertyCity',
  'propertyProvince',
] as const;

const minStayMap: Record<string, string> = {
  'no-minimum': 'No minimum',
  '1-month': '1 month',
  '3-months': '3 months',
  '6-months': '6 months',
  '1-year': '1 year',
};

const allowedPhotoExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

function requiredFieldErrors(body: JsonRecord): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of createListingRequiredFields) {
    if (isPhpEmpty(body[field])) {
      const message = `${field.replace('property', '') || field} is required`;
      errors[field] = message.charAt(0).toUpperCase() + message.slice(1);
    }
  }

  return errors;
}

function normalizeListingStatus(status: string): string {
  if (status === 'active') {
    return 'available';
  }

  if (status === 'inactive') {
    return 'hidden';
  }

  return status || 'available';
}

function minStayFromBody(body: JsonRecord, fallback: string): string {
  const value = firstBodyValue(body, ['min_stay', 'propertyMinStay']);

  if (value === undefined) {
    return fallback;
  }

  const minStay = String(value).trim();

  return minStayMap[minStay] ?? minStay;
}

function listingRooms(body: JsonRecord) {
  const customRooms = Array.isArray(body.rooms) ? body.rooms : [];

  if (customRooms.length > 0) {
    return customRooms.map((room, index) => {
      const roomRecord =
        room && typeof room === 'object' && !Array.isArray(room) ? (room as JsonRecord) : {};
      const roomName = String(roomRecord.name ?? '').trim() || `Room ${index + 1}`;
      const capacity = intValue(roomRecord.capacity, 1);
      const roomTypeValue = String(roomRecord.roomType ?? '').trim();
      const roomType = roomTypeValue || (capacity === 1 ? 'single' : 'shared');

      return {
        title: roomName,
        roomNumber: roomName,
        roomType,
        capacity,
      };
    });
  }

  const roomsCount = intValue(body.propertyRooms);
  const capacity = intValue(body.propertyCapacity, 1);
  const roomType = capacity === 1 ? 'single' : 'shared';
  const roomTypeDisplay = capacity === 1 ? 'Single Room' : `Shared Room (${capacity} persons)`;

  return Array.from({ length: Math.max(roomsCount, 0) }, (_, index) => {
    const roomNumber = `Room ${index + 1}`;

    return {
      title: `${roomTypeDisplay} - ${roomNumber}`,
      roomNumber,
      roomType,
      capacity,
    };
  });
}

function updateRoomTitle(roomNumber: string, roomCapacity: number | null): string {
  if (!roomCapacity) {
    return roomNumber;
  }

  return roomCapacity === 1
    ? `Single Room - ${roomNumber}`
    : `Shared Room (${roomCapacity} persons) - ${roomNumber}`;
}

async function handleCreateListing(c: Context<{ Bindings: Env }>) {
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
    minStay: stringValue(body, 'propertyMinStay', '1 month') || '1 month',
    houseRules: JSON.stringify([]),
    genderPreference: stringValue(body, 'genderPreference', 'any') || 'any',
    propertyRules: stringValue(body, 'propertyRules'),
  });
  const roomIds: number[] = [];

  for (const room of listingRooms(body)) {
    const roomId = await createLandlordRoom(db, {
      propertyId,
      landlordId: user.user_id,
      title: room.title,
      price: propertyPrice,
      description: '',
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      capacity: room.capacity,
      deposit: numberValue(body, 'propertyDeposit'),
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
        status: 'available',
        room_ids: roomIds,
      },
    },
    201
  );
}

async function handleCreateLandlordPropertyAlias(c: Context<{ Bindings: Env }>) {
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
  const roomType = roomCapacity === 1 ? 'single' : 'shared';
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

async function handleUpdateListing(c: Context<{ Bindings: Env }>) {
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
  await updateListingAmenitiesIfNeeded(db, body, propertyId);
  await updateListingRoomsIfNeeded(db, body, property, user.user_id);
  await updateListingPhotosIfNeeded(c.env, db, body, propertyId);

  return jsonResponse({
    message: 'Listing updated successfully',
    data: { id: propertyId },
  });
}

async function handleUploadTemporaryPropertyPhotos(c: Context<{ Bindings: Env }>) {
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  let formData: FormData;

  try {
    formData = await c.req.raw.formData();
  } catch {
    return errorResponse(400, 'No photos provided');
  }

  const files = temporaryPropertyPhotoFiles(formData);

  if (files.length === 0) {
    return errorResponse(400, 'No photos provided');
  }

  const validFiles = files.filter(file => {
    const extension = fileExtension(file.name);

    return allowedPhotoExtensions.has(extension) && file.size <= maxPhotoSizeBytes;
  });

  if (validFiles.length === 0) {
    return errorResponse(400, 'Failed to upload photos');
  }

  const uploadResults = await uploadFilesToUploadThing(c.env, validFiles, {
    landlordId: user.user_id,
    route: 'landlord-temporary-property-photos',
  });
  const uploadedPhotos = uploadResults
    .map(result => result.data?.ufsUrl ?? result.data?.url ?? result.data?.appUrl ?? null)
    .filter((url): url is string => Boolean(url));

  if (uploadedPhotos.length === 0) {
    return errorResponse(
      400,
      uploadResults.find(result => result.error)?.error?.message || 'Failed to upload photos'
    );
  }

  return jsonResponse({
    message: 'Photos uploaded successfully',
    data: {
      urls: uploadedPhotos,
    },
  });
}

async function handleUploadListingPhotos(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const propertyId = parsePositiveInt(c.req.param('id'));

  if (!propertyId) {
    return errorResponse(400, 'Invalid property ID');
  }

  const property = await findAccessibleLandlordPropertyIdentity(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(403, 'Property not found or access denied');
  }

  let formData: FormData;

  try {
    formData = await c.req.raw.formData();
  } catch {
    return errorResponse(400, 'No photos provided');
  }

  const files = listingPhotoFiles(formData);

  if (files.length === 0) {
    return errorResponse(400, 'No photos provided');
  }

  const maxOrder = await getMaxPropertyPhotoDisplayOrder(db, propertyId);
  const validFiles = files.filter(file => {
    const extension = fileExtension(file.name);

    return allowedPhotoExtensions.has(extension) && file.size <= maxPhotoSizeBytes;
  });

  if (validFiles.length === 0) {
    return errorResponse(
      400,
      'Failed to upload photos. Check file types and sizes (max 5 MB, jpg/png/webp/gif).'
    );
  }

  const uploadResults = await uploadFilesToUploadThing(c.env, validFiles, {
    landlordId: user.user_id,
    propertyId,
    route: 'landlord-listing-photos',
  });
  const uploadedPhotos = uploadResults
    .map(result => result.data?.ufsUrl ?? result.data?.url ?? result.data?.appUrl ?? null)
    .filter((url): url is string => Boolean(url));

  if (uploadedPhotos.length === 0) {
    return errorResponse(
      400,
      uploadResults.find(result => result.error)?.error?.message ||
        'Failed to upload photos. Check file types and sizes (max 5 MB, jpg/png/webp/gif).'
    );
  }

  for (const [index, photoUrl] of uploadedPhotos.entries()) {
    const displayOrder = maxOrder + 1 + index;
    const isCover = maxOrder === -1 && index === 0 ? 1 : 0;
    await createLandlordPropertyPhoto(db, propertyId, photoUrl, isCover, displayOrder);
  }

  return jsonResponse({
    message: 'Photos uploaded successfully',
    data: {
      urls: uploadedPhotos,
    },
  });
}

const listingsRoutes = new Hono<{ Bindings: Env }>();

listingsRoutes.post('/listings', handleCreateListing);
listingsRoutes.put('/listings/:id', handleUpdateListing);
listingsRoutes.post('/upload-photos', handleUploadTemporaryPropertyPhotos);
listingsRoutes.post('/listings/:id/photos', handleUploadListingPhotos);
listingsRoutes.post('/properties', handleCreateLandlordPropertyAlias);

export default listingsRoutes;
