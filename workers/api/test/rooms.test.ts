import { describe, expect, it } from 'bun:test';

import app from '../src/index';
import type { Env } from '../src/env';
import type {
  AmenityRow,
  DetailPropertyRow,
  PropertyPhotoRow,
  PublicPropertyRow,
  RoomPhotoRow,
  RoomRow,
} from '../src/repositories/listings';
import type { PopularLocationRow } from '../src/repositories/locations';

function createDb(rows: PopularLocationRow[]): D1Database {
  return {
    prepare: () =>
      ({
        bind: () => ({
          all: async () => ({ results: rows }),
        }),
      } as unknown as D1PreparedStatement),
  } as unknown as D1Database;
}

function createEnv(rows: PopularLocationRow[]): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    DB: createDb(rows),
  };
}

interface D1Response {
  first?: unknown;
  all?: unknown[];
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
          };
        },
      } as unknown as D1PreparedStatement),
  } as unknown as D1Database;
}

function createSequenceEnv(responses: D1Response[], capturedBinds: unknown[][] = []): Env {
  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost',
    DB: createSequenceDb(responses, capturedBinds),
  };
}

describe('room routes', () => {
  it('returns popular locations with the PHP response shape', async () => {
    const response = await app.request(
      'http://localhost/api/rooms/popular-locations?limit=6',
      {},
      createEnv([
        { city: 'City of Manila', province: 'Metro Manila', property_count: 8 },
        { city: 'Cebu City', province: 'Cebu', property_count: 4 },
      ])
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        locations: [
          {
            name: 'Manila, Metro Manila',
            search_value: 'Manila, Metro Manila',
            property_count: 8,
            avg_price: 0,
            min_price: 0,
            max_price: 0,
            price_range: 'Various prices',
          },
          {
            name: 'Cebu City, Cebu',
            search_value: 'Cebu City, Cebu',
            property_count: 4,
            avg_price: 0,
            min_price: 0,
            max_price: 0,
            price_range: 'Various prices',
          },
        ],
      },
    });
  });

  it('caps popular location limit at 20', async () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({
      city: `City ${index + 1}`,
      province: 'Province',
      property_count: 25 - index,
    }));

    const response = await app.request(
      'http://localhost/api/rooms/popular-locations?limit=99',
      {},
      createEnv(rows)
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.locations).toHaveLength(20);
  });

  it('returns public room listings with the PHP response shape', async () => {
    const property: PublicPropertyRow = {
      id: 10,
      title: 'Pine House',
      description: 'Near campus',
      address: '123 Mabini St',
      city: 'Manila',
      province: 'Metro Manila',
      price: 4500,
      latitude: 14.5995,
      longitude: 120.9842,
      listing_moderation_status: 'published',
      created_at: '2020-01-01T00:00:00.000Z',
      landlord_id: 3,
      landlord_first_name: 'Ana',
      landlord_last_name: 'Reyes',
    };
    const amenities: AmenityRow[] = [
      { property_id: 10, amenity_name: 'WiFi' },
      { property_id: 10, amenity_name: 'Laundry' },
    ];
    const photos: PropertyPhotoRow[] = [
      { property_id: 10, photo_url: '/uploads/cover.jpg', is_cover: 1 },
      { property_id: 10, photo_url: '/uploads/side.jpg', is_cover: 0 },
    ];
    const rooms: RoomRow[] = [
      {
        property_id: 10,
        id: 100,
        room_number: 'A1',
        room_type: 'Single',
        capacity: 1,
        status: 'available',
        room_price: 5000,
        title: 'Window room',
      },
      {
        property_id: 10,
        id: 101,
        room_number: 'A2',
        room_type: 'Shared',
        capacity: 2,
        status: 'occupied',
        room_price: 4200,
        title: 'Shared room',
      },
    ];
    const roomPhotos: RoomPhotoRow[] = [{ room_id: 100, photo_url: '/uploads/room-a1.jpg' }];

    const response = await app.request(
      'http://localhost/api/rooms/public?limit=20&offset=0',
      {},
      createSequenceEnv([
        { first: { total_count: 1 } },
        { all: [property] },
        { all: amenities },
        { all: photos },
        { all: rooms },
        { all: roomPhotos },
      ])
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        properties: [
          {
            id: 10,
            title: 'Pine House',
            description: 'Near campus',
            address: '123 Mabini St',
            city: 'Manila',
            province: 'Metro Manila',
            // Spec D10: the headline price is the cheapest room (4200), not the
            // property's own price field (4500).
            price: 4200,
            latitude: 14.5995,
            longitude: 120.9842,
            rating: 4.5,
            reviews: 0,
            roomTypes: 'Available',
            availableRooms: 1,
            totalRooms: 2,
            capacity: '',
            minStay: '',
            availability: '',
            amenities: ['WiFi', 'Laundry'],
            image: '/uploads/cover.jpg',
            images: ['/uploads/cover.jpg', '/uploads/side.jpg'],
            badges: ['verified'],
            rooms: [
              {
                id: 100,
                room_number: 'A1',
                room_name: 'Single',
                type: 'Single',
                capacity: 1,
                occupied: 0,
                free_slots: 1,
                status: 'available',
                availability: 'Available',
                description: 'Window room',
                price: 5000,
                photos: ['/uploads/room-a1.jpg'],
                image: '/uploads/room-a1.jpg',
              },
              {
                id: 101,
                room_number: 'A2',
                room_name: 'Shared',
                type: 'Shared',
                capacity: 2,
                occupied: 0,
                free_slots: 2,
                status: 'occupied',
                availability: 'Occupied',
                description: 'Shared room',
                price: 4200,
                photos: [],
                image: '/assets/images/placeholder-room.svg',
              },
            ],
            landlord: {
              id: 3,
              name: 'Ana Reyes',
            },
            createdAt: '2020-01-01T00:00:00.000Z',
          },
        ],
        total_count: 1,
        limit: 20,
        offset: 0,
      },
    });
  });

  it('applies public listing filters and caps limit at 50', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/rooms/public?search=cebu&price_min=1000&price_max=5000&sort_by=price-low&limit=99&offset=3',
      {},
      createSequenceEnv(
        [{ first: { total_count: 0 } }, { all: [] }, { all: [] }, { all: [] }, { all: [] }],
        capturedBinds
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.limit).toBe(50);
    expect(body.data.offset).toBe(3);
    expect(capturedBinds[0]).toEqual([
      '%cebu%',
      '%cebu%',
      '%cebu%',
      '%cebu%',
      '%cebu%',
      1000,
      5000,
    ]);
    expect(capturedBinds[1]).toEqual([
      '%cebu%',
      '%cebu%',
      '%cebu%',
      '%cebu%',
      '%cebu%',
      1000,
      5000,
      50,
      3,
    ]);
  });

  it('matches popular-location search values against city and province', async () => {
    // Regression: the popular-location chips send "City, Province" (e.g. "Sampaloc, Manila"),
    // which previously matched no row because the search only looked at title/address/description.
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/rooms/public?search=Sampaloc%2C%20Manila',
      {},
      createSequenceEnv(
        [{ first: { total_count: 0 } }, { all: [] }, { all: [] }, { all: [] }, { all: [] }],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    expect(capturedBinds[0]).toEqual([
      '%Sampaloc%',
      '%Sampaloc%',
      '%Sampaloc%',
      '%Sampaloc%',
      '%Sampaloc%',
      '%Manila%',
      '%Manila%',
      '%Manila%',
      '%Manila%',
      '%Manila%',
    ]);
  });

  it('ignores comma-only search values', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/rooms/public?search=,,',
      {},
      createSequenceEnv(
        [{ first: { total_count: 0 } }, { all: [] }, { all: [] }, { all: [] }, { all: [] }],
        capturedBinds
      )
    );

    expect(response.status).toBe(200);
    // No terms → no search clause, so nothing is bound for the where clause.
    expect(capturedBinds[0]).toEqual([]);
  });

  it('returns room detail with the PHP response envelope', async () => {
    const property: DetailPropertyRow = {
      id: 10,
      title: 'Pine House',
      description: 'Near campus',
      address: '123 Mabini St',
      city: 'Manila',
      province: 'Metro Manila',
      price: 4500,
      latitude: 14.5995,
      longitude: 120.9842,
      listing_moderation_status: 'published',
      created_at: '2020-01-01T00:00:00.000Z',
      landlord_id: 3,
      landlord_first_name: 'Ana',
      landlord_last_name: 'Reyes',
      property_type: 'boarding-house',
      deposit: 2000,
      advance: '1 month',
      min_stay: '3 months',
      house_rules: '["No smoking","Quiet hours"]',
      gender_preference: 'female',
      property_rules: 'Keep shared areas clean.',
    };
    const amenities: AmenityRow[] = [{ property_id: 10, amenity_name: 'WiFi' }];
    const photos: PropertyPhotoRow[] = [
      { property_id: 10, photo_url: '/uploads/cover.jpg', is_cover: 1 },
    ];
    const rooms: RoomRow[] = [
      {
        property_id: 10,
        id: 100,
        room_number: 'A1',
        room_type: 'Single',
        capacity: 1,
        deposit: 1000,
        status: 'available',
        room_price: 5000,
        title: 'Window room',
        description: 'Bright private room',
        size: 12,
      },
    ];
    const roomPhotos: RoomPhotoRow[] = [{ room_id: 100, photo_url: '/uploads/room-a1.jpg' }];

    const response = await app.request(
      'http://localhost/api/rooms/detail?id=10',
      {},
      createSequenceEnv([
        { first: property },
        { all: amenities },
        { all: photos },
        { all: rooms },
        { first: { property_count: 2 } },
        { all: roomPhotos },
      ])
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        id: 10,
        title: 'Pine House',
        description: 'Near campus',
        address: '123 Mabini St',
        city: 'Manila',
        province: 'Metro Manila',
        // Same headline rule as the browse list (spec D10).
        price: 5000,
        latitude: 14.5995,
        longitude: 120.9842,
        propertyType: 'boarding-house',
        deposit: '2000',
        advance: '1 month',
        minStay: '3 months',
        capacity: '',
        availabilityStatus: '',
        rating: 4.5,
        reviews: 0,
        roomTypes: 'Single',
        availability: 'Available Now',
        availableRooms: 1,
        totalRooms: 1,
        amenities: ['WiFi'],
        houseRules: ['No smoking', 'Quiet hours'],
        genderPreference: 'female',
        propertyRules: 'Keep shared areas clean.',
        images: ['/uploads/cover.jpg'],
        coverImage: '/uploads/cover.jpg',
        badges: ['verified'],
        rooms: [
          {
            id: 100,
            roomNumber: 'A1',
            roomType: 'Single',
            price: 5000,
            deposit: 1000,
            status: 'available',
            capacity: 1,
            occupied: 0,
            freeSlots: 1,
            description: 'Bright private room',
            size: 12,
            images: ['/uploads/room-a1.jpg'],
            furnishing: 'Not specified',
          },
        ],
        landlord: {
          id: 3,
          name: 'Ana Reyes',
          properties: 2,
          rating: 4.7,
        },
        createdAt: '2020-01-01T00:00:00.000Z',
      },
    });
  });

  it('returns PHP-compatible room detail errors', async () => {
    const missingIdResponse = await app.request(
      'http://localhost/api/rooms/detail',
      {},
      createSequenceEnv([])
    );
    const notFoundResponse = await app.request(
      'http://localhost/api/rooms/detail?id=404',
      {},
      createSequenceEnv([{ first: null }])
    );

    expect(missingIdResponse.status).toBe(400);
    expect(await missingIdResponse.json()).toEqual({ error: 'Property ID is required' });

    expect(notFoundResponse.status).toBe(404);
    expect(await notFoundResponse.json()).toEqual({ error: 'Property not found' });
  });

  it('returns similar rooms with the PHP response shape and capped limit', async () => {
    const capturedBinds: unknown[][] = [];
    const response = await app.request(
      'http://localhost/api/rooms/similar?id=10&limit=99',
      {},
      createSequenceEnv(
        [
          {
            first: {
              price: 5000,
              city: 'Manila',
              province: 'Metro Manila',
              landlord_id: 3,
            },
          },
          {
            all: [
              {
                id: 11,
                title: 'Oak Studio',
                description: 'Near train',
                price: 5200,
                address: '456 Rizal Ave',
                city: 'Manila',
                province: 'Metro Manila',
                rating: 0,
                review_count: 0,
                cover_image: '/uploads/oak.jpg',
              },
              {
                id: 12,
                title: 'Maple Room',
                description: null,
                price: 4800,
                address: null,
                city: 'Quezon City',
                province: 'Metro Manila',
                rating: 0,
                review_count: 0,
                cover_image: null,
              },
            ],
          },
        ],
        capturedBinds
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: [
        {
          id: 11,
          title: 'Oak Studio',
          description: 'Near train',
          price: 5200,
          address: '456 Rizal Ave',
          city: 'Manila',
          province: 'Metro Manila',
          rating: 0,
          reviewCount: 0,
          coverImage: '/uploads/oak.jpg',
        },
        {
          id: 12,
          title: 'Maple Room',
          description: '',
          price: 4800,
          address: '',
          city: 'Quezon City',
          province: 'Metro Manila',
          rating: 0,
          reviewCount: 0,
          coverImage: '/assets/images/placeholder-room.svg',
        },
      ],
    });
    expect(capturedBinds[0]).toEqual([10]);
    expect(capturedBinds[1]).toEqual([
      10,
      2000,
      12500,
      'Manila',
      'Metro Manila',
      'Manila',
      5000,
      10,
    ]);
  });

  it('returns PHP-compatible similar room errors', async () => {
    const missingIdResponse = await app.request(
      'http://localhost/api/rooms/similar',
      {},
      createSequenceEnv([])
    );
    const notFoundResponse = await app.request(
      'http://localhost/api/rooms/similar?id=404',
      {},
      createSequenceEnv([{ first: null }])
    );

    expect(missingIdResponse.status).toBe(400);
    expect(await missingIdResponse.json()).toEqual({ error: 'Property ID is required' });

    expect(notFoundResponse.status).toBe(404);
    expect(await notFoundResponse.json()).toEqual({ error: 'Property not found' });
  });
});
