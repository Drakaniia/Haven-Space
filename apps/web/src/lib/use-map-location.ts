import { useCallback, useEffect, useRef, useState } from 'react';

import {
  clearLocationOptIn,
  getCurrentCoordinates,
  hasLocationOptIn,
  setLocationOptIn,
  supportsGeolocation,
  type UserCoordinates,
} from './geolocation';

/** `idle` = Malaybalay default, `locating` = browser is resolving, `active` = pin follows the user. */
export type MapLocationStatus = 'idle' | 'locating' | 'active';

export type MapLocationState = {
  status: MapLocationStatus;
  coordinates: UserCoordinates | null;
  /** False where the browser can't provide a position — the control hides itself (spec D13). */
  supported: boolean;
  /** Ask for a fresh position and remember the opt-in (spec D1). */
  useMyLocation: () => void;
  /** Forget the opt-in and return to the default view (spec D14). */
  reset: () => void;
};

/**
 * The one hook behind every map surface's "use my location" behaviour (spec R3).
 *
 * Surfaces get it from here rather than each writing their own geolocation call, so the four map
 * pages and the listing map cannot drift on: the zoom, the fallback, the copy or the storage rule.
 *
 * Failure is silent by design (spec D6) — the map stays on its default and nothing is announced.
 * A failed lookup also deliberately **keeps** the stored opt-in (spec §6): a user who walks into a
 * basement with no signal should not lose the preference, so only an explicit `reset()` clears it.
 *
 * `autoApply` is the one per-surface switch. The four map pages default to a *place*, so
 * re-centring them on a remembered user is the whole point. The listing map instead defaults to
 * *that listing*, and auto-swapping it would hide the answer to the question the map was opened
 * for — so it passes `autoApply: false` and follows the user only on an explicit click.
 */
export function useMapLocation({
  autoApply = true,
}: { autoApply?: boolean } = {}): MapLocationState {
  const [status, setStatus] = useState<MapLocationStatus>('idle');
  const [coordinates, setCoordinates] = useState<UserCoordinates | null>(null);
  // Starts false so the server render and the first client render agree (no hydration mismatch);
  // the capability is only ever discovered inside an effect (spec R4).
  const [supported, setSupported] = useState(false);
  const mounted = useRef(true);
  /** Invalidates in-flight lookups when a newer request or a reset supersedes them. */
  const requestId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Auto-apply a remembered opt-in (spec D5/D16). No loading UI here: this is a background
  // refresh, so the map simply keeps showing its default until real coordinates arrive.
  useEffect(() => {
    const canLocate = supportsGeolocation();
    setSupported(canLocate);
    if (!canLocate || !autoApply || !hasLocationOptIn()) return;

    const id = ++requestId.current;
    getCurrentCoordinates()
      .then(next => {
        if (!mounted.current || id !== requestId.current) return;
        setCoordinates(next);
        setStatus('active');
      })
      .catch(() => {
        // Silent fall back to the default view (spec D6); the opt-in is left in place.
      });
  }, [autoApply]);

  const useMyLocation = useCallback(() => {
    if (!supportsGeolocation()) return;

    const id = ++requestId.current;
    setStatus('locating');
    getCurrentCoordinates()
      .then(next => {
        if (!mounted.current || id !== requestId.current) return;
        setLocationOptIn(true);
        setCoordinates(next);
        setStatus('active');
      })
      .catch(() => {
        if (!mounted.current || id !== requestId.current) return;
        setStatus('idle');
      });
  }, []);

  const reset = useCallback(() => {
    // Bump the id first so a lookup that is already in flight cannot land after the reset.
    requestId.current += 1;
    clearLocationOptIn();
    setCoordinates(null);
    setStatus('idle');
  }, []);

  return { status, coordinates, supported, useMyLocation, reset };
}
