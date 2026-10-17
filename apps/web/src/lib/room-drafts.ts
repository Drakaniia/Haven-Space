/**
 * Pure helpers for the create-listing per-room forms (spec
 * `create-listing-room-details`). Keeping the state transitions here — seeding,
 * resizing, validation, payload building — lets the page stay a thin renderer and
 * lets the rules be unit-tested without a router or auth context.
 */

export type RoomType = 'private' | 'shared' | 'dorm';

export type RoomStatus = 'available' | 'occupied' | 'maintenance';

export interface RoomDraft {
  /** Stable React key; survives resizes so values never shuffle between boxes. */
  key: string;
  name: string;
  type: RoomType;
  capacity: string;
  price: string;
  deposit: string;
  size: string;
  description: string;
  status: RoomStatus;
  /** Held in memory and uploaded per room after the listing exists (spec D11). */
  photos: File[];
}

/** Property-level values a new room box starts from (spec D9). */
export interface RoomDefaults {
  rent: string;
  deposit: string;
  capacity: string;
}

export const MAX_ROOMS_PER_LISTING = 30;
export const MAX_ROOM_CAPACITY = 10;
export const MIN_ROOM_CAPACITY = 1;
export const MAX_ROOM_PHOTOS = 4;
export const RECOMMENDED_ROOM_PHOTOS = 2;

export const ROOM_TYPE_OPTIONS: ReadonlyArray<{ value: RoomType; label: string }> = [
  { value: 'private', label: 'Private' },
  { value: 'shared', label: 'Shared' },
  { value: 'dorm', label: 'Dorm' },
];

export const ROOM_STATUS_OPTIONS: ReadonlyArray<{ value: RoomStatus; label: string }> = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
];

/** Legacy rows/values still say `single`; tenants and landlords see `Private`. */
export function roomTypeLabel(value: string | null | undefined): string {
  const roomType = String(value ?? '')
    .trim()
    .toLowerCase();

  if (roomType === 'private' || roomType === 'single') {
    return 'Private';
  }

  if (roomType === 'shared') {
    return 'Shared';
  }

  if (roomType === 'dorm') {
    return 'Dorm';
  }

  // Older rows may carry other labels (e.g. `studio`); show them as written
  // rather than mislabelling them as shared.
  return roomType ? roomType.charAt(0).toUpperCase() + roomType.slice(1) : 'Room';
}

/** Single-occupancy rooms are private; anything else is shared (spec R6/R7). */
export function roomTypeForCapacity(capacity: number): RoomType {
  return capacity === 1 ? 'private' : 'shared';
}

export function clampRoomCount(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(Math.max(parsed, 1), MAX_ROOMS_PER_LISTING);
}

export function isRoomType(value: string): value is RoomType {
  return ROOM_TYPE_OPTIONS.some(option => option.value === value);
}

export function isRoomStatus(value: string): value is RoomStatus {
  return ROOM_STATUS_OPTIONS.some(option => option.value === value);
}

function draftKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `room-${Math.random().toString(36).slice(2)}`;
}

export function createRoomDraft(index: number, defaults: RoomDefaults): RoomDraft {
  const capacity = clampRoomCount(defaults.capacity || '1');

  return {
    key: draftKey(),
    name: `Room ${index + 1}`,
    type: roomTypeForCapacity(capacity),
    capacity: String(capacity),
    price: defaults.rent,
    deposit: defaults.deposit,
    size: '',
    description: '',
    status: 'available',
    photos: [],
  };
}

export function createRoomDrafts(count: number, defaults: RoomDefaults): RoomDraft[] {
  return Array.from({ length: clampRoomCount(String(count)) }, (_, index) =>
    createRoomDraft(index, defaults)
  );
}

/**
 * Grows or shrinks the draft list. Shrinking is destructive, so callers must
 * confirm first and name the rooms that will be dropped (spec D12); growing just
 * appends boxes seeded from the property defaults.
 */
export function resizeRoomDrafts(
  drafts: RoomDraft[],
  count: number,
  defaults: RoomDefaults
): RoomDraft[] {
  const target = clampRoomCount(String(count));

  if (target === drafts.length) {
    return drafts;
  }

  if (target < drafts.length) {
    return drafts.slice(0, target);
  }

  const grown = [...drafts];

  for (let index = drafts.length; index < target; index += 1) {
    grown.push(createRoomDraft(index, defaults));
  }

  return grown;
}

/** Rooms that a shrink to `count` would discard — used by the confirm dialog. */
export function roomsToDiscard(drafts: RoomDraft[], count: number): RoomDraft[] {
  const target = clampRoomCount(String(count));

  return target < drafts.length ? drafts.slice(target) : [];
}

function parsePositive(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function roomDraftErrors(draft: RoomDraft, siblings: RoomDraft[]): string[] {
  const errors: string[] = [];
  const name = draft.name.trim();
  const capacity = parsePositive(draft.capacity);
  const siblingsWithSameName = siblings.filter(
    sibling =>
      sibling.key !== draft.key && sibling.name.trim().toLowerCase() === name.toLowerCase() && name
  );

  if (!name) {
    errors.push('Room name is required.');
  } else if (siblingsWithSameName.length > 0) {
    errors.push(`A room named "${draft.name.trim()}" already exists in this listing.`);
  }

  if (capacity < MIN_ROOM_CAPACITY || capacity > MAX_ROOM_CAPACITY) {
    errors.push(`Capacity must be between ${MIN_ROOM_CAPACITY} and ${MAX_ROOM_CAPACITY}.`);
  }

  if (
    draft.price.trim() === '' ||
    Number(draft.price) < 0 ||
    !Number.isFinite(Number(draft.price))
  ) {
    errors.push('Monthly rent is required.');
  }

  if (draft.photos.length > MAX_ROOM_PHOTOS) {
    errors.push(`A room can have at most ${MAX_ROOM_PHOTOS} photos.`);
  }

  return errors;
}

export function isRoomDraftValid(draft: RoomDraft, siblings: RoomDraft[]): boolean {
  return roomDraftErrors(draft, siblings).length === 0;
}

export function areRoomDraftsValid(drafts: RoomDraft[]): boolean {
  return drafts.length > 0 && drafts.every(draft => isRoomDraftValid(draft, drafts));
}

export function roomDraftNeedsPhotos(draft: RoomDraft): boolean {
  return draft.photos.length < RECOMMENDED_ROOM_PHOTOS;
}

/** One-line summary used in each box header and in the shrink confirm. */
export function roomDraftSummary(draft: RoomDraft): string {
  const parts = [
    roomTypeLabel(draft.type),
    `${parsePositive(draft.capacity) || 1} ${
      parsePositive(draft.capacity) === 1 ? 'person' : 'persons'
    }`,
    `₱${Number(draft.price || 0).toLocaleString()}/mo`,
    `${draft.photos.length} photo${draft.photos.length === 1 ? '' : 's'}`,
  ];

  return parts.join(' · ');
}

/** The API room payload for one draft (spec R6). */
export function roomDraftPayload(draft: RoomDraft) {
  const capacity = Math.min(
    Math.max(parsePositive(draft.capacity), MIN_ROOM_CAPACITY),
    MAX_ROOM_CAPACITY
  );

  return {
    name: draft.name.trim(),
    room_type: draft.type,
    capacity,
    price: Number(draft.price) || 0,
    deposit: draft.deposit.trim() === '' ? 0 : Number(draft.deposit),
    size: draft.size.trim() === '' ? undefined : Number(draft.size),
    description: draft.description.trim(),
    status: draft.status,
  };
}

export function roomDraftsPayload(drafts: RoomDraft[]) {
  return drafts.map(roomDraftPayload);
}
