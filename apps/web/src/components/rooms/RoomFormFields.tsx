import { useState, type ChangeEvent } from 'react';
import { Field, SelectInput, TextArea, TextInput } from '../ui/Field';
import {
  MAX_ROOM_CAPACITY,
  MAX_ROOM_PHOTOS,
  MIN_ROOM_CAPACITY,
  RECOMMENDED_ROOM_PHOTOS,
  ROOM_STATUS_OPTIONS,
  ROOM_TYPE_OPTIONS,
  roomDraftSummary,
  type RoomDraft,
} from '../../lib/room-drafts';

/**
 * One inline room form on the create-listing page (spec
 * `create-listing-room-details` R1–R4). Plain page content — no modal, no portal
 * — built from the shared `Field` / `TextInput` / `SelectInput` primitives so it
 * matches every other landlord form.
 */
export function RoomFormFields({
  draft,
  index,
  errors,
  disabled,
  onChange,
  onAddPhotos,
  onRemovePhoto,
}: {
  draft: RoomDraft;
  index: number;
  errors: string[];
  disabled?: boolean;
  onChange: (patch: Partial<RoomDraft>) => void;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (photoIndex: number) => void;
}) {
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const fieldId = (name: string) => `room-${index}-${name}`;
  const needsPhotos = draft.photos.length < RECOMMENDED_ROOM_PHOTOS;

  function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);

    if (picked.length > 0) {
      const remaining = MAX_ROOM_PHOTOS - draft.photos.length;
      const accepted = picked.slice(0, Math.max(remaining, 0));

      setPhotoNotice(
        picked.length > accepted.length
          ? `Only ${MAX_ROOM_PHOTOS} photos per room — the extra files were skipped.`
          : null
      );

      if (accepted.length > 0) {
        onAddPhotos(accepted);
      }
    }

    event.target.value = '';
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold tracking-tight text-ink">Room {index + 1}</h3>
        <p className="text-xs text-gray-ink">{roomDraftSummary(draft)}</p>
      </div>

      {errors.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 rounded-xl bg-error-tint px-3 py-2 text-sm text-error-ink">
          {errors.map(error => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Field label="Room name / number" htmlFor={fieldId('name')}>
          <TextInput
            id={fieldId('name')}
            required
            disabled={disabled}
            value={draft.name}
            onChange={event => onChange({ name: event.target.value })}
          />
        </Field>
        <Field label="Room type" htmlFor={fieldId('type')}>
          <SelectInput
            id={fieldId('type')}
            disabled={disabled}
            value={draft.type}
            onChange={event => onChange({ type: event.target.value as RoomDraft['type'] })}
          >
            {ROOM_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Tenant capacity" htmlFor={fieldId('capacity')}>
          <TextInput
            id={fieldId('capacity')}
            type="number"
            min={MIN_ROOM_CAPACITY}
            max={MAX_ROOM_CAPACITY}
            required
            disabled={disabled}
            value={draft.capacity}
            onChange={event => onChange({ capacity: event.target.value })}
          />
        </Field>
        <Field label="Monthly rent (₱)" htmlFor={fieldId('price')}>
          <TextInput
            id={fieldId('price')}
            type="number"
            min={0}
            required
            disabled={disabled}
            value={draft.price}
            onChange={event => onChange({ price: event.target.value })}
          />
        </Field>
        <Field label="Deposit (₱)" htmlFor={fieldId('deposit')}>
          <TextInput
            id={fieldId('deposit')}
            type="number"
            min={0}
            disabled={disabled}
            value={draft.deposit}
            onChange={event => onChange({ deposit: event.target.value })}
          />
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Size (m²)" htmlFor={fieldId('size')}>
          <TextInput
            id={fieldId('size')}
            type="number"
            min={0}
            disabled={disabled}
            value={draft.size}
            onChange={event => onChange({ size: event.target.value })}
          />
        </Field>
        <Field label="Status" htmlFor={fieldId('status')}>
          <SelectInput
            id={fieldId('status')}
            disabled={disabled}
            value={draft.status}
            onChange={event => onChange({ status: event.target.value as RoomDraft['status'] })}
          >
            {ROOM_STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="col-span-2 sm:col-span-1">
          <p className="mb-1 block text-sm font-medium text-ink">Occupied now</p>
          <p className="rounded-xl border border-border bg-subtle px-3 py-2 text-base text-gray-ink">
            0 of {draft.capacity || 1} slots taken
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Field label="Description" htmlFor={fieldId('description')}>
          <TextArea
            id={fieldId('description')}
            rows={2}
            disabled={disabled}
            value={draft.description}
            onChange={event => onChange({ description: event.target.value })}
          />
        </Field>
      </div>

      <section className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink">Photos</p>
          <p className="text-xs text-gray-ink">
            {draft.photos.length} of {MAX_ROOM_PHOTOS} · {RECOMMENDED_ROOM_PHOTOS} recommended
          </p>
        </div>

        <label className="mt-2 block cursor-pointer rounded-xl border border-dashed border-border-strong p-3 text-center text-sm transition-colors hover:bg-subtle">
          {draft.photos.length >= MAX_ROOM_PHOTOS
            ? 'Photo limit reached'
            : 'Add room photos (jpg/png/webp, max 5 MB each)'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={disabled || draft.photos.length >= MAX_ROOM_PHOTOS}
            onChange={handlePhotos}
          />
        </label>

        {needsPhotos ? (
          <p className="mt-2 text-xs text-warning-ink">
            Add at least {RECOMMENDED_ROOM_PHOTOS} photos so boarders know what they&apos;re renting
            — you can still save without them.
          </p>
        ) : null}

        {photoNotice ? <p className="mt-2 text-xs text-warning-ink">{photoNotice}</p> : null}

        {draft.photos.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {draft.photos.map((photo, photoIndex) => (
              <li
                key={`${photo.name}-${photoIndex}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-cream px-2 py-1 text-xs text-gray-ink"
              >
                <span className="max-w-[12rem] truncate">{photo.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${photo.name}`}
                  disabled={disabled}
                  onClick={() => onRemovePhoto(photoIndex)}
                  className="rounded-full px-1 transition-all hover:bg-subtle active:scale-[0.94]"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
