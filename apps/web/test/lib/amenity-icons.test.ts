import { test, expect } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { amenityIcon } from '../src/components/rooms/FindARoomContent';

const ICON_DIR = join(import.meta.dir, '..', 'public', 'assets', 'svg');

// Regression: the icon names used to be lowercased amenity names ('wifi', 'laundry',
// 'kitchen'), which 404 on the dev server and on Cloudflare Pages because the files are
// named 'wfifi.svg', 'Laundry.svg' and 'Kitchen.svg'. Broken <img> icons showed up on every
// listing card.
const SEED_AMENITIES = [
  'WiFi',
  'Air conditioning',
  'AC',
  'Furnished',
  'Parking',
  'Laundry',
  'Kitchen',
  'CCTV',
  'Security',
];

test('every amenity icon resolves to an existing svg file', () => {
  for (const amenity of [...SEED_AMENITIES, 'Some unmapped amenity']) {
    const icon = amenityIcon(amenity);
    expect(existsSync(join(ICON_DIR, `${icon}.svg`))).toBe(true);
  }
});

test('known amenities map to their specific icon, not the fallback', () => {
  expect(amenityIcon('WiFi')).toBe('wfifi');
  expect(amenityIcon('Laundry')).toBe('Laundry');
  expect(amenityIcon('Kitchen')).toBe('Kitchen');
  expect(amenityIcon('Some unmapped amenity')).toBe('checkSimple');
});
