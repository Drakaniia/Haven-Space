import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  adminFacts,
  formatCardDate,
  formatPeso,
  landlordFacts,
  listingPill,
  moderationPill,
  occupancyLabel,
  propertyAddress,
  roomsLabel,
} from '../../src/components/properties/PropertyCard';
import {
  amenitiesLabel,
  availableRooms,
  hasRooms,
  locationLabel,
  propertyTypeLabel,
} from '../../src/components/properties/PropertyOverview';
import {
  DEFAULT_PROPERTY_TAB,
  PROPERTY_TAB_BAR_KEYS,
  PROPERTY_TAB_KEYS,
  PROPERTY_TAB_LABELS,
  toPropertyTabKey,
} from '../../src/lib/property-tabs';
import { isFullProperty } from '../../src/lib/listing-status';
import { buildTrail } from '../../src/components/layout/Topbar';
import type { AdminPropertyRow, LandlordProperty } from '../../src/lib/types';

/**
 * `landlord-properties-card-layout` (D23): the card list, its vocabulary and the
 * markup contracts the source-contract assertions below lock in.
 */

const landlordProperty: LandlordProperty = {
  id: 7,
  name: 'High-Yield commercial property',
  type: 'boarding-house',
  description: '',
  address: '4140 Parker Rd',
  city: 'Allentown',
  province: 'New Mexico',
  price: 12000,
  status: 'active',
  role: 'owner',
  total_rooms: 4,
  occupied_rooms: 2,
  monthly_revenue: 24000,
  created_at: '2026-10-18T00:00:00.000Z',
  amenities: [],
  photos: [],
  pending_applications: 0,
};

const adminProperty: AdminPropertyRow = {
  id: 7,
  title: 'High-Yield commercial property',
  price: 12000,
  listing_moderation_status: 'pending_review',
  landlord_first: 'Jane',
  landlord_last: 'Cooper',
  landlord_email: 'jane@example.com',
  created_at: '2026-10-18T00:00:00.000Z',
  address: '4140 Parker Rd',
  city: 'Allentown',
  province: 'New Mexico',
  rooms_count: 4,
  occupied_rooms: 2,
  monthly_revenue: 24000,
  cover_photo: null,
};

describe('property card facts', () => {
  test('chip order matches the layout: rooms, occupancy, rent, revenue, date', () => {
    const labels = landlordFacts(landlordProperty).map(fact => fact.label);

    expect(labels).toEqual([
      '4 rooms',
      '2 of 4 rooms occupied',
      '₱12,000/mo',
      '₱24,000',
      expect.any(String),
    ]);
  });

  test('admin cards carry the same five facts, from the enriched payload', () => {
    expect(adminFacts(adminProperty)).toEqual(landlordFacts(landlordProperty));
  });

  test('a single room is not pluralised', () => {
    expect(roomsLabel(1)).toBe('1 room');
    expect(occupancyLabel(1, 1)).toBe('1 of 1 room occupied');
  });

  test('properties with no rooms say so instead of 0 of 0 (D19)', () => {
    expect(occupancyLabel(0, 0)).toBe('No rooms yet');
    expect(landlordFacts({ ...landlordProperty, total_rooms: 0, occupied_rooms: 0 })[1].label).toBe(
      'No rooms yet'
    );
  });

  test('addresses join street, city and province, and fall back safely', () => {
    expect(propertyAddress(landlordProperty)).toBe('4140 Parker Rd, Allentown, New Mexico');
    expect(propertyAddress({ city: 'Cebu' })).toBe('Cebu');
    expect(propertyAddress({ address: '12 Mabini St', city: 'Cebu', province: 'Cebu' })).toBe(
      '12 Mabini St, Cebu'
    );
    expect(propertyAddress({})).toBe('No address yet');
  });

  test('money and dates format the way the card renders them', () => {
    expect(formatPeso(1250000)).toBe('₱1,250,000');
    expect(formatCardDate('not-a-date')).toBe('not-a-date');
    expect(formatCardDate(landlordProperty.created_at)).not.toContain('T');
  });
});

describe('status pills', () => {
  test('landlord surfaces read the stored status in the landlord vocabulary (D7/D15)', () => {
    // The API hands the raw value over and the shared helper names it
    // (`edit-listing-property-info` D15) — one definition, four consumers.
    expect(listingPill('available')).toEqual({ label: 'Published', dot: 'bg-success' });
    expect(listingPill('hidden')).toEqual({ label: 'Unpublished', dot: 'bg-muted' });
    expect(listingPill('draft')).toEqual({ label: 'Draft', dot: 'bg-muted' });
    // A rejected listing must never read as live, whatever the column says (D12).
    expect(listingPill('available', 'rejected')).toEqual({ label: 'Unpublished', dot: 'bg-muted' });
    // Occupancy is a badge now, not a status (D16).
    expect(isFullProperty(2, 2)).toBe(true);
    expect(isFullProperty(2, 1)).toBe(false);
    expect(isFullProperty(0, 0)).toBe(false);
  });

  test('admin surfaces read moderation status (D7)', () => {
    expect(moderationPill('published').label).toBe('Published');
    expect(moderationPill('pending_review').label).toBe('Pending review');
    expect(moderationPill('rejected').dot).toBe('bg-error');
    expect(moderationPill('flagged').label).toBe('Flagged');
  });

  test('every status carries a readable label, never a raw snake_case token', () => {
    for (const status of ['available', 'hidden', 'draft', 'occupied']) {
      expect(listingPill(status).label).not.toContain('_');
    }

    for (const status of ['published', 'pending_review', 'rejected', 'flagged']) {
      expect(moderationPill(status).label).not.toContain('_');
    }
  });
});

describe('property card contract', () => {
  const webRoot = join(import.meta.dir, '../..');
  const read = (...parts: string[]) => readFileSync(join(webRoot, 'src', ...parts), 'utf8');

  const card = read('components', 'properties', 'PropertyCard.tsx');

  test('the stretched link opens the property detail page, not the edit form (D3/R1)', () => {
    expect(card).toContain('after:absolute after:inset-0');
    expect(card).toContain('relative z-10');
    expect(card).toContain('to="/landlord/properties/$id"');
    expect(card).not.toContain('/landlord/listings/$id/edit');
  });

  test('the rooms slot survives for admin while the overflow menu is gone (R15)', () => {
    // Admin still embeds its read-only per-room inspector in this slot; it is the
    // landlord caller that stopped passing it. The landlord-only overflow menu
    // had no other user, so it was deleted outright.
    expect(card).toContain('aria-expanded={rooms.open}');
    expect(card).toContain('aria-controls={rooms.id}');
    expect(card).not.toContain('CardMenu');
  });

  test('the card list is not a table', () => {
    expect(card).not.toContain('<table');
    expect(card).toContain('PropertyCardSkeletonList');
  });

  test('the five chip slots are declared once, in the helpers the surfaces share', () => {
    for (const icon of ['list', 'users', 'currencyDollar', 'chartBar', 'calendarDays']) {
      expect(card).toContain(`icon: '${icon}'`);
    }
  });

  test('the properties page is the single landlord card list, behind the subtree layout (D2/R5)', () => {
    const index = read('routes', 'landlord', 'properties', 'index.tsx');

    expect(index).toContain('LandlordPropertyCards');
    expect(index).not.toContain('DataTable');
    // The shell moved to the layout so `$id` children can nest under it.
    expect(read('routes', 'landlord', 'properties.tsx')).toContain('Outlet');

    // The duplicate page is gone; its create/edit routes are not.
    expect(existsSync(join(webRoot, 'src', 'routes', 'landlord', 'listings', 'index.tsx'))).toBe(
      false
    );
    expect(existsSync(join(webRoot, 'src', 'routes', 'landlord', 'listings', 'create.tsx'))).toBe(
      true
    );
    expect(
      existsSync(join(webRoot, 'src', 'routes', 'landlord', 'listings', '$id', 'edit.tsx'))
    ).toBe(true);
  });

  test('the landlord card list is a pure entry point; the actions moved to the detail page (D13/D18/R15)', () => {
    const list = read('components', 'properties', 'LandlordPropertyCards.tsx');

    expect(list).not.toContain('LandlordRoomList');
    expect(list).not.toContain('deleteProperty');
    expect(list).not.toContain('ConfirmDialog');
    expect(list).not.toContain('CardMenu');

    // Delete lives in the detail page's destructive zone (D18); room CRUD lives
    // on the property's own rooms page (D8/D9).
    expect(read('routes', 'landlord', 'properties', '$id', 'index.tsx')).toContain('Danger zone');
    expect(read('routes', 'landlord', 'properties', '$id', 'index.tsx')).toContain(
      'deleteProperty'
    );
    // Room CRUD lives on the property's own rooms page. That page was
    // redesigned into the card grid (`landlord-rooms-grid` D1), so the page
    // renders `PropertyRoomsGrid`; `LandlordRoomList` still serves the listing
    // edit page.
    expect(read('routes', 'landlord', 'properties', '$id', 'rooms.tsx')).toContain(
      'PropertyRoomsGrid'
    );
    expect(read('components', 'rooms', 'LandlordRoomList.tsx')).toContain('RoomFormModal');
  });

  test('admin moderation keeps its own inline rooms inspector', () => {
    const section = read('components', 'admin', 'sections', 'PropertiesSection.tsx');

    expect(section).toContain('rooms={{');
    expect(section).toContain('AdminPropertyRooms');
  });

  test('admin moderation uses cards, keeps bulk select and drops the rooms modal', () => {
    const section = read('components', 'admin', 'sections', 'PropertiesSection.tsx');

    expect(section).toContain('PropertyCard');
    expect(section).toContain('moderationPill');
    expect(section).toContain('Select all (first 100)');
    expect(section).toContain('Max 100 per bulk operation');
    expect(section).toContain('BulkActionBar');
    expect(section).not.toContain('<Modal');
    expect(section).not.toContain('<DataTable');
  });
});

/**
 * `landlord-property-detail-page` — the tab contract, the room-summary rollup
 * and the page's own markup contracts.
 */
describe('property detail page', () => {
  const webRoot = join(import.meta.dir, '../..');
  const read = (...parts: string[]) => readFileSync(join(webRoot, 'src', ...parts), 'utf8');

  test('tab keys are kebab-case and an unknown or absent value lands on Overview (R6)', () => {
    expect(PROPERTY_TAB_KEYS).toEqual(['overview', 'rooms', 'public-listing', 'applications']);
    expect(DEFAULT_PROPERTY_TAB).toBe('overview');
    expect(toPropertyTabKey('public-listing')).toBe('public-listing');
    expect(toPropertyTabKey('applications')).toBe('applications');
    // `rooms` stays a valid key even though its tab navigates rather than opens
    // a pane (D9) — a hand-typed `?tab=rooms` must be understood, not reinterpreted.
    expect(toPropertyTabKey('rooms')).toBe('rooms');

    for (const value of [undefined, null, '', 'nope', 'Overview', 7, {}, ['overview']]) {
      expect(toPropertyTabKey(value)).toBe('overview');
    }
  });

  test('every tab carries a readable label, never a raw key', () => {
    for (const key of PROPERTY_TAB_KEYS) {
      expect(PROPERTY_TAB_LABELS[key]).toBeTruthy();
      expect(PROPERTY_TAB_LABELS[key]).not.toContain('-');
    }
  });

  test('available rooms are total minus occupied, clamped at zero (D14/D20)', () => {
    expect(availableRooms(20, 12)).toBe(8);
    expect(availableRooms(4, 4)).toBe(0);
    expect(availableRooms(0, 0)).toBe(0);
    // A data glitch must read 0, never a negative count.
    expect(availableRooms(2, 5)).toBe(0);
    // The zero-room treatment keys off the total, not the available figure.
    expect(hasRooms(0)).toBe(false);
    expect(hasRooms(1)).toBe(true);
  });

  test('type, location and amenity labels fall back instead of rendering blanks', () => {
    expect(propertyTypeLabel('boarding-house')).toBe('Boarding house');
    expect(propertyTypeLabel('apartment')).toBe('Apartment');
    expect(propertyTypeLabel('dormitory')).toBe('Dormitory');
    expect(propertyTypeLabel(null)).toBe('Not specified');
    expect(locationLabel('Malaybalay', 'Bukidnon')).toBe('Malaybalay, Bukidnon');
    expect(locationLabel('Cebu', '')).toBe('Cebu');
    expect(locationLabel('', '')).toBe('No location yet');
    expect(amenitiesLabel(['WiFi', 'Kitchen'])).toBe('WiFi · Kitchen');
    expect(amenitiesLabel([])).toBe('None listed');
    expect(amenitiesLabel(null)).toBe('None listed');
  });

  test('the tab bar lists the panes only — Rooms is reached from Manage rooms (D26/R7)', () => {
    // The bar is the valid keys minus the one that is a navigation, not a pane.
    expect(PROPERTY_TAB_BAR_KEYS).toEqual(['overview', 'public-listing', 'applications']);
    expect(
      PROPERTY_TAB_KEYS.filter(
        key => !(PROPERTY_TAB_BAR_KEYS as readonly string[]).includes(key)
      )
    ).toEqual(['rooms']);

    const tabs = read('components', 'properties', 'PropertyTabs.tsx');

    expect(tabs).toContain('PROPERTY_TAB_BAR_KEYS');
    expect(tabs).not.toContain('PROPERTY_TAB_KEYS.map');
    expect(tabs).not.toContain('/landlord/properties/$id/rooms');
    // Every tab passes a concrete key. An *empty* search matches any search in
    // TanStack's link comparison, which left Overview permanently marked active
    // next to whichever tab was actually open.
    expect(tabs).toContain('search={{ tab: key }}');
    expect(tabs).not.toContain('search={key === DEFAULT_PROPERTY_TAB');

    // The rooms page keeps its single entry point on the Overview pane, and a
    // hand-typed or bookmarked `?tab=rooms` still lands there rather than being
    // reinterpreted as Overview.
    const overview = read('components', 'properties', 'PropertyOverview.tsx');
    expect(overview).toContain('to="/landlord/properties/$id/rooms"');
    expect(overview).toContain('Manage rooms');
    expect(toPropertyTabKey('rooms')).toBe('rooms');
  });

  test('the route normalises every ?tab= to a concrete key, including the default (R6)', () => {
    const detail = read('routes', 'landlord', 'properties', '$id', 'index.tsx');

    // Returning `{}` for the default let the raw param leak through unresolved,
    // so an unknown value rendered no pane at all.
    expect(detail).toContain('tab: toPropertyTabKey(search?.tab)');
    expect(detail).not.toContain('tab === DEFAULT_PROPERTY_TAB ? {}');
  });

  test('the shell breadcrumb only names admin sections on admin routes', () => {
    // `applications` is both an admin section key and a property tab key; the
    // lookup must not fire on the landlord property page.
    expect(buildTrail('/landlord/properties/3', { tab: 'applications' }).map(c => c.label)).toEqual(
      ['Landlord', 'Properties']
    );
    expect(buildTrail('/admin', { tab: 'applications' }).map(c => c.label)).toEqual([
      'Admin',
      'Applications',
    ]);
    expect(
      buildTrail('/landlord/properties/3', { tab: 'public-listing' }).map(c => c.label)
    ).toEqual(['Landlord', 'Properties']);
  });

  test('the trail names the property, and the sub-routes append their own step (D6/D7)', () => {
    const header = read('components', 'properties', 'PropertyDetailHeader.tsx');
    expect(header).toContain('Properties');
    expect(header).toContain('trailTail');

    expect(read('routes', 'landlord', 'properties', '$id', 'rooms.tsx')).toContain(
      'trailTail="Rooms"'
    );
  });

  test('the detail page wires the tabs and the destructive zone, and owns no status control (R6/R13/R14/D18)', () => {
    const detail = read('routes', 'landlord', 'properties', '$id', 'index.tsx');

    expect(detail).toContain('validateSearch');
    expect(detail).toContain('PropertyTabs');
    expect(detail).toContain('PropertyDetailHeader');
    expect(detail).toContain('Danger zone');
    // Publishing moved to the Edit listing form's Listing status section
    // (`edit-listing-property-info` D18) — one control per destination.
    expect(detail).not.toContain('Unpublish');
    expect(detail).not.toContain("status: 'hidden'");
    // Preview opens the public page beside this one (D17/R12).
    expect(detail).toContain('target="_blank"');
  });

  test('the public listing pane is read-only and reuses the listing vocabulary (D12)', () => {
    const pane = read('components', 'properties', 'PropertyPublicListing.tsx');

    expect(pane).toContain('House rules');
    expect(pane).toContain('Description');
    expect(pane).toContain('Photos');
    // It must not re-implement editing: the form only exists on the edit route.
    expect(pane).not.toContain('TextInput');
    expect(pane).not.toContain('TextArea');
  });
});
