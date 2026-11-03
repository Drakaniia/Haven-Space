/**
 * Barrel for the client's API types (spec `types` split, audit Phase 2.1).
 *
 * Imports stay `from '../lib/types'` so the split is invisible at every call
 * site; new code should import from the domain module directly.
 */
export * from './activity';
export * from './admin';
export * from './applications';
export * from './auth';
export * from './calendar';
export * from './landlord';
export * from './listings';
export * from './messages';
export * from './payments';
