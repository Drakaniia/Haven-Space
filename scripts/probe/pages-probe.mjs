#!/usr/bin/env bun
/**
 * Throwaway probe, used only on the `probe/pages-stage` branch.
 *
 * Cloudflare Pages build logs are dashboard-only, and the check run carries no
 * error text, so this runs the real `vite build` on the Pages builder, captures
 * its output plus the toolchain it ran on, and publishes the report as a static
 * asset (`/assets/__probe.txt`) instead of failing the build. The deployment
 * going green is itself the signal that install, assemble and deploy work.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const WEB = join(ROOT, 'apps', 'web');
const NM = join(WEB, 'node_modules');

const report = [];
report.push(`cwd: ${process.cwd()}`);
report.push(`bun: ${process.versions.bun ?? 'n/a'}`);
report.push(`node reported: ${process.versions.node}`);
report.push(`platform: ${process.platform} ${process.arch}`);
report.push(`execPath: ${process.execPath}`);
for (const key of [
  'CI',
  'NODE_VERSION',
  'BUN_VERSION',
  'NODE_OPTIONS',
  'SKIP_DEPENDENCY_INSTALL',
  'CF_PAGES',
  'CF_PAGES_BRANCH',
  'npm_config_registry',
]) {
  report.push(`${key}=${process.env[key] ?? ''}`);
}

report.push(`\nnode_modules: ${existsSync(NM) ? readdirSync(NM).length + ' entries' : 'MISSING'}`);
for (const name of ['vite', 'recharts', '@tanstack/react-start', '@cloudflare/vite-plugin', 'rolldown']) {
  report.push(`  ${name}: ${existsSync(join(NM, ...name.split('/')))}`);
}

const bin = join(NM, '.bin', 'vite');
report.push(`\nvite bin exists: ${existsSync(bin)}`);
const run = spawnSync(existsSync(bin) ? bin : 'bun', existsSync(bin) ? ['build'] : ['run', 'vite', 'build'], {
  cwd: WEB,
  encoding: 'utf8',
  timeout: 600_000,
});
report.push(`\n$ vite build -> status ${run.status} signal ${run.signal ?? 'none'} error ${run.error ?? 'none'}`);
report.push('--- stdout (tail) ---\n' + (run.stdout ?? '').trim().split('\n').slice(-60).join('\n'));
report.push('--- stderr (tail) ---\n' + (run.stderr ?? '').trim().split('\n').slice(-60).join('\n'));

const assetsDir = join(WEB, 'dist', 'client', 'assets');
mkdirSync(assetsDir, { recursive: true });
writeFileSync(join(assetsDir, '__probe.txt'), report.join('\n') + '\n');

// Keep the real worker when the build produced one; otherwise ship a stub so the
// assembler and the upload path still get exercised.
const worker = join(WEB, 'dist', 'server', 'index.js');
if (!existsSync(worker)) {
  mkdirSync(dirname(worker), { recursive: true });
  writeFileSync(
    worker,
    'export default { fetch: () => new Response("probe: vite build produced no server entry\\n") };\n'
  );
}
