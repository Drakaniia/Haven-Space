/**
 * Canonical map locale (spec `auth-hero-map-locale`).
 *
 * Every embedded map page (`/maps`, `/landlord/maps`) and the map dialogs used to
 * hardcode its own nationwide search URL, so they drifted and none of them showed a
 * meaningful location. Keeping the location and zoom in one module means the pin, the zoom and
 * the page copy can only change together — prefer these constants over literal map URLs.
 *
 * Every map in the app is OpenStreetMap: the embeds below, the listing-detail embed and the
 * Leaflet location picker. No map provider API key is needed.
 */

/** The place every embedded map pins. Also used in the map pages' copy. */
export const MAP_LOCATION_QUERY = 'Malaybalay, Bukidnon';

/** `MAP_LOCATION_QUERY` as coordinates: where the listing location picker opens. */
export const DEFAULT_MAP_CENTER = { latitude: 8.1575, longitude: 125.1278 };

/** City-level zoom: the pin stays readable with the surrounding area still in frame. */
export const DEFAULT_MAP_ZOOM = 13;

const OSM_EMBED_BASE = 'https://www.openstreetmap.org/export/embed.html';

/**
 * The embed frame size the zoom-to-bbox conversion assumes. OSM embeds take a bounding box, not
 * a zoom, so a zoom is turned into the box a frame of roughly this size shows at that zoom.
 */
const EMBED_HALF_WIDTH_PX = 512;
const EMBED_HALF_HEIGHT_PX = 300;

/** Six decimals (~10 cm) keeps the URLs short without moving the pin. */
function coord(value: number): string {
  return Number(value.toFixed(6)).toString();
}

/**
 * OpenStreetMap embed centred on a point at a slippy-map zoom, with a marker on the point.
 * Web Mercator: a 256 px tile spans 360° of longitude at zoom 0, halving per level, and a degree
 * of latitude is `cos(lat)` as wide on screen as near the equator.
 */
export function osmEmbedUrlAtZoom(latitude: number, longitude: number, zoom: number): string {
  const degreesPerPx = 360 / (256 * 2 ** zoom);
  const halfLng = degreesPerPx * EMBED_HALF_WIDTH_PX;
  const halfLat = degreesPerPx * Math.cos((latitude * Math.PI) / 180) * EMBED_HALF_HEIGHT_PX;
  const bbox = [
    coord(longitude - halfLng),
    coord(latitude - halfLat),
    coord(longitude + halfLng),
    coord(latitude + halfLat),
  ].join(',');

  return `${OSM_EMBED_BASE}?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${coord(
    latitude
  )},${coord(longitude)}`;
}

/** OpenStreetMap embed pinned on `MAP_LOCATION_QUERY` (`DEFAULT_MAP_CENTER`) at city zoom. */
export const DEFAULT_MAP_URL = osmEmbedUrlAtZoom(
  DEFAULT_MAP_CENTER.latitude,
  DEFAULT_MAP_CENTER.longitude,
  DEFAULT_MAP_ZOOM
);

/**
 * Neighbourhood-level zoom for the map once it follows the user (spec `map-use-location` D10).
 * Tighter than `DEFAULT_MAP_ZOOM` because a street-level pin is only useful if the streets are
 * readable; the surrounding houses are a small pan away rather than out of frame.
 */
export const USER_LOCATION_MAP_ZOOM = 15;

/**
 * OpenStreetMap embed URL pinned on raw coordinates.
 *
 * A *builder* rather than a constant (unlike `DEFAULT_MAP_URL`): the user's position is runtime
 * data, so the URL cannot exist at module scope (spec R2).
 */
export function mapUrlForCoordinates(
  latitude: number,
  longitude: number,
  zoom: number = USER_LOCATION_MAP_ZOOM
): string {
  return osmEmbedUrlAtZoom(latitude, longitude, zoom);
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
  return `${OSM_EMBED_BASE}?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${latitude},${longitude}`;
}
