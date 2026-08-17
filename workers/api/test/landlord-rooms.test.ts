import { describe, expect, it } from 'bun:test';

import app from '../src/index';
import type { Env, UploadThingDeleteFiles, UploadThingUploadFiles } from '../src/env';
import type {
  LandlordRoomPhotoRow,
  LandlordRoomPropertyRow,
  LandlordRoomRow,
} from '../src/repositories/landlord-rooms';

interface D1Response {
  first?: unknown;
  all?: unknown[];
  run?: unknown;
}

function createSequenceDb(responses: D1Response[], capturedBinds: unknown[][] = []): D1Database {
  const responseQueue = [...responses];

  return {
    prepare: () =>
      ({
        bind: (...values: unknown[]) => {
          capturedBinds.push(values);
          const response = responseQueue.shift() ?? {};

          return {
            first: async () => response.first ?? null,
            all: async () => ({ results: response.all ?? [] }),
            run: async () =>
              response.run ?? {
                success: true,
                meta: { last_row_id: 0, changes: 0 },
                results: [],
              },
          };
        },
      } as unknown as D1PreparedStatement),
  } as unknown as D1Database;
}

function createSequenceEnv(
  responses: D1Response[],
  capturedBinds: unknown[][] = [],
  uploadFiles?: UploadThingUploadFiles,
  deleteFiles?: UploadThingDeleteFiles
): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    JWT_SECRET: 'test-secret',
    UPLOADTHING_TOKEN: 'test-token',
    DB: createSequenceDb(responses, capturedBinds),
    UPLOADTHING_DELETE_FILES: deleteFiles ?? (async () => {}),
    UPLOADTHING_UPLOAD_FILES:
      uploadFiles ??
      (async files =>
        files.map(file => ({
          data: {
            key: `key-${file.name}`,
            name: file.name,
            size: file.size,
            ufsUrl: `https://utfs.io/f/key-${file.name}`,
          },
          error: null,
        }))),
  };
}

function formDataWithRoomPhoto(fieldName: string, fileName: string, type = 'image/jpeg'): FormData {
  const formData = new FormData();
  formData.append(fieldName, new File(['photo-bytes'], fileName, { type }));

  return formData;
}

const landlordUser = {
  id: 3,
  role: 'landlord',
  is_verified: 1,
  email_verified: 1,
  account_status: 'active',
};

const boarderUser = {
  id: 7,
  role: 'boarder',
  is_verified: 1,
  email_verified: 1,
  account_status: 'active',
};

const propertyRow: LandlordRoomPropertyRow = {
  id: 10,
  title: 'Pine House',
  status: 'available',
};

const roomA: LandlordRoomRow = {
  id: 11,
  property_id: 10,
  landlord_id: 3,
  title: 'Room A',
  room_number: 'A1',
  room_type: 'single',
  description: 'Sunny room',
  price: 4500,
  deposit: 500,
  status: 'available',
  capacity: 1,
  size: 12.5,
  created_at: '2026-05-01 10:00:00',
  updated_at: '2026-05-02 10:00:00',
};

const roomB: LandlordRoomRow = {
  id: 12,
  property_id: 10,
  landlord_id: 3,
  title: 'Room B',
  room_number: 'B1',
  room_type: 'shared',
  description: null,
  price: 5000,
  deposit: 0,
  status: 'occupied',
  capacity: 2,
  size: null,
  created_at: '2026-05-03 10:00:00',
  updated_at: '2026-05-04 10:00:00',
};

const roomPhotos: LandlordRoomPhotoRow[] = [
  { id: 101, room_id: 11, photo_url: '/storage/rooms/11/cover.jpg', is_cover: 1, display_order: 0 },
  { id: 102, room_id: 11, photo_url: '/storage/rooms/11/side.jpg', is_cover: 0, display_order: 1 },
];

describe('landlord room routes', () => {
  it('returns landlord rooms with the PHP response shape and  alias', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/rooms?propertyId=10',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: propertyRow },
          { all: [roomA, roomB] },
          { all: roomPhotos },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        property: {
          id: 10,
          name: 'Pine House',
          status: 'available',
          total_rooms: 2,
          occupied_rooms: 1,
        },
        rooms: [
          {
            id: 11,
            property_id: 10,
            room_number: 'A1',
            room_type: 'single',
            description: 'Sunny room',
            price: 4500,
            deposit: 500,
            status: 'available',
            capacity: 1,
            size: 12.5,
            cover_photo: '/storage/rooms/11/cover.jpg',
            photos: [
              {
                id: 101,
                photo_url: '/storage/rooms/11/cover.jpg',
                is_cover: true,
                display_order: 0,
              },
              {
                id: 102,
                photo_url: '/storage/rooms/11/side.jpg',
                is_cover: false,
                display_order: 1,
              },
            ],
            tenant: null,
            created_at: '2026-05-01 10:00:00',
            updated_at: '2026-05-02 10:00:00',
          },
          {
            id: 12,
            property_id: 10,
            room_number: 'B1',
            room_type: 'shared',
            description: null,
            price: 5000,
            deposit: 0,
            status: 'occupied',
            capacity: 2,
            size: null,
            cover_photo: null,
            photos: [],
            tenant: null,
            created_at: '2026-05-03 10:00:00',
            updated_at: '2026-05-04 10:00:00',
          },
        ],
      },
    });
    expect(capturedBinds).toEqual([[3], [10, 3, 3], [10], [11, 12]]);
  });

  it('returns a single landlord room', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/rooms?propertyId=10&id=11',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv(
        [{ first: landlordUser }, { first: propertyRow }, { first: roomA }, { all: roomPhotos }],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        id: 11,
        property_id: 10,
        room_number: 'A1',
        room_type: 'single',
        description: 'Sunny room',
        price: 4500,
        deposit: 500,
        status: 'available',
        capacity: 1,
        size: 12.5,
        cover_photo: '/storage/rooms/11/cover.jpg',
        photos: [
          {
            id: 101,
            photo_url: '/storage/rooms/11/cover.jpg',
            is_cover: true,
            display_order: 0,
          },
          {
            id: 102,
            photo_url: '/storage/rooms/11/side.jpg',
            is_cover: false,
            display_order: 1,
          },
        ],
        tenant: null,
        created_at: '2026-05-01 10:00:00',
        updated_at: '2026-05-02 10:00:00',
      },
    });
    expect(capturedBinds).toEqual([[3], [10, 3, 3], [11, 10], [11]]);
  });

  it('creates a landlord room with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/rooms',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          property_id: 10,
          room_number: 'A3',
          room_type: 'single',
          price: '4700',
          deposit: '700',
          status: 'available',
          capacity: 1,
          description: 'New room',
          size: '13.5',
        }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: propertyRow },
          { first: null },
          { run: { success: true, meta: { last_row_id: 13, changes: 1 }, results: [] } },
          {
            first: {
              ...roomA,
              id: 13,
              room_number: 'A3',
              title: 'A3',
              price: 4700,
              deposit: 700,
              description: 'New room',
              size: 13.5,
            },
          },
          { all: [] },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Room created successfully',
      data: {
        id: 13,
        property_id: 10,
        room_number: 'A3',
        room_type: 'single',
        description: 'New room',
        price: 4700,
        deposit: 700,
        status: 'available',
        capacity: 1,
        size: 13.5,
        cover_photo: null,
        photos: [],
        tenant: null,
        created_at: '2026-05-01 10:00:00',
        updated_at: '2026-05-02 10:00:00',
      },
    });
    expect(capturedBinds).toEqual([
      [3],
      [10, 3, 3],
      [10, 'A3'],
      [10, 3, 'A3', 'A3', 'single', 4700, 700, 'available', 1, 'New room', 13.5],
      [13],
      [13],
    ]);
  });

  it('returns PHP-compatible room create validation and duplicate errors', async () => {
    const missingResponse = await app.request(
      'http://localhost/api/landlord/rooms',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ property_id: 10, price: 4500 }),
      },
      createSequenceEnv([{ first: landlordUser }, { first: propertyRow }])
    );

    expect(missingResponse.status).toBe(400);
    expect(await missingResponse.json()).toEqual({ error: 'room_number is required' });

    const duplicateResponse = await app.request(
      'http://localhost/api/landlord/rooms',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ property_id: 10, room_number: 'A1', price: 4500 }),
      },
      createSequenceEnv([{ first: landlordUser }, { first: propertyRow }, { first: { id: 11 } }])
    );

    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toEqual({
      error: 'A room with this number already exists in this property',
    });
  });

  it('updates a landlord room status and fields', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/rooms?id=11',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ status: 'maintenance', price: '4800' }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: { id: 11, property_id: 10, room_number: 'A1' } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { first: { ...roomA, status: 'maintenance', price: 4800 } },
          { all: [] },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Room updated successfully',
      data: {
        id: 11,
        property_id: 10,
        room_number: 'A1',
        room_type: 'single',
        description: 'Sunny room',
        price: 4800,
        deposit: 500,
        status: 'maintenance',
        capacity: 1,
        size: 12.5,
        cover_photo: null,
        photos: [],
        tenant: null,
        created_at: '2026-05-01 10:00:00',
        updated_at: '2026-05-02 10:00:00',
      },
    });
    expect(capturedBinds).toEqual([[3], [11, 3, 3], [4800, 'maintenance', 11], [11], [11]]);
  });

  it('returns PHP-compatible room update errors', async () => {
    const missingResponse = await app.request(
      'http://localhost/api/landlord/rooms',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ status: 'maintenance' }),
      },
      createSequenceEnv([{ first: landlordUser }])
    );

    expect(missingResponse.status).toBe(400);
    expect(await missingResponse.json()).toEqual({ error: 'Room id is required' });

    const duplicateResponse = await app.request(
      'http://localhost/api/landlord/rooms?id=11',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ room_number: 'B1' }),
      },
      createSequenceEnv([
        { first: landlordUser },
        { first: { id: 11, property_id: 10, room_number: 'A1' } },
        { first: { id: 12 } },
      ])
    );

    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toEqual({
      error: 'A room with this number already exists in this property',
    });
  });

  it('soft deletes a landlord room', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/rooms?id=11',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '3' },
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: { id: 11, property_id: 10, room_number: 'A1' } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Room deleted successfully',
    });
    expect(capturedBinds).toEqual([[3], [11, 3, 3], [11]]);
  });

  it('uploads room photos through UploadThing and records returned URLs', async () => {
    const capturedBinds: unknown[][] = [];
    const uploaded: { names: string[]; metadata?: Record<string, unknown> }[] = [];
    const response = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithRoomPhoto('roomPhotos[]', 'front.jpg'),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: { id: 11, property_id: 10, room_number: 'A1' } },
          { first: { photo_count: 0, max_order: -1 } },
          { run: { success: true, meta: { last_row_id: 201, changes: 1 }, results: [] } },
        ],
        capturedBinds,
        async (files, metadata) => {
          uploaded.push({ names: files.map(file => file.name), metadata });

          return [
            {
              data: {
                key: 'room-front-key',
                name: 'front.jpg',
                size: 11,
                ufsUrl: 'https://utfs.io/f/room-front-key',
              },
              error: null,
            },
          ];
        }
      )
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      message: '1 photo(s) uploaded successfully',
      data: {
        photos: [
          {
            id: 201,
            photo_url: 'https://utfs.io/f/room-front-key',
            is_cover: true,
            display_order: 0,
          },
        ],
        errors: [],
      },
    });
    expect(uploaded).toEqual([
      {
        names: ['front.jpg'],
        metadata: {
          landlordId: 3,
          propertyId: 10,
          roomId: 11,
          route: 'landlord-room-photos',
        },
      },
    ]);
    expect(capturedBinds).toEqual([
      [3],
      [11, 3, 3],
      [11],
      [11, 'https://utfs.io/f/room-front-key', 1, 0],
    ]);
  });

  it('appends uploaded room photos after existing display order', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithRoomPhoto('roomPhotos', 'side.png', 'image/png'),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: { id: 11, property_id: 10, room_number: 'A1' } },
          { first: { photo_count: 2, max_order: 2 } },
          { run: { success: true, meta: { last_row_id: 202, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      message: '1 photo(s) uploaded successfully',
      data: {
        photos: [
          {
            id: 202,
            photo_url: 'https://utfs.io/f/key-side.png',
            is_cover: false,
            display_order: 3,
          },
        ],
        errors: [],
      },
    });
    expect(capturedBinds).toEqual([
      [3],
      [11, 3, 3],
      [11],
      [11, 'https://utfs.io/f/key-side.png', 0, 3],
    ]);
  });

  it('returns PHP-compatible room photo validation errors', async () => {
    const noPhotos = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: new FormData(),
      },
      createSequenceEnv([{ first: landlordUser }, { first: { id: 11, property_id: 10 } }])
    );

    expect(noPhotos.status).toBe(400);
    expect(await noPhotos.json()).toEqual({
      error: 'No photos provided (field name: roomPhotos[])',
    });

    const invalidType = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithRoomPhoto('roomPhotos[]', 'notes.gif', 'image/gif'),
      },
      createSequenceEnv([{ first: landlordUser }, { first: { id: 11, property_id: 10 } }])
    );

    expect(invalidType.status).toBe(400);
    expect(await invalidType.json()).toEqual({
      error: 'No photos were saved. Check file types (jpg/png/webp) and sizes (max 5 MB).',
      errors: ['File notes.gif: unsupported type (allowed: jpg, png, webp)'],
    });
  });

  it('returns UploadThing room photo failures without recording rows', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithRoomPhoto('roomPhotos[]', 'front.jpg'),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: { id: 11, property_id: 10, room_number: 'A1' } },
          { first: { photo_count: 0, max_order: -1 } },
        ],
        capturedBinds,
        async () => [{ data: null, error: { message: 'UploadThing rejected the room photo' } }]
      )
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'No photos were saved. Check file types (jpg/png/webp) and sizes (max 5 MB).',
      errors: ['File front.jpg: UploadThing rejected the room photo'],
    });
    expect(capturedBinds).toEqual([[3], [11, 3, 3], [11]]);
  });

  it('requires room ownership for room photo uploads', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/rooms/404/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithRoomPhoto('roomPhotos[]', 'front.jpg'),
      },
      createSequenceEnv([{ first: landlordUser }, { first: null }])
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Room not found or access denied' });
  });

  it('sets a room photo as cover', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ photo_id: 102 }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: { id: 11, property_id: 10, room_number: 'A1' } },
          {
            first: {
              id: 102,
              room_id: 11,
              photo_url: 'https://utfs.io/f/room-side-key',
              is_cover: 0,
              display_order: 1,
            },
          },
          { run: { success: true, meta: { last_row_id: 0, changes: 2 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Cover photo updated',
    });
    expect(capturedBinds).toEqual([[3], [11, 3, 3], [102, 11], [11], [102]]);
  });

  it('returns PHP-compatible room photo cover errors', async () => {
    const missingPhotoId = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({}),
      },
      createSequenceEnv([{ first: landlordUser }, { first: { id: 11, property_id: 10 } }])
    );

    expect(missingPhotoId.status).toBe(400);
    expect(await missingPhotoId.json()).toEqual({ error: 'photo_id is required' });

    const missingPhoto = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ photo_id: 999 }),
      },
      createSequenceEnv([
        { first: landlordUser },
        { first: { id: 11, property_id: 10 } },
        { first: null },
      ])
    );

    expect(missingPhoto.status).toBe(404);
    expect(await missingPhoto.json()).toEqual({ error: 'Photo not found' });
  });

  it('deletes a non-cover room photo and deletes the UploadThing file when possible', async () => {
    const capturedBinds: unknown[][] = [];
    const deletedKeys: string[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ photo_id: 102 }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: { id: 11, property_id: 10, room_number: 'A1' } },
          {
            first: {
              id: 102,
              room_id: 11,
              photo_url: 'https://utfs.io/f/room-side-key',
              is_cover: 0,
              display_order: 1,
            },
          },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds,
        undefined,
        async keys => {
          deletedKeys.push(keys);
        }
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Photo deleted',
    });
    expect(capturedBinds).toEqual([[3], [11, 3, 3], [102, 11], [102]]);
    expect(deletedKeys).toEqual([['room-side-key']]);
  });

  it('promotes the next room photo when deleting the cover photo', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ photo_id: 101 }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: { id: 11, property_id: 10, room_number: 'A1' } },
          {
            first: {
              id: 101,
              room_id: 11,
              photo_url: 'https://utfs.io/f/room-cover-key',
              is_cover: 1,
              display_order: 0,
            },
          },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { first: { id: 102 } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Photo deleted',
    });
    expect(capturedBinds).toEqual([[3], [11, 3, 3], [101, 11], [101], [11], [102]]);
  });

  it('returns PHP-compatible room photo delete errors', async () => {
    const missingPhotoId = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({}),
      },
      createSequenceEnv([{ first: landlordUser }, { first: { id: 11, property_id: 10 } }])
    );

    expect(missingPhotoId.status).toBe(400);
    expect(await missingPhotoId.json()).toEqual({ error: 'photo_id is required' });

    const missingPhoto = await app.request(
      'http://localhost/api/landlord/rooms/11/photos',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ photo_id: 999 }),
      },
      createSequenceEnv([
        { first: landlordUser },
        { first: { id: 11, property_id: 10 } },
        { first: null },
      ])
    );

    expect(missingPhoto.status).toBe(404);
    expect(await missingPhoto.json()).toEqual({ error: 'Photo not found' });
  });

  it('requires a landlord role for landlord room routes', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/rooms?propertyId=10',
      { headers: { 'X-User-ID': '7' } },
      createSequenceEnv([{ first: boarderUser }])
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Forbidden: You do not have permission to access this resource',
    });
  });
});
