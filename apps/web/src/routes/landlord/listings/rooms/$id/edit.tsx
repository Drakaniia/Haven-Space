import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { VerificationNotice } from '../../../../../components/landlord/VerificationNotice';
import { Button } from '../../../../../components/ui/Button';
import { Card } from '../../../../../components/ui/Card';
import { ErrorState } from '../../../../../components/ui/ErrorState';
import { Field, SelectInput, TextArea, TextInput } from '../../../../../components/ui/Field';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Spinner } from '../../../../../components/ui/Spinner';
import { ApiRequestError } from '../../../../../lib/api/http';
import { getRooms, updateRoom, uploadRoomPhotos } from '../../../../../lib/api/landlord';
import { useAuth } from '../../../../../lib/auth-context';
import { setPendingToast } from '../../../../../lib/toast';
import { ToastStack, useToasts } from '../../../../../components/ui/Toast';

interface RoomEditSearch {
  propertyId?: string;
  /** Which surface opened this editor, so saving returns to it (defaults to listing). */
  from?: 'rooms' | 'listing';
}

export const Route = createFileRoute('/landlord/listings/rooms/$id/edit')({
  validateSearch: (search: Record<string, unknown>): RoomEditSearch => ({
    propertyId:
      typeof search.propertyId === 'string' || typeof search.propertyId === 'number'
        ? String(search.propertyId)
        : undefined,
    from: search.from === 'rooms' || search.from === 'listing' ? search.from : undefined,
  }),
  component: EditRoomPage,
});

function EditRoomPage() {
  const { id } = Route.useParams();
  const { propertyId, from } = useSearch({ from: '/landlord/listings/rooms/$id/edit' });
  const { token, user } = useAuth();
  // Unverified landlords cannot save room edits (API returns 403) — see BUG-09.
  const needsVerification = !user?.is_verified;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();
  const [uploading, setUploading] = useState(false);

  const roomId = Number(id);
  const propertyIdNumber = propertyId ? Number(propertyId) : null;
  // Reached from the property rooms page, this editor lives under the listing
  // path only because that is where its file-based route sits; saving must send
  // the landlord back to the property's rooms, not the listing edit form.
  const openedFromRooms = from === 'rooms';

  const rooms = useQuery({
    queryKey: ['landlord-rooms', propertyIdNumber],
    queryFn: () => getRooms(token!, propertyIdNumber!),
    enabled: Boolean(token && propertyIdNumber),
  });

  const room = rooms.data?.data.rooms.find(r => r.id === roomId);

  const [form, setForm] = useState({
    room_number: '',
    room_type: '',
    price: '',
    deposit: '',
    status: 'available',
    capacity: '1',
    occupied: '0',
    description: '',
    size: '',
  });
  const [seeded, setSeeded] = useState(false);

  if (room && !seeded) {
    setForm({
      room_number: room.room_number ?? '',
      room_type: room.room_type ?? '',
      price: String(room.price ?? 0),
      deposit: String(room.deposit ?? 0),
      status: room.status ?? 'available',
      capacity: String(room.capacity ?? 1),
      occupied: String(room.occupied ?? 0),
      description: room.description ?? '',
      size: room.size == null ? '' : String(room.size),
    });
    setSeeded(true);
  }

  const submit = useMutation({
    mutationFn: () =>
      updateRoom(token!, roomId, {
        ...form,
        price: Number(form.price),
        deposit: Number(form.deposit),
        capacity: Number(form.capacity),
        occupied: Number(form.occupied),
        size: form.size === '' ? undefined : Number(form.size),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-rooms', propertyIdNumber] });
      setPendingToast('success', 'Room updated.');
      void (openedFromRooms
        ? navigate({
            to: '/landlord/properties/$id/rooms',
            params: { id: String(propertyIdNumber) },
          })
        : navigate({
            to: '/landlord/listings/$id/edit',
            params: { id: String(propertyIdNumber) },
          }));
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update room.'),
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setPhotoError(null);
    setUploading(true);
    uploadRoomPhotos(token!, roomId, files)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['landlord-rooms', propertyIdNumber] });
        push({ tone: 'success', message: 'Photos uploaded.' });
      })
      .catch(err =>
        setPhotoError(err instanceof ApiRequestError ? err.message : 'Failed to upload photos.')
      )
      .finally(() => setUploading(false));
    e.target.value = '';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (needsVerification) return;

    setError(null);
    submit.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      {rooms.isLoading ? (
        <Spinner />
      ) : !propertyIdNumber ? (
        <div>
          <ErrorState message="This page needs a propertyId query parameter to load the room." />
          <Link
            to="/landlord/listings"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            ← Back to listings
          </Link>
        </div>
      ) : rooms.error ? (
        <ErrorState message={rooms.error.message} />
      ) : !room ? (
        <ErrorState message="Room not found" />
      ) : (
        <div>
          <Link
            to={openedFromRooms ? '/landlord/properties/$id/rooms' : '/landlord/listings/$id/edit'}
            params={{ id: String(propertyIdNumber) }}
            className="mb-4 inline-block text-sm text-primary hover:underline"
          >
            {openedFromRooms ? '← Back to rooms' : '← Back to listing'}
          </Link>
          <PageHeader icon="book" title={`Edit room ${room.room_number}`} />

          {needsVerification ? <VerificationNotice /> : null}

          {error ? (
            <div className="mb-4">
              <ErrorState message={error} />
            </div>
          ) : null}

          <Card>
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Room number" htmlFor="room_number">
                  <TextInput
                    id="room_number"
                    required
                    value={form.room_number}
                    onChange={e => set('room_number', e.target.value)}
                  />
                </Field>
                <Field label="Room type" htmlFor="room_type">
                  <SelectInput
                    id="room_type"
                    value={form.room_type}
                    onChange={e => set('room_type', e.target.value)}
                  >
                    <option value="">Select type</option>
                    <option value="private">Private</option>
                    <option value="shared">Shared</option>
                    <option value="dorm">Dorm</option>
                  </SelectInput>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Monthly rent (₱)" htmlFor="price">
                  <TextInput
                    id="price"
                    type="number"
                    min={0}
                    required
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                  />
                </Field>
                <Field label="Deposit (₱)" htmlFor="deposit">
                  <TextInput
                    id="deposit"
                    type="number"
                    min={0}
                    value={form.deposit}
                    onChange={e => set('deposit', e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Capacity" htmlFor="capacity">
                  <TextInput
                    id="capacity"
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={form.capacity}
                    onChange={e => set('capacity', e.target.value)}
                  />
                </Field>
                {/* Occupancy is a booking-driven count (confirmed booking +1,
                    approved leave -1) that the landlord can correct here. */}
                <Field label="Occupied now" htmlFor="occupied">
                  <TextInput
                    id="occupied"
                    type="number"
                    min={0}
                    max={Number(form.capacity) || 10}
                    value={form.occupied}
                    onChange={e => set('occupied', e.target.value)}
                  />
                </Field>
                <Field label="Size (m²)" htmlFor="size">
                  <TextInput
                    id="size"
                    type="number"
                    min={0}
                    value={form.size}
                    onChange={e => set('size', e.target.value)}
                  />
                </Field>
                <Field label="Status" htmlFor="status">
                  <SelectInput
                    id="status"
                    value={form.status}
                    onChange={e => set('status', e.target.value)}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </SelectInput>
                </Field>
              </div>

              <p className="text-xs text-gray-ink">
                {Math.max(Number(form.capacity) - Number(form.occupied), 0)} of {form.capacity || 1}{' '}
                slots free for boarders.
              </p>

              <Field label="Description" htmlFor="description">
                <TextArea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                />
              </Field>

              <Button type="submit" disabled={submit.isPending || needsVerification}>
                {needsVerification
                  ? 'Verify your account to save'
                  : submit.isPending
                  ? 'Saving…'
                  : 'Save changes'}
              </Button>
            </form>

            <section className="mt-8">
              <h2 className="text-lg font-semibold tracking-tight">Photos</h2>
              {photoError ? (
                <div className="mt-2">
                  <ErrorState message={photoError} />
                </div>
              ) : null}
              <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-border-strong p-4 text-center text-sm transition-colors hover:bg-subtle">
                {uploading ? 'Uploading…' : 'Choose photos to upload (jpg/png/webp, max 5 MB each)'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotos}
                />
              </label>
              {room.photos.length > 0 ? (
                <ul className="mt-3 grid grid-cols-3 gap-2">
                  {room.photos.map(photo => (
                    <li key={photo.id} className="overflow-hidden rounded-xl border border-border">
                      <img src={photo.photo_url} alt="" className="h-24 w-full object-cover" />
                      {photo.is_cover ? (
                        <span className="block bg-primary-strong py-0.5 text-center text-xs text-white">
                          Cover
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </Card>
        </div>
      )}
    </div>
  );
}
