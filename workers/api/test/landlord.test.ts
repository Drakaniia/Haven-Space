import { describe, expect, it } from 'bun:test';

import app from '../src/index';
import type { Env } from '../src/env';
import type {
  LandlordAmenityRow,
  LandlordPhotoRow,
  LandlordPropertyDetailRow,
  LandlordPropertyListRow,
  LandlordPropertyUpdateRow,
} from '../src/repositories/landlord-properties';

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

function createSequenceEnv(responses: D1Response[], capturedBinds: unknown[][] = []): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    JWT_SECRET: 'test-secret',
    DB: createSequenceDb(responses, capturedBinds),
  };
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

const propertyRow: LandlordPropertyListRow = {
  id: 10,
  title: 'Pine House',
  description: 'Near campus',
  address: '123 Mabini St',
  city: 'Manila',
  province: 'Metro Manila',
  latitude: 14.5995,
  longitude: 120.9842,
  price: 4500,
  status: 'available',
  listing_moderation_status: 'published',
  role: 'owner',
  created_at: '2026-05-01 10:00:00',
  rooms_count: 2,
  occupied_rooms: 1,
  monthly_revenue: 5000,
  property_type: 'Apartment',
  pending_applications: 3,
};

const detailRow: LandlordPropertyDetailRow = {
  id: 10,
  title: 'Pine House',
  description: 'Near campus',
  property_type: 'boarding-house',
  gender_preference: 'any',
  address: '123 Mabini St',
  latitude: 14.5995,
  longitude: 120.9842,
  city: 'Manila',
  province: 'Metro Manila',
  price: 4500,
  deposit: 1000,
  advance: '1 month',
  min_stay: '6 months',
  property_rules: 'No smoking',
  status: 'available',
  listing_moderation_status: 'published',
  role: 'owner',
  created_at: '2026-05-01 10:00:00',
  rooms_count: 2,
  occupied_rooms: 1,
};

const updateRow: LandlordPropertyUpdateRow = {
  id: 10,
  address_id: 100,
  title: 'Pine House',
  description: 'Near campus',
  price: 4500,
  deposit: 1000,
  advance: '1 month',
  min_stay: '6 months',
  property_rules: 'No smoking',
  property_type: 'boarding-house',
  gender_preference: 'any',
};

const amenities: LandlordAmenityRow[] = [
  { property_id: 10, amenity_name: 'WiFi' },
  { property_id: 10, amenity_name: 'Laundry' },
];

const photos: LandlordPhotoRow[] = [
  { property_id: 10, photo_url: 'cover.jpg', is_cover: 1 },
  { property_id: 10, photo_url: '/uploads/side.jpg', is_cover: 0 },
];

const createListingPayload = {
  propertyName: 'Pine House',
  propertyType: 'apartment',
  genderPreference: 'any',
  propertyDescription: 'Near campus',
  propertyPrice: 4500,
  propertyDeposit: 1000,
  propertyAdvance: '1 month',
  propertyRooms: 2,
  propertyCapacity: 2,
  propertyAddress: '123 Mabini St',
  propertyCity: 'Manila',
  propertyProvince: 'Metro Manila',
  propertyLatitude: '14.5995',
  propertyLongitude: '120.9842',
  propertyRules: 'No smoking',
  amenities: ['WiFi', 'Laundry'],
  rooms: [
    { name: 'Room A', capacity: 1, roomType: 'single' },
    { name: 'Room B', capacity: 2, roomType: '' },
  ],
};

describe('landlord property routes', () => {
  it('creates a landlord listing with rooms and amenities', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/listings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify(createListingPayload),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { run: { success: true, meta: { last_row_id: 100, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 10, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 201, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 202, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      message: 'Listing created successfully',
      data: {
        id: 10,
        title: 'Pine House',
        status: 'available',
        room_ids: [201, 202],
      },
    });
    expect(capturedBinds).toEqual([
      [3],
      ['123 Mabini St', 'Manila', 'Metro Manila', 14.5995, 120.9842],
      [
        3,
        'Pine House',
        'apartment',
        'Near campus',
        100,
        4500,
        1000,
        '1 month',
        '1 month',
        '[]',
        'any',
        'No smoking',
      ],
      [10, 3, 'Room A', 4500, '', 1000, 'Room A', 'single', 1],
      [10, 3, 'Room B', 4500, '', 1000, 'Room B', 'shared', 2],
      [10, 'WiFi'],
      [10, 'Laundry'],
    ]);
  });

  it('creates a property through the PHP properties alias', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/properties',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          propertyName: 'Draft Pine House',
          propertyDescription: 'Published from draft',
          propertyAddress: '789 Luna St',
          propertyCity: 'Cebu City',
          propertyProvince: 'Cebu',
          propertyLatitude: '10.3157',
          propertyLongitude: '123.8854',
          propertyPrice: '6200',
          propertyStatus: 'available',
          amenities: ['WiFi', 'Study Area'],
        }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { run: { success: true, meta: { last_row_id: 120, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 20, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        property_id: 20,
        message: 'Property created successfully',
      },
    });
    expect(capturedBinds).toEqual([
      [3],
      ['789 Luna St', 'Cebu City', 'Cebu', 10.3157, 123.8854],
      [3, 'Draft Pine House', 'Published from draft', 120, 6200, 'available'],
      [20, 'WiFi'],
      [20, 'Study Area'],
    ]);
  });

  it('creates fallback rooms when custom room data is absent', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/listings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ ...createListingPayload, rooms: [] }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { run: { success: true, meta: { last_row_id: 100, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 10, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 201, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 202, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      message: 'Listing created successfully',
      data: {
        id: 10,
        title: 'Pine House',
        status: 'available',
        room_ids: [201, 202],
      },
    });
    expect(capturedBinds[3]).toEqual([
      10,
      3,
      'Shared Room (2 persons) - Room 1',
      4500,
      '',
      1000,
      'Room 1',
      'shared',
      2,
    ]);
    expect(capturedBinds[4]).toEqual([
      10,
      3,
      'Shared Room (2 persons) - Room 2',
      4500,
      '',
      1000,
      'Room 2',
      'shared',
      2,
    ]);
  });

  it('returns PHP-compatible listing validation errors', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/listings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ ...createListingPayload, propertyName: '' }),
      },
      createSequenceEnv([{ first: landlordUser }])
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        propertyName: 'Name is required',
      },
    });
  });

  it('returns PHP-compatible properties create validation errors', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/properties',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({ propertyName: 'Missing address' }),
      },
      createSequenceEnv([{ first: landlordUser }])
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Missing required fields: propertyName, propertyAddress, propertyPrice',
    });
  });

  it('requires a landlord role for listing creation', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/listings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify(createListingPayload),
      },
      createSequenceEnv([{ first: boarderUser }])
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Forbidden: You do not have permission to access this resource',
    });
  });

  it('updates a landlord listing with address, amenities, and room expansion', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/listings/10',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          name: 'Updated Pine House',
          type: 'apartment',
          gender_preference: 'female',
          description: 'Updated description',
          status: 'inactive',
          address: '456 Rizal Ave',
          city: 'Quezon City',
          province: 'Metro Manila',
          latitude: '14.6',
          longitude: '121.0',
          rules: 'Quiet hours after 10 PM',
          amenities: ['WiFi', 'Kitchen'],
          monthlyPayment: '5200',
          monthlyDeposit: '1500',
          advancePayment: '2 months',
          min_stay: '3-months',
          total_rooms: 3,
          capacity: 2,
        }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: updateRow },
          {
            first: {
              address_line_1: '123 Mabini St',
              city: 'Manila',
              province: 'Metro Manila',
              latitude: 14.5995,
              longitude: 120.9842,
            },
          },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 2 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { first: { count: 1 } },
          { run: { success: true, meta: { last_row_id: 202, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 203, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 3 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Listing updated successfully',
      data: { id: 10 },
    });
    expect(capturedBinds).toEqual([
      [3],
      [10, 3, 3],
      [100],
      ['456 Rizal Ave', 'Quezon City', 'Metro Manila', 14.6, 121, 100],
      [
        'Updated Pine House',
        'Updated description',
        5200,
        1500,
        '2 months',
        '3 months',
        'Quiet hours after 10 PM',
        'apartment',
        'female',
        'hidden',
        10,
        3,
        3,
      ],
      [10],
      [10, 'WiFi'],
      [10, 'Kitchen'],
      [10],
      [10, 3, 'Shared Room (2 persons) - Room 2', 5200, '', 1000, 'Room 2', 'shared', 2],
      [10, 3, 'Shared Room (2 persons) - Room 3', 5200, '', 1000, 'Room 3', 'shared', 2],
      [2, 'shared', 5200, 10],
    ]);
  });

  it('shrinks landlord listing rooms when the requested room count is lower', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/listings/10',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          id: 10,
          total_rooms: 1,
          capacity: 1,
        }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: { ...updateRow, address_id: null } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { first: { count: 3 } },
          { all: [{ id: 33 }, { id: 32 }] },
          { run: { success: true, meta: { last_row_id: 0, changes: 2 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Listing updated successfully',
      data: { id: 10 },
    });
    expect(capturedBinds).toEqual([
      [3],
      [10, 3, 3],
      [
        'Pine House',
        'Near campus',
        4500,
        1000,
        '1 month',
        '6 months',
        'No smoking',
        'boarding-house',
        'any',
        'available',
        10,
        3,
        3,
      ],
      [10],
      [10, 2],
      [33, 32],
      [1, 'single', 4500, 10],
    ]);
  });

  it('updates listing photo order, inserts new photo URLs, and deletes removed photos', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/listings/10',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({
          photos: ['https://utfs.io/f/existing-cover-key', 'https://utfs.io/f/new-side-key'],
          photos_to_delete: ['https://utfs.io/f/removed-key'],
        }),
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: updateRow },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { all: [{ photo_url: 'https://utfs.io/f/existing-cover-key' }] },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Listing updated successfully',
      data: { id: 10 },
    });
    expect(capturedBinds).toEqual([
      [3],
      [10, 3, 3],
      [
        'Pine House',
        'Near campus',
        4500,
        1000,
        '1 month',
        '6 months',
        'No smoking',
        'boarding-house',
        'any',
        'available',
        10,
        3,
        3,
      ],
      [10, 'https://utfs.io/f/removed-key'],
      [10],
      [0, 1, 10, 'https://utfs.io/f/existing-cover-key'],
      [10, 'https://utfs.io/f/new-side-key', 0, 1],
    ]);
  });

  it('returns PHP-compatible update errors for missing or inaccessible listings', async () => {
    const missingIdResponse = await app.request(
      'http://localhost/api/landlord/listings/not-a-number',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({}),
      },
      createSequenceEnv([{ first: landlordUser }])
    );

    expect(missingIdResponse.status).toBe(400);
    expect(await missingIdResponse.json()).toEqual({ error: 'Property ID is required' });

    const capturedBinds: unknown[][] = [];
    const inaccessibleResponse = await app.request(
      'http://localhost/api/landlord/listings/404',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '3',
        },
        body: JSON.stringify({}),
      },
      createSequenceEnv([{ first: landlordUser }, { first: null }], capturedBinds)
    );

    expect(inaccessibleResponse.status).toBe(403);
    expect(await inaccessibleResponse.json()).toEqual({
      error: 'Property not found or access denied',
    });
    expect(capturedBinds).toEqual([[3], [404, 3, 3]]);
  });

  it('requires a landlord role for listing updates', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/listings/10',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '7',
        },
        body: JSON.stringify({ id: 10 }),
      },
      createSequenceEnv([{ first: boarderUser }])
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Forbidden: You do not have permission to access this resource',
    });
  });

  it('returns landlord properties with the PHP response shape and  alias', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/properties',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv(
        [{ first: landlordUser }, { all: [propertyRow] }, { all: amenities }, { all: photos }],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        properties: [
          {
            id: 10,
            name: 'Pine House',
            type: 'apartment',
            description: 'Near campus',
            address: '123 Mabini St',
            latitude: 14.5995,
            longitude: 120.9842,
            city: 'Manila',
            province: 'Metro Manila',
            price: 4500,
            status: 'active',
            role: 'owner',
            total_rooms: 2,
            occupied_rooms: 1,
            monthly_revenue: 5000,
            created_at: '2026-05-01 10:00:00',
            amenities: ['WiFi', 'Laundry'],
            photos: ['/storage/properties/10/cover.jpg', '/uploads/side.jpg'],
            pending_applications: 3,
          },
        ],
        total_count: 1,
      },
    });
    expect(capturedBinds).toEqual([[3], [3, 3, 3], [10], [10]]);
  });

  it('returns an empty landlord property list from the non-php route', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/properties',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv([{ first: landlordUser }, { all: [] }])
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        properties: [],
        total_count: 0,
      },
    });
  });

  it('returns single landlord property detail with amenities and photos', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/properties?id=10',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: detailRow },
          { all: amenities },
          { all: photos },
          { all: [] },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        id: 10,
        name: 'Pine House',
        type: 'boarding-house',
        gender_preference: 'any',
        description: 'Near campus',
        address: '123 Mabini St',
        latitude: 14.5995,
        longitude: 120.9842,
        city: 'Manila',
        province: 'Metro Manila',
        price: 4500,
        deposit: 1000,
        capacity: '',
        min_stay: '6 months',
        availability: 'available-now',
        status: 'active',
        role: 'owner',
        total_rooms: 2,
        rooms: 2,
        occupied_rooms: 1,
        created_at: '2026-05-01 10:00:00',
        amenities: ['WiFi', 'Laundry'],
        photos: ['/storage/properties/10/cover.jpg', '/uploads/side.jpg'],
        rules: 'No smoking',
        monthlyPayment: 4500,
        monthlyDeposit: 1000,
        advancePayment: '1 month',
        authorized_landlords: [],
      },
    });
    expect(capturedBinds).toEqual([[3], [3, 10, 3, 3], [10], [10], [10]]);
  });

  it('returns PHP-compatible landlord property not found behavior', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/properties?id=404',
      { headers: { 'X-User-ID': '3' } },
      createSequenceEnv([{ first: landlordUser }, { first: null }])
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Property not found' });
  });

  it('soft deletes a landlord property and its rooms with the PHP response shape', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/properties?id=10',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '3' },
      },
      createSequenceEnv(
        [
          { first: landlordUser },
          { first: { id: 10, title: 'Pine House' } },
          { run: { success: true, meta: { last_row_id: 0, changes: 1 }, results: [] } },
          { run: { success: true, meta: { last_row_id: 0, changes: 2 }, results: [] } },
        ],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Property deleted successfully',
      data: {
        property_id: 10,
        property_name: 'Pine House',
      },
    });
    expect(capturedBinds).toEqual([[3], [10, 3], [10, 3], [10]]);
  });

  it('requires a property ID for landlord property deletion', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/properties',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '3' },
      },
      createSequenceEnv([{ first: landlordUser }], capturedBinds)
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Property ID is required' });
    expect(capturedBinds).toEqual([[3]]);
  });

  it('returns PHP-compatible delete not found or access denied behavior', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/landlord/properties?id=404',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '3' },
      },
      createSequenceEnv([{ first: landlordUser }, { first: null }], capturedBinds)
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Property not found or access denied' });
    expect(capturedBinds).toEqual([[3], [404, 3]]);
  });

  it('requires a landlord role for landlord property deletion', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/properties?id=10',
      {
        method: 'DELETE',
        headers: { 'X-User-ID': '7' },
      },
      createSequenceEnv([{ first: boarderUser }])
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Forbidden: You do not have permission to access this resource',
    });
  });

  it('requires a landlord role for landlord properties', async () => {
    const response = await app.request(
      'http://localhost/api/landlord/properties',
      { headers: { 'X-User-ID': '7' } },
      createSequenceEnv([{ first: boarderUser }])
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Forbidden: You do not have permission to access this resource',
    });
  });
});
