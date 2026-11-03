/**
 * Browser geolocation + the "map follows me" opt-in (spec `map-use-location`).
 *
 * Two rules shape this module:
 *
 * 1. **Coordinates never leave the browser** (spec D9). They exist only long enough to build an
 *    embedded-map URL. Nothing here calls the API, and nothing logs.
 * 2. **Only a boolean flag is persisted** (spec D15/D16). `localStorage` records that the user
 *    opted in — never a latitude/longitude — so every visit re-asks the device and a user who
 *    has moved gets an accurate pin (and a shared machine leaks no position history).
 *
 * Every entry point is safe to import from server-rendered code: the Worker render path has no
 * `window`/`navigator`, so accessors are guarded rather than assumed (spec R4).
 */

/** A position as reported by the browser. */
export type UserCoordinates = { latitude: number; longitude: number };

/** The single `localStorage` entry this feature writes. A flag, never coordinates. */
export const LOCATION_OPT_IN_KEY = 'haven.mapUseLocation';

/**
 * How long to wait for a position before giving up (spec `map-use-location` R3.4).
 *
 * Without a browser-side cap a stalled location provider can leave the request pending
 * indefinitely — observed in headless Chrome, where no provider answers at all — which would pin
 * the control on "Locating…" forever. On expiry the API reports `TIMEOUT` and the map silently
 * stays on its default, exactly like any other failure.
 */
export const GEOLOCATION_TIMEOUT_MS = 10_000;

/** Can this browser serve a position at all? False during SSR and in insecure contexts. */
export function supportsGeolocation(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.geolocation?.getCurrentPosition === 'function'
  );
}

/**
 * `localStorage`, or `null` when it is unavailable (SSR) or throws (private-mode Safari, blocked
 * storage). A missing store degrades to "not opted in", never to a crash.
 */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Has the user opted into "use my location"? Always false where storage is unavailable. */
export function hasLocationOptIn(): boolean {
  try {
    return storage()?.getItem(LOCATION_OPT_IN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Remember (or forget) the opt-in. Failures are swallowed — the map still works for this visit. */
export function setLocationOptIn(on: boolean): void {
  try {
    const store = storage();
    if (!store) return;
    if (on) store.setItem(LOCATION_OPT_IN_KEY, '1');
    else store.removeItem(LOCATION_OPT_IN_KEY);
  } catch {
    // Storage full or blocked: the preference simply does not survive the visit.
  }
}

/** Forget the opt-in — the "Reset to Malaybalay" path (spec D14). */
export function clearLocationOptIn(): void {
  setLocationOptIn(false);
}

/**
 * Promise wrapper over `navigator.geolocation.getCurrentPosition`.
 *
 * Rejects with the browser's `GeolocationPositionError` on denial/unavailable/timeout, or with a
 * plain `Error` when the API is missing. Callers fall back silently (spec D6), so the rejection
 * value is deliberately untyped beyond `unknown`.
 */
export function getCurrentCoordinates(
  options: PositionOptions = { timeout: GEOLOCATION_TIMEOUT_MS }
): Promise<UserCoordinates> {
  return new Promise((resolve, reject) => {
    if (!supportsGeolocation()) {
      reject(new Error('geolocation-unsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      error => reject(error),
      options
    );
  });
}
