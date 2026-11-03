#!/usr/bin/env bun
/**
 * Compatibility shim at the assembler's pre-move location.
 *
 * The `haven-space` Cloudflare Pages build command still calls
 * `bun scripts/build-pages.mjs`, so removing this file (8979a8e) broke every
 * Pages build from that commit on — the Vite build finished and then the command
 * exited with "Module not found". The real script is `scripts/build/build-pages.mjs`;
 * keep this forwarding until the Pages build command is repointed at
 * `bun run pages:ci`.
 */
import './build/build-pages.mjs';
