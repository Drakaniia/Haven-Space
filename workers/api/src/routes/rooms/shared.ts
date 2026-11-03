import {
  PLACEHOLDER_IMAGE,
  type DetailPropertyRow,
  type PublicListingFilters,
  type PublicPropertyRow,
  type PropertyPhotoRow,
  type RoomRow,
  type SimilarPropertyRow,
} from '../../repositories/listings';
import type { PopularLocationRow } from '../../repositories/locations';

export function parseLimit(value: string | null, defaultLimit: number, maxLimit: number): number {
  if (value === null) {
    return defaultLimit;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return defaultLimit;
  }

  return Math.min(Math.max(parsed, 0), maxLimit);
}

function cleanLocationName(cityValue: string | null, provinceValue: string | null): string {
  const city = (cityValue ?? '').trim();

  const province = (provinceValue ?? '').trim();

  const locationName = province && province !== city ? `${city}, ${province}` : city;

  return locationName.replace(/^(City of|Municipality of)\s+/i, '').trim();
}

export function formatPopularLocation(location: PopularLocationRow) {
  const locationName = cleanLocationName(location.city, location.province);

  return {
    name: locationName,
    search_value: locationName,
    property_count: Number(location.property_count),
    avg_price: 0,
    min_price: 0,
    max_price: 0,
    price_range: 'Various prices',
  };
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseOffset(value: string | undefined): number {
  if (value === undefined) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isNewListing(createdAt: string | null): boolean {
  if (!createdAt) {
    return false;
  }

  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return false;
  }

  const ageMs = Date.now() - createdDate.getTime();

  return ageMs >= 0 && ageMs <= 7 * 24 * 60 * 60 * 1000;
}

/** Free slots are what tenants can still book in the room (spec D2/R10). */
function roomOccupancy(room: RoomRow): { capacity: number; occupied: number; freeSlots: number } {
  const capacity = Math.max(Number(room.capacity ?? 1), 1);

  const occupied = Math.max(Number(room.occupied ?? 0), 0);

  return { capacity, occupied, freeSlots: Math.max(capacity - occupied, 0) };
}

function formatRoom(room: RoomRow, property: PublicPropertyRow, photos: string[]) {
  const roomPrice = Number(room.room_price);

  const price = Number.isFinite(roomPrice) && roomPrice > 0 ? roomPrice : Number(property.price);

  const roomNumber = room.room_number || `Room ${room.id}`;

  const roomType = room.room_type || 'Standard Room';

  const status = room.status || 'available';

  const occupancy = roomOccupancy(room);

  return {
    id: Number(room.id),
    room_number: roomNumber,
    room_name: room.room_type || room.room_number || `Room ${room.id}`,
    type: roomType,
    capacity: occupancy.capacity,
    occupied: occupancy.occupied,
    free_slots: occupancy.freeSlots,
    status,
    availability: status === 'available' ? 'Available' : 'Occupied',
    description: room.title || 'Comfortable room with all basic amenities.',
    price,
    photos,
    image: photos[0] ?? PLACEHOLDER_IMAGE,
  };
}

function formatDetailRoom(room: RoomRow, photos: string[]) {
  const occupancy = roomOccupancy(room);

  return {
    id: Number(room.id),
    roomNumber: escapeHtml(room.room_number ?? 'N/A'),
    roomType: escapeHtml(room.room_type ?? 'Room'),
    price: Number(room.room_price),
    deposit: Number(room.deposit ?? 0),
    status: escapeHtml(room.status ?? ''),
    capacity: occupancy.capacity,
    occupied: occupancy.occupied,
    freeSlots: occupancy.freeSlots,
    description: escapeHtml(room.description ?? ''),
    size: room.size === null || room.size === undefined ? null : Number(room.size),
    images: photos,
    furnishing: 'Not specified',
  };
}

function coverImage(photos: PropertyPhotoRow[]): { image: string; images: string[] } {
  const images = photos.map(photo => photo.photo_url).filter(Boolean);

  const cover = photos.find(photo => Number(photo.is_cover) === 1)?.photo_url;

  return { image: cover || images[0] || PLACEHOLDER_IMAGE, images };
}

export function formatPublicProperty(
  property: PublicPropertyRow,
  amenities: string[],
  photos: PropertyPhotoRow[],
  rooms: RoomRow[],
  roomPhotos: Map<number, string[]>
) {
  const badges = property.listing_moderation_status === 'published' ? ['verified'] : [];

  if (isNewListing(property.created_at)) {
    badges.push('new');
  }

  const formattedRooms = rooms.map(room =>
    formatRoom(room, property, roomPhotos.get(Number(room.id)) ?? [])
  );

  const availableRooms = formattedRooms.filter(room => room.status === 'available').length;

  const propertyImages = coverImage(photos);

  return {
    id: Number(property.id),
    title: escapeHtml(property.title),
    description: escapeHtml(property.description),
    address: escapeHtml(property.address),
    city: property.city ?? '',
    province: property.province ?? '',
    // Headline price is the cheapest bookable room, falling back to the
    // property price when no priced rooms exist (spec D10).
    price: cheapestRoomPrice(formattedRooms) ?? Number(property.price),
    latitude: property.latitude === null ? null : Number(property.latitude),
    longitude: property.longitude === null ? null : Number(property.longitude),
    rating: 4.5,
    reviews: 0,
    roomTypes: 'Available',
    availableRooms,
    totalRooms: formattedRooms.length,
    capacity: '',
    minStay: '',
    availability: '',
    amenities,
    image: propertyImages.image,
    images: propertyImages.images,
    badges,
    rooms: formattedRooms,
    landlord: {
      id: Number(property.landlord_id),
      name: escapeHtml(
        `${property.landlord_first_name ?? ''} ${property.landlord_last_name ?? ''}`
      ),
    },
    createdAt: property.created_at,
  };
}

function parseJsonArray(value: string | null): unknown[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function displayRoomTypes(rooms: RoomRow[]): string {
  const roomTypes = Array.from(
    new Set(
      rooms
        .map(room => room.room_type)
        .filter((roomType): roomType is string => Boolean(roomType))
        .filter(roomType => roomType.toLowerCase() !== 'room')
        .map(roomType => `${roomType.charAt(0).toUpperCase()}${roomType.slice(1).toLowerCase()}`)
    )
  );

  return roomTypes.length > 0 ? roomTypes.join(' & ') : 'Available';
}

function availabilityText(availableRooms: number, totalRooms: number): string {
  if (availableRooms > 0) {
    return 'Available Now';
  }

  if (totalRooms > 0) {
    return 'No rooms available';
  }

  return 'Contact for details';
}

function detailImages(photos: PropertyPhotoRow[]): { coverImage: string; images: string[] } {
  const imageData = coverImage(photos);

  return {
    coverImage: imageData.image,
    images: imageData.images.length > 0 ? imageData.images : [PLACEHOLDER_IMAGE],
  };
}

export function formatListingDetail(
  property: DetailPropertyRow,
  amenities: string[],
  photos: PropertyPhotoRow[],
  rooms: RoomRow[],
  roomPhotos: Map<number, string[]>,
  landlordProperties: number
) {
  const badges = property.listing_moderation_status === 'published' ? ['verified'] : [];

  if (isNewListing(property.created_at)) {
    badges.push('new');
  }

  const availableRooms = rooms.filter(room => room.status === 'available').length;

  const images = detailImages(photos);

  const formattedRooms = rooms.map(room =>
    formatDetailRoom(room, roomPhotos.get(Number(room.id)) ?? [])
  );

  return {
    id: Number(property.id),
    title: escapeHtml(property.title),
    description: escapeHtml(property.description),
    address: escapeHtml(property.address),
    city: escapeHtml(property.city),
    province: escapeHtml(property.province),
    // Same headline rule as the browse cards (spec D10).
    price: cheapestRoomPrice(formattedRooms) ?? Number(property.price),
    latitude: property.latitude === null ? null : Number(property.latitude),
    longitude: property.longitude === null ? null : Number(property.longitude),
    propertyType: escapeHtml(property.property_type ?? 'boarding-house'),
    deposit: escapeHtml(property.deposit),
    advance: escapeHtml(property.advance ?? 'None'),
    minStay: escapeHtml(property.min_stay),
    capacity: '',
    availabilityStatus: '',
    rating: 4.5,
    reviews: 0,
    roomTypes: displayRoomTypes(rooms),
    availability: availabilityText(availableRooms, rooms.length),
    availableRooms,
    totalRooms: rooms.length,
    amenities,
    houseRules: parseJsonArray(property.house_rules),
    genderPreference: property.gender_preference ?? 'any',
    propertyRules: property.property_rules ?? '',
    images: images.images,
    coverImage: images.coverImage,
    badges,
    rooms: formattedRooms,
    landlord: {
      id: Number(property.landlord_id),
      name: escapeHtml(
        `${property.landlord_first_name ?? ''} ${property.landlord_last_name ?? ''}`.trim()
      ),
      properties: landlordProperties,
      rating: 4.7,
    },
    createdAt: property.created_at,
  };
}

/** Lowest positive room price, or null when the property has none. */
function cheapestRoomPrice(rooms: Array<{ price: number }>): number | null {
  return rooms.reduce<number | null>((lowest, room) => {
    if (!Number.isFinite(room.price) || room.price <= 0) {
      return lowest;
    }

    return lowest === null || room.price < lowest ? room.price : lowest;
  }, null);
}

export function formatSimilarProperty(property: SimilarPropertyRow) {
  const rating = Number(property.rating);

  return {
    id: Number(property.id),
    title: escapeHtml(property.title),
    description: escapeHtml(property.description),
    price: Number(property.price),
    address: escapeHtml(property.address),
    city: escapeHtml(property.city),
    province: escapeHtml(property.province),
    rating: rating ? Math.round(rating * 10) / 10 : 0,
    reviewCount: Number(property.review_count ?? 0),
    coverImage: property.cover_image ? escapeHtml(property.cover_image) : PLACEHOLDER_IMAGE,
  };
}

export function publicListingFilters(url: URL): PublicListingFilters {
  return {
    search: url.searchParams.get('search')?.trim() ?? '',
    priceMin: parseNumber(url.searchParams.get('price_min') ?? undefined),
    priceMax: parseNumber(url.searchParams.get('price_max') ?? undefined),
    sortBy: url.searchParams.get('sort_by') ?? 'newest',
    limit: parseLimit(url.searchParams.get('limit'), 20, 50),
    offset: parseOffset(url.searchParams.get('offset') ?? undefined),
  };
}
