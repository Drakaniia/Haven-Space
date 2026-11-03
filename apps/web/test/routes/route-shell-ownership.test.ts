import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Static guard for the doubled-shell regression (spec `payments-shell-reverification`
 * §4.2 / D10).
 *
 * The rule: a route that lives under a layout route which already renders the app
 * shell (`Protected` + `RoleShell`) must not render that shell itself. When it
 * does, the router nests a second sidebar and topbar inside the first — the
 * "two payments pages" screenshot.
 *
 * The render test (`payments-shell.test.tsx`) proves the same thing for the four
 * payments routes by counting real DOM nodes. This one covers every route and
 * names the offending file, which a count alone cannot.
 */

const routesRoot = join(import.meta.dir, '../..', 'src', 'routes');

// Import statements only — a comment that mentions `RoleShell` (the payments
// leaves carry one explaining where the shell lives) is not a second shell.
const ROLE_SHELL_IMPORT = /from\s+['"][^'"]*components\/layout\/RoleShell['"]/;
// The `Protected` wrapper's *JSX*, not a bare import: `boarder/find-a-room/$id/apply.tsx`
// has carried an unused `Protected` import since before this fix.
const PROTECTED_JSX = /<Protected[\s/>]/;
const OUTLET_JSX = /<Outlet[\s/>]/;

interface RouteFile {
  /** Posix path relative to `src/routes`, e.g. `landlord/payments/index.tsx`. */
  path: string;
  source: string;
}

function routeFiles(dir = routesRoot, found: RouteFile[] = []): RouteFile[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name);

    if (entry.isDirectory()) {
      routeFiles(child, found);
      continue;
    }

    if (entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.gen.ts')) {
      found.push({
        path: relative(routesRoot, child).replace(/\\/g, '/'),
        source: readFileSync(child, 'utf8'),
      });
    }
  }

  return found;
}

/** `landlord/payments.tsx` → `landlord/payments`; `landlord/payments/index.tsx` → `landlord/payments`. */
function routePath(filePath: string): string {
  const withoutExtension = filePath.replace(/\.tsx?$/, '');

  return withoutExtension.endsWith('/index')
    ? withoutExtension.slice(0, -'/index'.length)
    : withoutExtension;
}

const files = routeFiles();

/** Route paths whose layout route provides the shell for everything beneath it. */
const shellLayouts = files
  .filter(file => ROLE_SHELL_IMPORT.test(file.source) && OUTLET_JSX.test(file.source))
  .map(file => routePath(file.path));

/** A file that is nested under one of those layouts (and is not the layout itself). */
function parentShellLayout(filePath: string): string | undefined {
  return shellLayouts.find(layout => filePath.startsWith(`${layout}/`));
}

const nestedUnderShell = files.filter(file => parentShellLayout(file.path));

describe('shell ownership', () => {
  it('finds the shell-owning layouts it is meant to guard', () => {
    // Without this, a broken walk would make the assertion below pass vacuously.
    expect(shellLayouts).toContain('landlord/payments');
    expect(shellLayouts).toContain('boarder/payments');
    expect(shellLayouts.length).toBeGreaterThan(4);
  });

  it('checks the payments leaves, so the regression it was written for stays covered', () => {
    const checked = nestedUnderShell.map(file => file.path);

    expect(checked).toContain('landlord/payments/index.tsx');
    expect(checked).toContain('landlord/payments/record.tsx');
    expect(checked).toContain('boarder/payments/index.tsx');
    expect(checked).toContain('boarder/payments/pay.tsx');
  });

  it('no route under a shell layout renders Protected + RoleShell itself', () => {
    const offenders = nestedUnderShell
      .filter(file => ROLE_SHELL_IMPORT.test(file.source) || PROTECTED_JSX.test(file.source))
      .map(file => file.path);

    expect(offenders).toEqual([]);
  });
});
