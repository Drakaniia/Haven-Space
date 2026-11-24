import { useEffect, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap, Marker } from 'leaflet';

import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MALAYBALAY_MAP_BOUNDS,
  isWithinMalaybalay,
} from '../../lib/maps';
import type { PublicProperty } from '../../lib/types';
import { pesos } from './ListingCard';

/**
 * The browse map beside the Find a Room results: OpenStreetMap tiles through Leaflet, one price
 * pin per listing on the current page. The pin and the card share `activeId`, so hovering a card
 * lights its pin and pressing a pin points back at its card.
 *
 * Leaflet touches `window` at import, so it loads in an effect, never during SSR.
 */

// Literal class strings so Tailwind picks them up from this file.
const PIN_BASE =
  'relative block w-max -translate-x-1/2 -translate-y-[calc(100%+6px)] whitespace-nowrap rounded-lg border px-2.5 py-1 font-sans text-[0.8125rem] font-semibold tabular-nums shadow-card transition-colors duration-150';
const PIN_IDLE = 'border-border-strong bg-surface text-ink';
const PIN_ACTIVE = 'border-primary-strong bg-primary-strong text-white';
const TAIL_BASE =
  'absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r';

function pinHtml(price: number, active: boolean): string {
  const tone = active ? PIN_ACTIVE : PIN_IDLE;
  return `<span class="${PIN_BASE} ${tone}">${pesos(
    price
  )}<span class="${TAIL_BASE} ${tone}"></span></span>`;
}

type Pinned = PublicProperty & { latitude: number; longitude: number };

function hasPin(property: PublicProperty): property is Pinned {
  return (
    typeof property.latitude === 'number' &&
    typeof property.longitude === 'number' &&
    isWithinMalaybalay(property.latitude, property.longitude)
  );
}

export function ListingMap({
  properties,
  activeId,
  onSelect,
  className = '',
}: {
  properties: PublicProperty[];
  activeId: number | null;
  onSelect: (id: number) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const markers = useRef(new Map<number, { marker: Marker; price: number }>());
  const [ready, setReady] = useState(false);
  // Read from refs so the map is built once and the pins never go stale.
  const latest = useRef({ onSelect, activeId });
  latest.current = { onSelect, activeId };

  const pinned = properties.filter(hasPin);
  const pinKey = pinned.map(p => `${p.id}:${p.latitude}:${p.longitude}:${p.price}`).join('|');

  function drawPins() {
    const L = leaflet.current;
    const instance = map.current;
    if (!L || !instance || !layer.current) return;

    layer.current.clearLayers();
    markers.current.clear();

    for (const property of pinned) {
      const active = property.id === latest.current.activeId;
      const marker = L.marker([property.latitude, property.longitude], {
        icon: L.divIcon({ className: '', html: pinHtml(property.price, active), iconSize: [0, 0] }),
        title: `${property.title}, ${pesos(property.price)} a month`,
        alt: `${property.title}, ${pesos(property.price)} a month`,
        riseOnHover: true,
        zIndexOffset: active ? 1000 : 0,
      });
      marker.on('click', () => latest.current.onSelect(property.id));
      marker.addTo(layer.current);
      markers.current.set(property.id, { marker, price: property.price });
    }

    if (pinned.length === 1) {
      instance.setView([pinned[0].latitude, pinned[0].longitude], 16);
    } else if (pinned.length > 1) {
      instance.fitBounds(
        L.latLngBounds(pinned.map(p => [p.latitude, p.longitude] as [number, number])),
        { padding: [48, 48], maxZoom: 16 }
      );
    } else {
      instance.setView(
        [DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude],
        DEFAULT_MAP_ZOOM
      );
    }
  }

  // Build the map once.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !container.current || map.current) return;

      const instance = L.map(container.current, {
        scrollWheelZoom: false,
        maxBounds: MALAYBALAY_MAP_BOUNDS,
        maxBoundsViscosity: 1,
        minZoom: DEFAULT_MAP_ZOOM,
      }).setView([DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude], DEFAULT_MAP_ZOOM);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(instance);

      leaflet.current = L;
      layer.current = L.layerGroup().addTo(instance);
      map.current = instance;
      // Draw from the latest render, not the props captured before Leaflet finished loading.
      setReady(true);
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
      markers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw when the listings on the page change.
  useEffect(() => {
    if (ready) drawPins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pinKey]);

  useEffect(() => {
    if (!ready || !container.current) return;
    const observer = new ResizeObserver(() => {
      const instance = map.current;
      const L = leaflet.current;
      if (!instance || !L) return;
      instance.invalidateSize();
      // Keep the viewport inside the city extent even on a wide desktop panel.
      const bounds = L.latLngBounds(MALAYBALAY_MAP_BOUNDS);
      instance.setMinZoom(Math.max(DEFAULT_MAP_ZOOM, instance.getBoundsZoom(bounds, true)));
      instance.panInsideBounds(bounds, { animate: false });
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [ready]);

  // Restyle pins when the highlighted listing changes, without moving the map.
  useEffect(() => {
    const L = leaflet.current;
    if (!L) return;
    for (const [id, { marker, price }] of markers.current) {
      const active = id === activeId;
      marker.setIcon(L.divIcon({ className: '', html: pinHtml(price, active), iconSize: [0, 0] }));
      marker.setZIndexOffset(active ? 1000 : 0);
    }
  }, [activeId, ready, pinKey]);

  return (
    <div
      className={`relative isolate z-0 overflow-hidden rounded-2xl border border-border bg-subtle shadow-card ${className}`}
    >
      <div
        ref={container}
        role="region"
        aria-label="Map of listings in Malaybalay City, Bukidnon"
        className="h-full w-full"
      />
      <p className="pointer-events-none absolute right-3 top-3 z-[500] rounded-lg bg-surface/95 px-2.5 py-1 text-xs font-medium text-primary-dark shadow-card">
        Malaybalay City, Bukidnon
      </p>
      {pinned.length < properties.length ? (
        <p className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg bg-surface/95 px-2.5 py-1 text-xs text-gray-ink shadow-card">
          {pinned.length === 0
            ? 'No listings on this page have map pins in Malaybalay City.'
            : `${properties.length - pinned.length} listing${
                properties.length - pinned.length === 1 ? '' : 's'
              } without a map pin in Malaybalay City`}
        </p>
      ) : null}
    </div>
  );
}
