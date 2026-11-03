import { Hono } from 'hono';

import type { Env } from '../../env';
import { registerAccountRoutes } from './accounts';
import { registerApplicationAdminRoutes } from './applications';
import { registerLandlordRoutes } from './landlords';
import { registerPropertyAdminRoutes } from './properties';
import { registerPropertyAccessRoutes } from './property-access';
import { registerSettingsRoutes } from './settings';

/**
 * Admin routes (split by concern in audit Phase 2.4).
 *
 * Registration order follows the original single file so the property-access
 * paths keep their specificity relative to `/api/admin/properties`.
 */
const adminRoutes = new Hono<{ Bindings: Env }>();

registerPropertyAccessRoutes(adminRoutes);
registerLandlordRoutes(adminRoutes);
registerAccountRoutes(adminRoutes);
registerPropertyAdminRoutes(adminRoutes);
registerApplicationAdminRoutes(adminRoutes);
registerSettingsRoutes(adminRoutes);

export default adminRoutes;
