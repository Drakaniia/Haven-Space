#!/usr/bin/env bun
/**
 * Cloudflare Pages build entry point for the git integration.
 *
 * The Pages project should run exactly `bun run pages:ci` from the repo root, so
 * the dashboard setting cannot drift from what the repo actually builds. It:
 *
 *   1. installs `apps/web` dependencies from the committed lockfile,
 *   2. checks that every declared dependency is installed, and
 *   3. runs the Worker-mode Vite build and assembles `apps/web/dist/pages`.
 *
 * Step 1 passes `--frozen-lockfile`: a lockfile that was not regenerated after a
 * dependency was added fails here with that message, instead of surfacing deep in
 * the Vite build as "failed to resolve import X". Step 2 catches the rarer case
 * of an install that succeeded while leaving a declared package unlinked.
 *
 * Run it locally the same way Pages does:
 *   bun run pages:ci
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const WEB = join(ROOT, 'apps', 'web');

function run(label, args) {
  console.log(`\n▸ ${label}: bun ${args.join(' ')}`);
  const { status } = spawnSync('bun', args, { cwd: ROOT, stdio: 'inherit' });
  if (status !== 0) {
    console.error(`\n✗ ${label} failed with exit code ${status ?? 'unknown'}.`);
    process.exit(status ?? 1);
  }
}

run('install', ['install', '--cwd', 'apps/web', '--frozen-lockfile']);

const pkg = JSON.parse(readFileSync(join(WEB, 'package.json'), 'utf8'));
const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
// Types-only packages ship no resolvable entry point, so check the installed
// directory rather than importing the name.
const missing = declared.filter(
  (name) => !existsSync(join(WEB, 'node_modules', ...name.split('/')))
);
if (missing.length > 0) {
  console.error(
    `\n✗ ${missing.length} declared package(s) are not installed: ${missing.join(', ')}\n` +
      '  Run `bun install` in apps/web, then commit the updated bun.lock.'
  );
  process.exit(1);
}
console.log(`\n✓ all ${declared.length} declared packages resolve`);

run('build', ['run', '--cwd', 'apps/web', 'build']);
run('assemble', ['scripts/build/build-pages.mjs']);

console.log('\n✓ Cloudflare Pages bundle is ready to deploy from apps/web/dist/pages');
