/**
 * The landlord's listing-status vocabulary (`edit-listing-property-info` D15).
 *
 * `properties.status` is stored raw — `draft` / `available` / `hidden` — and the
 * landlord API hands it over untranslated, so this file is the single place that
 * decides what a landlord reads. The edit form, the property cards and the detail
 * page all come through here, which is why they can never disagree about a
 * listing's state.
 *
 * Admin moderation (`listing_moderation_status`) is a **separate axis**: the
 * landlord never chooses it, but it decides whether boarders can actually see the
 * listing, so it drives the hint under the status control instead of the label.
 */

export const LISTING_STATUS_VALUES = ['draft', 'available', 'hidden'] as const;

export type ListingStatusValue = (typeof LISTING_STATUS_VALUES)[number];

/**
 * Where an absent or unrecognised stored value lands. `hidden` on purpose: an
 * unreadable status must never be shown as Published, because that is the one
 * label that promises boarders can see the listing.
 */
export const DEFAULT_LISTING_STATUS: ListingStatusValue = 'hidden';

/** The three options, in reading order (D3/D6). */
export const LISTING_STATUS_OPTIONS: ReadonlyArray<{
  value: ListingStatusValue;
  label: string;
}> = [
  { value: 'draft', label: 'Draft' },
  { value: 'available', label: 'Published' },
  { value: 'hidden', label: 'Unpublished' },
];

const LABELS: Record<ListingStatusValue, string> = {
  draft: 'Draft',
  available: 'Published',
  hidden: 'Unpublished',
};

export const AWAITING_REVIEW_HINT =
  "Awaiting admin review — boarders can't see this listing yet.";

export const REJECTED_HINT =
  'An admin rejected this listing — fix the details and publish again to request another review.';

/** Shown next to `Preview as boarder` whenever the listing is not live (edge §9 Q3). */
export const NOT_VISIBLE_TO_BOARDERS = "Boarders can't see this listing while it isn't published.";

/** The inline reason Published cannot be saved yet (R9). */
export const PUBLISH_NEEDS_ROOM =
  'Add at least one room before publishing — rooms are managed in the Rooms section below.';

export function isListingStatusValue(value: unknown): value is ListingStatusValue {
  return typeof value === 'string' && (LISTING_STATUS_VALUES as readonly string[]).includes(value);
}

/**
 * The landlord's word for a stored status.
 *
 * A **rejected** listing reads as Unpublished whatever the column says (D12): the
 * landlord's own status control never offers "rejected", and the hint below the
 * select explains why. An unknown legacy value is shown as written rather than
 * mislabelled (edge case §6.7).
 */
export function listingStatusLabel(
  status: string | null | undefined,
  moderation?: string | null
): string {
  if (moderationKey(moderation) === 'rejected') {
    return LABELS.hidden;
  }

  const value = String(status ?? '')
    .trim()
    .toLowerCase();

  if (!value) {
    return LABELS[DEFAULT_LISTING_STATUS];
  }

  return isListingStatusValue(value) ? LABELS[value] : value.replaceAll('_', ' ');
}

export type ListingStatusTone = 'published' | 'unpublished' | 'draft';

/**
 * The pill tone a status should be drawn with. A rejected listing is drawn as
 * unpublished whatever the column says, so the label and the colour never
 * contradict each other (D12).
 */
export function listingStatusTone(
  status: string | null | undefined,
  moderation?: string | null
): ListingStatusTone {
  if (moderationKey(moderation) === 'rejected') {
    return 'unpublished';
  }

  const value = String(status ?? '')
    .trim()
    .toLowerCase();

  if (value === 'draft') return 'draft';
  if (value === 'available') return 'published';

  return 'unpublished';
}

/** Label + tone together, so every pill pairs the two from one lookup. */
export function listingStatusPill(
  status: string | null | undefined,
  moderation?: string | null
): { label: string; tone: ListingStatusTone } {
  return {
    label: listingStatusLabel(status, moderation),
    tone: listingStatusTone(status, moderation),
  };
}

/** The select's seed: always one of the three legal values (never a legacy string). */
export function toListingStatusValue(
  value: unknown,
  moderation?: string | null
): ListingStatusValue {
  if (moderationKey(moderation) === 'rejected') {
    return 'hidden';
  }

  const normalised = String(value ?? '')
    .trim()
    .toLowerCase();

  return isListingStatusValue(normalised) ? normalised : DEFAULT_LISTING_STATUS;
}

/**
 * The muted line under the status control (D10), or `null` when there is nothing
 * worth saying: a live listing, a draft (private by definition), an Unpublished
 * listing that was never reviewed, and an unknown moderation value that we cannot
 * honestly describe.
 */
export function listingModerationHint(
  moderation: string | null | undefined,
  status: string | null | undefined
): string | null {
  const review = moderationKey(moderation);
  const stored = String(status ?? '')
    .trim()
    .toLowerCase();

  if (review === 'rejected') {
    return REJECTED_HINT;
  }

  if (review === '' || review === 'published') {
    return null;
  }

  // Draft is private by design, so a review note would be noise; anything else
  // that is not live is still waiting on an admin.
  return stored === 'available' && review === 'pending_review' ? AWAITING_REVIEW_HINT : null;
}

/**
 * Every room taken. A **derived fact**, never a status (D16): the card's pill keeps
 * showing the landlord's own choice and this rides beside it.
 */
export function isFullProperty(
  totalRooms: number | null | undefined,
  occupiedRooms: number | null | undefined
): boolean {
  const total = Number(totalRooms ?? 0);
  const occupied = Number(occupiedRooms ?? 0);

  return total > 0 && occupied >= total;
}

export interface SharedPricingState {
  /** True when every live room shares one rent, or when there are no rooms (D6). */
  shared: boolean;
  min: number;
  max: number;
  count: number;
}

/**
 * Whether the property's rent/deposit can be presented as shared pricing.
 *
 * Derived on load and **not persisted** (D6): the toggle is a form-session choice
 * about the defaults, not a declaration stored against the property.
 */
export function sharedPricingState(
  rooms: ReadonlyArray<{ price?: number | string | null }>
): SharedPricingState {
  const prices = rooms
    .map(room => Number(room.price ?? 0))
    .filter(price => Number.isFinite(price));
  const min = prices.length > 0 ? Math.min(...prices) : 0;
  const max = prices.length > 0 ? Math.max(...prices) : 0;

  return { shared: prices.length === 0 || min === max, min, max, count: prices.length };
}

/** The read-only range line shown when pricing is not shared (D7). */
export function sharedPricingSummary(state: SharedPricingState): string {
  if (state.count === 0) {
    return 'No rooms yet — these values are the default for every room you add.';
  }

  if (state.min === state.max) {
    return `₱${state.min.toLocaleString()} for all ${state.count} room${
      state.count === 1 ? '' : 's'
    }`;
  }

  return `Rent varies by room: ₱${state.min.toLocaleString()} – ₱${state.max.toLocaleString()} across ${
    state.count
  } room${state.count === 1 ? '' : 's'}`;
}

export interface ListingFormValues {
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
}

/**
 * The exact PUT body this form sends (R2).
 *
 * An **allow-list**, never a spread of the form state, so a leftover key can't
 * smuggle a room field back into the request: `total_rooms`/`capacity` used to
 * create, delete and re-price rooms server-side (D8/D21). `price`/`deposit` are
 * sent only while pricing is shared, so the stored values survive untouched when
 * the landlord is not claiming a shared price (D7).
 */
export function listingUpdatePayload(
  values: ListingFormValues,
  options: { sharedPricing: boolean }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: values.name,
    type: values.type,
    gender_preference: values.gender_preference,
    description: values.description,
    address: values.address,
    city: values.city,
    province: values.province,
    status: values.status,
  };

  if (options.sharedPricing) {
    payload.price = Number(values.price);
    payload.deposit = Number(values.deposit);
  }

  return payload;
}

function moderationKey(moderation: string | null | undefined): string {
  return String(moderation ?? '')
    .trim()
    .toLowerCase();
}
