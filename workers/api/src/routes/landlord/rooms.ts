import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { deleteUploadThingFileByUrl, uploadFilesToUploadThing } from '../../lib/uploadthing';
import { readJsonObject, type JsonRecord } from '../../lib/validation';
import {
  clearLandlordRoomCover,
  createLandlordManagedRoom,
  createLandlordRoomPhoto,
  deleteLandlordRoomPhoto,
  findDuplicateLandlordRoomNumber,
  findLandlordManagedRoomIdentity,
  findLandlordRoomPhoto,
  findLandlordRoomProperty,
  findNextLandlordRoomPhoto,
  getLandlordManagedRoom,
  getLandlordManagedRoomById,
  getLandlordRoomPhotoStats,
  listLandlordManagedRooms,
  listLandlordRoomPhotos,
  setLandlordRoomPhotoCover,
  softDeleteLandlordManagedRoom,
  updateLandlordManagedRoom,
  type LandlordRoomPhotoRow,
  type LandlordRoomRow,
} from '../../repositories/landlord-rooms';
import {
  fileExtension,
  floatValue,
  hasOwnBodyField,
  intValue,
  isPhpEmpty,
  maxPhotoSizeBytes,
  parsePositiveInt,
  positiveIntValue,
  requireLandlord,
  roomPhotoFiles,
} from './shared';
const validRoomStatuses = new Set(['available', 'occupied', 'maintenance']);

// Spec `create-listing-room-details` R7: room types are private / shared / dorm.
const validRoomTypes = new Set(['private', 'shared', 'dorm']);

const maxRoomCapacity = 10;

const allowedRoomPhotoExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);

function normalizeRoomCreateStatus(value: unknown): string {
  const status = String(value ?? '');

  return validRoomStatuses.has(status) ? status : 'available';
}

/**
 * Maps a payload room type to the private/shared/dorm vocabulary. Legacy
 * `single` values (older clients, pre-0019 rows) map to `private`; anything else
 * unknown is rejected by the caller.
 */
function normalizeRoomType(value: unknown): string | null {
  const roomType = String(value ?? '')
    .trim()
    .toLowerCase();

  if (!roomType) {
    return null;
  }

  if (roomType === 'single') {
    return 'private';
  }

  return validRoomTypes.has(roomType) ? roomType : null;
}

function formatLandlordManagedRoom(room: LandlordRoomRow, photos: LandlordRoomPhotoRow[] = []) {
  const formattedPhotos = photos.map(photo => ({
    id: Number(photo.id),
    photo_url: photo.photo_url,
    is_cover: Boolean(photo.is_cover),
    display_order: Number(photo.display_order),
  }));
  const coverPhoto =
    formattedPhotos.find(photo => photo.is_cover)?.photo_url ??
    formattedPhotos[0]?.photo_url ??
    null;

  const capacity = Number(room.capacity ?? 1);
  const occupied = Math.max(0, Number(room.occupied ?? 0));

  return {
    id: Number(room.id),
    property_id: Number(room.property_id),
    room_number: room.room_number ?? '',
    room_type: room.room_type ?? null,
    description: room.description ?? null,
    price: Number(room.price),
    deposit: Number(room.deposit ?? 0),
    status: room.status ?? 'available',
    capacity,
    occupied,
    free_slots: Math.max(capacity - occupied, 0),
    size: room.size === null || room.size === undefined ? null : Number(room.size),
    cover_photo: coverPhoto,
    photos: formattedPhotos,
    tenant: null,
    created_at: room.created_at ?? null,
    updated_at: room.updated_at ?? null,
  };
}

async function handleListLandlordRooms(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const propertyId = parsePositiveInt(c.req.query('propertyId'));

  if (!propertyId) {
    return errorResponse(400, 'propertyId is required');
  }

  const property = await findLandlordRoomProperty(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found or access denied');
  }

  const roomId = parsePositiveInt(c.req.query('id'));

  if (roomId) {
    const room = await getLandlordManagedRoom(db, roomId, propertyId, user.user_id);

    if (!room) {
      return errorResponse(404, 'Room not found');
    }

    const photos = await listLandlordRoomPhotos(db, [roomId]);

    return jsonResponse({
      data: formatLandlordManagedRoom(room, photos.get(roomId) ?? []),
    });
  }

  const rooms = await listLandlordManagedRooms(db, propertyId, user.user_id);
  const roomIds = rooms.map(room => Number(room.id));
  const photos = await listLandlordRoomPhotos(db, roomIds);
  const occupiedRooms = rooms.filter(room => room.status === 'occupied').length;

  return jsonResponse({
    data: {
      property: {
        id: Number(property.id),
        name: property.title,
        status: property.status,
        total_rooms: rooms.length,
        occupied_rooms: occupiedRooms,
      },
      rooms: rooms.map(room => formatLandlordManagedRoom(room, photos.get(Number(room.id)) ?? [])),
    },
  });
}

async function handleCreateLandlordRoom(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonObject(c.req.raw);
  const propertyId = positiveIntValue(body.property_id);

  if (!propertyId) {
    return errorResponse(400, 'property_id is required');
  }

  const property = await findLandlordRoomProperty(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found or access denied');
  }

  if (isPhpEmpty(body.room_number)) {
    return errorResponse(400, 'room_number is required');
  }

  if (body.price === undefined || body.price === null || body.price === '') {
    return errorResponse(400, 'price is required');
  }

  const roomNumber = String(body.room_number).trim();
  const duplicate = await findDuplicateLandlordRoomNumber(db, propertyId, roomNumber);

  if (duplicate) {
    return errorResponse(409, 'A room with this number already exists in this property');
  }

  const roomType = normalizeRoomType(body.room_type);

  if (!isPhpEmpty(body.room_type) && roomType === null) {
    return errorResponse(400, 'room_type must be one of: private, shared, dorm');
  }

  const capacity = body.capacity === undefined ? 1 : intValue(body.capacity);

  if (capacity < 1 || capacity > maxRoomCapacity) {
    return errorResponse(400, `capacity must be between 1 and ${maxRoomCapacity}`);
  }

  const occupied = body.occupied === undefined ? 0 : intValue(body.occupied);

  if (occupied < 0 || occupied > capacity) {
    return errorResponse(400, 'occupied must be between 0 and capacity');
  }

  const roomId = await createLandlordManagedRoom(db, {
    propertyId,
    landlordId: user.user_id,
    roomNumber,
    roomType: isPhpEmpty(body.room_type) ? null : roomType,
    price: floatValue(body.price),
    deposit: body.deposit === undefined ? 0 : floatValue(body.deposit),
    status: normalizeRoomCreateStatus(body.status),
    capacity,
    occupied,
    description: isPhpEmpty(body.description) ? '' : String(body.description),
    size: isPhpEmpty(body.size) ? 0 : floatValue(body.size),
  });
  const room = await getLandlordManagedRoomById(db, roomId);

  if (!room) {
    throw new Error('Created room was not found');
  }

  const photos = await listLandlordRoomPhotos(db, [roomId]);

  return jsonResponse(
    {
      success: true,
      message: 'Room created successfully',
      data: formatLandlordManagedRoom(room, photos.get(roomId) ?? []),
    },
    201
  );
}

async function handleUpdateLandlordRoom(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonObject(c.req.raw);
  const roomId = parsePositiveInt(c.req.query('id')) ?? positiveIntValue(body.id);

  if (!roomId) {
    return errorResponse(400, 'Room id is required');
  }

  const existing = await findLandlordManagedRoomIdentity(db, roomId, user.user_id);

  if (!existing) {
    return errorResponse(404, 'Room not found or access denied');
  }

  if (
    hasOwnBodyField(body, 'room_number') &&
    String(body.room_number) !== (existing.room_number ?? '')
  ) {
    const duplicate = await findDuplicateLandlordRoomNumber(
      db,
      Number(existing.property_id),
      String(body.room_number),
      roomId
    );

    if (duplicate) {
      return errorResponse(409, 'A room with this number already exists in this property');
    }
  }

  if (hasOwnBodyField(body, 'room_type')) {
    const normalized = normalizeRoomType(body.room_type);

    if (normalized === null) {
      return errorResponse(400, 'room_type must be one of: private, shared, dorm');
    }
  }

  const capacityFromBody = hasOwnBodyField(body, 'capacity') ? intValue(body.capacity) : null;

  if (capacityFromBody !== null && (capacityFromBody < 1 || capacityFromBody > maxRoomCapacity)) {
    return errorResponse(400, `capacity must be between 1 and ${maxRoomCapacity}`);
  }

  // Manual occupancy is the landlord's correction of the booking-driven count
  // (spec D8) — it must stay inside the room's capacity for the tenant-facing
  // "X of Y slots free" to make sense. The current capacity is only read when the
  // payload changes occupancy without capacity.
  if (hasOwnBodyField(body, 'occupied')) {
    const occupied = intValue(body.occupied);
    const capacityForCheck =
      capacityFromBody ?? Number((await getLandlordManagedRoomById(db, roomId))?.capacity ?? 1);

    if (occupied < 0 || occupied > capacityForCheck) {
      return errorResponse(400, 'occupied must be between 0 and capacity');
    }
  }

  await updateLandlordManagedRoom(db, roomId, {
    ...(hasOwnBodyField(body, 'room_number') ? { room_number: String(body.room_number) } : {}),
    ...(hasOwnBodyField(body, 'room_type') ? { room_type: normalizeRoomType(body.room_type) } : {}),
    ...(hasOwnBodyField(body, 'price') ? { price: floatValue(body.price) } : {}),
    ...(hasOwnBodyField(body, 'deposit') ? { deposit: floatValue(body.deposit) } : {}),
    ...(hasOwnBodyField(body, 'status') ? { status: String(body.status) } : {}),
    ...(capacityFromBody !== null ? { capacity: capacityFromBody } : {}),
    ...(hasOwnBodyField(body, 'occupied') ? { occupied: intValue(body.occupied) } : {}),
    ...(hasOwnBodyField(body, 'description') ? { description: String(body.description) } : {}),
    ...(hasOwnBodyField(body, 'size') ? { size: floatValue(body.size) } : {}),
  });

  const room = await getLandlordManagedRoomById(db, roomId);

  if (!room) {
    throw new Error('Updated room was not found');
  }

  const photos = await listLandlordRoomPhotos(db, [roomId]);

  return jsonResponse({
    success: true,
    message: 'Room updated successfully',
    data: formatLandlordManagedRoom(room, photos.get(roomId) ?? []),
  });
}

async function handleDeleteLandlordRoom(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const roomId = parsePositiveInt(c.req.query('id'));

  if (!roomId) {
    return errorResponse(400, 'Room id is required');
  }

  const room = await findLandlordManagedRoomIdentity(db, roomId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  await softDeleteLandlordManagedRoom(db, roomId);

  return jsonResponse({
    success: true,
    message: 'Room deleted successfully',
  });
}

async function handleUploadRoomPhotos(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const roomId = parsePositiveInt(c.req.param('id'));

  if (!roomId) {
    return errorResponse(400, 'Invalid room ID in URL');
  }

  const room = await findLandlordManagedRoomIdentity(db, roomId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  let formData: FormData;

  try {
    formData = await c.req.raw.formData();
  } catch {
    return errorResponse(400, 'No photos provided (field name: roomPhotos[])');
  }

  const files = roomPhotoFiles(formData);

  if (files.length === 0) {
    return errorResponse(400, 'No photos provided (field name: roomPhotos[])');
  }

  const errors: string[] = [];
  const validFiles = files.filter(file => {
    const extension = fileExtension(file.name);

    if (!allowedRoomPhotoExtensions.has(extension)) {
      errors.push(`File ${file.name}: unsupported type (allowed: jpg, png, webp)`);
      return false;
    }

    if (file.size > maxPhotoSizeBytes) {
      errors.push(`File ${file.name}: exceeds 5 MB limit`);
      return false;
    }

    return true;
  });

  if (validFiles.length === 0) {
    return jsonResponse(
      {
        error: 'No photos were saved. Check file types (jpg/png/webp) and sizes (max 5 MB).',
        errors,
      },
      400
    );
  }

  const stats = await getLandlordRoomPhotoStats(db, roomId);
  const uploadResults = await uploadFilesToUploadThing(c.env, validFiles, {
    landlordId: user.user_id,
    propertyId: Number(room.property_id),
    roomId,
    route: 'landlord-room-photos',
  });
  const uploaded: Array<{
    id: number;
    photo_url: string;
    is_cover: boolean;
    display_order: number;
  }> = [];

  for (const [index, result] of uploadResults.entries()) {
    const photoUrl = result.data?.ufsUrl ?? result.data?.url ?? result.data?.appUrl ?? null;

    if (!photoUrl) {
      errors.push(
        `File ${validFiles[index]?.name ?? 'photo'}: ${result.error?.message ?? 'failed to upload'}`
      );
      continue;
    }

    const displayOrder = stats.maxOrder + 1 + uploaded.length;
    const isCover = stats.photoCount === 0 && uploaded.length === 0 ? 1 : 0;
    const photoId = await createLandlordRoomPhoto(db, roomId, photoUrl, isCover, displayOrder);
    uploaded.push({
      id: photoId,
      photo_url: photoUrl,
      is_cover: Boolean(isCover),
      display_order: displayOrder,
    });
  }

  if (uploaded.length === 0) {
    return jsonResponse(
      {
        error: 'No photos were saved. Check file types (jpg/png/webp) and sizes (max 5 MB).',
        errors,
      },
      400
    );
  }

  return jsonResponse(
    {
      success: true,
      message: `${uploaded.length} photo(s) uploaded successfully`,
      data: {
        photos: uploaded,
        errors,
      },
    },
    201
  );
}

async function handleSetRoomPhotoCover(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const roomId = parsePositiveInt(c.req.param('id'));

  if (!roomId) {
    return errorResponse(400, 'Invalid room ID in URL');
  }

  const room = await findLandlordManagedRoomIdentity(db, roomId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  const body = await readJsonObject(c.req.raw);
  const photoId = positiveIntValue(body.photo_id);

  if (!photoId) {
    return errorResponse(400, 'photo_id is required');
  }

  const photo = await findLandlordRoomPhoto(db, roomId, photoId);

  if (!photo) {
    return errorResponse(404, 'Photo not found');
  }

  await clearLandlordRoomCover(db, roomId);
  await setLandlordRoomPhotoCover(db, photoId);

  return jsonResponse({
    success: true,
    message: 'Cover photo updated',
  });
}

async function handleDeleteRoomPhoto(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const roomId = parsePositiveInt(c.req.param('id'));

  if (!roomId) {
    return errorResponse(400, 'Invalid room ID in URL');
  }

  const room = await findLandlordManagedRoomIdentity(db, roomId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  const body = await readJsonObject(c.req.raw);
  const photoId = positiveIntValue(body.photo_id);

  if (!photoId) {
    return errorResponse(400, 'photo_id is required');
  }

  const photo = await findLandlordRoomPhoto(db, roomId, photoId);

  if (!photo) {
    return errorResponse(404, 'Photo not found');
  }

  await deleteLandlordRoomPhoto(db, photoId);

  if (photo.is_cover) {
    const nextPhoto = await findNextLandlordRoomPhoto(db, roomId);

    if (nextPhoto) {
      await setLandlordRoomPhotoCover(db, nextPhoto.id);
    }
  }

  try {
    await deleteUploadThingFileByUrl(c.env, photo.photo_url);
  } catch (error) {
    console.warn('Failed to delete UploadThing room photo', error);
  }

  return jsonResponse({
    success: true,
    message: 'Photo deleted',
  });
}

const roomsRoutes = new Hono<{ Bindings: Env }>();

roomsRoutes.get('/rooms', handleListLandlordRooms);
roomsRoutes.post('/rooms', handleCreateLandlordRoom);
roomsRoutes.post('/rooms/:id/photos', handleUploadRoomPhotos);
roomsRoutes.patch('/rooms/:id/photos', handleSetRoomPhotoCover);
roomsRoutes.delete('/rooms/:id/photos', handleDeleteRoomPhoto);
roomsRoutes.put('/rooms', handleUpdateLandlordRoom);
roomsRoutes.delete('/rooms', handleDeleteLandlordRoom);

export default roomsRoutes;
