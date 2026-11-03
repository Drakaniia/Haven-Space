import type { Context } from 'hono';

import type { Env } from '../../env';
import { canTransition } from '../../lib/application-status';
import { authenticateUser, authorizeUser } from '../../lib/auth';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import {
  findApplicationById,
  listLandlordApplications,
  updateApplicationStatus,
  verifyBoarderEmail,
} from '../../repositories/applications';
import {
  canAccessApplication,
  parseRouteId,
  readApplicationJson,
  requiredNonEmptyString,
  validApplicationStatuses,
} from './shared';

export async function handleListLandlordApplications(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['landlord'], c.env.JWT_SECRET);
  const applications = await listLandlordApplications(db, user.user_id);

  return jsonResponse({ data: applications });
}

export async function handleUpdateApplicationStatus(c: Context<{ Bindings: Env }>) {
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
}
