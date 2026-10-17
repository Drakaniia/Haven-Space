import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Field, SelectInput, TextInput } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { ApiRequestError } from '../../lib/api/http';
import { createRoom, uploadRoomPhotos } from '../../lib/api/landlord';
import type { LandlordRoom } from '../../lib/types';

/**
 * The add-room dialog, shared by every landlord surface that can create a room
 * (`landlord-rooms-grid` D17): the property's rooms page and the compact
 * `LandlordRoomList` still used by the listing edit page.
 *
 * It owns the form, the `POST /api/landlord/rooms` call and the follow-up
 * `POST /api/landlord/rooms/{id}/photos` upload — the same order the create-listing
 * page uses for a room created while creating a property (D29–D31), because room
 * photos can only be attached once the room exists. Callers keep their own
 * query invalidation and toasts through `onCreated`, so each surface still says
 * what it always said.
 */

export interface AddRoomForm {
  room_number: string;
  room_type: string;
  price: string;
  deposit: string;
  capacity: string;
}

export const EMPTY_ROOM_FORM: AddRoomForm = {
  room_number: '',
  room_type: 'private',
  price: '',
  deposit: '',
  capacity: '1',
};

/** Mirrors the room photo rules used while creating a property (5 MB, these three types). */
export const MAX_COVER_PHOTO_BYTES = 5 * 1024 * 1024;
export const COVER_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
const ACCEPTED_PHOTO_TYPES = COVER_PHOTO_ACCEPT.split(',');

/** Pure so the rule can be asserted without a DOM; returns null when the file is fine. */
export function coverPhotoError(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return 'Cover photo must be a jpg, png or webp image.';
  }

  if (file.size > MAX_COVER_PHOTO_BYTES) {
    return 'Cover photo must be 5 MB or smaller.';
  }

  return null;
}

export function RoomFormModal({
  open,
  token,
  propertyId,
  onClose,
  onCreated,
}: {
  open: boolean;
  token: string;
  propertyId: number;
  onClose: () => void;
  /** The room exists at this point; `photoFailed` is true when only the upload failed (D30/R28). */
  onCreated: (room: LandlordRoom, photoFailed: boolean) => void;
}) {
  const [form, setForm] = useState<AddRoomForm>(EMPTY_ROOM_FORM);
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A reopened dialog always starts clean, so a failed attempt never leaks into
  // the next room (the modal stays mounted while closed).
  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_ROOM_FORM);
    setCoverPhoto(null);
    setError(null);
    setBusy(false);
  }, [open]);

  function handleCoverPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!file) return;

    const problem = coverPhotoError(file);

    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setCoverPhoto(file);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (busy) return;

    setError(null);
    setBusy(true);

    try {
      const created = await createRoom(token, {
        property_id: propertyId,
        room_number: form.room_number.trim(),
        room_type: form.room_type,
        price: Number(form.price),
        deposit: form.deposit === '' ? 0 : Number(form.deposit),
        capacity: Number(form.capacity),
      });

      if (!created.data?.id) {
        throw new Error('The room was created but the server did not return it.');
      }

      let photoFailed = false;

      if (coverPhoto) {
        try {
          await uploadRoomPhotos(token, created.data.id, [coverPhoto]);
        } catch {
          // The room is real either way — the caller reports the partial success
          // instead of pretending the whole submit failed (R28).
          photoFailed = true;
        }
      }

      onCreated(created.data, photoFailed);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to add room.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Add a room" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-md bg-error-tint px-3 py-2 text-sm text-error-ink">{error}</div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Room number" htmlFor="room_number">
            <TextInput
              id="room_number"
              required
              disabled={busy}
              value={form.room_number}
              onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))}
            />
          </Field>
          <Field label="Room type" htmlFor="room_type">
            <SelectInput
              id="room_type"
              disabled={busy}
              value={form.room_type}
              onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}
            >
              <option value="private">Private</option>
              <option value="shared">Shared</option>
              <option value="dorm">Dorm</option>
            </SelectInput>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Monthly rent (₱)" htmlFor="room_price">
            <TextInput
              id="room_price"
              type="number"
              min={0}
              required
              disabled={busy}
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            />
          </Field>
          <Field label="Deposit (₱)" htmlFor="room_deposit">
            <TextInput
              id="room_deposit"
              type="number"
              min={0}
              disabled={busy}
              value={form.deposit}
              onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))}
            />
          </Field>
          <Field label="Capacity" htmlFor="room_capacity">
            <TextInput
              id="room_capacity"
              type="number"
              min={1}
              required
              disabled={busy}
              value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
            />
          </Field>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-ink">
            Cover photo <span className="font-normal text-gray-ink">(optional)</span>
          </span>

          {coverPhoto ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-cream px-3 py-2 text-sm text-gray-ink">
              <span className="truncate">{coverPhoto.name}</span>
              <button
                type="button"
                aria-label={`Remove ${coverPhoto.name}`}
                disabled={busy}
                onClick={() => setCoverPhoto(null)}
                className="shrink-0 rounded-full px-2 transition-all hover:bg-subtle active:scale-[0.94]"
              >
                ✕
              </button>
            </div>
          ) : (
            <label
              htmlFor="room_cover_photo"
              className="block cursor-pointer rounded-xl border border-dashed border-border-strong p-3 text-center text-sm transition-colors hover:bg-subtle"
            >
              Add a cover photo (jpg/png/webp, max 5 MB)
              <input
                id="room_cover_photo"
                type="file"
                accept={COVER_PHOTO_ACCEPT}
                className="hidden"
                disabled={busy}
                onChange={handleCoverPhoto}
              />
            </label>
          )}
        </div>

        <Button type="submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add room'}
        </Button>
      </form>
    </Modal>
  );
}
