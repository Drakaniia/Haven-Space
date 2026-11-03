import type { MapLocationState } from '../../lib/use-map-location';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/**
 * The toolbar row that sits between a page's header and its map frame (spec D11/R5).
 *
 * It owns every state a surface needs — the idle invitation, the busy button, the reset action —
 * so the five map surfaces only choose their `resetLabel`.
 *
 * Renders nothing at all when the browser cannot serve a position (spec D13), rather than a
 * disabled control that would never work.
 */
export function MapLocationControl({
  state,
  resetLabel = 'Reset to Malaybalay',
}: {
  state: MapLocationState;
  /** What "back to normal" means on this surface — the listing map resets to its listing. */
  resetLabel?: string;
}) {
  if (!state.supported) return null;

  const active = state.status === 'active';
  const locating = state.status === 'locating';
  const statusText = locating
    ? 'Finding your location'
    : active
    ? 'Map centred on your location'
    : 'Map centred on Malaybalay, Bukidnon';

  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
      <Button
        variant={active ? 'primary' : 'outline'}
        size="sm"
        onClick={state.useMyLocation}
        disabled={locating}
        aria-pressed={active}
      >
        <Icon name="location" size={16} className="mr-1.5" />
        {locating ? 'Locating…' : 'Use my location'}
      </Button>
      {active ? (
        <Button variant="ghost" size="sm" onClick={state.reset}>
          {resetLabel}
        </Button>
      ) : null}
      {/* State is exposed to assistive tech too, not just by the button's colour. */}
      <span className="sr-only" aria-live="polite">
        {statusText}
      </span>
    </div>
  );
}
