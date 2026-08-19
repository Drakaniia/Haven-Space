#!/usr/bin/env bun
/**
 * Assembles the Cloudflare Pages bundle (advanced mode) for the `haven-space`
 * Pages project from the Worker-mode build of `apps/web`.
 *
 * The web app is built by Vite + `@cloudflare/vite-plugin` in Worker mode, which
 * produces:
 *   - apps/web/dist/server/index.js  -> the SSR module worker entry
 *   - apps/web/dist/server/assets/   -> lazy server chunks imported by the worker
 *   - apps/web/dist/client/assets/   -> the hashed client bundles (JS/CSS/images)
 *
 * Pages "advanced mode" deployments need a `_worker.js` at the deployment root
 * plus the static assets alongside it. This script assembles those into
 * `apps/web/dist/pages/` (git-ignored via `dist/`), merging the server and
 * client asset dirs under a single `/assets` prefix (the same layout as the
 * current production deployment), the directory used by:
 *   - `bun run pages:build` / the app `deploy` script
 *   - the Pages project's git build settings (build command + destination dir)
 *   - the GitHub Actions deploy workflow
 *
 * `_routes.json` routes every request through the worker except `/assets/*`,
 * which Pages serves statically (the built worker does not use the ASSETS
 * binding, so without this the hashed bundles would be invisible to it).
 *
 * Usage (from the repo root, after `bun run web:build`):
 *   bun scripts/build-pages.mjs
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'web', 'dist');
const OUT = join(DIST, 'pages');

const workerEntry = join(DIST, 'server', 'index.js');
const serverAssets = join(DIST, 'server', 'assets');
const clientAssets = join(DIST, 'client', 'assets');

if (!existsSync(workerEntry)) {
  console.error(
    `Missing ${join(
      'apps',
      'web',
      'dist',
      'server',
      'index.js'
    )} — run \`bun run web:build\` first.`
  );
  process.exit(1);
}
if (!existsSync(serverAssets) || !existsSync(clientAssets)) {
  console.error(
    `Missing ${join('apps', 'web', 'dist', 'server', 'assets')} or ${join(
      'apps',
      'web',
      'dist',
      'client',
      'assets'
    )} — run \`bun run web:build\` first.`
  );
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });

cpSync(workerEntry, join(OUT, '_worker.js'));
// The worker's `./assets/...` imports (lazy server chunks) must resolve during
// bundling, and the browser loads the client bundles from /assets, so merge both.
cpSync(serverAssets, join(OUT, 'assets'), { recursive: true });
cpSync(clientAssets, join(OUT, 'assets'), { recursive: true });

writeFileSync(
  join(OUT, '_routes.json'),
  JSON.stringify({ version: 1, include: ['/*'], exclude: ['/assets/*'] }, null, 2) + '\n'
);

console.log(`Pages bundle ready at ${join('apps', 'web', 'dist', 'pages')}`);
