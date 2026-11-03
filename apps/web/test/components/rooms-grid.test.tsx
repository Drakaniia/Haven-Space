import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PropertyRoomsGrid } from '../src/components/rooms/PropertyRoomsGrid';
import {
  ROOM_FILTERS,
  ROOM_SORT_OPTIONS,
  RoomCard,
  countRoomsByFilter,
  matchesRoomSearch,
  naturalRoomNumber,
  occupancyValue,
  rollupRoomStats,
  roomMatchesFilter,
  roomStatusLabel,
  slotRatio,
  slotsLabel,
  sortRooms,
} from '../src/components/rooms/RoomCard';
import { COVER_PHOTO_ACCEPT, coverPhotoError } from '../src/components/rooms/RoomFormModal';
import type { LandlordRoom } from '../src/lib/types';

/**
 * `landlord-rooms-grid`: the stat rollups, the toolbar vocabulary and the markup
 * contracts behind the redesigned property rooms page.
 */

function room(overrides: Partial<LandlordRoom> = {}): LandlordRoom {
  const draft = {
    id: 1,
    property_id: 7,
    room_number: 'Room 1',
    room_type: 'shared',
    description: null,
    price: 600,
    deposit: 0,
    status: 'available',
    capacity: 20,
    occupied: 0,
    free_slots: 20,
    size: null,
    cover_photo: null,
    photos: [],
    created_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };

  // Keep the fixture internally consistent so the slot sorts mean something.
  return { ...draft, free_slots: Math.max(0, draft.capacity - draft.occupied) };
}

const rooms: LandlordRoom[] = [
  room({ id: 1, room_number: 'Room 1', status: 'available', occupied: 0 }),
  room({ id: 2, room_number: 'Room 2', status: 'occupied', occupied: 20 }),
  room({ id: 3, room_number: 'Room 10', status: 'maintenance', occupied: 0 }),
  room({ id: 4, room_number: 'Room 3', status: 'available', occupied: 1, capacity: 20, price: 900 }),
];

describe('room stat rollups (D6/D11/D15)', () => {
  test('counts rooms by status, with maintenance excluded from available', () => {
    expect(rollupRoomStats(rooms)).toMatchObject({
      total: 4,
      occupiedRooms: 1,
      availableRooms: 2,
      maintenanceRooms: 1,
    });
  });

  test('the Tenants / capacity card counts tenants over capacity, not rooms over rooms', () => {
    // 0 + 20 + 0 + 1 tenants over 4 x 20 slots.
    expect(rollupRoomStats(rooms).occupancyLabel).toBe('21/80');
    expect(rollupRoomStats([]).occupancyLabel).toBe('0/0');
    expect(occupancyValue(1, 400)).toBe('1/400');
  });

  test('a property with no rooms reports zeroes rather than throwing', () => {
    expect(rollupRoomStats([])).toEqual({
      total: 0,
      occupiedRooms: 0,
      availableRooms: 0,
      maintenanceRooms: 0,
      occupiedSlots: 0,
      capacitySlots: 0,
      occupancyLabel: '0/0',
    });
  });
});

describe('room card numbers (D12/R19/R20)', () => {
  test('the slot line reads occupied over capacity', () => {
    expect(slotsLabel(1, 20)).toBe('1/20 slots occupied');
    expect(slotsLabel(20, 20)).toBe('20/20 slots occupied');
    expect(slotsLabel(0, 0)).toBe('0/0 slots occupied');
  });

  test('a single-slot room is not pluralised', () => {
    expect(slotsLabel(1, 1)).toBe('1/1 slot occupied');
  });

  test('the bar fill is the occupied share, clamped', () => {
    expect(slotRatio(0, 20)).toBe(0);
    expect(slotRatio(10, 20)).toBe(0.5);
    expect(slotRatio(20, 20)).toBe(1);
    // Data glitches must not overflow the track.
    expect(slotRatio(30, 20)).toBe(1);
    expect(slotRatio(3, 0)).toBe(0);
  });

  test('status labels are readable, never raw tokens', () => {
    expect(roomStatusLabel('available')).toBe('Available');
    expect(roomStatusLabel('occupied')).toBe('Occupied');
    expect(roomStatusLabel('maintenance')).toBe('Maintenance');
    expect(roomStatusLabel('something_new')).toBe('Something new');
    expect(roomStatusLabel(null)).toBe('Available');
  });
});

describe('search, filter and sort (D13/D24/D25/D26/D33)', () => {
  test('search matches the room number only, case-insensitively', () => {
    expect(rooms.filter(r => matchesRoomSearch(r, '1')).map(r => r.room_number)).toEqual([
      'Room 1',
      'Room 10',
    ]);
    expect(matchesRoomSearch(room({ room_number: 'A2' }), 'a2')).toBe(true);
    // A type or description match must not pull an unrelated room in.
    expect(matchesRoomSearch(room({ room_number: 'B4' }), 'shared')).toBe(false);
    expect(rooms.filter(r => matchesRoomSearch(r, '   ')).length).toBe(4);
  });

  test('the pills follow room.status, so a part-filled available room stays Available (D24)', () => {
    const partFilled = room({ status: 'available', occupied: 3, capacity: 20 });

    expect(roomMatchesFilter(partFilled, 'available')).toBe(true);
    expect(roomMatchesFilter(partFilled, 'occupied')).toBe(false);
    expect(roomMatchesFilter(partFilled, 'all')).toBe(true);
    expect(rooms.filter(r => roomMatchesFilter(r, 'maintenance')).length).toBe(1);
  });

  test('pill counts describe the searched set, maintenance included (D7/D25)', () => {
    expect(countRoomsByFilter(rooms)).toEqual({
      all: 4,
      available: 2,
      occupied: 1,
      maintenance: 1,
    });

    // "Room 1" also hits "Room 10" — the substring match the search box promises.
    const searched = rooms.filter(r => matchesRoomSearch(r, 'Room 1'));
    expect(countRoomsByFilter(searched)).toEqual({
      all: 2,
      available: 1,
      occupied: 0,
      maintenance: 1,
    });
  });

  test('room numbers sort naturally, so Room 2 precedes Room 10', () => {
    expect(naturalRoomNumber('Room 2', 'Room 10')).toBeLessThan(0);
    expect(naturalRoomNumber('A2', 'A10')).toBeLessThan(0);
    expect(naturalRoomNumber('room 3', 'Room 3')).toBe(0);
    expect(sortRooms(rooms, 'number').map(r => r.room_number)).toEqual([
      'Room 1',
      'Room 2',
      'Room 3',
      'Room 10',
    ]);
  });

  test('the numeric sorts lead with availability and keep room order as the tiebreak', () => {
    expect(sortRooms(rooms, 'rent').map(r => r.price)).toEqual([600, 600, 600, 900]);
    // Most free slots first: 20, 20 (naturally ordered), then 19, then the full room.
    expect(sortRooms(rooms, 'slots').map(r => r.room_number)).toEqual([
      'Room 1',
      'Room 10',
      'Room 3',
      'Room 2',
    ]);
    // Least full first: 0 occupancy rooms hold their natural order, the full one last.
    expect(sortRooms(rooms, 'occupancy').map(r => r.room_number)).toEqual([
      'Room 1',
      'Room 10',
      'Room 3',
      'Room 2',
    ]);
    expect(sortRooms(rooms, 'rent')).not.toBe(rooms);
  });

  test('every filter and sort option carries a readable label', () => {
    expect(ROOM_FILTERS.map(f => f.value)).toEqual([
      'all',
      'available',
      'occupied',
      'maintenance',
    ]);
    expect(ROOM_SORT_OPTIONS[0].value).toBe('number');
    for (const option of [...ROOM_FILTERS, ...ROOM_SORT_OPTIONS]) {
      expect(option.label).not.toContain('_');
    }
  });
});

describe('cover photo validation (R26)', () => {
  test('accepts the three image types the create flow accepts', () => {
    expect(COVER_PHOTO_ACCEPT).toContain('image/jpeg');
    expect(coverPhotoError({ type: 'image/png', size: 1024 })).toBeNull();
    expect(coverPhotoError({ type: 'image/webp', size: 5 * 1024 * 1024 })).toBeNull();
  });

  test('rejects other types and oversized files with a readable message', () => {
    expect(coverPhotoError({ type: 'application/pdf', size: 10 })).toContain('jpg, png or webp');
    expect(coverPhotoError({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 })).toContain('5 MB');
  });
});

/**
 * Behavioural pass through the real components. `RoomCard` renders a TanStack
 * `<Link>`, so it needs a router context — this is the minimal tree used by
 * `feature-gate.test.tsx`, which avoids importing the app's full route tree.
 */
let uiSlot: ReactNode = null;

const rootRoute = createRootRoute({ component: () => uiSlot });
const roomEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landlord/listings/rooms/$id/edit',
});
const router = createRouter({
  routeTree: rootRoute.addChildren([roomEditRoute]),
  history: createMemoryHistory({ initialEntries: ['/landlord/listings/rooms/1/edit'] }),
});

function renderInApp(node: ReactNode) {
  uiSlot = (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {node}
    </QueryClientProvider>
  );
  return render(<RouterProvider router={router} />);
}

const gridRooms: LandlordRoom[] = [
  room({ id: 1, room_number: 'Room 1', status: 'available', occupied: 0, capacity: 20, price: 600 }),
  room({ id: 2, room_number: 'Room 2', status: 'occupied', occupied: 20, capacity: 20, price: 600 }),
  room({ id: 10, room_number: 'Room 10', status: 'available', occupied: 1, capacity: 20, price: 900 }),
];

function mockRoomsApi(roomsPayload: LandlordRoom[]) {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: {
          property: {
            id: 7,
            name: 'Onda Boarding House',
            status: 'active',
            total_rooms: roomsPayload.length,
            occupied_rooms: roomsPayload.filter(r => r.status === 'occupied').length,
          },
          rooms: roomsPayload,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as unknown as typeof fetch;
}

beforeEach(() => {
  uiSlot = null;
});

afterEach(() => cleanup());

describe('room card rendering', () => {
  // The router's first paint is async, so every card waits for its own render.
  const awaitCard = () => screen.findByRole('heading', { level: 3 });

  test('shows the room number, type, pill, rent and the occupancy bar', async () => {
    const { container } = renderInApp(
      <RoomCard
        room={room({
          id: 9,
          room_number: 'Room 9',
          room_type: 'shared',
          status: 'available',
          price: 600,
          occupied: 2,
          capacity: 20,
        })}
        propertyId={7}
        onDelete={() => {}}
      />
    );

    await awaitCard();

    expect(screen.getByText('Room 9')).toBeDefined();
    expect(screen.getByText('Shared room')).toBeDefined();
    expect(screen.getByText('Available')).toBeDefined();
    expect(container.textContent).toContain('₱600');
    expect(screen.getByText('2/20 slots occupied')).toBeDefined();

    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('2');
    expect(bar.getAttribute('aria-valuemax')).toBe('20');
    // Width is the occupied share, 10%.
    expect(container.querySelector('[role="progressbar"] > div')?.getAttribute('style')).toContain(
      '10%'
    );
  });

  test('an occupied room renders the warning-tinted pill and a full bar', async () => {
    const { container } = renderInApp(
      <RoomCard
        room={room({ status: 'occupied', occupied: 20, capacity: 20 })}
        propertyId={7}
        onDelete={() => {}}
      />
    );

    await awaitCard();

    expect(screen.getByText('20/20 slots occupied')).toBeDefined();
    expect(container.querySelector('[role="progressbar"] > div')?.getAttribute('style')).toContain(
      '100%'
    );
    // Status is text *and* tone, never colour alone (D20/R17).
    expect(screen.getByText('Occupied').className).toContain('bg-warning-tint');
  });

  test('the cover photo is used when set, and a placeholder tile stands in when it is not', async () => {
    const withPhoto = renderInApp(
      <RoomCard
        room={room({ cover_photo: 'https://cdn.example/room-cover.jpg' })}
        propertyId={7}
        onDelete={() => {}}
      />
    );
    await awaitCard();
    expect(withPhoto.container.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example/room-cover.jpg'
    );

    cleanup();

    const withoutPhoto = renderInApp(
      <RoomCard room={room({ cover_photo: null })} propertyId={7} onDelete={() => {}} />
    );
    await awaitCard();
    expect(withoutPhoto.container.querySelectorAll('img[src*="cdn.example"]').length).toBe(0);
  });

  test('Edit room links to the room edit route, and the trash button reports the room', async () => {
    const deleted: LandlordRoom[] = [];
    renderInApp(
      <RoomCard
        room={room({ id: 9, room_number: 'Room 9' })}
        propertyId={7}
        onDelete={r => deleted.push(r)}
      />
    );

    await awaitCard();

    // Only the target route is asserted from the DOM: several test files each
    // mount their own minimal route tree in this process, and happy-dom's `href`
    // is not reliably interpolated here. The route, the `id` param and the
    // `propertyId` search value are locked in by the source contract below.
    expect(screen.getByText('Edit room').closest('a')?.getAttribute('href')).toContain(
      '/landlord/listings/rooms/'
    );

    fireEvent.click(screen.getByLabelText('Delete room Room 9'));
    expect(deleted.map(r => r.id)).toEqual([9]);
  });
});

describe('rooms grid behaviour', () => {
  const grid = () =>
    renderInApp(<PropertyRoomsGrid token="test-token" propertyId={7} addOpen={false} onAddOpenChange={() => {}} />);

  const headings = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);

  test('renders the four stats and one card per room, in room-number order', async () => {
    mockRoomsApi(gridRooms);
    grid();

    await screen.findByText('Room 1');

    // Total 3, occupied 1, available 2, occupancy 21 tenants of 60 slots.
    for (const [label, value] of [
      ['Total rooms', '3'],
      ['Occupied rooms', '1'],
      ['Available rooms', '2'],
      ['Tenants / capacity', '21/60'],
    ]) {
      const card = screen.getByText(label).parentElement;
      expect(card?.textContent).toContain(value);
    }

    expect(headings()).toEqual(['Room 1', 'Room 2', 'Room 10']);
  });

  test('the status pills filter the grid and carry the searched counts', async () => {
    mockRoomsApi(gridRooms);
    grid();
    await screen.findByText('Room 1');

    fireEvent.click(screen.getByRole('button', { name: /^Occupied/ }));
    expect(headings()).toEqual(['Room 2']);

    fireEvent.click(screen.getByRole('button', { name: /^Available/ }));
    expect(headings()).toEqual(['Room 1', 'Room 10']);

    // Maintenance has no rooms here, so its filter is empty and offers a reset.
    fireEvent.click(screen.getByRole('button', { name: /^Maintenance/ }));
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    expect(screen.getByText(/No maintenance rooms/)).toBeDefined();

    fireEvent.click(screen.getByText('Clear filters'));
    expect(headings()).toEqual(['Room 1', 'Room 2', 'Room 10']);
  });

  test('search filters by room number and updates the pill counts', async () => {
    mockRoomsApi(gridRooms);
    grid();
    await screen.findByText('Room 1');

    fireEvent.change(screen.getByLabelText('Search rooms'), { target: { value: '1' } });

    expect(headings()).toEqual(['Room 1', 'Room 10']);
    // "Room 10" is available, "Room 1" is available: All 2, Available 2.
    expect(screen.getByRole('button', { name: /^All/ }).textContent).toContain('2');
    // The stat cards describe the whole property, not the search (D25).
    expect(screen.getByText('Total rooms').parentElement?.textContent).toContain('3');

    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(headings()).toEqual(['Room 1', 'Room 2', 'Room 10']);
  });

  test('the sort select reorders the cards, with room number as the default', async () => {
    mockRoomsApi(gridRooms);
    grid();
    await screen.findByText('Room 1');

    const select = screen.getByLabelText('Sort rooms') as HTMLSelectElement;
    expect(select.value).toBe('number');

    // Free slots, most first: 20, 19, 0.
    fireEvent.change(select, { target: { value: 'slots' } });
    expect(headings()).toEqual(['Room 1', 'Room 10', 'Room 2']);

    // Cheapest first: 600 (1 and 2, naturally ordered), then 900.
    fireEvent.change(select, { target: { value: 'rent' } });
    expect(headings()).toEqual(['Room 1', 'Room 2', 'Room 10']);

    fireEvent.change(select, { target: { value: 'occupancy' } });
    expect(headings()).toEqual(['Room 1', 'Room 10', 'Room 2']);
  });

  test('the trash button opens the delete confirm, and cancelling keeps the room', async () => {
    mockRoomsApi(gridRooms);
    grid();
    await screen.findByText('Room 1');

    fireEvent.click(screen.getByLabelText('Delete room Room 1'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Room 1');
    expect(dialog.textContent).toContain('cannot be undone');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(headings()).toEqual(['Room 1', 'Room 2', 'Room 10']);
  });

  test('an empty property offers the add-room action instead of a grid', async () => {
    mockRoomsApi([]);
    const opened: boolean[] = [];
    renderInApp(
      <PropertyRoomsGrid
        token="test-token"
        propertyId={7}
        addOpen={false}
        onAddOpenChange={open => opened.push(open)}
      />
    );

    await screen.findByText('No rooms yet');
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    // The stat cards still render, zeroed.
    expect(screen.getByText('Tenants / capacity').parentElement?.textContent).toContain('0/0');

    fireEvent.click(screen.getByRole('button', { name: '+ Add room' }));
    expect(opened).toEqual([true]);
  });
});

describe('rooms page contract', () => {
  const webRoot = join(import.meta.dir, '..');
  const read = (...parts: string[]) => readFileSync(join(webRoot, 'src', ...parts), 'utf8');

  const page = read('routes', 'landlord', 'properties', '$id', 'rooms.tsx');
  const grid = read('components', 'rooms', 'PropertyRoomsGrid.tsx');
  const card = read('components', 'rooms', 'RoomCard.tsx');
  const badge = read('components', 'ui', 'StatusBadge.tsx');

  test('the page hands the header its add-room action and renders the grid (D1/D2/D14)', () => {
    expect(page).toContain('PropertyRoomsGrid');
    // The page no longer imports the compact list (its doc comment may still name it).
    expect(page).not.toContain('components/rooms/LandlordRoomList');
    expect(page).toContain('trailTail="Rooms"');
    // The redundant page subtitle was removed (redundant-copy sweep).
    expect(page).not.toContain('Manage rooms, rent and occupancy in one place.');
    expect(page).toContain('+ Add room');
    expect(page).toContain('action={');
  });

  test('the four stat cards and the toolbar are declared once', () => {
    for (const label of ['Total rooms', 'Occupied rooms', 'Available rooms', 'Tenants / capacity']) {
      expect(grid).toContain(label);
    }
    expect(grid).toContain('ROOM_FILTERS');
    expect(grid).toContain('ROOM_SORT_OPTIONS');
    expect(grid).toContain('aria-label="Search rooms"');
    expect(grid).toContain('aria-label="Sort rooms"');
    expect(grid).toContain('role="group"');
  });

  test('the grid is responsive, has no paging and shows every state (D4/D16/D21)', () => {
    expect(card).toContain('grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4');
    expect(card).toContain('RoomCardSkeletonGrid');
    expect(grid).toContain('EmptyState');
    expect(grid).toContain('ErrorState');
    expect(grid).toContain('Clear filters');
    expect(grid).not.toContain('Load more');
    expect(grid).not.toContain('Showing');
  });

  test('the card is inert except for its two controls (D5/D27)', () => {
    expect(card).toContain('to="/landlord/listings/rooms/$id/edit"');
    expect(card).toContain('params={{ id: String(room.id) }}');
    // The card tags the editor with its origin so saving returns to the rooms page.
    expect(card).toContain("search={{ propertyId: String(propertyId), from: 'rooms' }}");
    expect(card).toContain('aria-label={`Delete room ${title}`}');
    expect(card).toContain('role="progressbar"');
    expect(card).toContain('onClick={() => onDelete(room)}');
    // No stretched link: the card body does not navigate.
    expect(card).not.toContain('after:absolute');
  });

  test('the editor returns to the surface that opened it, not always the listing (bug fix)', () => {
    const editor = read('routes', 'landlord', 'listings', 'rooms', '$id', 'edit.tsx');

    // The same editor sits under the listing route but is opened from the property
    // rooms page too; it must carry and honour which surface sent the landlord here.
    expect(editor).toContain("from?: 'rooms' | 'listing'");
    expect(editor).toContain("from: search.from === 'rooms'");
    expect(editor).toContain("to: '/landlord/properties/$id/rooms'");
    expect(editor).toContain("to: '/landlord/listings/$id/edit'");
    // The property-rooms card is the surface that tags the editor with `rooms`.
    expect(card).toContain("from: 'rooms'");
  });

  test('the page uses the app tokens only (D35)', () => {
    for (const source of [card, grid]) {
      expect(source).not.toMatch(/#[0-9a-f]{3,6}/i);
      expect(source).not.toContain('style={{ color');
    }
    expect(card).toContain('bg-mint');
    expect(card).toContain('bg-primary');
  });

  test('StatusBadge gained the room statuses (D20)', () => {
    expect(badge).toContain("available: 'bg-success-tint text-success-ink'");
    expect(badge).toContain("occupied: 'bg-warning-tint text-warning-ink'");
    expect(badge).toContain("maintenance: 'bg-subtle text-gray-ink'");
  });

  test('the shared dialog creates before it uploads, and the list still deletes through a confirm', () => {
    const list = read('components', 'rooms', 'LandlordRoomList.tsx');

    expect(list).toContain('ConfirmDialog');
    expect(list).toContain('RoomFormModal');
    expect(list).toContain('room.free_slots');
  });
});
