import type { RoomDetail } from '../../lib/types';

const AMENITY_ICONS: Record<string, string> = {
  kitchen: 'kitchen',
  'own kitchen': 'kitchen',
  toilet: 'toilet',
  'own bathroom': 'toilet',
  'own toilet': 'toilet',
  'private bathroom': 'toilet',
  laundry: 'laundry',
  'laundry room': 'laundry',
  aircon: 'aircon',
  'air conditioning': 'aircon',
  cctv: 'cctv',
  'cctv security': 'cctv',
  parking: 'parking',
  'parking space': 'parking',
  furnished: 'furnished',
  'fully furnished': 'furnished',
  wifi: 'wifi',
  'free wifi': 'wifi',
  'high-speed wifi': 'wifi',
  pool: 'sparkles',
  'study area': 'book',
  generator: 'lightbulb',
};

export function amenityIcon(name: string): string {
  const key = name.toLowerCase();
  for (const [match, icon] of Object.entries(AMENITY_ICONS)) {
    if (key.includes(match)) return icon;
  }
  return 'check';
}

export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return `₱${value.toLocaleString()}`;
}

/** Format a deposit/advance that may arrive as a raw number string or plain text. */
export function formatAmount(value: string): string {
  if (!value) return 'Contact for details';
  const numeric = Number(value.replace(/[^\d.]/g, ''));
  if (
    !Number.isNaN(numeric) &&
    String(value).trim() !== '' &&
    /^[₱\s]*[\d.,]+$/.test(value.trim())
  ) {
    return formatPrice(numeric);
  }
  return value;
}

/**
 * Room-type display name. The vocabulary is private / shared / dorm; legacy rows
 * may still say `single`, and anything unrecognised falls back to the room number
 * (with a trailing "-X" suffix stripped, e.g. "Room 1-1" -> "Room 1").
 */
export function cleanRoomType(room: RoomDetail): string {
  const raw = (room.roomType ?? '').trim();
  const normalized = raw.toLowerCase();

  if (normalized === 'private' || normalized === 'single') return 'Private';
  if (normalized === 'shared') return 'Shared';
  if (normalized === 'dorm') return 'Dorm';

  const fallback = raw && raw !== 'N/A' ? raw : room.roomNumber || 'Room';
  return capitalize(fallback.replace(/-\d+$/, ''));
}

/** Free slots the API reported, or the room's capacity when it did not. */
export function freeSlots(room: RoomDetail): number {
  const reported = Number(room.freeSlots);

  if (Number.isFinite(reported)) {
    return Math.max(reported, 0);
  }

  return Math.max(Number(room.capacity ?? 1), 1);
}

/** Tenant-facing occupancy copy, e.g. "2 of 4 slots free" or "Full". */
export function freeSlotsLabel(room: RoomDetail): string {
  const capacity = Math.max(Number(room.capacity ?? 1), 1);
  const free = freeSlots(room);

  if (free <= 0) return 'Full';

  return `${free} of ${capacity} slot${capacity === 1 ? '' : 's'} free`;
}

/**
 * A room is bookable while it has a free slot, even if its status still says
 * `occupied` (a shared room fills up slot by slot). Maintenance always wins.
 */
export function isRoomAvailable(room: RoomDetail): boolean {
  const status = (room.status || '').toLowerCase();

  if (status === 'maintenance' || status === 'deleted') return false;
  if (typeof room.freeSlots === 'number') return freeSlots(room) > 0;

  return status !== 'occupied' && status !== 'full';
}

export function roomStatusLabel(room: RoomDetail): { label: string; className: string } {
  const status = (room.status || '').toLowerCase();

  if (status === 'maintenance') {
    return { label: 'Maintenance', className: 'bg-subtle text-gray-ink' };
  }
  if (freeSlots(room) <= 0) {
    return { label: 'Full', className: 'bg-error-tint text-error-ink' };
  }
  if (status === 'occupied' || status === 'full' || status === 'limited' || status === 'few-left') {
    return { label: 'Limited', className: 'bg-warning-tint text-warning-ink' };
  }
  return { label: 'Available', className: 'bg-success-tint text-success-ink' };
}

export function genderInfo(preference: string): {
  label: string;
  icon: string;
  description: string;
} {
  switch ((preference || 'any').toLowerCase()) {
    case 'male':
      return {
        label: 'Male Only',
        icon: 'user',
        description: 'This property accepts male boarders.',
      };
    case 'female':
      return {
        label: 'Female Only',
        icon: 'user',
        description: 'This property accepts female boarders.',
      };
    default:
      return {
        label: 'Open to All Genders',
        icon: 'users',
        description: 'This property accepts boarders of all genders.',
      };
  }
}
