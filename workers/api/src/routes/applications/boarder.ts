import type { Context } from 'hono';

import type { Env } from '../../env';
import { canTransition } from '../../lib/application-status';
import { authorizeUser } from '../../lib/auth';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import {
  cancelOtherBoarderApplications,
  confirmApplicationBooking,
  createApplication,
  findApplicationById,
  findApplicationRoom,
  findExistingApplicationForRoom,
  hardDeleteApplication,
  listBoarderApplications,
  occupyRoom,
  softDeleteApplication,
  updateBoarderStatus,
} from '../../repositories/applications';
import { generateScheduleForApplication } from '../../repositories/payments';
import {
  parseRouteId,
  readApplicationJson,
  requiredNonEmptyString,
  requiredPositiveInt,
} from './shared';

export async function handleListBoarderApplications(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const applications = await listBoarderApplications(db, user.user_id);

  return jsonResponse({ data: applications });
}

export async function handleCreateApplication(c: Context<{ Bindings: Env }>) {
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

  // Capacity-aware guard (spec `create-listing-room-details` R9): shared rooms
  // accept applications until every slot is taken, instead of stopping at the
  // first confirmed booking.
  const roomStatus = String(room.status ?? '').toLowerCase();
  const capacity = Math.max(Number(room.capacity ?? 1), 1);
  const occupied = Math.max(Number(room.occupied ?? 0), 0);

  if (roomStatus === 'maintenance') {
    return errorResponse(400, 'This room is under maintenance and can no longer be applied to');
  }

  if (capacity - occupied <= 0) {
    return errorResponse(400, 'This room is already full and can no longer be applied to');
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
}

export async function handleWithdrawApplication(c: Context<{ Bindings: Env }>) {
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
}

export async function handleConfirmBooking(c: Context<{ Bindings: Env }>) {
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
  // A confirmed booking is what creates the tenancy, so this is where its rent,
  // deposit and advance charges come from (spec `payments-feature` §6.1). The
  // generator is idempotent (`generation_key`), so a replayed confirm is safe.
  await generateScheduleForApplication(db, applicationId);
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
}
