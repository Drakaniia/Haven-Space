import { Hono } from 'hono';

import type { Env } from '../../env';
import {
  handleConfirmBooking,
  handleCreateApplication,
  handleListBoarderApplications,
  handleWithdrawApplication,
} from './boarder';
import { handleListLandlordApplications, handleUpdateApplicationStatus } from './landlord';
import { showApplication } from './shared';

const applicationRoutes = new Hono<{ Bindings: Env }>();

applicationRoutes.get('/api/boarder/applications', handleListBoarderApplications);
applicationRoutes.post('/api/boarder/applications', handleCreateApplication);
applicationRoutes.get('/api/boarder/applications/:id', showApplication);
applicationRoutes.delete('/api/boarder/applications/:id', handleWithdrawApplication);
applicationRoutes.post('/api/boarder/applications/:id/confirm', handleConfirmBooking);

applicationRoutes.get('/api/landlord/applications', handleListLandlordApplications);
applicationRoutes.patch('/api/landlord/applications/:id/status', handleUpdateApplicationStatus);
applicationRoutes.get('/api/landlord/applications/:id', showApplication);

export default applicationRoutes;
