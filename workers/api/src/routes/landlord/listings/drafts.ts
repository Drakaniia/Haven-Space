import type { JsonRecord } from '../../../lib/validation';
import { firstBodyValue, intValue, isPhpEmpty, numberValue } from '../shared';

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

export const allowedPhotoExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

/** Room vocabulary and per-listing guard rails (spec `create-listing-room-details` R6/R7/R13). */
const validRoomTypes = new Set(['private', 'shared', 'dorm']);

const validRoomStatuses = new Set(['available', 'occupied', 'maintenance']);

const maxRoomsPerListing = 30;

const maxRoomCapacity = 10;

export function requiredFieldErrors(body: JsonRecord): Record<string, string> {
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

export function normalizeListingStatus(status: string): string {
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

export function minStayFromBody(body: JsonRecord, fallback: string): string {
  const value = firstBodyValue(body, ['min_stay', 'propertyMinStay']);

  if (value === undefined) {
    return fallback;
  }

  const minStay = String(value).trim();

  return minStayMap[minStay] ?? minStay;
}

export interface ListingRoomDraft {
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
export function listingRooms(body: JsonRecord): { rooms: ListingRoomDraft[]; errors: string[] } {
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

export function updateRoomTitle(roomNumber: string, roomCapacity: number | null): string {
  if (!roomCapacity) {
    return roomNumber;
  }

  return roomCapacity === 1
    ? `Single Room - ${roomNumber}`
    : `Shared Room (${roomCapacity} persons) - ${roomNumber}`;
}
