import { test, expect } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AUTH_PANEL_IMAGE } from '../src/components/auth/AuthSplitLayout';

const WEB_DIR = join(import.meta.dir, '..');
const IMAGES_DIR = join(WEB_DIR, 'public', 'assets', 'images', 'public');
const SRC_DIR = join(WEB_DIR, 'src');

/** Auth artwork retired in favour of `login_hero.webp` (spec `auth-hero-map-locale`). */
const RETIRED_IMAGES = ['login_right.png', 'signup_lower_left.png', 'signup_lower_right.png'];

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

test('the retired auth artwork is deleted', () => {
  for (const image of RETIRED_IMAGES) {
    expect(existsSync(join(IMAGES_DIR, image))).toBe(false);
  }
});

test('the auth hero the layout defaults to exists on disk', () => {
  expect(AUTH_PANEL_IMAGE.startsWith('/assets/images/public/')).toBe(true);
  expect(existsSync(join(WEB_DIR, 'public', AUTH_PANEL_IMAGE))).toBe(true);
});

test('no source file references the retired auth artwork', () => {
  const offenders = sourceFiles(SRC_DIR).filter(file => {
    const source = readFileSync(file, 'utf8');
    return RETIRED_IMAGES.some(image => source.includes(image.replace(/\.png$/, '')));
  });
  expect(offenders).toEqual([]);
});
