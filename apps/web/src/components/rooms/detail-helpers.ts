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

/** Strip a trailing "-X" suffix (e.g. "Room 1-1" -> "Room 1") and capitalize. */
export function cleanRoomType(room: RoomDetail): string {
  const raw = room.roomType && room.roomType !== 'N/A' ? room.roomType : room.roomNumber || 'Room';
  return capitalize(raw.replace(/-\d+$/, ''));
}

export function isRoomAvailable(room: RoomDetail): boolean {
  const status = (room.status || '').toLowerCase();
  return status !== 'occupied' && status !== 'full';
}

export function roomStatusLabel(room: RoomDetail): { label: string; className: string } {
  const status = (room.status || '').toLowerCase();
  if (status === 'occupied' || status === 'full') {
    return { label: 'Occupied', className: 'bg-red-100 text-red-700' };
  }
  if (status === 'limited' || status === 'few-left') {
    return { label: 'Limited', className: 'bg-amber-100 text-amber-700' };
  }
  return { label: 'Available', className: 'bg-green-100 text-green-700' };
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
