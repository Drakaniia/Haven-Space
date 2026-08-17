import { describe, expect, it } from 'bun:test';

import app from '../src/index';
import type { Env, UploadThingUploadFiles } from '../src/env';

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

function createEnv(
  responses: D1Response[] = [],
  capturedBinds: unknown[][] = [],
  uploadFiles: UploadThingUploadFiles = async files =>
    files.map(file => ({
      data: {
        key: `key-${file.name}`,
        name: file.name,
        size: file.size,
        ufsUrl: `https://utfs.io/f/key-${file.name}`,
      },
      error: null,
    }))
): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    JWT_SECRET: 'test-secret',
    UPLOADTHING_TOKEN: 'test-token',
    DB: createSequenceDb(responses, capturedBinds),
    UPLOADTHING_UPLOAD_FILES: uploadFiles,
  };
}

function formDataWithPhoto(fieldName: string, fileName: string, type = 'image/jpeg'): FormData {
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

describe('landlord listing photo routes', () => {
  it('uploads temporary property photos through UploadThing', async () => {
    const capturedBinds: unknown[][] = [];
    const uploaded: { names: string[]; metadata?: Record<string, unknown> }[] = [];
    const response = await app.request(
      'http://localhost/api/landlord/upload-photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithPhoto('photos[]', 'temp-front.webp', 'image/webp'),
      },
      createEnv([{ first: landlordUser }], capturedBinds, async (files, metadata) => {
        uploaded.push({ names: files.map(file => file.name), metadata });

        return [
          {
            data: {
              key: 'temp-front-key',
              name: 'temp-front.webp',
              size: 11,
              ufsUrl: 'https://utfs.io/f/temp-front-key',
            },
            error: null,
          },
        ];
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Photos uploaded successfully',
      data: { urls: ['https://utfs.io/f/temp-front-key'] },
    });
    expect(uploaded).toEqual([
      {
        names: ['temp-front.webp'],
        metadata: {
          landlordId: 3,
          route: 'landlord-temporary-property-photos',
        },
      },
    ]);
    expect(capturedBinds).toEqual([[3]]);
  });

  it('returns temporary property photo upload validation errors', async () => {
    const noPhotos = await app.request(
      'http://localhost/api/landlord/upload-photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: new FormData(),
      },
      createEnv([{ first: landlordUser }])
    );

    expect(noPhotos.status).toBe(400);
    expect(await noPhotos.json()).toEqual({ error: 'No photos provided' });

    const invalidType = await app.request(
      'http://localhost/api/landlord/upload-photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithPhoto('photos[]', 'notes.txt', 'text/plain'),
      },
      createEnv([{ first: landlordUser }])
    );

    expect(invalidType.status).toBe(400);
    expect(await invalidType.json()).toEqual({ error: 'Failed to upload photos' });
  });

  it('uploads property photos through UploadThing and records returned URLs', async () => {
    const capturedBinds: unknown[][] = [];
    const uploaded: { names: string[]; metadata?: Record<string, unknown> }[] = [];
    const response = await app.request(
      'http://localhost/api/landlord/listings/10/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithPhoto('propertyPhotos[]', 'front.JPG'),
      },
      createEnv(
        [
          { first: landlordUser },
          { first: { id: 10, title: 'Pine House' } },
          { first: { max_order: -1 } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds,
        async (files, metadata) => {
          uploaded.push({ names: files.map(file => file.name), metadata });

          return [
            {
              data: {
                key: 'uploadthing-key-front',
                name: 'front.JPG',
                size: 11,
                ufsUrl: 'https://utfs.io/f/uploadthing-key-front',
              },
              error: null,
            },
          ];
        }
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Photos uploaded successfully',
      data: { urls: ['https://utfs.io/f/uploadthing-key-front'] },
    });
    expect(uploaded).toEqual([
      {
        names: ['front.JPG'],
        metadata: {
          landlordId: 3,
          propertyId: 10,
          route: 'landlord-listing-photos',
        },
      },
    ]);
    expect(capturedBinds).toEqual([
      [3],
      [10, 3, 3],
      [10],
      [10, 'https://utfs.io/f/uploadthing-key-front', 1, 0],
    ]);
  });

  it('appends uploaded property photos after existing display order', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/listings/10/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithPhoto('propertyPhotos', 'side.png', 'image/png'),
      },
      createEnv(
        [
          { first: landlordUser },
          { first: { id: 10, title: 'Pine House' } },
          { first: { max_order: 2 } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(capturedBinds).toEqual([
      [3],
      [10, 3, 3],
      [10],
      [10, 'https://utfs.io/f/key-side.png', 0, 3],
    ]);
  });

  it('returns PHP-compatible upload validation errors', async () => {
    const noPhotos = await app.request(
      'http://localhost/api/landlord/listings/10/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: new FormData(),
      },
      createEnv([{ first: landlordUser }, { first: { id: 10, title: 'Pine House' } }])
    );

    expect(noPhotos.status).toBe(400);
    expect(await noPhotos.json()).toEqual({ error: 'No photos provided' });

    const invalidType = await app.request(
      'http://localhost/api/landlord/listings/10/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithPhoto('propertyPhotos[]', 'notes.txt', 'text/plain'),
      },
      createEnv([
        { first: landlordUser },
        { first: { id: 10, title: 'Pine House' } },
        { first: { max_order: -1 } },
      ])
    );

    expect(invalidType.status).toBe(400);
    expect(await invalidType.json()).toEqual({
      error: 'Failed to upload photos. Check file types and sizes (max 5 MB, jpg/png/webp/gif).',
    });
  });

  it('returns UploadThing failures without recording photo rows', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/listings/10/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithPhoto('propertyPhotos[]', 'front.jpg'),
      },
      createEnv(
        [
          { first: landlordUser },
          { first: { id: 10, title: 'Pine House' } },
          { first: { max_order: -1 } },
        ],
        capturedBinds,
        async () => [{ data: null, error: { message: 'UploadThing rejected the upload' } }]
      )
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'UploadThing rejected the upload' });
    expect(capturedBinds).toEqual([[3], [10, 3, 3], [10]]);
  });

  it('requires landlord ownership for property photo uploads', async () => {
    const boarderResponse = await app.request(
      'http://localhost/api/landlord/listings/10/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '7' },
        body: formDataWithPhoto('propertyPhotos[]', 'front.jpg'),
      },
      createEnv([{ first: boarderUser }])
    );

    expect(boarderResponse.status).toBe(403);
    expect(await boarderResponse.json()).toEqual({
      error: 'Forbidden: You do not have permission to access this resource',
    });

    const missingProperty = await app.request(
      'http://localhost/api/landlord/listings/404/photos',
      {
        method: 'POST',
        headers: { 'X-User-ID': '3' },
        body: formDataWithPhoto('propertyPhotos[]', 'front.jpg'),
      },
      createEnv([{ first: landlordUser }, { first: null }])
    );

    expect(missingProperty.status).toBe(403);
    expect(await missingProperty.json()).toEqual({
      error: 'Property not found or access denied',
    });
  });
});
