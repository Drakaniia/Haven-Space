import { freeRoom } from '../applications';
import { formatLongDate } from './helpers';
import {
  createLeaveConversation,
  createLeaveMessage,
  findLeaveConversation,
  touchConversation,
} from './leave';

/**
 * Approve a leave request without ending the tenancy yet (spec
 * `approve-leave-request` §4.1, amended by `leave-now` §4.1). The room is
 * released immediately; open charges are deliberately left alone so the tenant
 * must settle them before an early exit. `status`/`deleted_at` stay untouched so
 * the tenant remains listed as "Leaving approved" until their leave date.
 *
 * The approver is stamped twice: `approved_by` links the account, while
 * `approved_by_name` is the snapshot that still renders after a rename or a
 * deleted account (spec `approve-leave-request` §4.8).
 */
export async function approvePendingLeaveRequest(
  db: D1Database,
  applicationId: number,
  roomId: number,
  approver: { id: number; name: string }
): Promise<{ approvedAt: string | null }> {
  await db
    .prepare(
      `
        UPDATE applications
        SET leave_request_status = 'approved',
            approved_at = CURRENT_TIMESTAMP,
            approved_by = ?,
            approved_by_name = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(approver.id, approver.name, applicationId)
    .run();

  await freeRoom(db, roomId);

  const row = await db
    .prepare('SELECT approved_at FROM applications WHERE id = ?')
    .bind(applicationId)
    .first<{ approved_at: string | null }>();

  return { approvedAt: row?.approved_at ?? null };
}

/**
 * End an approved tenancy on the tenant's request (spec `leave-now` §4.3).
 *
 * Returns false when the guarded update matches nothing — a double click, a
 * second tab, or a tenancy that was already ended/removed.
 */
export async function endApprovedLeaveNow(
  db: D1Database,
  applicationId: number,
  boarderId: number
): Promise<boolean> {
  const result = await db
    .prepare(
      `
        UPDATE applications
        SET status = 'ended',
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND boarder_id = ?
          AND status = 'confirmed'
          AND deleted_at IS NULL
          AND leave_request_status = 'approved'
      `
    )
    .bind(applicationId, boarderId)
    .run();

  if (Number(result.meta?.changes ?? 0) === 0) {
    return false;
  }

  await db
    .prepare(
      `
        UPDATE users
        SET boarder_status = 'new',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(boarderId)
    .run();

  return true;
}

/**
 * Tell the tenant their leave was approved: one bell notification plus a
 * landlord-authored message in the leave conversation (spec §4.4). Message and
 * notification failures must not roll back the approval, so callers await this
 * only after the state change has been written.
 */
export async function notifyBoarderOfLeaveApproval(
  db: D1Database,
  input: {
    applicationId: number;
    boarderId: number;
    landlordId: number;
    propertyId: number;
    propertyName: string;
    /** The approving user — named in the copy and credited as the sender. */
    landlordName: string;
    senderId: number;
    leaveDate: string;
  }
): Promise<void> {
  const formattedDate = formatLongDate(input.leaveDate);
  const message =
    `Your leave request has been approved. Your tenancy at ${input.propertyName} ` +
    `ends on ${formattedDate}.`;
  const existing = await findLeaveConversation(
    db,
    input.propertyId,
    input.boarderId,
    input.landlordId
  );
  const conversationId = existing
    ? Number(existing.id)
    : await createLeaveConversation(
        db,
        `Leave Request - ${input.propertyName}`,
        input.propertyId,
        input.boarderId,
        input.landlordId
      );

  if (existing) {
    await touchConversation(db, conversationId);
  }

  await createLeaveMessage(db, conversationId, input.senderId, message);

  await db
    .prepare(
      `
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (?, 'leave_request_approved', ?, ?, ?)
      `
    )
    .bind(
      input.boarderId,
      `Leave approved by ${input.landlordName}`,
      message,
      JSON.stringify({
        application_id: input.applicationId,
        intended_leave_date: input.leaveDate,
        // The bell reads this to know where tapping the row goes (§4.6).
        route: '/boarder/tenancy',
      })
    )
    .run();
}

/**
 * Tell the landlord their tenant moved out before the approved date (spec
 * `leave-now` §4.5). Best-effort, like the approval notification: the tenancy has
 * already ended when this is called.
 */
export async function notifyLandlordOfEarlyMoveOut(
  db: D1Database,
  input: {
    applicationId: number;
    landlordId: number;
    boarderName: string;
    propertyId: number;
    propertyName: string;
    roomId: number;
    roomNumber: string | null;
    approvedLeaveDate: string;
    moveOutDate: string;
  }
): Promise<void> {
  const room = input.roomNumber || 'their room';
  const message =
    `${input.boarderName} moved out of ${room} at ${input.propertyName} today, ` +
    `earlier than the approved ${formatLongDate(input.approvedLeaveDate)}.`;

  await db
    .prepare(
      `
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (?, 'boarder_left_early', ?, ?, ?)
      `
    )
    .bind(
      input.landlordId,
      'Boarder moved out early',
      message,
      JSON.stringify({
        application_id: input.applicationId,
        property_id: input.propertyId,
        room_id: input.roomId,
        room_number: input.roomNumber,
        approved_leave_date: input.approvedLeaveDate,
        actual_move_out_date: input.moveOutDate,
      })
    )
    .run();
}
