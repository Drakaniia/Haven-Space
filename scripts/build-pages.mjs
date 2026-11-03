#!/usr/bin/env bun
/**
 * Compatibility shim for build configurations that still point at the assembler's
 * pre-move location (`scripts/build-pages.mjs`); the real script is
 * `scripts/build/build-pages.mjs`.
 */
import './build/build-pages.mjs';
