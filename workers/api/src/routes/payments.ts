/**
 * Barrel for the payments routes (audit Phase 2.2). The implementation lives in
 * `./payments/`, one module per concern; `workers/api/src/index.ts` still mounts
 * this path, so the split is invisible to the app.
 */
export { default } from './payments/index';
