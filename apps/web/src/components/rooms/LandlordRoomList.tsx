import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, buttonClasses } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ErrorState } from '../ui/ErrorState';
import { Spinner } from '../ui/Spinner';
import { StatusBadge } from '../ui/StatusBadge';
import { ToastStack, useToasts } from '../ui/Toast';
import { ApiRequestError } from '../../lib/api/http';
import { deleteRoom, getRooms } from '../../lib/api/landlord';
import { roomTypeLabel } from '../../lib/room-drafts';
import type { LandlordRoom } from '../../lib/types';
import { RoomFormModal } from './RoomFormModal';

/**
 * Landlord room management block: lists a property's rooms with per-room edit
 * links and add/delete affordances. Owns its own data fetching and mutations so
 * it can be embedded on any landlord page (listing edit, boarders, etc.).
 *
 * The add-room dialog is the shared `RoomFormModal` (`landlord-rooms-grid` D17) —
 * the same one the property rooms page uses — so creating a room behaves
 * identically wherever it is offered, including the optional cover photo.
 */
export function LandlordRoomList({ token, propertyId }: { token: string; propertyId: number }) {
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();
  const [addRoomOpen, setAddRoomOpen] = useState(false);
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
    onError: err =>
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Failed to delete room.'),
  });

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Rooms</h2>
            <p className="mt-1 text-sm text-gray-ink">
              Edit each room&apos;s price, status, and photos, or add new rooms.
            </p>
          </div>
          <Button onClick={() => setAddRoomOpen(true)}>+ Add room</Button>
        </div>

        {deleteError ? (
          <div className="mt-4">
            <ErrorState message={deleteError} />
          </div>
        ) : null}

        {rooms.isLoading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : rooms.error ? (
          <div className="mt-4">
            <ErrorState message={rooms.error.message} />
          </div>
        ) : (rooms.data?.data.rooms.length ?? 0) === 0 ? (
          <p className="mt-4 text-sm text-gray-ink">No rooms on this listing yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border/70 bg-surface">
            {rooms.data!.data.rooms.map(room => (
              <li
                key={room.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-ink">{room.room_number}</p>
                  <p className="text-sm text-gray-ink">
                    {roomTypeLabel(room.room_type)} · ₱{room.price.toLocaleString()}/mo ·{' '}
                    {room.free_slots} of {room.capacity} {room.capacity === 1 ? 'slot' : 'slots'}{' '}
                    free
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={room.status} />
                  <Link
                    to="/landlord/listings/rooms/$id/edit"
                    params={{ id: String(room.id) }}
                    search={{ propertyId: String(propertyId), from: 'listing' }}
                    className={buttonClasses({ variant: 'outline', size: 'sm' })}
                  >
                    Edit room
                  </Link>
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    disabled={removeRoom.isPending}
                    onClick={() => setPendingDelete(room)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RoomFormModal
        open={addRoomOpen}
        token={token}
        propertyId={propertyId}
        onClose={() => setAddRoomOpen(false)}
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
