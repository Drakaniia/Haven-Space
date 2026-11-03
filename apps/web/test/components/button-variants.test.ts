import { test, expect } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC_DIR = join(import.meta.dir, '..', 'src');

/** Every `.ts`/`.tsx` file under `src`, so a regression can't hide in an unread file. */
function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

/**
 * A `<Button>` tag, up to its `className`, tolerating attribute values that contain `>` — every
 * `onClick={() => …}` does. A brace group is consumed whole, so the arrow's `>` cannot end the match
 * early and hide a later `className`.
 */
const BUTTON_WITH_CLASSNAME = /<Button\b(?:\{[^{}]*\}|[^>{}])*?className="([^"]*)"/gs;

/**
 * Palette colours only. `text-sm`, `text-center`, `border-2`, `border-border` and friends are
 * typography/layout utilities and must not be mistaken for a colour override.
 */
const COLOUR_UTILITY =
  /\b(?:(?:hover|active|focus|focus-visible|sm|md|lg|xl|2xl):)*(?:bg|text|border)-(?:white|black|ink|gray-ink|cream|mint|surface|primary(?:-[\w-]+)?|error(?:-[\w-]+)?|warning(?:-[\w-]+)?|success(?:-[\w-]+)?|amber-\d{2,3}|green-\d{2,3}|pink-\d{2,3}|red-\d{2,3})\b/;

function relative(file: string): string {
  return file.slice(SRC_DIR.length + 1).replace(/\\/g, '/');
}

test('no Button hand-rolls a colour over its variant', () => {
  // A `className` is appended *after* the variant's own utility string, but Tailwind resolves two
  // conflicting classes by their order in the stylesheet, not in the class attribute — so the
  // variant usually wins and the override is silently ignored.
  //
  // This is the bug it guards: `/boarder/tenancy`'s "Request to leave" shipped as
  // `className="border border-primary bg-surface text-primary hover:bg-mint"` on the default
  // `primary` variant (`bg-primary-strong text-white`). `bg-surface` won the background while
  // `text-white` won the colour — `--color-surface` is `#ffffff`, so the label was white on white and
  // only appeared once `hover:bg-mint` applied. Colour belongs to the variant; reach for `outline`,
  // `ghost` or another entry in `Button`'s variant map instead.
  const offenders = sourceFiles(SRC_DIR)
    .filter(file => {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(BUTTON_WITH_CLASSNAME)) {
        if (COLOUR_UTILITY.test(match[1])) return true;
      }
      return false;
    })
    .map(relative);

  expect(offenders).toEqual([]);
});

test('the tenancy page leaves the "Request to leave" look to the outline variant', () => {
  const source = readFileSync(join(SRC_DIR, 'routes', 'boarder', 'tenancy.tsx'), 'utf8');

  expect(source).toContain('variant="outline"');
  // The exact string that shipped invisible.
  expect(source).not.toContain('bg-surface text-primary hover:bg-mint');
});
