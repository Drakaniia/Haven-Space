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
  resetListingModerationForReview,
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

/** Room vocabulary and per-listing guard rails (spec `create-listing-room-details` R6/R7/R13). */
const validRoomTypes = new Set(['private', 'shared', 'dorm']);

const validRoomStatuses = new Set(['available', 'occupied', 'maintenance']);

const maxRoomsPerListing = 30;

const maxRoomCapacity = 10;

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

/**
 * The three values a listing may hold (`edit-listing-property-info` D3):
 * `draft`, `available` (Published) and `hidden` (Unpublished).
 */
const listingStatuses = new Set(['draft', 'available', 'hidden']);

function normalizeListingStatus(status: string): string {
  if (status === 'active') {
    return 'available';
  }

  if (status === 'inactive') {
    return 'hidden';
  }

  if (!status) {
    return 'available';
  }

  // Anything unrecognised is stored as Unpublished rather than passed through:
  // an unreadable value must never be the one that keeps a listing live (D3, §6.7).
  return listingStatuses.has(status) ? status : 'hidden';
}

function minStayFromBody(body: JsonRecord, fallback: string): string {
  const value = firstBodyValue(body, ['min_stay', 'propertyMinStay']);

  if (value === undefined) {
    return fallback;
  }

  const minStay = String(value).trim();

  return minStayMap[minStay] ?? minStay;
}

interface ListingRoomDraft {
  title: string;
  roomNumber: string;
  roomType: string;
  capacity: number;
  price: number;
  deposit: number;
  size: number;
  description: string;
  status: string;
  occupied: number;
}

/** Single-occupancy rooms are `private`; the legacy `single` value maps onto it. */
function roomTypeForCapacity(capacity: number): string {
  return capacity === 1 ? 'private' : 'shared';
}

function normalizeRoomType(value: unknown, capacity: number): string | null {
  const roomType = String(value ?? '')
    .trim()
    .toLowerCase();

  if (!roomType) {
    return roomTypeForCapacity(capacity);
  }

  if (roomType === 'single') {
    return 'private';
  }

  return validRoomTypes.has(roomType) ? roomType : null;
}

function normalizeRoomStatus(value: unknown): string {
  const status = String(value ?? '')
    .trim()
    .toLowerCase();

  return validRoomStatuses.has(status) ? status : 'available';
}

function roomTitle(roomType: string, capacity: number, roomNumber: string): string {
  if (roomType === 'dorm') {
    return `Dorm Room (${capacity} persons) - ${roomNumber}`;
  }

  if (capacity === 1) {
    return `Private Room - ${roomNumber}`;
  }

  return `Shared Room (${capacity} persons) - ${roomNumber}`;
}

/**
 * Builds the rooms to create from a create-listing payload.
 *
 * The per-room `rooms` array is the primary contract now (spec R6) and carries
 * rent/deposit/size/description/status/occupancy; the property-level
 * count/capacity path stays for older clients and is what the property defaults
 * seed from. `errors` is non-empty only for payloads the API refuses to create.
 */
function listingRooms(body: JsonRecord): { rooms: ListingRoomDraft[]; errors: string[] } {
  const customRooms = Array.isArray(body.rooms) ? body.rooms : [];
  const propertyPrice = numberValue(body, 'propertyPrice');
  const propertyDeposit = numberValue(body, 'propertyDeposit');

  if (customRooms.length > 0) {
    if (customRooms.length > maxRoomsPerListing) {
      return {
        rooms: [],
        errors: [`A listing can have at most ${maxRoomsPerListing} rooms at a time.`],
      };
    }

    const errors: string[] = [];
    const seenNames = new Set<string>();
    const rooms = customRooms.map((room, index) => {
      const roomRecord =
        room && typeof room === 'object' && !Array.isArray(room) ? (room as JsonRecord) : {};
      const roomNumber =
        String(roomRecord.name ?? roomRecord.room_number ?? '').trim() || `Room ${index + 1}`;
      const capacity = intValue(roomRecord.capacity, 1);
      const roomType = normalizeRoomType(roomRecord.room_type ?? roomRecord.roomType, capacity);
      const occupied = intValue(roomRecord.occupied, 0);
      const normalizedName = roomNumber.toLowerCase();

      if (capacity < 1 || capacity > maxRoomCapacity) {
        errors.push(`${roomNumber}: capacity must be between 1 and ${maxRoomCapacity}.`);
      }

      if (roomType === null) {
        errors.push(`${roomNumber}: room type must be one of private, shared, dorm.`);
      }

      if (seenNames.has(normalizedName)) {
        errors.push(`${roomNumber}: room names must be unique within a listing.`);
      }

      if (occupied < 0 || occupied > capacity) {
        errors.push(`${roomNumber}: occupied must be between 0 and capacity.`);
      }

      seenNames.add(normalizedName);

      return {
        title: roomNumber,
        roomNumber,
        roomType: roomType ?? roomTypeForCapacity(capacity),
        capacity,
        price:
          roomRecord.price === undefined
            ? propertyPrice
            : numberValue(roomRecord, 'price', propertyPrice),
        deposit:
          roomRecord.deposit === undefined
            ? propertyDeposit
            : numberValue(roomRecord, 'deposit', propertyDeposit),
        size: isPhpEmpty(roomRecord.size) ? 0 : numberValue(roomRecord, 'size'),
        description: String(roomRecord.description ?? '').trim(),
        status: normalizeRoomStatus(roomRecord.status),
        occupied,
      };
    });

    return { rooms, errors };
  }

  const roomsCount = Math.min(Math.max(intValue(body.propertyRooms, 0), 0), maxRoomsPerListing);

  if (roomsCount <= 0) {
    return { rooms: [], errors: ['At least one room is required.'] };
  }

  const capacity = Math.min(Math.max(intValue(body.propertyCapacity, 1), 1), maxRoomCapacity);
  const roomType = roomTypeForCapacity(capacity);

  return {
    rooms: Array.from({ length: roomsCount }, (_, index) => {
      const roomNumber = `Room ${index + 1}`;

      return {
        title: roomTitle(roomType, capacity, roomNumber),
        roomNumber,
        roomType,
        capacity,
        price: propertyPrice,
        deposit: propertyDeposit,
        size: 0,
        description: '',
        status: 'available',
        occupied: 0,
      };
    }),
    errors: [],
  };
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
