import { accessiblePropertyClause } from '../property-access';
import { formatLongDate, insertedId } from './helpers';
import type { ConversationRow, PendingLeaveRequestRow } from './types';

export async function findLeaveConversation(
  db: D1Database,
  propertyId: number,
  boarderId: number,
  landlordId: number
): Promise<ConversationRow | null> {
  return await db
    .prepare(
      `
        SELECT c.id
        FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
        WHERE c.property_id = ?
          AND c.type = 'direct'
          AND cp1.user_id = ?
          AND cp2.user_id = ?
          AND cp1.is_active = 1
          AND cp2.is_active = 1
        LIMIT 1
      `
    )
    .bind(propertyId, boarderId, landlordId)
    .first<ConversationRow>();
}

export async function touchConversation(db: D1Database, conversationId: number): Promise<void> {
  await db
    .prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(conversationId)
    .run();
}

export async function createLeaveConversation(
  db: D1Database,
  title: string,
  propertyId: number,
  boarderId: number,
  landlordId: number
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO conversations (title, type, property_id, created_by, is_system_thread)
        VALUES (?, 'direct', ?, ?, 0)
      `
    )
    .bind(title, propertyId, boarderId)
    .run();
  const conversationId = insertedId(result, 'Conversation');

  await db
    .prepare(
      `
        INSERT INTO conversation_participants (conversation_id, user_id, role, is_active)
        VALUES (?, ?, ?, 1)
      `
    )
    .bind(conversationId, boarderId, 'boarder')
    .run();

  await db
    .prepare(
      `
        INSERT INTO conversation_participants (conversation_id, user_id, role, is_active)
        VALUES (?, ?, ?, 1)
      `
    )
    .bind(conversationId, landlordId, 'landlord')
    .run();

  return conversationId;
}

export async function createLeaveMessage(
  db: D1Database,
  conversationId: number,
  boarderId: number,
  messageText: string
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO messages (conversation_id, sender_id, message_text, has_attachment, is_read)
        VALUES (?, ?, ?, 0, 0)
      `
    )
    .bind(conversationId, boarderId, messageText)
    .run();

  return insertedId(result, 'Message');
}

export async function submitLeaveRequest(
  db: D1Database,
  applicationId: number,
  boarderId: number,
  reason: string,
  leaveDate: string
): Promise<void> {
  // Keep the application active (status stays confirmed, no soft delete) so the
  // boarder's tenancy remains visible in a "pending approval" state; the room
  // stays occupied until the landlord approves the request.
  await db
    .prepare(
      `
        UPDATE applications
        SET leave_request_status = 'pending',
            leave_request_date = date('now'),
            leave_request_reason = ?,
            intended_leave_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND boarder_id = ?
      `
    )
    .bind(reason, leaveDate, applicationId, boarderId)
    .run();
}

export async function findPendingLeaveRequest(
  db: D1Database,
  applicationId: number,
  landlordId: number
): Promise<PendingLeaveRequestRow | null> {
  return await db
    .prepare(
      `
        SELECT
          app.id,
          app.boarder_id,
          app.room_id,
          app.intended_leave_date,
          p.id AS property_id,
          p.landlord_id,
          p.title AS property_title,
          lu.first_name AS landlord_first_name,
          lu.last_name AS landlord_last_name,
          u.first_name,
          u.last_name
        FROM applications app
        JOIN rooms r ON app.room_id = r.id
        JOIN properties p ON r.property_id = p.id
        JOIN users lu ON p.landlord_id = lu.id
        JOIN users u ON app.boarder_id = u.id
        WHERE app.id = ?
          AND app.leave_request_status = 'pending'
          AND app.status = 'confirmed'
          AND app.deleted_at IS NULL
          AND ${accessiblePropertyClause('p')}
        LIMIT 1
      `
    )
    .bind(applicationId, landlordId, landlordId)
    .first<PendingLeaveRequestRow>();
}

export function buildLeaveMessage(
  boarderName: string,
  propertyName: string,
  reason: string,
  leaveDate: string,
  message: string
): { text: string; formattedDate: string } {
  const formattedDate = formatLongDate(leaveDate);
  const text = [
    'LEAVE REQUEST',
    '',
    `Boarder: ${boarderName}`,
    `Property: ${propertyName}`,
    `Reason: ${reason}`,
    `Intended Leave Date: ${formattedDate}`,
    '',
    'Message:',
    message,
    '',
    '---',
    'This is an automated leave request notification.',
  ].join('\n');

  return { text, formattedDate };
}
