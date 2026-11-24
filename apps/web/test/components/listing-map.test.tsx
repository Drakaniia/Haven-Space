import { afterEach, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { ListingMap } from '../../src/components/rooms/ListingMap';
import type { PublicProperty } from '../../src/lib/types';
import { isWithinMalaybalay, MALAYBALAY_MAP_BOUNDS } from '../../src/lib/maps';

// The map only reads the listing identity, title, price and coordinates.
function property(overrides: Partial<PublicProperty> = {}): PublicProperty {
  return {
    id: 1,
    title: 'Test boarding house',
    price: 750,
    latitude: 8.1575,
    longitude: 125.1278,
    ...overrides,
  } as PublicProperty;
}

afterEach(cleanup);

test('pins use the latest results when Leaflet finishes loading and select the listing', async () => {
  let selected: number | null = null;
  const onSelect = (id: number) => {
    selected = id;
  };
  const { container, rerender } = render(
    <ListingMap properties={[]} activeId={null} onSelect={onSelect} />
  );
  // Results arrive while the effect is still awaiting the dynamic Leaflet import.
  rerender(<ListingMap properties={[property()]} activeId={1} onSelect={onSelect} />);
  await waitFor(() => expect(container.querySelector('.leaflet-marker-icon')).not.toBeNull(), {
    timeout: 5000,
  });
  const pin = container.querySelector('.leaflet-marker-icon') as HTMLElement;
  expect(pin.title).toBe('Test boarding house, ₱750 a month');
  expect(pin.textContent).toBe('₱750');
  expect(pin.innerHTML).toContain('bg-primary-strong');
  fireEvent.click(pin);
  expect(selected).toBe(1);

  rerender(
    <ListingMap
      properties={[property({ id: 2, price: 3800 })]}
      activeId={null}
      onSelect={onSelect}
    />
  );
  await waitFor(() =>
    expect(container.querySelector('.leaflet-marker-icon')?.textContent).toBe('₱3,800')
  );
  expect(container.querySelectorAll('.leaflet-marker-icon').length).toBe(1);
  expect(container.querySelector('.leaflet-marker-icon')?.innerHTML).toContain('bg-surface');
});

test('the browse extent includes Malaybalay and excludes out-of-city coordinates', () => {
  expect(isWithinMalaybalay(8.1575, 125.1278)).toBe(true);
  expect(isWithinMalaybalay(14.6096, 120.9895)).toBe(false);
  expect(isWithinMalaybalay(8.1575, 124.8)).toBe(false);
  expect(isWithinMalaybalay(8.5, 125.1278)).toBe(false);
  expect(isWithinMalaybalay(Number.NaN, 125.1278)).toBe(false);
  expect(isWithinMalaybalay(...MALAYBALAY_MAP_BOUNDS[0])).toBe(true);
});

test('out-of-city listings cannot add pins or pull the map away from Malaybalay', async () => {
  const { container, getByText } = render(
    <ListingMap
      properties={[property(), property({ id: 2, latitude: 14.6096, longitude: 120.9895 })]}
      activeId={null}
      onSelect={() => {}}
    />
  );
  await waitFor(() => expect(container.querySelectorAll('.leaflet-marker-icon').length).toBe(1), {
    timeout: 5000,
  });
  expect(container.querySelector('.leaflet-marker-icon')?.textContent).toBe('₱750');
  expect(getByText('1 listing without a map pin in Malaybalay City')).toBeDefined();
  expect(getByText('Malaybalay City, Bukidnon')).toBeDefined();
});

test('listings without valid map coordinates do not receive invented pins', async () => {
  const { container, getByText } = render(
    <ListingMap
      properties={[
        property({ latitude: null }),
        property({ id: 2, latitude: Number.NaN }),
        property({ id: 3, longitude: 181 }),
      ]}
      activeId={null}
      onSelect={() => {}}
    />
  );
  await waitFor(() => expect(container.querySelector('.leaflet-container')).not.toBeNull());
  expect(container.querySelectorAll('.leaflet-marker-icon').length).toBe(0);
  expect(getByText('No listings on this page have map pins in Malaybalay City.')).toBeDefined();
});
