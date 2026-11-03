#!/usr/bin/env bun
/**
 * Assembles the Cloudflare Pages bundle (advanced mode) for the `haven-space`
 * Pages project from the Worker-mode build of `apps/web`.
 *
 * The web app is built by Vite + `@cloudflare/vite-plugin` in Worker mode, which
 * produces:
 *   - the SSR module worker entry  -> `dist/server/index.js`
 *   - lazy server chunks           -> `dist/server/assets/`
 *   - hashed client bundles        -> `dist/client/assets/`
 *
 * Those locations have moved between plugin releases (the entry used to be
 * `dist/index.js`), so this script locates them instead of trusting one layout,
 * and prints the actual `dist` tree when it cannot — a Cloudflare Pages build log
 * is the only place that output is visible.
 *
 * Pages "advanced mode" deployments need a `_worker.js` at the deployment root
 * plus the static assets alongside it, so this assembles them into
 * `apps/web/dist/pages/` (git-ignored via `dist/`), merging the server and
 * client asset dirs under a single `/assets` prefix (the same layout as the
 * current production deployment). That directory is used by:
 *   - `bun run pages:build` / `bun run pages:ci`
 *   - the Pages project's git build settings (build command + output dir)
 *
 * `_routes.json` routes every request through the worker except `/assets/*`,
 * which Pages serves statically (the built worker does not use the ASSETS
 * binding, so without this the hashed bundles would be invisible to it).
 *
 * Usage (from the repo root, after `bun run web:build`):
 *   bun scripts/build/build-pages.mjs
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = join(ROOT, 'apps', 'web', 'dist');
const OUT = join(DIST, 'pages');

const WORKER_ENTRY_CANDIDATES = [
  'server/index.js',
  'index.js',
  'server/server.js',
  'server/_worker.js',
];
const ASSET_DIR_CANDIDATES = ['server/assets', 'client/assets', 'assets'];

function listTree(dir, depth = 0) {
  if (!existsSync(dir)) return `${dir} does not exist`;
  const lines = [`${dir}/`];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    const isDir = statSync(path).isDirectory();
    lines.push(`${'  '.repeat(depth + 1)}${name}${isDir ? '/' : ''}`);
    if (isDir && depth < 1) {
      for (const child of readdirSync(path).sort().slice(0, 5)) {
        lines.push(`${'  '.repeat(depth + 2)}${child}`);
      }
    }
  }
  return lines.join('\n');
}

function fail(message) {
  console.error(`\n✗ ${message}`);
  console.error('\nBuild output was:\n' + listTree(DIST));
  process.exit(1);
}

const workerEntry = WORKER_ENTRY_CANDIDATES.map((p) => join(DIST, p)).find(existsSync);
const assetDirs = ASSET_DIR_CANDIDATES.map((p) => join(DIST, p)).filter(existsSync);

if (!workerEntry) {
  fail(
    `Could not find the SSR worker entry in apps/web/dist (looked for ${WORKER_ENTRY_CANDIDATES.join(', ')}) — run \`bun run web:build\` first.`
  );
}
if (assetDirs.length === 0) {
  fail(
    `Could not find any built assets in apps/web/dist (looked for ${ASSET_DIR_CANDIDATES.join(', ')}) — run \`bun run web:build\` first.`
  );
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });

cpSync(workerEntry, join(OUT, '_worker.js'));
// The worker's `./assets/...` imports (lazy server chunks) must resolve during
// bundling, and the browser loads the client bundles from /assets, so merge both.
for (const dir of assetDirs) {
  cpSync(dir, join(OUT, 'assets'), { recursive: true });
}

writeFileSync(
  join(OUT, '_routes.json'),
  JSON.stringify({ version: 1, include: ['/*'], exclude: ['/assets/*'] }, null, 2) + '\n'
);

console.log(
  `Pages bundle ready at ${join('apps', 'web', 'dist', 'pages')} ` +
    `(worker: ${workerEntry.slice(DIST.length + 1)}, assets: ${assetDirs
      .map((d) => d.slice(DIST.length + 1))
      .join(' + ')})`
);
