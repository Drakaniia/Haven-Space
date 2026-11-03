import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { authenticateUser, authorizeUser, type AuthenticatedUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { isJsonRecord, type JsonRecord } from '../lib/validation';
import {
  approvePendingLeaveRequest,
  buildLeaveMessage,
  createLeaveConversation,
  createLeaveMessage,
  endApprovedLeaveNow,
  finalizeDueLeaveRequests,
  findBoarderName,
  findCurrentTenancy,
  findLeaveConversation,
  findPendingLeaveRequest,
  findUserName,
  formatTenancy,
  notifyBoarderOfLeaveApproval,
  notifyLandlordOfEarlyMoveOut,
  outstandingBalanceForApplication,
  submitLeaveRequest,
  touchConversation,
} from '../repositories/tenancy';
import { manilaToday } from '../repositories/payments/helpers';

const tenancyRoutes = new Hono<{ Bindings: Env }>();

async function readJsonBody(request: Request): Promise<JsonRecord | null> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  return isJsonRecord(body) ? body : null;
}

function nonEmptyString(body: JsonRecord | null, field: string): string | null {
  const value = body?.[field];

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function positiveInt(body: JsonRecord | null, field: string): number | null {
  const value = body?.[field];

  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function validDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

async function requireLandlord(
  c: Context<{ Bindings: Env }>
): Promise<AuthenticatedUser | Response> {
  const user = await authenticateUser(requireD1(c.env), c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'landlord') {
    return errorResponse(403, 'Forbidden: You do not have permission to access this resource');
  }

  return user;
}

tenancyRoutes.get('/api/boarder/tenancy', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  // A leave whose date has passed is closed on the same read that would show it
  // (spec `approve-leave-request` §4.2).
  await finalizeDueLeaveRequests(db, { boarderId: user.user_id });
  const tenancy = await findCurrentTenancy(db, user.user_id);

  if (!tenancy) {
    return jsonResponse({
      success: true,
      data: null,
      message: 'No active tenancy found',
    });
  }

  const balance = await outstandingBalanceForApplication(db, Number(tenancy.application_id));

  return jsonResponse({
    success: true,
    data: formatTenancy(tenancy, new Date(), balance),
  });
});

tenancyRoutes.post('/api/boarder/leave-request', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const body = await readJsonBody(c.req.raw);
  const reason = nonEmptyString(body, 'reason');
  const leaveDate = nonEmptyString(body, 'leave_date');
  const message = nonEmptyString(body, 'message');

  if (!reason || !leaveDate || !message) {
    return errorResponse(400, 'Reason, leave date, and message are required');
  }

  if (!validDateString(leaveDate)) {
    return errorResponse(400, 'Invalid leave date');
  }

  const boarder = await findBoarderName(db, user.user_id);

  if (!boarder) {
    return errorResponse(404, 'User not found');
  }

  const tenancy = await findCurrentTenancy(db, user.user_id);

  if (!tenancy) {
    return errorResponse(
      404,
      'No active tenancy found. You must be currently renting to submit a leave request.'
    );
  }

  if (tenancy.leave_request_status === 'pending') {
    return errorResponse(
      409,
      'You already have a pending leave request. Please wait for your landlord to review it before submitting another.'
    );
  }

  if (tenancy.leave_request_status === 'approved') {
    return errorResponse(
      409,
      `Your leave request has already been approved. Your tenancy ends on ${
        tenancy.intended_leave_date ?? 'the approved date'
      }.`
    );
  }

  const boarderName = [boarder.first_name, boarder.last_name].filter(Boolean).join(' ').trim();
  const leaveMessage = buildLeaveMessage(
    boarderName,
    tenancy.property_name,
    reason,
    leaveDate,
    message
  );
  const existingConversation = await findLeaveConversation(
    db,
    Number(tenancy.property_id),
    user.user_id,
    Number(tenancy.landlord_id)
  );
  const conversationId = existingConversation
    ? Number(existingConversation.id)
    : await createLeaveConversation(
        db,
        `Leave Request - ${tenancy.property_name}`,
        Number(tenancy.property_id),
        user.user_id,
        Number(tenancy.landlord_id)
      );

  if (existingConversation) {
    await touchConversation(db, conversationId);
  }

  const messageId = await createLeaveMessage(db, conversationId, user.user_id, leaveMessage.text);

  await submitLeaveRequest(db, Number(tenancy.application_id), user.user_id, reason, leaveDate);

  const outstanding = await outstandingBalanceForApplication(db, Number(tenancy.application_id));

  return jsonResponse({
    success: true,
    message: 'Leave request sent to landlord successfully',
    data: {
      conversation_id: conversationId,
      message_id: messageId,
      landlord_name: [tenancy.landlord_first_name, tenancy.landlord_last_name]
        .filter(Boolean)
        .join(' ')
        .trim(),
      property_name: tenancy.property_name,
      leave_date: leaveMessage.formattedDate,
      // Approval is gated on this, so the tenant learns about the debt at the
      // moment they file the request rather than when the landlord refuses
      // (spec `approve-leave-request` §4.7).
      outstanding_amount: outstanding.outstanding_balance,
    },
  });
});

tenancyRoutes.post('/api/landlord/approve-leave-request', async c => {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonBody(c.req.raw);
  const applicationId = positiveInt(body, 'application_id');

  if (!applicationId) {
    return errorResponse(400, 'Application ID is required');
  }

  const request = await findPendingLeaveRequest(db, applicationId, user.user_id);

  if (!request) {
    return errorResponse(404, 'Leave request not found or already processed');
  }

  // Unsettled money blocks the approval (spec `approve-leave-request` §4.2.3):
  // the room is released at approval, so an approval with rent still owed would
  // leave the debt behind a tenancy nobody can chase. Anything the tenant has
  // submitted but the landlord has not verified still counts as unsettled.
  const balance = await outstandingBalanceForApplication(db, applicationId);

  if (balance.outstanding_balance > 0) {
    return errorResponse(
      409,
      `This tenant still owes ₱${balance.outstanding_balance.toLocaleString(
        'en-PH'
      )}. Settle or verify payments before approving.`,
      {
        code: 'unsettled_balance',
        details: { outstanding_amount: balance.outstanding_balance },
      }
    );
  }

  const approver = await findUserName(db, user.user_id);
  const approverName =
    [approver?.first_name, approver?.last_name].filter(Boolean).join(' ').trim() || 'your landlord';

  const approval = await approvePendingLeaveRequest(db, applicationId, Number(request.room_id), {
    id: user.user_id,
    name: approverName,
  });

  const landlordName = approverName;

  if (request.intended_leave_date) {
    // Best-effort: a failed message/notification must not turn a completed
    // approval into an error response (spec `approve-leave-request` §7).
    try {
      await notifyBoarderOfLeaveApproval(db, {
        applicationId,
        boarderId: request.boarder_id,
        // The conversation always belongs to the property's owner, so a
        // manager approving does not spawn a second leave thread; the message
        // itself is still sent as the person who approved it.
        landlordId: Number(request.landlord_id),
        senderId: user.user_id,
        propertyId: Number(request.property_id),
        propertyName: request.property_title,
        landlordName,
        leaveDate: request.intended_leave_date,
      });
    } catch (error) {
      console.error('Leave approval notification failed', error);
    }
  }

  // A leave date that is today or already past has nothing left to wait for
  // (spec §4.1, decision 15).
  const finalized = await finalizeDueLeaveRequests(db, { boarderId: request.boarder_id });

  return jsonResponse({
    success: true,
    message: 'Leave request approved successfully',
    data: {
      application_id: applicationId,
      boarder_name: [request.first_name, request.last_name].filter(Boolean).join(' ').trim(),
      intended_leave_date: request.intended_leave_date,
      finalized: finalized > 0,
      approved_at: approval.approvedAt,
      approved_by_name: approverName,
    },
  });
});

tenancyRoutes.post('/api/boarder/leave-now', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const body = await readJsonBody(c.req.raw);
  const applicationId = positiveInt(body, 'application_id');

  if (!applicationId) {
    return errorResponse(400, 'Application ID is required');
  }

  // Close a leave whose approved date has arrived before deciding anything else.
  await finalizeDueLeaveRequests(db, { boarderId: user.user_id });

  const tenancy = await findCurrentTenancy(db, user.user_id);

  if (!tenancy) {
    return errorResponse(404, 'No active tenancy found.');
  }

  if (Number(tenancy.application_id) !== applicationId) {
    return errorResponse(404, 'Tenancy not found.');
  }

  if (tenancy.leave_request_status !== 'approved') {
    return errorResponse(
      409,
      'You can only leave now after your landlord approves your leave request.'
    );
  }

  if (!tenancy.intended_leave_date) {
    return errorResponse(409, 'Your leave request does not have an approved leave date.');
  }

  if (tenancy.intended_leave_date <= manilaToday()) {
    return errorResponse(
      409,
      'Your approved leave date has arrived. This tenancy is already closing.'
    );
  }

  const balance = await outstandingBalanceForApplication(db, applicationId);

  if (balance.outstanding_balance > 0) {
    return errorResponse(
      409,
      `You have an outstanding balance of ₱${balance.outstanding_balance.toLocaleString(
        'en-PH'
      )}. Settle your fees before you can leave now.`
    );
  }

  const ended = await endApprovedLeaveNow(db, applicationId, user.user_id);

  if (!ended) {
    return errorResponse(409, 'This tenancy has already ended.');
  }

  const moveOutDate = manilaToday();
  const boarder = await findBoarderName(db, user.user_id);
  const boarderName = [boarder?.first_name, boarder?.last_name].filter(Boolean).join(' ').trim();

  // Best-effort: the tenancy has already ended, so a failed bell must not turn
  // the completed move-out into an error (spec `leave-now` §4.3).
  try {
    await notifyLandlordOfEarlyMoveOut(db, {
      applicationId,
      landlordId: Number(tenancy.landlord_id),
      boarderName: boarderName || 'The boarder',
      propertyId: Number(tenancy.property_id),
      propertyName: tenancy.property_name,
      roomId: Number(tenancy.room_id),
      roomNumber: tenancy.room_number,
      approvedLeaveDate: tenancy.intended_leave_date,
      moveOutDate,
    });
  } catch (error) {
    console.error('Early move-out notification failed', error);
  }

  return jsonResponse({
    success: true,
    message: "You've moved out. Your tenancy has ended.",
    data: {
      application_id: applicationId,
      property_name: tenancy.property_name,
      room_number: tenancy.room_number,
      move_out_date: moveOutDate,
    },
  });
});

export default tenancyRoutes;
