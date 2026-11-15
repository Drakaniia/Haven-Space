import { useEffect, useRef, useState } from 'react';
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from 'leaflet';

import { Button } from '../ui/Button';
import { TextInput } from '../ui/Field';
import { DEFAULT_MAP_CENTER, addressFromNominatim, type PickedAddress } from '../../lib/maps';

export interface PickedPoint {
  latitude: number;
  longitude: number;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';

/**
 * Listing location picker: OpenStreetMap tiles through Leaflet, no API key.
 * Click the map or drag the pin to set the property's coordinates; the street,
 * city and province are filled from OSM's reverse geocoder. The search box is
 * the keyboard path to the same result.
 *
 * Leaflet touches `window` at import, so it loads in an effect, never during SSR.
 */
export function LocationPicker({
  value,
  onChange,
  onAddress,
  disabled = false,
}: {
  value: PickedPoint | null;
  onChange: (point: PickedPoint) => void;
  onAddress: (address: PickedAddress) => void;
  disabled?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const place = useRef<(point: PickedPoint, lookUp: boolean) => void>(() => undefined);
  // Callbacks change every render; the map is built once and reads them from refs.
  const latest = useRef({ onChange, onAddress });
  latest.current = { onChange, onAddress };
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (cancelled || !container.current || map.current) return;

      const start = value ?? DEFAULT_MAP_CENTER;
      const instance = L.map(container.current, { scrollWheelZoom: false }).setView(
        [start.latitude, start.longitude],
        value ? 17 : 13
      );
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(instance);

      // A CSS pin rather than Leaflet's image icon, whose asset paths break under bundlers.
      const icon = L.divIcon({
        className: '',
        html: '<span class="block h-5 w-5 -translate-x-1/2 -translate-y-full rounded-full border-[3px] border-white bg-primary shadow-md"></span>',
        iconSize: [0, 0],
      });

      place.current = (point, lookUp) => {
        if (!marker.current) {
          marker.current = L.marker([point.latitude, point.longitude], {
            icon,
            draggable: !disabled,
            keyboard: false,
          }).addTo(instance);
          marker.current.on('dragend', () => {
            const at = marker.current!.getLatLng();
            place.current({ latitude: at.lat, longitude: at.lng }, true);
          });
        } else {
          marker.current.setLatLng([point.latitude, point.longitude]);
        }

        const rounded = {
          latitude: Number(point.latitude.toFixed(6)),
          longitude: Number(point.longitude.toFixed(6)),
        };
        latest.current.onChange(rounded);

        if (lookUp) void reverseGeocode(rounded);
      };

      if (value) place.current(value, false);
      if (!disabled) {
        instance.on('click', (event: LeafletMouseEvent) =>
          place.current({ latitude: event.latlng.lat, longitude: event.latlng.lng }, true)
        );
      }

      map.current = instance;
      // The form may lay out after the map mounts; recompute the tile grid once it has.
      window.setTimeout(() => instance.invalidateSize(), 0);
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // Built once per mount: later `value` changes come from the map itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  async function reverseGeocode(point: PickedPoint) {
    setStatus('Looking up the address…');
    try {
      const response = await fetch(
        `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&lat=${point.latitude}&lon=${point.longitude}`,
        { headers: { Accept: 'application/json' } }
      );
      const address = addressFromNominatim(response.ok ? await response.json() : null);

      if (address.street || address.city || address.province) {
        latest.current.onAddress(address);
        setStatus('Address filled from the pin. Edit it if anything is off.');
      } else {
        setStatus('Pin saved. No address found here, so type it in below.');
      }
    } catch {
      setStatus('Pin saved. The address lookup is unavailable, so type it in below.');
    }
  }

  async function search() {
    const text = query.trim();
    if (!text) return;

    setStatus('Searching…');
    try {
      const response = await fetch(
        `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=ph&q=${encodeURIComponent(
          text
        )}`,
        { headers: { Accept: 'application/json' } }
      );
      const [hit] = response.ok ? ((await response.json()) as Array<Record<string, unknown>>) : [];

      if (!hit) {
        setStatus('No match. Try a barangay, street or landmark, or click the map.');
        return;
      }

      const point = { latitude: Number(hit.lat), longitude: Number(hit.lon) };
      map.current?.setView([point.latitude, point.longitude], 17);
      place.current(point, false);
      latest.current.onAddress(addressFromNominatim(hit as never));
      setStatus('Pin placed. Drag it onto the exact building if needed.');
    } catch {
      setStatus('Search is unavailable right now. Click the map to place the pin.');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {disabled ? null : (
        <div className="flex gap-2">
          <TextInput
            aria-label="Search for the property's location"
            placeholder="Search a street, barangay or landmark"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void search();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={() => void search()}>
            Find
          </Button>
        </div>
      )}

      <div
        ref={container}
        role="application"
        aria-label="Property location map. Click to place the pin."
        className="relative z-0 h-72 w-full overflow-hidden rounded-xl border border-border sm:h-96"
      />

      <p aria-live="polite" className="text-xs text-gray-ink">
        {status ??
          (value
            ? `Pinned at ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`
            : 'Click the map or search to pin your property.')}
      </p>
    </div>
  );
}
