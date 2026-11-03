import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { formatPeso } from '../properties/PropertyCard';
import { buttonClasses } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import { roomTypeLabel } from '../../lib/room-drafts';
import type { LandlordRoom } from '../../lib/types';

/**
 * Room card and the pure vocabulary behind the rooms grid
 * (`landlord-rooms-grid`): the picture-matched layout of one room — thumbnail,
 * room number, status pill, type, rent, an occupancy bar and two controls.
 *
 * Every number the page shows is derived here from the room rows the API already
 * returns (`GET /api/landlord/rooms`), so the stat cards, the filter pill counts
 * and the cards themselves can never disagree.
 *
 * The card body is inert by design (D27): only `Edit room` and the trash button
 * do anything, which is why this is a plain `<li>` and not a stretched link.
 */

export type RoomFilter = 'all' | 'available' | 'occupied' | 'maintenance';
export type RoomSort = 'number' | 'rent' | 'slots' | 'occupancy';

export const ROOM_FILTERS: ReadonlyArray<{ value: RoomFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
];

/** D13/D33 — the select's default is the room-number order. */
export const ROOM_SORT_OPTIONS: ReadonlyArray<{ value: RoomSort; label: string }> = [
  { value: 'number', label: 'Room number' },
  { value: 'rent', label: 'Rent (low to high)' },
  { value: 'slots', label: 'Slots free (most first)' },
  { value: 'occupancy', label: 'Tenants / capacity (least full first)' },
];

/** Readable pill text, so a status never renders as a raw snake_case token. */
export function roomStatusLabel(status: string | null | undefined): string {
  const value = String(status ?? '')
    .trim()
    .toLowerCase();

  if (value === 'available') return 'Available';
  if (value === 'occupied') return 'Occupied';
  if (value === 'maintenance') return 'Maintenance';

  // Unknown statuses still render as words, never as `snake_case` tokens.
  const words = value.replaceAll('_', ' ');

  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Available';
}

/** D12/R20 — `1/20 slots occupied`, singular when the room holds one tenant. */
export function slotsLabel(occupied: number, capacity: number): string {
  const slots = Math.max(0, Math.trunc(Number(capacity) || 0));
  const taken = Math.max(0, Math.trunc(Number(occupied) || 0));

  return `${taken}/${slots} slot${slots === 1 ? '' : 's'} occupied`;
}

/** Bar fill: the occupied share, clamped — a zero-capacity legacy row renders empty. */
export function slotRatio(occupied: number, capacity: number): number {
  const slots = Math.max(0, Number(capacity) || 0);

  if (slots <= 0) return 0;

  return Math.min(Math.max(0, Number(occupied) || 0) / slots, 1);
}

/** The fourth stat card's value: tenants over capacity (D11). */
export function occupancyValue(occupiedSlots: number, capacitySlots: number): string {
  const taken = Math.max(0, Math.trunc(Number(occupiedSlots) || 0));
  const slots = Math.max(0, Math.trunc(Number(capacitySlots) || 0));

  return `${taken}/${slots}`;
}

export interface RoomStats {
  total: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  occupiedSlots: number;
  capacitySlots: number;
  /** `1/400` — what the `Tenants / capacity` card prints. */
  occupancyLabel: string;
}

/** D6/D15/D25 — the four counts, computed from the grid's own rows. */
export function rollupRoomStats(rooms: LandlordRoom[]): RoomStats {
  let occupiedRooms = 0;
  let availableRooms = 0;
  let maintenanceRooms = 0;
  let occupiedSlots = 0;
  let capacitySlots = 0;

  for (const room of rooms) {
    const status = String(room.status ?? 'available').toLowerCase();

    if (status === 'occupied') occupiedRooms += 1;
    else if (status === 'maintenance') maintenanceRooms += 1;
    else availableRooms += 1;

    occupiedSlots += Math.max(0, Math.trunc(Number(room.occupied) || 0));
    capacitySlots += Math.max(0, Math.trunc(Number(room.capacity) || 0));
  }

  return {
    total: rooms.length,
    occupiedRooms,
    availableRooms,
    maintenanceRooms,
    occupiedSlots,
    capacitySlots,
    occupancyLabel: occupancyValue(occupiedSlots, capacitySlots),
  };
}

/**
 * D26 — numeric-aware and case-insensitive, so `Room 2` precedes `Room 10` and
 * `A2` precedes `A10`. Callers pair it with the room id so the order is stable.
 */
export function naturalRoomNumber(a: string | null | undefined, b: string | null | undefined) {
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/** D13 — the search box matches the room number only. */
export function matchesRoomSearch(room: Pick<LandlordRoom, 'room_number'>, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (!needle) return true;

  return String(room.room_number ?? '')
    .toLowerCase()
    .includes(needle);
}

/** D24 — classification follows `room.status`, never the tenant count. */
export function roomMatchesFilter(room: Pick<LandlordRoom, 'status'>, filter: RoomFilter): boolean {
  if (filter === 'all') return true;

  return String(room.status ?? 'available').toLowerCase() === filter;
}

export function countRoomsByFilter(rooms: LandlordRoom[]): Record<RoomFilter, number> {
  const counts: Record<RoomFilter, number> = {
    all: rooms.length,
    available: 0,
    occupied: 0,
    maintenance: 0,
  };

  for (const room of rooms) {
    const status = String(room.status ?? 'available').toLowerCase();

    if (status === 'occupied') counts.occupied += 1;
    else if (status === 'maintenance') counts.maintenance += 1;
    else counts.available += 1;
  }

  return counts;
}

/** D3/D33 — always a new array; ties fall back to the natural room-number order. */
export function sortRooms(rooms: LandlordRoom[], sort: RoomSort): LandlordRoom[] {
  const byNumber = (a: LandlordRoom, b: LandlordRoom) =>
    naturalRoomNumber(a.room_number, b.room_number) || Number(a.id) - Number(b.id);

  const sorted = [...rooms];

  if (sort === 'rent') {
    sorted.sort((a, b) => Number(a.price) - Number(b.price) || byNumber(a, b));
  } else if (sort === 'slots') {
    sorted.sort((a, b) => Number(b.free_slots) - Number(a.free_slots) || byNumber(a, b));
  } else if (sort === 'occupancy') {
    sorted.sort(
      (a, b) =>
        slotRatio(a.occupied, a.capacity) - slotRatio(b.occupied, b.capacity) || byNumber(a, b)
    );
  } else {
    sorted.sort(byNumber);
  }

  return sorted;
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

export function RoomCard({
  room,
  propertyId,
  onDelete,
}: {
  room: LandlordRoom;
  propertyId: number;
  onDelete: (room: LandlordRoom) => void;
}) {
  const title = room.room_number?.trim() || 'Room';
  const ratio = slotRatio(room.occupied, room.capacity);
  const capacity = Math.max(0, Math.trunc(Number(room.capacity) || 0));
  const occupied = Math.max(0, Math.trunc(Number(room.occupied) || 0));

  return (
    <li className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-pop">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mint">
          {room.cover_photo ? (
            <img src={room.cover_photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center text-primary"
            >
              <Icon name="photo" size={20} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-[15px] font-semibold text-ink">{title}</h3>
            <StatusBadge status={room.status} label={roomStatusLabel(room.status)} />
          </div>
          <p className="mt-0.5 text-[13px] text-gray-ink">{roomTypeLabel(room.room_type)} room</p>
        </div>
      </div>

      <p className="mt-3 text-lg font-bold text-ink">
        {formatPeso(Number(room.price))}
        <span className="ml-1 text-xs font-medium text-gray-ink">/month</span>
      </p>

      <div
        role="progressbar"
        aria-label={`Slots occupied in ${title}`}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={occupied}
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-mint"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-settle motion-reduce:transition-none"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-ink">{slotsLabel(room.occupied, room.capacity)}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to="/landlord/listings/rooms/$id/edit"
          params={{ id: String(room.id) }}
          search={{ propertyId: String(propertyId), from: 'rooms' }}
          className={buttonClasses({ variant: 'outline', size: 'sm', className: 'flex-1' })}
        >
          Edit room
        </Link>
        <button
          type="button"
          aria-label={`Delete room ${title}`}
          onClick={() => onDelete(room)}
          className={buttonClasses({
            variant: 'dangerGhost',
            size: 'sm',
            className: 'h-9 w-9 shrink-0 p-0',
          })}
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}

/** 4 / 2 / 1 columns (D16) — a lone card keeps its column width. */
export function RoomCardGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </ul>
  );
}

/** Loading state (R31) — same footprint as a real card, so nothing jumps. */
export function RoomCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <div className="flex items-start gap-3">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-3 h-5 w-24" />
          <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
          <Skeleton className="mt-4 h-8 w-full rounded-full" />
        </li>
      ))}
    </ul>
  );
}
