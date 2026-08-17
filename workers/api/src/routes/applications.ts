import { Hono, type Context } from 'hono';

import { canTransition } from '../lib/application-status';
import type { Env } from '../env';
import { authenticateUser, authorizeUser, type AuthenticatedUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { isJsonRecord, type JsonRecord } from '../lib/validation';
import {
  cancelOtherBoarderApplications,
  confirmApplicationBooking,
  createApplication,
  findApplicationById,
  findApplicationRoom,
  occupyRoom,
  findExistingApplicationForRoom,
  hardDeleteApplication,
  listBoarderApplications,
  listLandlordApplications,
  softDeleteApplication,
  type ApplicationDetailRow,
  updateApplicationStatus,
  updateBoarderStatus,
  verifyBoarderEmail,
} from '../repositories/applications';
import { findActiveAccess } from '../repositories/property-access';

const applicationRoutes = new Hono<{ Bindings: Env }>();
// Landlords may only move an application forward to accepted or rejected; every
// other transition (confirm, withdraw, end) is driven by a different endpoint
// and validated against the state machine.
const validApplicationStatuses = new Set(['accepted', 'rejected']);

function parseRouteId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function readApplicationJson(request: Request): Promise<JsonRecord | null> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!isJsonRecord(body) || Object.keys(body).length === 0) {
    return null;
  }

  return body;
}

function requiredPositiveInt(body: JsonRecord, field: string): number | null {
  const value = body[field];

  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function requiredNonEmptyString(body: JsonRecord, field: string): string | null {
  const value = body[field];

  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

// A landlord can view/manage an application when they are the application's
// landlord or they hold active shared access to the application's property.
async function canAccessApplication(
  db: D1Database,
  application: ApplicationDetailRow,
  user: AuthenticatedUser
): Promise<boolean> {
  if (user.role === 'boarder') {
    return Number(application.boarder_id) === user.user_id;
  }

  if (user.role === 'landlord') {
    if (Number(application.landlord_id) === user.user_id) {
      return true;
    }

    const access = await findActiveAccess(db, Number(application.property_id), user.user_id);
    return access !== null;
  }

  return false;
}

async function showApplication(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await authenticateUser(db, c.req.raw, c.env.JWT_SECRET);
  const applicationId = parseRouteId(c.req.param('id'));

  if (!applicationId) {
    return errorResponse(404, 'Application not found');
  }

  const application = await findApplicationById(db, applicationId);

  if (!application || !(await canAccessApplication(db, application, user))) {
    return errorResponse(404, 'Application not found');
  }

  return jsonResponse({ data: application });
}

applicationRoutes.get('/api/boarder/applications', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const applications = await listBoarderApplications(db, user.user_id);

  return jsonResponse({ data: applications });
});

applicationRoutes.post('/api/boarder/applications', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const body = await readApplicationJson(c.req.raw);

  if (!body) {
    return errorResponse(400, 'Invalid JSON input');
  }

  const roomId = requiredPositiveInt(body, 'room_id');

  if (!roomId) {
    return errorResponse(400, 'Missing required field: room_id');
  }

  const landlordId = requiredPositiveInt(body, 'landlord_id');

  if (!landlordId) {
    return errorResponse(400, 'Missing required field: landlord_id');
  }

  const message = requiredNonEmptyString(body, 'message');

  if (!message) {
    return errorResponse(400, 'Missing required field: message');
  }

  const room = await findApplicationRoom(db, roomId);

  if (!room) {
    return errorResponse(400, 'Invalid room_id: Room does not exist');
  }

  if (String(room.status ?? '').toLowerCase() === 'occupied') {
    return errorResponse(400, 'This room is already occupied and can no longer be applied to');
  }

  const existingApplication = await findExistingApplicationForRoom(db, user.user_id, roomId);

  if (existingApplication) {
    if (existingApplication.deleted_at === null) {
      return errorResponse(
        400,
        `You have already applied to this room. Status: ${existingApplication.status}`
      );
    }

    await hardDeleteApplication(db, existingApplication.id);
  }

  const applicationId = await createApplication(db, {
    boarderId: user.user_id,
    landlordId,
    roomId,
    message,
    status: 'pending',
  });
  const application = await findApplicationById(db, applicationId);

  if (!application) {
    return jsonResponse(
      {
        error: 'Failed to create application',
        message: 'Application could not be loaded',
      },
      500
    );
  }

  return jsonResponse(
    {
      data: application,
      message: 'Application created successfully',
      success: true,
    },
    201
  );
});

applicationRoutes.get('/api/boarder/applications/:id', showApplication);

applicationRoutes.delete('/api/boarder/applications/:id', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const applicationId = parseRouteId(c.req.param('id'));

  if (!applicationId) {
    return errorResponse(403, 'Application not found');
  }

  const application = await findApplicationById(db, applicationId);

  if (!application) {
    return errorResponse(403, 'Application not found');
  }

  if (Number(application.boarder_id) !== user.user_id) {
    return errorResponse(403, 'Unauthorized');
  }

  // Withdrawal is only allowed while the application is still actionable
  // (pending or accepted). Confirmed bookings must go through the leave
  // request flow; terminal statuses are immutable.
  if (!canTransition(application.status, 'cancelled')) {
    return errorResponse(
      409,
      'This application can no longer be withdrawn. Contact your landlord for assistance.'
    );
  }

  await softDeleteApplication(db, applicationId);

  return jsonResponse({ message: 'Application deleted successfully' });
});

applicationRoutes.post('/api/boarder/applications/:id/confirm', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const applicationId = parseRouteId(c.req.param('id'));
  const body = await readApplicationJson(c.req.raw);
  const paymentMethod = body ? requiredNonEmptyString(body, 'payment_method') : null;

  if (!paymentMethod) {
    return errorResponse(400, 'Payment method is required');
  }

  if (!applicationId) {
    return errorResponse(403, 'Application not found');
  }

  const application = await findApplicationById(db, applicationId);

  if (!application) {
    return errorResponse(403, 'Application not found');
  }

  if (Number(application.boarder_id) !== user.user_id) {
    return errorResponse(403, 'Unauthorized');
  }

  if (!canTransition(application.status, 'confirmed')) {
    return errorResponse(403, 'Only accepted applications can be confirmed');
  }

  await confirmApplicationBooking(db, applicationId, paymentMethod);
  await occupyRoom(db, Number(application.room_id));
  await updateBoarderStatus(db, user.user_id, 'accepted');
  await cancelOtherBoarderApplications(db, user.user_id, applicationId);

  const confirmedApplication = await findApplicationById(db, applicationId);

  if (!confirmedApplication) {
    return errorResponse(500, 'Failed to confirm booking');
  }

  return jsonResponse({
    data: confirmedApplication,
    message: 'Booking confirmed successfully',
    success: true,
  });
});

applicationRoutes.get('/api/landlord/applications', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['landlord'], c.env.JWT_SECRET);
  const applications = await listLandlordApplications(db, user.user_id);

  return jsonResponse({ data: applications });
});

applicationRoutes.patch('/api/landlord/applications/:id/status', async c => {
  const db = requireD1(c.env);
  const user = await authenticateUser(db, c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'landlord') {
    return errorResponse(403, 'Forbidden: You do not have permission to access this resource');
  }

  if (!user.email_verified) {
    return jsonResponse(
      {
        error: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before accessing landlord features.',
      },
      403
    );
  }

  if (user.account_status === 'pending_verification') {
    return jsonResponse(
      {
        error: 'Account verification pending',
        code: 'VERIFICATION_PENDING',
        message:
          'Your account is under review. You have read-only access until verification is complete.',
      },
      403
    );
  }

  if (!user.is_verified) {
    return jsonResponse(
      {
        error: 'Account verification required',
        code: 'VERIFICATION_REQUIRED',
        message:
          'Your account is pending verification. Write operations are not allowed until an admin approves your account.',
      },
      403
    );
  }

  const body = await readApplicationJson(c.req.raw);
  const status = body ? requiredNonEmptyString(body, 'status') : null;

  if (!status) {
    return errorResponse(400, 'Status is required');
  }

  if (!validApplicationStatuses.has(status)) {
    return errorResponse(400, `Invalid status: ${status}`);
  }

  const applicationId = parseRouteId(c.req.param('id'));

  if (!applicationId) {
    return errorResponse(403, 'Application not found');
  }

  const application = await findApplicationById(db, applicationId);

  if (!application) {
    return errorResponse(403, 'Application not found');
  }

  if (!(await canAccessApplication(db, application, user))) {
    return errorResponse(403, 'Unauthorized');
  }

  if (!canTransition(application.status, status)) {
    return errorResponse(403, 'Application has already been processed');
  }

  await updateApplicationStatus(db, applicationId, status);

  if (status === 'accepted') {
    await verifyBoarderEmail(db, Number(application.boarder_id));
  }

  const updatedApplication = await findApplicationById(db, applicationId);

  if (!updatedApplication) {
    return errorResponse(500, 'Failed to update status');
  }

  return jsonResponse({
    data: updatedApplication,
    message: 'Status updated successfully',
  });
});

applicationRoutes.get('/api/landlord/applications/:id', showApplication);

export default applicationRoutes;
