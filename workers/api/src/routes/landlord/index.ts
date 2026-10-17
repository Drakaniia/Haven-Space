import { Hono } from 'hono';

import type { Env } from '../../env';
import boardersRoutes from './boarders';
import calendarRoutes from './calendar';
import dashboardRoutes from './dashboard';
import invitationsRoutes from './invitations';
import listingsRoutes from './listings';
import propertiesRoutes from './properties';
import roomsRoutes from './rooms';
import verificationRoutes from './verification';

const landlordRoutes = new Hono<{ Bindings: Env }>();

landlordRoutes.route('/api/landlord', listingsRoutes);
landlordRoutes.route('/api/landlord', propertiesRoutes);
landlordRoutes.route('/api/landlord', roomsRoutes);
landlordRoutes.route('/api/landlord', boardersRoutes);
landlordRoutes.route('/api/landlord', dashboardRoutes);
landlordRoutes.route('/api/landlord', calendarRoutes);
landlordRoutes.route('/api/landlord', invitationsRoutes);
landlordRoutes.route('/api/landlord', verificationRoutes);

export default landlordRoutes;
