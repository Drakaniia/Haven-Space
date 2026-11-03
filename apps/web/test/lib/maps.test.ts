import { test, expect } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  DEFAULT_MAP_URL,
  DEFAULT_MAP_ZOOM,
  MAP_LOCATION_QUERY,
  USER_LOCATION_MAP_ZOOM,
  mapUrlForCoordinates,
  osmEmbedUrl,
} from '../src/lib/maps';
import {
  GEOLOCATION_TIMEOUT_MS,
  LOCATION_OPT_IN_KEY,
  hasLocationOptIn,
  type UserCoordinates,
} from '../src/lib/geolocation';
import { useMapLocation } from '../src/lib/useMapLocation';
import { mapSubtitle } from '../src/components/rooms/MapEmbed';
import { MAP_MODAL_TITLE } from '../src/components/rooms/MapModal';

const SRC_DIR = join(import.meta.dir, '..', 'src');

/** Every `.ts`/`.tsx` file under `src`, so a regression can't hide in an unread file. */
function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

// Regression: the map pages used to hardcode their own nationwide search
// (`?q=boarding+house+Philippines`), so none of them showed a meaningful location and the
// strings drifted apart. The locale now lives in one module (spec `auth-hero-map-locale`).
// `routes/boarder/maps.tsx` was removed by spec `find-a-room-map-modal` (D19) — boarders reach the
// map through the `/find-a-room` dialog instead. `routes/public-maps.tsx` was removed by spec
// `hero-map-modal` — the home hero opens the same view-only map as a dialog.
const MAP_ROUTES = ['routes/maps.tsx', 'routes/landlord/maps.tsx'];

/** Every surface that shows a map, for the "no coordinates leave the device" scan below. */
const MAP_SURFACE_FILES = [
  ...MAP_ROUTES,
  // Hosts the view-only dialog, so it is a map surface even though it renders no frame itself.
  'components/rooms/Hero.tsx',
  'components/rooms/MapEmbed.tsx',
  'components/rooms/MapLocationControl.tsx',
  'components/rooms/MapModal.tsx',
  'components/rooms/RoomDetailView.tsx',
];

// --- Static locale (spec `auth-hero-map-locale`) -------------------------------------------

test('the canonical map locale is Malaybalay, Bukidnon', () => {
  expect(MAP_LOCATION_QUERY).toBe('Malaybalay, Bukidnon');
});

test('the default map URL pins the locale at city zoom', () => {
  expect(DEFAULT_MAP_ZOOM).toBe(13);
  expect(DEFAULT_MAP_URL).toContain(`q=${encodeURIComponent(MAP_LOCATION_QUERY)}`);
  expect(DEFAULT_MAP_URL).toContain('output=embed');
  expect(DEFAULT_MAP_URL.endsWith(`&z=${DEFAULT_MAP_ZOOM}`)).toBe(true);
});

test('every map route renders the shared embed, not a literal URL', () => {
  for (const route of MAP_ROUTES) {
    const source = readFileSync(join(SRC_DIR, route), 'utf8');
    expect(source).toContain('<MapEmbed');
    expect(source).not.toContain('<iframe');
    expect(source).not.toContain('https://www.google.com/maps');
  }
});

test('the shared embed is the single place the map URL is consumed', () => {
  const embed = readFileSync(join(SRC_DIR, 'components/rooms/MapEmbed.tsx'), 'utf8');
  // A runtime position when the user shared one, otherwise the Malaybalay embed.
  expect(embed).toContain('url ?? DEFAULT_MAP_URL');
});

test('no source file still hardcodes the old nationwide map search', () => {
  const offenders = sourceFiles(SRC_DIR).filter(file =>
    readFileSync(file, 'utf8').includes('boarding+house+Philippines')
  );
  expect(offenders).toEqual([]);
});

// --- Runtime coordinates (spec `map-use-location`) -----------------------------------------

test('the user-location zoom is neighbourhood level, tighter than the default', () => {
  expect(USER_LOCATION_MAP_ZOOM).toBe(15);
  expect(USER_LOCATION_MAP_ZOOM).toBeGreaterThan(DEFAULT_MAP_ZOOM);
});

test('mapUrlForCoordinates pins raw coordinates at the user zoom', () => {
  const url = mapUrlForCoordinates(8.1575, 125.1275);
  expect(url).toContain('output=embed');
  expect(url).toContain(`q=${encodeURIComponent('8.1575,125.1275')}`);
  expect(url.endsWith(`&z=${USER_LOCATION_MAP_ZOOM}`)).toBe(true);
  // The place-string default must not leak into a coordinate URL.
  expect(url).not.toContain(encodeURIComponent(MAP_LOCATION_QUERY));
});

test('mapUrlForCoordinates handles negative coordinates and a custom zoom', () => {
  const url = mapUrlForCoordinates(-8.5, -125.25, 11);
  expect(url).toContain(`q=${encodeURIComponent('-8.5,-125.25')}`);
  expect(url.endsWith('&z=11')).toBe(true);
});

test('osmEmbedUrl keeps the listing-detail embed shape', () => {
  const url = osmEmbedUrl(8.1575, 125.1275);
  expect(url).toContain('https://www.openstreetmap.org/export/embed.html');
  expect(url).toContain('layer=mapnik');
  expect(url).toContain('marker=8.1575,125.1275');
  expect(url).toContain('bbox=');
});

// --- The hook ------------------------------------------------------------------------------

/**
 * happy-dom has no real geolocation, so the hook is exercised against a stub that answers
 * synchronously. Returns a counter so a test can assert nothing was fetched at all.
 */
function stubGeolocation(result: { coordinates?: UserCoordinates; fail?: boolean }) {
  const state = { calls: 0, options: [] as (PositionOptions | undefined)[] };
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition(
        onSuccess: (position: unknown) => void,
        onError?: (error: unknown) => void,
        options?: PositionOptions
      ) {
        state.calls += 1;
        state.options.push(options);
        if (result.fail) {
          onError?.({ code: 1, message: 'denied' });
          return;
        }
        onSuccess({ coords: result.coordinates ?? { latitude: 8.1575, longitude: 125.1275 } });
      },
    },
  });
  return state;
}

function removeGeolocation() {
  // The unsupported-browser case: the property must be genuinely absent.
  delete (navigator as unknown as Record<string, unknown>).geolocation;
}

function resetLocationState() {
  localStorage.removeItem(LOCATION_OPT_IN_KEY);
}

test('the control is hidden when the browser cannot serve a position', async () => {
  removeGeolocation();
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(false));
  expect(result.current.status).toBe('idle');
  expect(result.current.coordinates).toBeNull();
});

test('using the location activates the map and remembers the opt-in', async () => {
  stubGeolocation({ coordinates: { latitude: 8.1575, longitude: 125.1275 } });
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  await act(async () => {
    result.current.useMyLocation();
  });

  await waitFor(() => expect(result.current.status).toBe('active'));
  expect(result.current.coordinates).toEqual({ latitude: 8.1575, longitude: 125.1275 });
  expect(localStorage.getItem(LOCATION_OPT_IN_KEY)).toBe('1');
});

test('every lookup carries a timeout so the control cannot spin forever', async () => {
  const stub = stubGeolocation({ coordinates: { latitude: 8.1575, longitude: 125.1275 } });
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  await act(async () => {
    result.current.useMyLocation();
  });
  await waitFor(() => expect(result.current.status).toBe('active'));

  // Without a browser-side cap a stalled provider leaves the request pending and the button
  // stuck on "Locating…" (spec R3.4).
  expect(stub.options).toHaveLength(1);
  expect(stub.options[0]?.timeout).toBe(GEOLOCATION_TIMEOUT_MS);
});

test('a denied lookup stays on the default and writes no opt-in', async () => {
  stubGeolocation({ fail: true });
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  await act(async () => {
    result.current.useMyLocation();
  });

  await waitFor(() => expect(result.current.status).toBe('idle'));
  expect(result.current.coordinates).toBeNull();
  expect(hasLocationOptIn()).toBe(false);
});

test('a remembered opt-in auto-applies fresh coordinates on mount', async () => {
  stubGeolocation({ coordinates: { latitude: 10.5, longitude: 122.5 } });
  resetLocationState();
  localStorage.setItem(LOCATION_OPT_IN_KEY, '1');

  const { result } = renderHook(() => useMapLocation());

  await waitFor(() => expect(result.current.status).toBe('active'));
  expect(result.current.coordinates).toEqual({ latitude: 10.5, longitude: 122.5 });
});

test('a failing lookup on mount keeps the stored opt-in', async () => {
  stubGeolocation({ fail: true });
  resetLocationState();
  localStorage.setItem(LOCATION_OPT_IN_KEY, '1');

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  // Give the rejected lookup a turn to settle, then confirm nothing was downgraded.
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  expect(result.current.status).toBe('idle');
  expect(hasLocationOptIn()).toBe(true);
});

test('reset clears the opt-in and returns to the default view', async () => {
  stubGeolocation({ coordinates: { latitude: 8.1575, longitude: 125.1275 } });
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  await act(async () => {
    result.current.useMyLocation();
  });
  await waitFor(() => expect(result.current.status).toBe('active'));

  await act(async () => {
    result.current.reset();
  });

  expect(result.current.status).toBe('idle');
  expect(result.current.coordinates).toBeNull();
  expect(hasLocationOptIn()).toBe(false);
});

test("autoApply: false keeps the surface's own default on mount", async () => {
  const stub = stubGeolocation({ coordinates: { latitude: 8.1575, longitude: 125.1275 } });
  resetLocationState();
  localStorage.setItem(LOCATION_OPT_IN_KEY, '1');

  // The listing map's default is the listing, so a remembered opt-in must not override it until
  // the user clicks the control.
  const { result } = renderHook(() => useMapLocation({ autoApply: false }));
  await waitFor(() => expect(result.current.supported).toBe(true));

  expect(stub.calls).toBe(0);
  expect(result.current.status).toBe('idle');

  await act(async () => {
    result.current.useMyLocation();
  });
  await waitFor(() => expect(result.current.status).toBe('active'));
});

test('no lookup runs on mount without an opt-in', async () => {
  const stub = stubGeolocation({ coordinates: { latitude: 8.1575, longitude: 125.1275 } });
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  expect(stub.calls).toBe(0);
  expect(result.current.status).toBe('idle');
});

// --- Source-scan guards --------------------------------------------------------------------

/**
 * Surfaces that follow the user. The view-only home-hero dialog is deliberately **absent** (spec
 * `hero-map-modal`): it is a read-only overview for visitors, so it neither renders the control nor
 * mounts the hook. Keep this list and the guard below in step — one asserts the feature is still
 * everywhere it belongs, the other that it never comes back to the hero.
 */
const LOCATION_SURFACES = [
  'routes/maps.tsx',
  'routes/landlord/maps.tsx',
  'components/rooms/MapModal.tsx',
  'components/rooms/RoomDetailView.tsx',
];

test('every location-enabled surface renders the shared location control', () => {
  // `MapEmbed` is the frame only — the pages (and the listing detail) own the control row.
  for (const file of LOCATION_SURFACES) {
    const source = readFileSync(join(SRC_DIR, file), 'utf8');
    expect(source).toContain('MapLocationControl');
  }
});

test('the home hero map dialog is view-only: no control, no wiring, nothing to ask for a position', () => {
  // Same reasoning the retired `/public-maps` page had: dropping any of these would silently
  // re-enable "use my location" on a page that must never ask for a position, so the absence is
  // asserted rather than assumed.
  const source = readFileSync(join(SRC_DIR, 'components/rooms/Hero.tsx'), 'utf8');
  expect(source).not.toContain('MapLocationControl');
  expect(source).not.toContain('useMapLocation');
  expect(source).not.toContain('geolocation');
  expect(source).not.toContain('LOCATION_SUBTITLE');
  expect(source).not.toContain('mapUrlForCoordinates');
  // No runtime position on this dialog: the embed uses its own Malaybalay default.
  expect(source).not.toContain('url=');
  // It still renders the dialog, and opts into the view-only variant.
  expect(source).toContain('<MapModal');
  expect(source).toContain('viewOnly');
});

test('the view-only map body is the interactive one minus every geolocation piece', () => {
  const source = readFileSync(join(SRC_DIR, 'components/rooms/MapModal.tsx'), 'utf8');
  const body = source.slice(source.indexOf('function MapModalViewOnlyBody'));

  expect(body).not.toContain('useMapLocation');
  expect(body).not.toContain('MapLocationControl');
  expect(body).not.toContain('mapUrlForCoordinates');
  expect(body).not.toContain('LOCATION_SUBTITLE');
  expect(body).not.toContain('url=');
  // Same frame height as the interactive body, so the two dialogs are the same size.
  expect(body).toContain('heightClass="h-[60vh] sm:h-[70vh]"');
  // It still renders the map.
  expect(body).toContain('<MapEmbed');
});

test('the view-only dialog keeps the Malaybalay subtitle', () => {
  // No location state exists on that dialog, so `mapSubtitle()` is its only subtitle.
  expect(mapSubtitle()).toBe(`Browse boarding houses around ${MAP_LOCATION_QUERY}.`);
});

test('navigator.geolocation is only touched by the geolocation module', () => {
  const offenders = sourceFiles(SRC_DIR)
    .filter(file => readFileSync(file, 'utf8').includes('navigator.geolocation'))
    .map(file => file.slice(SRC_DIR.length + 1).replace(/\\/g, '/'));
  expect(offenders).toEqual(['lib/geolocation.ts']);
});

test('no map surface sends coordinates anywhere', () => {
  for (const file of MAP_SURFACE_FILES) {
    const source = readFileSync(join(SRC_DIR, file), 'utf8');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('createServerFn');
    expect(source).not.toContain('console.log');
  }
});

test('only the opt-in flag is persisted, never coordinates', () => {
  const persistedCoordinates = sourceFiles(SRC_DIR).filter(file =>
    /setItem\([^)]*(latitude|longitude|coords)/i.test(readFileSync(file, 'utf8'))
  );
  expect(persistedCoordinates).toEqual([]);

  const writers = sourceFiles(SRC_DIR).filter(file =>
    readFileSync(file, 'utf8').includes('LOCATION_OPT_IN_KEY')
  );
  // The key is defined in and written by the geolocation module alone.
  expect(writers.map(file => file.slice(SRC_DIR.length + 1).replace(/\\/g, '/'))).toEqual([
    'lib/geolocation.ts',
  ]);
});

// --- The Find a Room map dialog (spec `find-a-room-map-modal`) ------------------------------

test('Find a Room opens the map in place instead of navigating away', () => {
  const source = readFileSync(join(SRC_DIR, 'components/rooms/FindARoomContent.tsx'), 'utf8');

  expect(source).toContain('<MapModal');
  expect(source).toContain('setMapOpen(true)');
  // The regression this whole spec exists for: the affordance used to be a link to /maps.
  expect(source).not.toContain('to="/maps"');
  expect(source).not.toContain("to='/maps'");
});

test('the map dialog is a host for the shared map pieces, not a copy', () => {
  const source = readFileSync(join(SRC_DIR, 'components/rooms/MapModal.tsx'), 'utf8');

  expect(source).toContain('<Modal');
  expect(source).toContain('useMapLocation');
  expect(source).toContain('MapLocationControl');
  expect(source).toContain('<MapEmbed');
  // The frame keeps its phone height and steps up on desktop (spec `modal-desktop-width` R4).
  expect(source).toContain('h-[60vh]');
  expect(source).toContain('sm:h-[70vh]');
  // The dialog takes the widest panel rather than the shared default. Spec `modal-desktop-width` D6
  // supersedes D4 of `find-a-room-map-modal`, which pinned this to the default `md`. `md` now caps at
  // 672px on desktop, so dropping this would leave the map 480px narrower than the request asked for.
  expect(source).toContain('size="xl"');
});

// --- The dialog header row (spec `map-modal-header-row`) -------------------------------------

test('the dialog subtitle is centred with the control pinned beside it', () => {
  const source = readFileSync(join(SRC_DIR, 'components/rooms/MapModal.tsx'), 'utf8');

  // One row instead of the old subtitle line stacked above a right-aligned control (R1/R2).
  expect(source).toContain('text-center');
  expect(source).toContain('sm:absolute');
  expect(source).toContain('sm:inset-x-0');
  expect(source).toContain('sm:top-1/2');
  // The symmetric gutter that keeps the centred text clear of the button (R3).
  expect(source).toContain('sm:px-40');
  // Pinned right, and the row keeps its height when the control renders null (R4/R5).
  expect(source).toContain('sm:justify-end');
  expect(source).toContain('sm:min-h-9');
  // The ~8px gap: the wrapper cancels the control's own `mb-4` (R6). Deleting this as a mistake
  // silently re-adds 8px, so it is asserted rather than assumed.
  expect(source).toContain('-mb-4');
  // Still rendered from the modal, not re-implemented.
  expect(source).toContain('<MapLocationControl state={location} />');
});

test('the shared control was wrapped, not rewritten', () => {
  const source = readFileSync(join(SRC_DIR, 'components/rooms/MapLocationControl.tsx'), 'utf8');

  // `MapLocationControl` owns its margin and alignment (spec D8), and the modal's row simply gives
  // it a slot. If either goes, the wrapper's `-mb-4`/`sm:justify-end` stops doing anything.
  expect(source).toContain('mb-4');
  expect(source).toContain('justify-end');
});

test('the header-row rework is scoped to the /find-a-room dialog', () => {
  const modal = readFileSync(join(SRC_DIR, 'components/rooms/MapModal.tsx'), 'utf8');

  // The hero's view-only body keeps the old left-aligned subtitle (D1/D20).
  const viewOnly = modal.slice(modal.indexOf('function MapModalViewOnlyBody'));
  expect(viewOnly).not.toContain('text-center');
  expect(viewOnly).not.toContain('sm:px-40');

  // The other map surfaces keep their stacked layout (D1/D17).
  for (const file of ['routes/maps.tsx', 'routes/landlord/maps.tsx']) {
    expect(readFileSync(join(SRC_DIR, file), 'utf8')).not.toContain('sm:px-40');
  }
});

// --- The home hero map dialog (spec `hero-map-modal`) ----------------------------------------

test('the home hero opens the map in place instead of navigating away', () => {
  const source = readFileSync(join(SRC_DIR, 'components/rooms/Hero.tsx'), 'utf8');

  expect(source).toContain('<MapModal');
  expect(source).toContain('setMapOpen(true)');
  expect(source).toContain('open={mapOpen}');
  expect(source).toContain('<button');
  // The regression this whole spec exists for: the affordance used to navigate to /public-maps.
  expect(source).not.toContain('to="/public-maps"');
  expect(source).not.toContain("to='/public-maps'");
});

test('the hero dialog and the browse dialog are the same panel', () => {
  const hero = readFileSync(join(SRC_DIR, 'components/rooms/Hero.tsx'), 'utf8');
  const modal = readFileSync(join(SRC_DIR, 'components/rooms/MapModal.tsx'), 'utf8');

  // The hero passes no `size`: both dialogs take the one `MapModal` hard-codes, so they cannot
  // drift apart (spec `hero-map-modal` D5).
  expect(hero).not.toContain('size="xl"');
  expect(modal).toContain('size="xl"');
});

/**
 * Every map surface, with the frame height it must use (spec `modal-desktop-width` D8/D9).
 *
 * Each one steps up from 640px and keeps its existing phone height, so this scan is what stops a
 * surface being forgotten or silently getting shorter on mobile.
 */
const MAP_FRAME_HEIGHTS: { file: string; heights: [string, string] }[] = [
  { file: 'components/rooms/MapModal.tsx', heights: ['h-[60vh]', 'sm:h-[70vh]'] },
  { file: 'routes/maps.tsx', heights: ['h-[60vh]', 'sm:h-[70vh]'] },
  // Already the tallest on mobile, so it steps up to 80vh instead of 70vh.
  { file: 'routes/landlord/maps.tsx', heights: ['h-[70vh]', 'sm:h-[80vh]'] },
];

test('every map frame is taller on desktop and unchanged on phones', () => {
  for (const { file, heights } of MAP_FRAME_HEIGHTS) {
    const source = readFileSync(join(SRC_DIR, file), 'utf8');
    const declared = source.match(/heightClass="([^"]+)"/)?.[1];
    expect(declared).toBe(`${heights[0]} ${heights[1]}`);
  }
});

test('the dialog heading is the fixed one from the spec', () => {
  expect(MAP_MODAL_TITLE).toBe('Find boarding houses near you');
});

test('the map body only exists while the dialog is open', () => {
  const source = readFileSync(join(SRC_DIR, 'components/rooms/MapModal.tsx'), 'utf8');

  // Structural guard, not cosmetic: with this gate removed, a remembered opt-in would run a
  // geolocation lookup as soon as the host page loads, before the dialog is ever opened. Both
  // bodies sit behind the same `open` gate — the view-only one just has nothing to run.
  const gate = source.split('\n').find(line => line.includes('<MapModalBody'));
  expect(gate).toBeDefined();
  expect(gate).toContain('open ?');
  expect(gate).toContain('viewOnly ?');
});

test('the retired boarder map route is gone', () => {
  expect(existsSync(join(SRC_DIR, 'routes/boarder/maps.tsx'))).toBe(false);

  const offenders = sourceFiles(SRC_DIR)
    .filter(file => readFileSync(file, 'utf8').includes('/boarder/maps'))
    .map(file => file.slice(SRC_DIR.length + 1).replace(/\\/g, '/'));
  expect(offenders).toEqual([]);
});

test('the retired public map route is gone', () => {
  expect(existsSync(join(SRC_DIR, 'routes/public-maps.tsx'))).toBe(false);

  // The hero dialog replaced it as the only in-app entry point, so a leftover reference would be a
  // dead link (spec `hero-map-modal` D4).
  const offenders = sourceFiles(SRC_DIR)
    .filter(file => readFileSync(file, 'utf8').includes('/public-maps'))
    .map(file => file.slice(SRC_DIR.length + 1).replace(/\\/g, '/'));
  expect(offenders).toEqual([]);
});
