import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { VerificationNotice } from '../../../../components/landlord/VerificationNotice';
import { Button, buttonClasses } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Icon } from '../../../../components/ui/Icon';
import { Field, SelectInput, TextArea, TextInput } from '../../../../components/ui/Field';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Spinner } from '../../../../components/ui/Spinner';
import { ApiRequestError } from '../../../../lib/api/http';
import {
  getProperty,
  getRooms,
  updateListing,
  uploadPropertyPhotos,
} from '../../../../lib/api/landlord';
import { useAuth } from '../../../../lib/auth-context';
import {
  DEFAULT_LISTING_STATUS,
  LISTING_STATUS_OPTIONS,
  NOT_VISIBLE_TO_BOARDERS,
  PUBLISH_NEEDS_ROOM,
  listingModerationHint,
  listingUpdatePayload,
  sharedPricingState,
  sharedPricingSummary,
  toListingStatusValue,
  type ListingStatusValue,
} from '../../../../lib/listing-status';
import { setPendingToast } from '../../../../lib/toast';
import { ToastStack, useToasts } from '../../../../components/ui/Toast';

export const Route = createFileRoute('/landlord/listings/$id/edit')({
  component: EditListingPage,
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

/**
 * One titled block of the edit form. Sections carry their own heading and sit
 * inside a `divide-y` parent, so a long form reads as a few scannable groups
 * instead of one undifferentiated column of inputs.
 */
function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-6 first:pt-0 last:pb-0">
      <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

/**
 * Selectable amenity pill. `aria-pressed` carries the state for assistive tech;
 * the filled fill and the check mark carry it visually, so selection never
 * depends on colour alone.
 */
function AmenityToggle({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.97] ${
        selected
          ? 'border-primary-strong bg-primary-strong text-white'
          : 'border-border-strong bg-surface text-gray-ink hover:border-primary hover:bg-mint hover:text-primary'
      }`}
    >
      {selected ? <Icon name="check" size={14} /> : null}
      {label}
    </button>
  );
}

/**
 * The property-wide public information form (`edit-listing-property-info`).
 *
 * Rooms are **not** editable here: they are managed on the dedicated rooms page
 * (`/landlord/properties/$id/rooms`), so this form only reads the room rows to
 * derive the shared-pricing state and the publish precondition. It never sends
 * `total_rooms`/`capacity` — the old PUT path that created, deleted and re-priced
 * rooms in bulk (`D8`).
 */
function EditListingPage() {
  const { id } = Route.useParams();
  const { token, user } = useAuth();
  // Unverified landlords cannot save edits (API returns 403) — see BUG-09.
  const needsVerification = !user?.is_verified;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();
  const [uploading, setUploading] = useState(false);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);

  const propertyId = Number(id);

  const property = useQuery({
    queryKey: ['landlord-property', propertyId],
    queryFn: () => getProperty(token!, propertyId),
    enabled: Boolean(token),
  });

  // The rooms are read-only context here: they decide whether the rent can be
  // presented as shared (D6) and whether publishing is allowed (R9). Rooms are
  // managed on the dedicated rooms page, so this form never renders or edits them.
  const rooms = useQuery({
    queryKey: ['landlord-rooms', propertyId],
    queryFn: () => getRooms(token!, propertyId),
    enabled: Boolean(token),
  });
  const roomRows = rooms.data?.data.rooms ?? [];

  const [form, setForm] = useState<{
    name: string;
    type: string;
    gender_preference: string;
    description: string;
    price: string;
    deposit: string;
    address: string;
    city: string;
    province: string;
    status: ListingStatusValue;
  }>({
    name: '',
    type: 'boarding-house',
    gender_preference: 'any',
    description: '',
    price: '',
    deposit: '',
    address: '',
    city: '',
    province: '',
    status: DEFAULT_LISTING_STATUS,
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [sharedPricing, setSharedPricing] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [pricingSeeded, setPricingSeeded] = useState(false);

  // Seed the form once the property detail loads.
  const detail = property.data?.data as Record<string, unknown> | undefined;
  if (detail && !seeded) {
    setForm({
      name: String(detail.name ?? ''),
      type: String(detail.type ?? 'boarding-house'),
      gender_preference: String(detail.gender_preference ?? 'any'),
      description: String(detail.description ?? ''),
      price: String(Number(detail.monthlyPayment ?? detail.price ?? 0)),
      deposit: String(Number(detail.monthlyDeposit ?? detail.deposit ?? 0)),
      address: String(detail.address ?? ''),
      city: String(detail.city ?? ''),
      province: String(detail.province ?? ''),
      status: toListingStatusValue(detail.status, detail.listing_moderation_status as string),
    });
    setAmenities(
      Array.isArray(detail.amenities)
        ? detail.amenities.map(a => String(a)).filter(a => AMENITY_OPTIONS.includes(a))
        : []
    );
    setSeeded(true);
  }

  // The toggle's initial state comes from the rooms and is **not persisted** (D6):
  // it says whether the property's rent can honestly be presented as shared, so a
  // later room change must not silently flip it while the landlord is editing.
  const pricing = sharedPricingState(roomRows);
  if (rooms.isSuccess && !pricingSeeded) {
    setSharedPricing(pricing.shared);
    setPricingSeeded(true);
  }

  const photos: string[] = Array.isArray(detail?.photos) ? detail.photos.map(p => String(p)) : [];

  // Only the primary owner receives this field from the API.
  const authorizedLandlords = Array.isArray(detail?.authorized_landlords)
    ? detail.authorized_landlords.map(landlord => {
        const record = landlord as Record<string, unknown>;
        return {
          id: Number(record.id),
          name: `${String(record.first_name ?? '')} ${String(record.last_name ?? '')}`.trim(),
          email: String(record.email ?? ''),
          granted_at: String(record.granted_at ?? ''),
        };
      })
    : null;

  const moderationHint = listingModerationHint(
    detail?.listing_moderation_status as string | undefined,
    form.status
  );

  function formatWhen(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }

  const submit = useMutation({
    // An allow-list, never `...form` (R2): the payload can no longer carry room
    // fields, and price/deposit only travel while pricing is claimed as shared.
    mutationFn: () =>
      updateListing(token!, propertyId, {
        ...listingUpdatePayload(form, { sharedPricing }),
        amenities,
        photos_to_delete: photosToDelete,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-property', propertyId] });
      setPendingToast('success', 'Listing updated.');
      // Back to the property this listing belongs to — the list page it used to
      // return to no longer exists (`landlord-property-detail-page` D24).
      void navigate({ to: '/landlord/properties/$id', params: { id: String(propertyId) } });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update listing.'),
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function toggleAmenity(amenity: string) {
    setAmenities(list =>
      list.includes(amenity) ? list.filter(a => a !== amenity) : [...list, amenity]
    );
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setPhotoError(null);
    setUploading(true);
    uploadPropertyPhotos(token!, propertyId, files)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['landlord-property', propertyId] });
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

    // Publishing without a room would show boarders an empty listing (R9). The
    // room list is the source of truth, so the check waits for it to load rather
    // than blocking on an unfinished request.
    if (form.status === 'available' && rooms.isSuccess && roomRows.length === 0) {
      setError(PUBLISH_NEEDS_ROOM);
      return;
    }

    setError(null);
    submit.mutate();
  }

  if (property.isLoading) return <Spinner />;
  if (property.error) return <ErrorState message={property.error.message} />;

  if (!detail) return <ErrorState message="Property not found." />;

  return (
    <div className="mx-auto w-full max-w-[800px]">
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <PageHeader
        icon="list"
        title="Edit listing"
        actions={
          <>
            <Link
              to="/landlord/properties/$id"
              params={{ id: String(propertyId) }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Icon name="chevronLeft" size={16} />
              Back to property
            </Link>
            {/* Landlords preview the tenant view through the public listing page. */}
            <Link
              to="/rooms/$id"
              params={{ id: String(propertyId) }}
              className={buttonClasses({ variant: 'outline', size: 'sm' })}
            >
              Preview as boarder
              <Icon name="arrowRight" size={16} className="ml-1.5" />
            </Link>
          </>
        }
      />

      {form.status !== 'available' ? (
        <p className="mb-4 text-sm text-gray-ink">{NOT_VISIBLE_TO_BOARDERS}</p>
      ) : null}

      {needsVerification ? <VerificationNotice /> : null}

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <Card padding="p-0">
        <form onSubmit={handleSubmit}>
          <div className="divide-y divide-border px-6 py-6 sm:px-8 sm:py-8">
            <FormSection title="Basic information">
              <Field label="Property name" htmlFor="name">
                <TextInput
                  id="name"
                  required
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Property type" htmlFor="type">
                  <SelectInput
                    id="type"
                    value={form.type}
                    onChange={e => set('type', e.target.value)}
                  >
                    <option value="boarding-house">Boarding house</option>
                    <option value="apartment">Apartment</option>
                    <option value="dormitory">Dormitory</option>
                  </SelectInput>
                </Field>
                <Field label="Gender preference" htmlFor="gender_preference">
                  <SelectInput
                    id="gender_preference"
                    value={form.gender_preference}
                    onChange={e => set('gender_preference', e.target.value)}
                  >
                    <option value="any">Any</option>
                    <option value="male">Male only</option>
                    <option value="female">Female only</option>
                  </SelectInput>
                </Field>
              </div>

              <Field label="Description" htmlFor="description">
                <TextArea
                  id="description"
                  rows={6}
                  required
                  className="resize-y leading-relaxed"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                />
              </Field>
            </FormSection>

            <FormSection title="Pricing">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={sharedPricing}
                  onChange={e => setSharedPricing(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Same rent and deposit for every room
              </label>

              {sharedPricing ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                      required
                      value={form.deposit}
                      onChange={e => set('deposit', e.target.value)}
                    />
                  </Field>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-subtle px-4 py-3">
                  <p className="text-sm text-ink">{sharedPricingSummary(pricing)}</p>
                  <Link
                    to="/landlord/properties/$id/rooms"
                    params={{ id: String(propertyId) }}
                    className="mt-1 inline-block text-sm text-primary hover:underline"
                  >
                    Manage rooms →
                  </Link>
                </div>
              )}

              {/* The promise R3 makes, in the landlord's own words. */}
              <p className="text-xs text-gray-ink">
                Changing these values never rewrites an existing room&apos;s rent — they are the
                default for rooms you add later.
              </p>
            </FormSection>

            <FormSection title="Location">
              <Field label="Street address" htmlFor="address">
                <TextInput
                  id="address"
                  required
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="City" htmlFor="city">
                  <TextInput
                    id="city"
                    required
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                  />
                </Field>
                <Field label="Province" htmlFor="province">
                  <TextInput
                    id="province"
                    required
                    value={form.province}
                    onChange={e => set('province', e.target.value)}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Amenities">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Amenities">
                {AMENITY_OPTIONS.map(amenity => (
                  <AmenityToggle
                    key={amenity}
                    label={amenity}
                    selected={amenities.includes(amenity)}
                    onToggle={() => toggleAmenity(amenity)}
                  />
                ))}
              </div>
            </FormSection>

            <FormSection title="Listing status">
              <div className="max-w-xs">
                <SelectInput
                  id="status"
                  aria-label="Listing status"
                  value={form.status}
                  onChange={e => set('status', toListingStatusValue(e.target.value))}
                >
                  {LISTING_STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </div>

              {moderationHint ? <p className="text-sm text-gray-ink">{moderationHint}</p> : null}
            </FormSection>
          </div>

          {/*
            Sticky so the primary action stays reachable from anywhere in the
            form. Opaque (never translucent) because content scrolls beneath it.
          */}
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 rounded-b-2xl border-t border-border bg-surface px-6 py-4 sm:px-8">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                void navigate({
                  to: '/landlord/properties/$id',
                  params: { id: String(propertyId) },
                })
              }
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submit.isPending || needsVerification}>
              {needsVerification
                ? 'Verify your account to save'
                : submit.isPending
                ? 'Saving…'
                : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <div className="flex items-start gap-3">
          <Icon name="photo" size={22} className="mt-0.5 shrink-0" />
          <div>
            <h2 className="text-base font-semibold tracking-tight text-ink">Photos</h2>
            <p className="mt-1 text-sm text-gray-ink">
              Add clear photos of the property. Uploads save as soon as they finish.
            </p>
          </div>
        </div>

        {photoError ? (
          <div className="mt-4">
            <ErrorState message={photoError} />
          </div>
        ) : null}

        <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-border-strong p-5 text-center text-sm text-gray-ink transition-colors hover:border-primary hover:bg-mint focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          {uploading ? 'Uploading…' : 'Choose photos to upload (jpg/png/webp/gif, max 5 MB each)'}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
        </label>

        {photos.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map(photo => (
              <li key={photo} className="relative overflow-hidden rounded-xl border border-border">
                <img src={photo} alt="" className="h-24 w-full object-cover" />
                {photosToDelete.includes(photo) ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-medium text-white">
                    Will delete
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label="Mark photo for deletion"
                    className="absolute right-1 top-1 rounded-full bg-surface/90 px-2 py-0.5 text-xs transition-all duration-100 ease-out hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 active:scale-[0.94]"
                    onClick={() => setPhotosToDelete(list => [...list, photo])}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {authorizedLandlords !== null ? (
        <Card className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <Icon name="users" size={22} className="shrink-0" />
            <div>
              <h2 className="font-semibold tracking-tight text-ink">Authorized landlords</h2>
              <p className="text-sm text-gray-ink">
                Landlords who can also manage this property. Only the Haven Space Admin can change
                who has access.
              </p>
            </div>
          </div>
          {authorizedLandlords.length > 0 ? (
            <ul className="divide-y divide-border rounded-xl border border-border/70">
              {authorizedLandlords.map(landlord => (
                <li
                  key={landlord.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{landlord.name}</p>
                    <p className="text-xs text-gray-ink">
                      {landlord.email} · granted {formatWhen(landlord.granted_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-ink">
              No other landlords have access to this property.
            </p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
