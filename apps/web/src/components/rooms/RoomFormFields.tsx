import { useState } from 'react';
import { Field, SelectInput, TextArea, TextInput } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { PhotoDropzone } from '../properties/ListingFormParts';
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
 *
 * Layout: a numbered header with the live summary, then three rows — identity
 * (name, type), money and size (capacity, rent, deposit, size), and state
 * (status, occupancy, description) — then the photo area.
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
  const full = draft.photos.length >= MAX_ROOM_PHOTOS;
  const invalid = errors.length > 0;

  function handlePhotos(picked: File[]) {
    if (picked.length === 0) return;

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

  return (
    <div
      className={`rounded-2xl border bg-surface ${invalid ? 'border-error-border' : 'border-border'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3 sm:px-5">
        <h3 className="flex items-center gap-2.5 font-semibold text-ink">
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold tabular ${
              invalid ? 'bg-error-tint text-error-ink' : 'bg-mint text-primary-dark'
            }`}
          >
            {index + 1}
          </span>
          Room {index + 1}
        </h3>
        <p className="text-xs text-gray-ink tabular">{roomDraftSummary(draft)}</p>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {invalid ? (
          <ul
            role="alert"
            className="flex flex-col gap-1 rounded-xl border border-error-border bg-error-tint px-3.5 py-2.5 text-sm text-error-ink"
          >
            {errors.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Field label="Room name / number" htmlFor={fieldId('name')}>
            <TextInput
              id={fieldId('name')}
              required
              disabled={disabled}
              placeholder="e.g. Room 1 or Corner suite"
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

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Field label="Tenant capacity" htmlFor={fieldId('capacity')}>
            <TextInput
              id={fieldId('capacity')}
              type="number"
              inputMode="numeric"
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
              inputMode="numeric"
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
              inputMode="numeric"
              min={0}
              disabled={disabled}
              value={draft.deposit}
              onChange={event => onChange({ deposit: event.target.value })}
            />
          </Field>
          <Field label="Size (m²)" htmlFor={fieldId('size')}>
            <TextInput
              id={fieldId('size')}
              type="number"
              inputMode="decimal"
              min={0}
              disabled={disabled}
              placeholder="Optional"
              value={draft.size}
              onChange={event => onChange({ size: event.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div>
            <p className="mb-1.5 block text-sm font-semibold text-ink">Occupied now</p>
            <p className="flex h-[2.875rem] items-center rounded-xl border border-border bg-subtle px-3.5 text-base text-gray-ink tabular">
              0 of {draft.capacity || 1} slots taken
            </p>
          </div>
        </div>

        <Field label="Description" htmlFor={fieldId('description')}>
          <TextArea
            id={fieldId('description')}
            rows={2}
            disabled={disabled}
            placeholder="Bed setup, window, private bathroom…"
            value={draft.description}
            onChange={event => onChange({ description: event.target.value })}
          />
        </Field>

        <section className="flex flex-col gap-2" aria-label={`Room ${index + 1} photos`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Photos</p>
            <p className="text-xs text-gray-ink tabular">
              {draft.photos.length} of {MAX_ROOM_PHOTOS} · {RECOMMENDED_ROOM_PHOTOS} recommended
            </p>
          </div>

          <PhotoDropzone
            compact
            inputId={fieldId('photos')}
            title="Add room photos"
            hint="jpg, png or webp · max 5 MB each · drag files here or click to browse"
            full={full}
            disabled={disabled}
            onFiles={handlePhotos}
          />

          {needsPhotos ? (
            <p className="flex items-start gap-1.5 text-xs text-warning-ink">
              <Icon name="lightbulb" size={14} className="mt-px shrink-0" />
              <span>
                Add at least {RECOMMENDED_ROOM_PHOTOS} photos so boarders know what they&apos;re
                renting — you can still save without them.
              </span>
            </p>
          ) : null}

          {photoNotice ? (
            <p role="status" className="text-xs text-warning-ink">
              {photoNotice}
            </p>
          ) : null}

          {draft.photos.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {draft.photos.map((photo, photoIndex) => (
                <li
                  key={`${photo.name}-${photoIndex}`}
                  className="flex items-center gap-2 rounded-lg border border-border bg-cream py-1 pl-2.5 pr-1 text-xs text-gray-ink"
                >
                  <Icon name="photo" size={14} className="shrink-0 text-primary" />
                  <span className="max-w-[12rem] truncate">{photo.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${photo.name}`}
                    disabled={disabled}
                    onClick={() => onRemovePhoto(photoIndex)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-subtle hover:text-error-ink"
                  >
                    <Icon name="close" size={12} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  );
}
