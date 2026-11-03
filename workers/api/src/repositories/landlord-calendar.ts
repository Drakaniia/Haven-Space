/**
 * Barrel for the landlord calendar aggregation (audit Phase 2.3).
 *
 * The implementation lives in `./calendar/`:
 *
 * - `types.ts`        — event union, families, payload shapes
 * - `helpers.ts`      — date/window math, sorting, capping, summaries
 * - `charges.ts`      — `charge_due` / `payment_received`
 * - `applications.ts` — application, move-in and leave events
 * - `early-departures.ts` — tenancies that ended before their approved date
 * - `announcements.ts` — scheduled announcement publications
 * - `index.ts`        — the two public entry points
 *
 * Call sites keep importing `landlord-calendar`, so the split stays invisible to
 * the routes, the activity feed and the tests.
 */
export * from './calendar/index';
