import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { SelectInput, TextInput } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { ToastStack, useToasts } from '../ui/Toast';
import { ApiRequestError } from '../../lib/api/http';
import { deleteRoom, getRooms } from '../../lib/api/landlord';
import type { LandlordRoom } from '../../lib/types';
import { RoomFormModal } from './RoomFormModal';
import {
  ROOM_FILTERS,
  ROOM_SORT_OPTIONS,
  RoomCard,
  RoomCardGrid,
  RoomCardSkeletonGrid,
  countRoomsByFilter,
  matchesRoomSearch,
  roomMatchesFilter,
  rollupRoomStats,
  sortRooms,
  type RoomFilter,
  type RoomSort,
} from './RoomCard';

/**
 * The property's rooms page (`landlord-rooms-grid`): four stat cards, a status
 * filter / search / sort toolbar and one card per room.
 *
 * It owns the `landlord-rooms` query, the delete mutation and its confirm, the
 * toolbar state (component state only — D28) and the shared add-room dialog. The
 * `+ Add room` trigger lives in the page header, so its open state is passed in
 * by the route (D2).
 */

/**
 * Status dot per stat — the same tones the room pills use (`StatusBadge`), shown
 * as a small dot so the row reads calm: colour hints, the label says it.
 */
const STAT_DOT: Record<string, string> = {
  total: 'bg-border-strong',
  occupied: 'bg-warning',
  available: 'bg-success',
  tenants: 'bg-primary',
};

/** The bordered stat card (D23) — local, not `PropertyOverview`'s tile. */
function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface px-4 py-3.5 shadow-card">
      <p className="flex items-center gap-2 text-xs font-medium text-gray-ink">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${STAT_DOT[tone]}`} />
        {label}
      </p>
      <p className="mt-1.5 font-display text-[1.75rem] font-medium leading-none tracking-[-0.02em] text-ink tabular">
        {value}
      </p>
    </div>
  );
}

function pillClasses(active: boolean): string {
  return `inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-[background-color,border-color,color] duration-150 ${
    active
      ? 'border-primary/40 bg-mint text-primary-dark'
      : 'border-border bg-surface text-gray-ink hover:border-border-strong hover:text-ink'
  }`;
}

export function PropertyRoomsGrid({
  token,
  propertyId,
  addOpen,
  onAddOpenChange,
}: {
  token: string;
  propertyId: number;
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();
  const [filter, setFilter] = useState<RoomFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<RoomSort>('number');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LandlordRoom | null>(null);

  const rooms = useQuery({
    queryKey: ['landlord-rooms', propertyId],
    queryFn: () => getRooms(token, propertyId),
    enabled: Boolean(token),
  });

  const removeRoom = useMutation({
    mutationFn: (roomId: number) => deleteRoom(token, roomId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-rooms', propertyId] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      setDeleteError(null);
      setPendingDelete(null);
      push({ tone: 'success', message: 'Room deleted.' });
    },
    onError: err => {
      setPendingDelete(null);
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Failed to delete room.');
    },
  });

  const allRooms = rooms.data?.data.rooms ?? [];
  const stats = rollupRoomStats(allRooms);
  // Pill counts follow the search text; the stat cards above never do (D25).
  const searchHits = allRooms.filter(room => matchesRoomSearch(room, search));
  const counts = countRoomsByFilter(searchHits);
  const visible = sortRooms(
    searchHits.filter(room => roomMatchesFilter(room, filter)),
    sort
  );

  function clearFilters() {
    setFilter('all');
    setSearch('');
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total rooms" value={String(stats.total)} tone="total" />
          <StatCard label="Occupied rooms" value={String(stats.occupiedRooms)} tone="occupied" />
          <StatCard
            label="Available rooms"
            value={String(stats.availableRooms)}
            tone="available"
          />
          {/* Labelled in full so the number reads unambiguously as the property's
              total tenants over its total capacity (D11, relabelled on request). */}
          <StatCard label="Tenants / capacity" value={stats.occupancyLabel} tone="tenants" />
        </div>

        {rooms.isLoading ? (
          <div className="mt-6">
            <RoomCardSkeletonGrid />
          </div>
        ) : rooms.error ? (
          <div className="mt-6">
            <ErrorState message={rooms.error.message} />
          </div>
        ) : stats.total === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon="list"
              title="No rooms yet"
              description="Add your first room to start filling this property."
              action={<Button onClick={() => onAddOpenChange(true)}>+ Add room</Button>}
            />
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div
                role="group"
                aria-label="Filter rooms by status"
                className="flex flex-wrap items-center gap-2"
              >
                {ROOM_FILTERS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filter === option.value}
                    onClick={() => setFilter(option.value)}
                    className={pillClasses(filter === option.value)}
                  >
                    {option.label}
                    <span
                      className={`min-w-5 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums ${
                        filter === option.value ? 'bg-surface text-primary-dark' : 'bg-subtle text-gray-ink'
                      }`}
                    >
                      {counts[option.value]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
                    <Icon name="search" size={16} />
                  </span>
                  <TextInput
                    type="search"
                    value={search}
                    aria-label="Search rooms"
                    placeholder="Search rooms"
                    className="pl-9 sm:w-52"
                    onChange={event => setSearch(event.target.value)}
                  />
                  {search ? (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setSearch('')}
                      className="absolute inset-y-0 right-1 flex w-8 items-center justify-center text-muted transition-colors hover:text-gray-ink"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  ) : null}
                </div>

                <SelectInput
                  aria-label="Sort rooms"
                  value={sort}
                  className="sm:w-56"
                  onChange={event => setSort(event.target.value as RoomSort)}
                >
                  {ROOM_SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </div>
            </div>

            {deleteError ? (
              <div className="mt-4">
                <ErrorState message={deleteError} />
              </div>
            ) : null}

            {visible.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-border-strong bg-surface/70 px-5 py-8 text-center text-sm text-gray-ink">
                {search.trim()
                  ? `No rooms match “${search.trim()}”.`
                  : `No ${filter} rooms on this property.`}{' '}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-medium text-primary transition-colors hover:underline"
                >
                  Clear filters
                </button>
              </p>
            ) : (
              <div className="mt-4">
                <RoomCardGrid label="Rooms">
                  {visible.map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      propertyId={propertyId}
                      onDelete={setPendingDelete}
                    />
                  ))}
                </RoomCardGrid>
              </div>
            )}
          </>
        )}
      </section>

      <RoomFormModal
        open={addOpen}
        token={token}
        propertyId={propertyId}
        onClose={() => onAddOpenChange(false)}
        onCreated={(_room, photoFailed) => {
          void queryClient.invalidateQueries({ queryKey: ['landlord-rooms', propertyId] });
          void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
          push({ tone: 'success', message: 'Room added.' });

          if (photoFailed) {
            push({
              tone: 'warning',
              message: 'The room was added, but its photo did not upload. Add it from Edit room.',
            });
          }
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete room"
        message={
          <>
            Delete <strong>{pendingDelete?.room_number}</strong>? This cannot be undone.
          </>
        }
        confirmLabel="Delete room"
        busy={removeRoom.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          removeRoom.mutate(pendingDelete.id);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
