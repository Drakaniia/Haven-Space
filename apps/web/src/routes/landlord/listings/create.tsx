import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { VerificationNotice } from '../../../components/landlord/VerificationNotice';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Field, SelectInput, TextArea, TextInput } from '../../../components/ui/Field';
import { PageHeader } from '../../../components/ui/PageHeader';
import { RoomFormFields } from '../../../components/rooms/RoomFormFields';
import { ApiRequestError } from '../../../lib/api/http';
import { createListing, uploadRoomPhotos } from '../../../lib/api/landlord';
import { useAuth } from '../../../lib/auth-context';
import {
  MAX_ROOMS_PER_LISTING,
  areRoomDraftsValid,
  clampRoomCount,
  createRoomDrafts,
  resizeRoomDrafts,
  roomDraftErrors,
  roomDraftPayload,
  roomTypeForCapacity,
  roomsToDiscard,
  type RoomDefaults,
  type RoomDraft,
} from '../../../lib/room-drafts';
import { setPendingToast } from '../../../lib/toast';

export const Route = createFileRoute('/landlord/listings/create')({
  component: CreateListingPage,
});

const AMENITY_OPTIONS = [
  'WiFi',
  'Air conditioning',
  'Kitchen',
  'Laundry',
  'Parking',
  'CCTV',
  'Furnished',
  'Study area',
];

function CreateListingPage() {
  const { token, user } = useAuth();
  // Unverified landlords cannot save a listing (API returns 403), so gate the form
  // up front instead of letting them fill it in and fail at the end.
  const needsVerification = !user?.is_verified;
  const navigate = useNavigate();
  const [form, setForm] = useState({
    propertyName: '',
    propertyType: 'boarding-house',
    genderPreference: 'any',
    propertyDescription: '',
    propertyPrice: '',
    propertyDeposit: '',
    propertyRooms: '1',
    propertyCapacity: '1',
    propertyAddress: '',
    propertyCity: '',
    propertyProvince: '',
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [rooms, setRooms] = useState<RoomDraft[]>(() =>
    createRoomDrafts(1, { rent: '', deposit: '', capacity: '1' })
  );
  const [pendingShrink, setPendingShrink] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  /**
   * Property-level price/deposit/capacity are the defaults every new room box is
   * seeded from (spec D9). Rooms the landlord has already tuned keep their values.
   */
  function currentDefaults(): RoomDefaults {
    return {
      rent: form.propertyPrice,
      deposit: form.propertyDeposit,
      capacity: form.propertyCapacity,
    };
  }

  const submit = useMutation({
    mutationFn: async () => {
      const result = await createListing(token!, {
        ...form,
        propertyPrice: Number(form.propertyPrice),
        propertyDeposit: Number(form.propertyDeposit),
        propertyRooms: rooms.length,
        propertyCapacity: Number(form.propertyCapacity),
        amenities,
        rooms: rooms.map(roomDraftPayload),
      });

      // Photos are held in memory until the listing exists (spec D11): rooms are
      // created with the listing, then each room's photos go to that room.
      const roomIds = Array.isArray(result.data?.room_ids) ? result.data.room_ids : [];
      const withPhotos = rooms
        .map((draft, index) => ({ draft, roomId: Number(roomIds[index]) }))
        .filter(entry => entry.draft.photos.length > 0 && Number.isFinite(entry.roomId));
      const failed: string[] = [];

      for (const [index, entry] of withPhotos.entries()) {
        setProgress(`Uploading photos… ${index + 1} of ${withPhotos.length}`);
        try {
          await uploadRoomPhotos(token!, entry.roomId, entry.draft.photos);
        } catch {
          failed.push(entry.draft.name);
        }
      }

      return { id: result.data.id, failed };
    },
    onSuccess: ({ id, failed }) => {
      if (failed.length > 0) {
        setPendingToast(
          'error',
          `Listing created, but photos for ${failed.join(
            ', '
          )} failed — add them from the edit page.`
        );
        void navigate({ to: '/landlord/listings/$id/edit', params: { id: String(id) } });
        return;
      }

      setPendingToast('success', 'Listing created!');
      // The single property list (`landlord-property-detail-page` R4/D2).
      void navigate({ to: '/landlord/properties' });
    },
    onError: err => {
      setProgress(null);
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create listing.');
    },
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  /** Property rent/deposit sync into rooms that still carry the old default. */
  function syncRoomDefaults(
    key: 'propertyPrice' | 'propertyDeposit' | 'propertyCapacity',
    previous: string,
    value: string
  ) {
    const roomField =
      key === 'propertyPrice' ? 'price' : key === 'propertyDeposit' ? 'deposit' : 'capacity';
    const previousCapacity = Number(previous);

    setRooms(list =>
      list.map(room => {
        if (room[roomField] !== previous) {
          return room;
        }

        if (key === 'propertyCapacity') {
          const type =
            room.type === roomTypeForCapacity(Number(previous))
              ? roomTypeForCapacity(Number(value))
              : room.type;

          return { ...room, capacity: value, type };
        }

        return { ...room, [roomField]: value };
      })
    );
  }

  function changeRoomCount(value: string) {
    set('propertyRooms', value);

    const target = clampRoomCount(value);
    const discarded = roomsToDiscard(rooms, target);

    if (discarded.length > 0) {
      setPendingShrink(target);
      return;
    }

    setRooms(prev => resizeRoomDrafts(prev, target, currentDefaults()));
  }

  function updateRoom(key: string, patch: Partial<RoomDraft>) {
    setRooms(prev => prev.map(room => (room.key === key ? { ...room, ...patch } : room)));
  }

  function toggleAmenity(amenity: string) {
    setAmenities(list =>
      list.includes(amenity) ? list.filter(a => a !== amenity) : [...list, amenity]
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (needsVerification) return;

    if (rooms.length === 0 || !areRoomDraftsValid(rooms)) {
      setError('Fix the room details before creating the listing.');
      return;
    }

    setError(null);
    setProgress('Creating listing…');
    submit.mutate();
  }

  const roomCountHint = Number(form.propertyRooms) > MAX_ROOMS_PER_LISTING;
  const roomsValid = rooms.length > 0 && areRoomDraftsValid(rooms);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/landlord/properties"
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        ← Back to properties
      </Link>
      <PageHeader
        icon="list"
        title="Create listing"
      />

      {needsVerification ? <VerificationNotice /> : null}

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <Card>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <Field label="Property name" htmlFor="propertyName">
            <TextInput
              id="propertyName"
              required
              value={form.propertyName}
              onChange={e => set('propertyName', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Property type" htmlFor="propertyType">
              <SelectInput
                id="propertyType"
                value={form.propertyType}
                onChange={e => set('propertyType', e.target.value)}
              >
                <option value="boarding-house">Boarding house</option>
                <option value="apartment">Apartment</option>
                <option value="dormitory">Dormitory</option>
              </SelectInput>
            </Field>
            <Field label="Gender preference" htmlFor="genderPreference">
              <SelectInput
                id="genderPreference"
                value={form.genderPreference}
                onChange={e => set('genderPreference', e.target.value)}
              >
                <option value="any">Any</option>
                <option value="male">Male only</option>
                <option value="female">Female only</option>
              </SelectInput>
            </Field>
          </div>

          <Field label="Description" htmlFor="propertyDescription">
            <TextArea
              id="propertyDescription"
              rows={4}
              required
              value={form.propertyDescription}
              onChange={e => set('propertyDescription', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly rent (₱)" htmlFor="propertyPrice">
              <TextInput
                id="propertyPrice"
                type="number"
                min={0}
                required
                value={form.propertyPrice}
                onChange={e => {
                  const value = e.target.value;
                  const previous = form.propertyPrice;
                  set('propertyPrice', value);
                  syncRoomDefaults('propertyPrice', previous, value);
                }}
              />
            </Field>
            <Field label="Deposit (₱)" htmlFor="propertyDeposit">
              <TextInput
                id="propertyDeposit"
                type="number"
                min={0}
                required
                value={form.propertyDeposit}
                onChange={e => {
                  const value = e.target.value;
                  const previous = form.propertyDeposit;
                  set('propertyDeposit', value);
                  syncRoomDefaults('propertyDeposit', previous, value);
                }}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Number of rooms"
              htmlFor="propertyRooms"
              error={
                roomCountHint
                  ? `Maximum ${MAX_ROOMS_PER_LISTING} rooms at a time — add more from the edit page.`
                  : null
              }
            >
              <TextInput
                id="propertyRooms"
                type="number"
                min={1}
                max={MAX_ROOMS_PER_LISTING}
                required
                value={form.propertyRooms}
                onChange={e => changeRoomCount(e.target.value)}
              />
            </Field>
            <div>
              <Field label="Capacity per room (default)" htmlFor="propertyCapacity">
                <TextInput
                  id="propertyCapacity"
                  type="number"
                  min={1}
                  required
                  value={form.propertyCapacity}
                  onChange={e => {
                    const value = e.target.value;
                    const previous = form.propertyCapacity;
                    set('propertyCapacity', value);
                    syncRoomDefaults('propertyCapacity', previous, value);
                  }}
                />
              </Field>
              <p className="mt-1 text-xs text-gray-ink">
                Starting capacity for every new room above.
              </p>
            </div>
          </div>

          <section aria-label="Rooms" className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Rooms</h2>
              <p className="mt-1 text-sm text-gray-ink">
                One box per room: tenant capacity, room type, rent, and photos. Boarders see each
                room with its picture and how many slots are still free.
              </p>
            </div>

            {rooms.map((room, index) => (
              <RoomFormFields
                key={room.key}
                draft={room}
                index={index}
                errors={roomDraftErrors(room, rooms)}
                disabled={submit.isPending || needsVerification}
                onChange={patch => updateRoom(room.key, patch)}
                onAddPhotos={files => updateRoom(room.key, { photos: [...room.photos, ...files] })}
                onRemovePhoto={photoIndex =>
                  updateRoom(room.key, {
                    photos: room.photos.filter((_, i) => i !== photoIndex),
                  })
                }
              />
            ))}
          </section>

          <Field label="Street address" htmlFor="propertyAddress">
            <TextInput
              id="propertyAddress"
              required
              value={form.propertyAddress}
              onChange={e => set('propertyAddress', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City" htmlFor="propertyCity">
              <TextInput
                id="propertyCity"
                required
                value={form.propertyCity}
                onChange={e => set('propertyCity', e.target.value)}
              />
            </Field>
            <Field label="Province" htmlFor="propertyProvince">
              <TextInput
                id="propertyProvince"
                required
                value={form.propertyProvince}
                onChange={e => set('propertyProvince', e.target.value)}
              />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Amenities</p>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-all duration-100 ease-out active:scale-[0.96] ${
                    amenities.includes(amenity)
                      ? 'bg-primary-strong text-white'
                      : 'bg-subtle text-gray-ink hover:bg-subtle'
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={submit.isPending || needsVerification || !roomsValid}>
            {needsVerification
              ? 'Verify your account to publish'
              : submit.isPending
              ? progress ?? 'Creating…'
              : roomsValid
              ? `Create listing (${rooms.length} room${rooms.length === 1 ? '' : 's'})`
              : 'Complete every room to publish'}
          </Button>
        </form>
      </Card>

      <ConfirmDialog
        open={pendingShrink !== null}
        title="Remove rooms"
        message={
          <>
            {roomsToDiscard(rooms, pendingShrink ?? rooms.length)
              .map(room => room.name)
              .join(', ')}{' '}
            will be removed and their details discarded.
          </>
        }
        confirmLabel="Remove rooms"
        onConfirm={() => {
          setRooms(prev => resizeRoomDrafts(prev, pendingShrink ?? prev.length, currentDefaults()));
          setPendingShrink(null);
        }}
        onCancel={() => {
          set('propertyRooms', String(rooms.length));
          setPendingShrink(null);
        }}
      />
    </div>
  );
}
