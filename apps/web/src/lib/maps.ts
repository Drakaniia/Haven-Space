/**
 * Canonical map locale (spec `auth-hero-map-locale`).
 *
 * Every embedded map page (`/maps`, `/landlord/maps`) and the map dialogs used to
 * hardcode its own nationwide Google search URL, so they drifted and none of them showed a
 * meaningful location. Keeping the location and zoom in one module means the pin, the zoom and
 * the page copy can only change together — prefer these constants over literal map URLs.
 */

/** The place every embedded map pins. Also used in the map pages' copy. */
export const MAP_LOCATION_QUERY = 'Malaybalay, Bukidnon';

/** `MAP_LOCATION_QUERY` as coordinates: where the listing location picker opens. */
export const DEFAULT_MAP_CENTER = { latitude: 8.1575, longitude: 125.1278 };

/** City-level zoom: the pin stays readable with the surrounding area still in frame. */
export const DEFAULT_MAP_ZOOM = 13;

/** Google Maps embed URL pinned on `MAP_LOCATION_QUERY`. */
export const DEFAULT_MAP_URL = `https://www.google.com/maps?q=${encodeURIComponent(
  MAP_LOCATION_QUERY
)}&output=embed&z=${DEFAULT_MAP_ZOOM}`;

/**
 * Neighbourhood-level zoom for the map once it follows the user (spec `map-use-location` D10).
 * Tighter than `DEFAULT_MAP_ZOOM` because a street-level pin is only useful if the streets are
 * readable; the surrounding houses are a small pan away rather than out of frame.
 */
export const USER_LOCATION_MAP_ZOOM = 15;

/**
 * Google Maps embed URL pinned on raw coordinates.
 *
 * A *builder* rather than a constant (unlike `DEFAULT_MAP_URL`): the user's position is runtime
 * data, so the URL cannot exist at module scope (spec R2).
 */
export function mapUrlForCoordinates(
  latitude: number,
  longitude: number,
  zoom: number = USER_LOCATION_MAP_ZOOM
): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(
    `${latitude},${longitude}`
  )}&output=embed&z=${zoom}`;
}

/**
 * Bbox half-extents for the listing-detail OpenStreetMap embed, as before this module owned it
 * (`RoomDetailView`'s local `MapEmbed`) — moved here so the listing bbox and the user bbox are
 * built the same way.
 */
const OSM_LAT_SPAN = 0.009;
const OSM_LNG_SPAN = 0.012;

/** The address parts a pin drop fills in on the listing form. */
export interface PickedAddress {
  street: string;
  city: string;
  province: string;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  hamlet?: string;
  quarter?: string;
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  province?: string;
  state?: string;
  region?: string;
}

/**
 * A Nominatim reverse-geocode result as the form's street/city/province. Philippine
 * results put the barangay in `village`/`suburb`/`quarter`, the city in `city` or
 * `town`, and the province in `province` or `state` (with `region` a level above).
 */
export function addressFromNominatim(result: { address?: NominatimAddress } | null): PickedAddress {
  const a = result?.address ?? {};
  const street = [
    [a.house_number, a.road].filter(Boolean).join(' '),
    a.quarter ?? a.neighbourhood ?? a.suburb ?? a.village ?? a.hamlet,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    street,
    city: a.city ?? a.town ?? a.municipality ?? a.county ?? '',
    province: a.province ?? a.state ?? a.region ?? '',
  };
}

/** OpenStreetMap embed centred on a point, with a marker on it. */
export function osmEmbedUrl(latitude: number, longitude: number): string {
  const bbox = `${longitude - OSM_LNG_SPAN},${latitude - OSM_LAT_SPAN},${
    longitude + OSM_LNG_SPAN
  },${latitude + OSM_LAT_SPAN}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${latitude},${longitude}`;
}
