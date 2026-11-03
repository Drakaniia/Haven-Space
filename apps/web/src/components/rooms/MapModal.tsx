import { mapUrlForCoordinates } from '../../lib/maps';
import { useMapLocation } from '../../lib/use-map-location';
import { Modal } from '../ui/Modal';
import { LOCATION_SUBTITLE, MapEmbed, mapSubtitle } from './MapEmbed';
import { MapLocationControl } from './MapLocationControl';

/** Fixed heading — the dialog names its purpose, not the widget (spec `find-a-room-map-modal` D8). */
export const MAP_MODAL_TITLE = 'Find boarding houses near you';

/**
 * The map as a dialog, so a page does not lose its place.
 *
 * Two hosts share it and differ by one prop (spec `hero-map-modal`): `/find-a-room` gets the
 * interactive map — the control row, the embed and the geolocation hook, the same pieces `/maps`
 * uses, unchanged (spec `find-a-room-map-modal` D17) — while the home hero passes `viewOnly` and gets
 * the identical panel with no location wiring at all. Neither variant adds a footer or an "open the
 * full map" action: the dialog is the destination (D21).
 */
export function MapModal({
  open,
  onClose,
  viewOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * Drop the geolocation hook and its control. `false` (the default) is the interactive dialog;
   * `true` is the view-only home-hero dialog, which must never ask for a position.
   */
  viewOnly?: boolean;
}) {
  return (
    // `xl` on purpose: a map is a data-heavy panel, so it takes the widest tier rather than the
    // shared default (spec `modal-desktop-width` D6, which supersedes D4 of `find-a-room-map-modal`).
    // Both variants get the same panel — the view-only one differs only in what is inside it.
    <Modal open={open} title={MAP_MODAL_TITLE} onClose={onClose} size="xl">
      {/* Structural, not cosmetic (D18/R10): while closed neither child exists, so the interactive
          body's geolocation hook and the iframe cannot run on page load — even for an opted-in user,
          and even on the public home page. */}
      {open ? viewOnly ? <MapModalViewOnlyBody /> : <MapModalBody /> : null}
    </Modal>
  );
}

/**
 * Split out so the hook only ever mounts with the dialog.
 *
 * No `autoApply` override: the saved preference behaves exactly as it does on `/maps`, so an
 * opted-in visitor sees their position as soon as the dialog opens (D7).
 */
function MapModalBody() {
  const location = useMapLocation();
  const pin = location.coordinates;

  return (
    <>
      {/* One row, so the panel's width is used instead of stacking a mostly-empty line above a
          right-aligned button (spec `map-modal-header-row` R1). */}
      <div className="relative mb-2 sm:min-h-9">
        {/* Centred across the whole panel from 640px up; the symmetric gutter is what keeps the text
            clear of the pinned control, and it wraps rather than reaching it (R2/R3/R7). */}
        <p className="text-center text-sm text-gray-ink sm:absolute sm:inset-x-0 sm:top-1/2 sm:-translate-y-1/2 sm:px-40">
          {pin ? LOCATION_SUBTITLE : mapSubtitle()}
        </p>
        {/* `MapLocationControl` keeps its own `mb-4` and `justify-end` (spec D8 — the file is not
            edited), so `-mb-4` cancels that margin and the row's `mb-2` becomes the ~8px gap the map
            sees (R4/R6). */}
        <div className="-mb-4 sm:flex sm:justify-end">
          <MapLocationControl state={location} />
        </div>
      </div>
      <MapEmbed
        title="Haven Space map"
        // Taller from 640px up, where the panel has the width to justify it (spec D8).
        heightClass="h-[60vh] sm:h-[70vh]"
        url={pin ? mapUrlForCoordinates(pin.latitude, pin.longitude) : undefined}
      />
    </>
  );
}

/**
 * The view-only body (spec `hero-map-modal`), for a page that is public and must not ask for a
 * position.
 *
 * It is the interactive body minus every geolocation piece: no hook, no control, no runtime
 * coordinate URL — the embed keeps its own Malaybalay default. Leaving the feature out entirely is
 * what makes this read-only by construction rather than by hiding a button, and keeping the frame
 * height identical to `MapModalBody`'s is what makes the two dialogs the same size (see the scan in
 * `test/maps.test.ts`).
 */
function MapModalViewOnlyBody() {
  return (
    <>
      <p className="mb-3 text-sm text-gray-ink">{mapSubtitle()}</p>
      <MapEmbed title="Haven Space map" heightClass="h-[60vh] sm:h-[70vh]" />
    </>
  );
}
