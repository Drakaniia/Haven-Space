import { DEFAULT_MAP_URL, MAP_LOCATION_QUERY } from '../../lib/maps';

/**
 * The single embedded Google Map every `/maps` surface renders. The pin, the
 * zoom and the copy all come from `lib/maps`, so a page only chooses its
 * heading and its frame height.
 *
 * `url` is the runtime position when the user has shared one (spec `map-use-location` R7); it
 * defaults to the Malaybalay embed, so a caller that never passes it still renders a valid map.
 */
export function MapEmbed({
  title,
  heightClass,
  url,
}: {
  title: string;
  heightClass: string;
  url?: string;
}) {
  return (
    <iframe
      title={title}
      src={url ?? DEFAULT_MAP_URL}
      className={`w-full rounded-lg border-0 shadow-card ${heightClass}`}
    />
  );
}

/** Subtitle naming the pinned location, for pages without richer copy. */
export function mapSubtitle(): string {
  return `Browse boarding houses around ${MAP_LOCATION_QUERY}.`;
}

/**
 * The one shared subtitle while the map follows the user (spec D8/R9).
 *
 * Deliberately names no place: the app has no reverse geocoding (spec D3), so it cannot honestly
 * say *which* city it is showing.
 */
export const LOCATION_SUBTITLE = 'Showing boarding houses around your location.';
