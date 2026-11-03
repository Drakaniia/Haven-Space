import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  MAX_ROOMS_PER_LISTING,
  MAX_ROOM_CAPACITY,
  MAX_ROOM_PHOTOS,
  areRoomDraftsValid,
  clampRoomCount,
  createRoomDrafts,
  resizeRoomDrafts,
  roomDraftErrors,
  roomDraftPayload,
  roomDraftSummary,
  roomTypeForCapacity,
  roomTypeLabel,
  roomsToDiscard,
} from '../../src/lib/room-drafts';
import { RoomFormFields } from '../../src/components/rooms/RoomFormFields';
import {
  cleanRoomType,
  freeSlotsLabel,
  isRoomAvailable,
  roomStatusLabel,
} from '../../src/components/rooms/detail-helpers';
import type { RoomDetail } from '../../src/lib/types';

afterEach(() => cleanup());

const DEFAULTS = { rent: '3000', deposit: '1000', capacity: '2' };

function roomDetail(overrides: Partial<RoomDetail> = {}): RoomDetail {
  return {
    id: 1,
    roomNumber: 'Room 1',
    roomType: 'shared',
    price: 3000,
    deposit: 1000,
    status: 'available',
    capacity: 4,
    occupied: 1,
    freeSlots: 3,
    description: '',
    size: null,
    images: [],
    furnishing: 'Not specified',
    ...overrides,
  };
}

function file(name: string): File {
  return new File(['bytes'], name, { type: 'image/jpeg' });
}

describe('room drafts', () => {
  test('seeds each new room from the property defaults', () => {
    const drafts = createRoomDrafts(3, DEFAULTS);

    expect(drafts).toHaveLength(3);
    expect(drafts.map(draft => draft.name)).toEqual(['Room 1', 'Room 2', 'Room 3']);
    expect(drafts.every(draft => draft.price === '3000' && draft.deposit === '1000')).toBe(true);
    // Capacity 2 is a shared room; capacity 1 would be private.
    expect(drafts.every(draft => draft.type === 'shared')).toBe(true);
    expect(roomTypeForCapacity(1)).toBe('private');
    expect(roomTypeForCapacity(4)).toBe('shared');
  });

  test('grows without disturbing existing rooms and shrinks from the tail (D12)', () => {
    const drafts = createRoomDrafts(2, DEFAULTS);
    const edited = drafts.map((draft, index) =>
      index === 0 ? { ...draft, name: 'Corner suite', price: '4500' } : draft
    );

    const grown = resizeRoomDrafts(edited, 4, DEFAULTS);
    expect(grown).toHaveLength(4);
    expect(grown[0].name).toBe('Corner suite');
    expect(grown[0].price).toBe('4500');
    expect(grown[0].key).toBe(edited[0].key);

    const toDiscard = roomsToDiscard(grown, 2);
    expect(toDiscard.map(draft => draft.name)).toEqual(['Room 3', 'Room 4']);

    const shrunk = resizeRoomDrafts(grown, 2, DEFAULTS);
    expect(shrunk.map(draft => draft.name)).toEqual(['Corner suite', 'Room 2']);
  });

  test('clamps the room count into the supported range', () => {
    expect(clampRoomCount('0')).toBe(1);
    expect(clampRoomCount('')).toBe(1);
    expect(clampRoomCount('nope')).toBe(1);
    expect(clampRoomCount('5')).toBe(5);
    expect(clampRoomCount(String(MAX_ROOMS_PER_LISTING + 20))).toBe(MAX_ROOMS_PER_LISTING);
  });

  test('validates names, capacity and rent', () => {
    const [first, second] = createRoomDrafts(2, DEFAULTS);

    expect(roomDraftErrors(first, [first, second])).toEqual([]);

    const duplicated = { ...second, name: 'room 1' };
    expect(roomDraftErrors(duplicated, [first, duplicated])).toEqual([
      'A room named "room 1" already exists in this listing.',
    ]);

    const badCapacity = { ...first, name: 'Room 9', capacity: String(MAX_ROOM_CAPACITY + 1) };
    expect(roomDraftErrors(badCapacity, [badCapacity])).toEqual([
      `Capacity must be between 1 and ${MAX_ROOM_CAPACITY}.`,
    ]);

    const noRent = { ...first, name: 'Room 9', price: '' };
    expect(roomDraftErrors(noRent, [noRent])).toEqual(['Monthly rent is required.']);

    expect(areRoomDraftsValid([first, second])).toBe(true);
    expect(areRoomDraftsValid([])).toBe(false);
  });

  test('builds the API room payload and omits an empty size', () => {
    const [draft] = createRoomDrafts(1, DEFAULTS);
    const payload = roomDraftPayload({
      ...draft,
      name: 'Dorm A',
      type: 'dorm',
      capacity: '6',
      price: '1500',
      deposit: '',
      description: 'Bunk beds',
      size: '',
    });

    expect(payload).toEqual({
      name: 'Dorm A',
      room_type: 'dorm',
      capacity: 6,
      price: 1500,
      deposit: 0,
      size: undefined,
      description: 'Bunk beds',
      status: 'available',
    });
  });

  test('labels room types for tenants, including legacy single rows', () => {
    expect(roomTypeLabel('private')).toBe('Private');
    expect(roomTypeLabel('single')).toBe('Private');
    expect(roomTypeLabel('shared')).toBe('Shared');
    expect(roomTypeLabel('dorm')).toBe('Dorm');
    expect(roomTypeLabel(null)).toBe('Room');
  });

  test('summarises a room for its box header', () => {
    const [draft] = createRoomDrafts(1, DEFAULTS);
    expect(roomDraftSummary({ ...draft, type: 'private', capacity: '1' })).toBe(
      'Private · 1 person · ₱3,000/mo · 0 photos'
    );
  });
});

describe('the inline room form', () => {
  function renderRoom(overrides: Partial<Parameters<typeof RoomFormFields>[0]> = {}) {
    const [draft] = createRoomDrafts(1, DEFAULTS);
    const added: File[][] = [];
    const removed: number[] = [];

    const view = render(
      <RoomFormFields
        draft={{ ...draft, ...overrides.draft }}
        index={0}
        errors={overrides.errors ?? []}
        onChange={overrides.onChange ?? (() => {})}
        onAddPhotos={files => added.push(files)}
        onRemovePhoto={index => removed.push(index)}
      />
    );

    return { view, added, removed };
  }

  test('shows the room fields, its summary and the recommended-photo hint', () => {
    const { view } = renderRoom();

    expect(screen.getByLabelText('Room name / number', { exact: false })).toBeDefined();
    expect(screen.getByText('Room type')).toBeDefined();
    expect(screen.getByText('Tenant capacity')).toBeDefined();
    expect(screen.getByText('Monthly rent (₱)')).toBeDefined();
    expect(screen.getByText('Occupied now')).toBeDefined();
    expect(screen.getByText('0 of 4 · 2 recommended')).toBeDefined();
    expect(view.getByText(/Add at least 2 photos/)).toBeDefined();
    // Inline, not a dialog.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('caps room photos at four and reports the skipped files', () => {
    const { view, added } = renderRoom();
    const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: {
        files: [file('1.jpg'), file('2.jpg'), file('3.jpg'), file('4.jpg'), file('5.jpg')],
      },
    });

    expect(added).toHaveLength(1);
    expect(added[0]).toHaveLength(MAX_ROOM_PHOTOS);
    expect(view.getByText(/Only 4 photos per room/)).toBeDefined();
  });

  test('lists chosen photos and removes them by index', () => {
    const { view, removed } = renderRoom({
      draft: { photos: [file('front.jpg'), file('side.jpg')] },
    });

    expect(view.getByText('front.jpg')).toBeDefined();
    expect(view.getByText('2 of 4 · 2 recommended')).toBeDefined();

    fireEvent.click(view.getByLabelText('Remove front.jpg'));

    expect(removed).toEqual([0]);
  });

  test('renders validation errors inside the room box', () => {
    const { view } = renderRoom({ errors: ['Room name is required.'] });

    expect(view.getByText('Room name is required.')).toBeDefined();
  });
});

describe('tenant-facing occupancy copy', () => {
  test('reports free slots per room instead of a static capacity', () => {
    expect(freeSlotsLabel(roomDetail())).toBe('3 of 4 slots free');
    expect(freeSlotsLabel(roomDetail({ capacity: 1, occupied: 0, freeSlots: 1 }))).toBe(
      '1 of 1 slot free'
    );
    expect(freeSlotsLabel(roomDetail({ occupied: 4, freeSlots: 0 }))).toBe('Full');
  });

  test('a partially filled shared room stays bookable and reads as Limited', () => {
    const shared = roomDetail({ status: 'occupied', occupied: 2, freeSlots: 2 });

    expect(isRoomAvailable(shared)).toBe(true);
    expect(roomStatusLabel(shared).label).toBe('Limited');
  });

  test('a full room is not bookable and reads as Full', () => {
    const full = roomDetail({ occupied: 4, freeSlots: 0 });

    expect(isRoomAvailable(full)).toBe(false);
    expect(roomStatusLabel(full).label).toBe('Full');
  });

  test('maintenance rooms are never bookable', () => {
    const maintenance = roomDetail({ status: 'maintenance' });

    expect(isRoomAvailable(maintenance)).toBe(false);
    expect(roomStatusLabel(maintenance).label).toBe('Maintenance');
  });

  test('shows the private/shared/dorm vocabulary, including legacy single rows', () => {
    expect(cleanRoomType(roomDetail({ roomType: 'private' }))).toBe('Private');
    expect(cleanRoomType(roomDetail({ roomType: 'single' }))).toBe('Private');
    expect(cleanRoomType(roomDetail({ roomType: 'dorm' }))).toBe('Dorm');
    expect(cleanRoomType(roomDetail({ roomType: 'shared' }))).toBe('Shared');
  });
});

describe('create-listing page contract', () => {
  const createPage = readFileSync(
    join(import.meta.dir, '../..', 'src', 'routes', 'landlord', 'listings', 'create.tsx'),
    'utf8'
  );
  const roomEditPage = readFileSync(
    join(
      import.meta.dir,
      '../..',
      'src',
      'routes',
      'landlord',
      'listings',
      'rooms',
      '$id',
      'edit.tsx'
    ),
    'utf8'
  );
  const roomList = readFileSync(
    join(import.meta.dir, '../..', 'src', 'components', 'rooms', 'LandlordRoomList.tsx'),
    'utf8'
  );
  // The add-room dialog was extracted so the rooms page and the listing edit page
  // create rooms the same way (`landlord-rooms-grid` D17).
  const roomFormModal = readFileSync(
    join(import.meta.dir, '../..', 'src', 'components', 'rooms', 'RoomFormModal.tsx'),
    'utf8'
  );

  test('the create form renders rooms inline with no minimum stay field', () => {
    expect(createPage).toContain('aria-label="Rooms"');
    expect(createPage).toContain('<RoomFormFields');
    expect(createPage).not.toContain('Minimum stay');
    expect(createPage).not.toContain('propertyMinStay');
    expect(createPage).not.toContain('<Modal');
  });

  test('the create payload sends the per-room array and uploads photos after create', () => {
    expect(createPage).toContain('rooms: rooms.map(roomDraftPayload)');
    expect(createPage).toContain('uploadRoomPhotos');
    // Every room must be valid before the listing can be created (R3).
    expect(createPage).toContain('!roomsValid');
  });

  test('room types are private / shared / dorm wherever landlords set them', () => {
    for (const source of [roomEditPage, roomFormModal, roomList]) {
      // The option list moved into the shared dialog; the room edit page keeps
      // its own. The list itself no longer declares it.
      if (source !== roomList) {
        expect(source).toContain('<option value="private">Private</option>');
        expect(source).toContain('<option value="shared">Shared</option>');
        expect(source).toContain('<option value="dorm">Dorm</option>');
      }
      expect(source).not.toContain('<option value="single">');
    }
    expect(roomEditPage).toContain('Occupied now');
    // The landlord list shows live occupancy per room.
    expect(roomList).toContain('room.free_slots');
  });

  test('the add-room dialog is shared, and creating a room uploads its photo after the create (R25-R28)', () => {
    expect(roomList).toContain('RoomFormModal');
    expect(roomList).not.toContain('<Modal');
    expect(roomFormModal).toContain('uploadRoomPhotos');
    expect(roomFormModal).toContain('createRoom');
    // The room must exist before its photo can be attached.
    expect(roomFormModal.indexOf('createRoom(token')).toBeLessThan(
      roomFormModal.indexOf('uploadRoomPhotos(token')
    );
  });

  test('the admin property screen inspects each room read-only', () => {
    const propertiesSection = readFileSync(
      join(
        import.meta.dir,
        '../..',
        'src',
        'components',
        'admin',
        'sections',
        'PropertiesSection.tsx'
      ),
      'utf8'
    );

    expect(propertiesSection).toContain('getPropertyRooms');
    expect(propertiesSection).toContain('roomTypeLabel');
    expect(propertiesSection).toContain('free_slots');
    // The inspector is inline on the card now, not a modal
    // (`landlord-properties-card-layout` R20).
    expect(propertiesSection).not.toContain('<Modal');
  });
});
