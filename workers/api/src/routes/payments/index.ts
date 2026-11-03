import { Hono } from 'hono';

import type { Env } from '../../env';
import { registerBillingRoutes } from './billing';
import { registerBoarderRoutes } from './boarder';
import { registerChargeRoutes } from './charges';
import { registerLedgerRoutes } from './ledger';
import { registerRecordRoutes } from './record';
import { registerSubmissionRoutes } from './submissions';
import { registerTrackerRoutes } from './tracker';

/**
 * Payments routes (spec `payments-feature` §5).
 *
 * Boarder routes are scoped to `boarder_id` from the token; landlord routes are
 * scoped by property access. No route accepts a caller-supplied owner id as
 * authority, and admins are not granted any of them (D14).
 *
 * Split by concern (audit Phase 2.2). Registration order follows the original
 * single file, because `/api/landlord/payments/report` and
 * `/api/landlord/payments/export.csv` sit beside the plain list route.
 */
const paymentsRoutes = new Hono<{ Bindings: Env }>();

registerBoarderRoutes(paymentsRoutes);
registerLedgerRoutes(paymentsRoutes);
registerBillingRoutes(paymentsRoutes);
registerChargeRoutes(paymentsRoutes);
registerRecordRoutes(paymentsRoutes);
registerSubmissionRoutes(paymentsRoutes);
registerTrackerRoutes(paymentsRoutes);

export default paymentsRoutes;
