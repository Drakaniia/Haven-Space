import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AWAITING_REVIEW_HINT,
  DEFAULT_LISTING_STATUS,
  LISTING_STATUS_OPTIONS,
  LISTING_STATUS_VALUES,
  NOT_VISIBLE_TO_BOARDERS,
  PUBLISH_NEEDS_ROOM,
  REJECTED_HINT,
  isFullProperty,
  isListingStatusValue,
  listingModerationHint,
  listingStatusLabel,
  listingStatusPill,
  listingStatusTone,
  listingUpdatePayload,
  sharedPricingState,
  sharedPricingSummary,
  toListingStatusValue,
} from '../src/lib/listing-status';

/**
 * `edit-listing-property-info` — the landlord's listing-status vocabulary, the
 * pricing rules and the exact PUT body the edit form builds.
 *
 * Pure helpers are asserted directly; the form's field list is asserted against
 * the source, the way the repo's other page contracts are (`a full render needs a
 * router and an auth context`).
 */

const webRoot = join(import.meta.dir, '..');
const read = (...parts: string[]) => readFileSync(join(webRoot, 'src', ...parts), 'utf8');

const form = {
  name: 'Onda Boarding House',
  type: 'boarding-house',
  gender_preference: 'female',
  description: 'Near campus',
  price: '4200',
  deposit: '1000',
  address: '12 Rizal St',
  city: 'Malaybalay',
  province: 'Bukidnon',
  status: 'available' as const,
};

describe('listing status vocabulary', () => {
  test('the three legal values are the only ones the API may store (D3)', () => {
    expect(LISTING_STATUS_VALUES).toEqual(['draft', 'available', 'hidden']);
    expect(isListingStatusValue('draft')).toBe(true);
    expect(isListingStatusValue('active')).toBe(false);
    expect(isListingStatusValue(null)).toBe(false);
  });

  test('the select offers Draft / Published / Unpublished, in reading order (D3)', () => {
    expect(LISTING_STATUS_OPTIONS).toEqual([
      { value: 'draft', label: 'Draft' },
      { value: 'available', label: 'Published' },
      { value: 'hidden', label: 'Unpublished' },
    ]);
  });

  test('raw stored status reads back as the landlord word for it (D15)', () => {
    expect(listingStatusLabel('available')).toBe('Published');
    expect(listingStatusLabel('hidden')).toBe('Unpublished');
    expect(listingStatusLabel('draft')).toBe('Draft');
    // An unknown legacy value is shown as written rather than mislabelled (§6.7).
    expect(listingStatusLabel('occupied')).toBe('occupied');
    // Nothing stored lands on the safe end of the vocabulary.
    expect(listingStatusLabel(undefined)).toBe('Unpublished');
    expect(DEFAULT_LISTING_STATUS).toBe('hidden');
  });

  test('a rejected listing reads as Unpublished whatever the column says (D12)', () => {
    expect(listingStatusLabel('available', 'rejected')).toBe('Unpublished');
    expect(toListingStatusValue('available', 'rejected')).toBe('hidden');
    expect(listingStatusTone('available', 'rejected')).toBe('unpublished');
  });

  test('the form seeds itself with a legal value, never a legacy string', () => {
    expect(toListingStatusValue('draft')).toBe('draft');
    expect(toListingStatusValue('available')).toBe('available');
    expect(toListingStatusValue('hidden')).toBe('hidden');
    // `active`/`inactive` were the old landlord words; neither is a stored value.
    expect(toListingStatusValue('active')).toBe('hidden');
    expect(toListingStatusValue(undefined)).toBe('hidden');
  });

  test('the pill pairs label and tone from one lookup', () => {
    expect(listingStatusPill('available')).toEqual({ label: 'Published', tone: 'published' });
    expect(listingStatusPill('draft')).toEqual({ label: 'Draft', tone: 'draft' });
    expect(listingStatusPill('hidden')).toEqual({ label: 'Unpublished', tone: 'unpublished' });
  });

  test('the moderation hint only speaks when it can be honest (D10)', () => {
    // Live: nothing to say.
    expect(listingModerationHint('published', 'available')).toBeNull();
    // Awaiting review, and the wording says exactly that.
    expect(listingModerationHint('pending_review', 'available')).toBe(AWAITING_REVIEW_HINT);
    expect(AWAITING_REVIEW_HINT).toContain('Awaiting admin review');
    // Rejected beats everything else.
    expect(listingModerationHint('rejected', 'hidden')).toBe(REJECTED_HINT);
    expect(REJECTED_HINT).toContain('publish again');
    // A draft is private by definition, so a review note would be noise.
    expect(listingModerationHint('pending_review', 'draft')).toBeNull();
    // An unpublished listing nobody reviewed is not "awaiting review".
    expect(listingModerationHint('pending_review', 'hidden')).toBeNull();
    // An unknown moderation value is described as neither live nor awaiting.
    expect(listingModerationHint(undefined, 'available')).toBeNull();
  });

  test('Full is a derived fact, never a status (D16)', () => {
    expect(isFullProperty(2, 2)).toBe(true);
    expect(isFullProperty(3, 2)).toBe(false);
    expect(isFullProperty(2, 1)).toBe(false);
    // A property with no rooms is not full.
    expect(isFullProperty(0, 0)).toBe(false);
  });
});

describe('shared pricing', () => {
  test('the toggle defaults ON when every live room shares one rent (D6)', () => {
    expect(sharedPricingState([{ price: 4200 }, { price: 4200 }]).shared).toBe(true);
    expect(sharedPricingState([]).shared).toBe(true);
    expect(sharedPricingState([{ price: 4200 }, { price: 5000 }]).shared).toBe(false);
  });

  test('the range line names the real spread and the room count (D7)', () => {
    const mixed = sharedPricingState([{ price: 4200 }, { price: 6500 }, { price: 5000 }]);

    expect(mixed).toEqual({ shared: false, min: 4200, max: 6500, count: 3 });
    expect(sharedPricingSummary(mixed)).toBe('Rent varies by room: ₱4,200 – ₱6,500 across 3 rooms');
    expect(sharedPricingSummary(sharedPricingState([{ price: 4200 }]))).toBe(
      '₱4,200 for all 1 room'
    );
    expect(sharedPricingSummary(sharedPricingState([]))).toContain('No rooms yet');
  });
});

describe('the PUT body this form sends (R2/R3)', () => {
  test('carries the property-wide fields and never a room field', () => {
    const payload = listingUpdatePayload(form, { sharedPricing: true });

    expect(payload).toEqual({
      name: 'Onda Boarding House',
      type: 'boarding-house',
      gender_preference: 'female',
      description: 'Near campus',
      price: 4200,
      deposit: 1000,
      address: '12 Rizal St',
      city: 'Malaybalay',
      province: 'Bukidnon',
      status: 'available',
    });

    // The fields that used to create, delete and re-price rooms server-side.
    for (const roomField of ['total_rooms', 'propertyRooms', 'capacity', 'propertyCapacity']) {
      expect(payload).not.toHaveProperty(roomField);
    }

    // `min_stay` is not editable on this form, so it must not be round-tripped.
    expect(payload).not.toHaveProperty('min_stay');
  });

  test('omits price and deposit when pricing is not shared (D7)', () => {
    const payload = listingUpdatePayload(form, { sharedPricing: false });

    expect(payload).not.toHaveProperty('price');
    expect(payload).not.toHaveProperty('deposit');
    expect(payload.status).toBe('available');
  });
});

describe('the Edit listing page', () => {
  const edit = read('routes', 'landlord', 'listings', '$id', 'edit.tsx');

  test('keeps the property-wide fields and drops the room-shaping ones (D1/R1)', () => {
    for (const kept of [
      'Property name',
      'Property type',
      'Gender preference',
      'Description',
      'Street address',
      'City',
      'Province',
      'Amenities',
      'Listing status',
    ]) {
      expect(edit).toContain(kept);
    }

    // "Number of rooms" and "Capacity per room" are gone (`R1`), and so are the
    // input ids and form-state keys behind them.
    expect(edit).not.toContain('Number of rooms');
    expect(edit).not.toContain('Capacity per room');
    expect(edit).not.toContain('id="total_rooms"');
    expect(edit).not.toContain('id="capacity"');
    expect(edit).not.toContain('total_rooms:');
    expect(edit).not.toContain('propertyRooms');
  });

  test('builds its body through the allow-list instead of spreading the form (R2)', () => {
    expect(edit).toContain('listingUpdatePayload(form, { sharedPricing })');
    expect(edit).not.toContain('...form,');
  });

  test('offers the shared-pricing toggle and the read-only range (D6/D7)', () => {
    expect(edit).toContain('Same rent and deposit for every room');
    expect(edit).toContain('sharedPricingSummary(pricing)');
    // The range links out to the rooms page, not an in-form anchor (D2 superseded).
    expect(edit).toContain('to="/landlord/properties/$id/rooms"');
    // The property rent is a default, and the copy promises it (R3).
    expect(edit).toContain('never rewrites an existing room');
  });

  test('owns the status control with its moderation hint (D9/D10)', () => {
    expect(edit).toContain('LISTING_STATUS_OPTIONS');
    expect(edit).toContain('listingModerationHint');
    expect(edit).toContain('NOT_VISIBLE_TO_BOARDERS');
    expect(edit).toContain('PUBLISH_NEEDS_ROOM');
    // The old Active/Inactive options are gone with the old vocabulary.
    expect(edit).not.toContain('Active</option>');
    expect(edit).not.toContain('Inactive</option>');
  });

  test('keeps the photos card below the form and no inline room list (D2 superseded)', () => {
    expect(edit).toContain('Choose photos to upload');
    // Rooms are managed on their own page, so the edit form no longer embeds the
    // room manager — listing it here duplicated `Manage rooms`.
    expect(edit).not.toContain('LandlordRoomList');
  });
});

describe('the property detail surfaces', () => {
  test('no longer offer a status mutation (D18)', () => {
    const overview = read('components', 'properties', 'PropertyOverview.tsx');
    const tab = read('components', 'properties', 'PropertyPublicListing.tsx');

    expect(overview).not.toContain('Unpublish');
    expect(tab).not.toContain('Unpublish');
    expect(overview).toContain('listingStatusTone');
    expect(tab).toContain('listingStatusPill');
    // Both still point at the one place that edits a listing.
    expect(overview).toContain('Edit listing');
    expect(tab).toContain('Edit listing');
  });

  test('the not-published note exists for the landlord to read (edge §9 Q3)', () => {
    expect(NOT_VISIBLE_TO_BOARDERS).toContain('Boarders');
  });

  test('publishing without a room is explained, not silently blocked (R9)', () => {
    expect(PUBLISH_NEEDS_ROOM).toContain('at least one room');
  });
});
