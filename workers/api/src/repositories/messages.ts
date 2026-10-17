/**
 * Data access for landlord ↔ boarder messaging (spec `messages-feature-review`).
 *
 * One thread per (landlord, boarder) pair (`message_threads`), messages with an
 * optional property chip, image attachments, per-side soft delete, reversible
 * blocks and metadata-only reports. Every read here is scoped by the caller's
 * `side` so a participant can never see a half of the pair they are not in.
 */

export type MessageSide = 'landlord' | 'boarder';

export interface MessageThreadRow {
  id: number;
  landlord_id: number;
  boarder_id: number;
  property_id: number | null;
  created_by: number;
  last_message_at: string;
  landlord_deleted_at: string | null;
  boarder_deleted_at: string | null;
  created_at: string;
}

/** A thread plus everything the inbox row and the thread header need. */
export interface MessageThreadSummary {
  id: number;
  property_id: number | null;
  property_title: string | null;
  counterpart_id: number;
  counterpart_first_name: string;
  counterpart_last_name: string;
  counterpart_avatar_url: string | null;
  last_message_at: string;
  created_at: string;
  last_body: string | null;
  last_sender_id: number | null;
  /** Attachments on the newest visible message, so an image-only row still previews. */
  last_attachment_count: number;
  unread_count: number;
  /** `1` while the caller's block is active (they blocked the counterpart). */
  blocked_by_me: number;
  /** `1` while the counterpart's block is active (they blocked the caller). */
  blocked_me: number;
}

export interface MessageRow {
  id: number;
  thread_id: number;
  sender_id: number;
  body: string;
  property_id: number | null;
  read_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface MessageAttachmentRow {
  id: number;
  message_id: number;
  file_url: string;
  file_key: string | null;
  display_order: number;
}

export interface MessageUserRow {
  id: number;
  role: string;
  account_status: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export interface InquiryPropertyRow {
  id: number;
  title: string;
  landlord_id: number;
}

export interface MessageAttachmentInput {
  url: string;
  key: string | null;
}

function sideColumn(side: MessageSide, column: string): string {
  return `${side}_${column}`;
}

/** The pair's thread, regardless of either side's soft-delete flag (R1/R11). */
export async function findMessageThreadByPair(
  db: D1Database,
  landlordId: number,
  boarderId: number
): Promise<MessageThreadRow | null> {
  const row = await db
    .prepare('SELECT * FROM message_threads WHERE landlord_id = ? AND boarder_id = ?')
    .bind(landlordId, boarderId)
    .first<MessageThreadRow>();

  return row ?? null;
}

export async function findMessageThreadById(
  db: D1Database,
  threadId: number
): Promise<MessageThreadRow | null> {
  const row = await db
    .prepare('SELECT * FROM message_threads WHERE id = ?')
    .bind(threadId)
    .first<MessageThreadRow>();

  return row ?? null;
}

export async function insertMessageThread(
  db: D1Database,
  input: {
    landlordId: number;
    boarderId: number;
    propertyId: number | null;
    createdBy: number;
  }
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO message_threads (landlord_id, boarder_id, property_id, created_by)
        VALUES (?, ?, ?, ?)
      `
    )
    .bind(input.landlordId, input.boarderId, input.propertyId, input.createdBy)
    .run();

  return Number(result.meta.last_row_id);
}

/** Boarder-initiated threads in the last 24h — the D13 inquiry cap. */
export async function countRecentBoarderThreads(
  db: D1Database,
  boarderId: number
): Promise<number> {
  const row = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM message_threads
        WHERE boarder_id = ? AND created_at >= datetime('now', '-1 day')
      `
    )
    .bind(boarderId)
    .first<{ total: number }>();

  return Number(row?.total ?? 0);
}

/** Messages sent in a thread during the last minute — the D23 in-thread rate cap. */
export async function countRecentThreadMessages(
  db: D1Database,
  threadId: number
): Promise<number> {
  const row = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM thread_messages
        WHERE thread_id = ? AND created_at >= datetime('now', '-1 minute')
      `
    )
    .bind(threadId)
    .first<{ total: number }>();

  return Number(row?.total ?? 0);
}

const threadSummarySelect = `
  SELECT
    t.id,
    t.property_id,
    t.last_message_at,
    t.created_at,
    p.title AS property_title,
    CASE WHEN t.landlord_id = ? THEN t.boarder_id ELSE t.landlord_id END AS counterpart_id,
    CASE WHEN t.landlord_id = ? THEN bu.first_name ELSE lu.first_name END AS counterpart_first_name,
    CASE WHEN t.landlord_id = ? THEN bu.last_name ELSE lu.last_name END AS counterpart_last_name,
    CASE WHEN t.landlord_id = ? THEN bu.avatar_url ELSE lu.avatar_url END AS counterpart_avatar_url,
    lm.body AS last_body,
    lm.sender_id AS last_sender_id,
    COALESCE((
      SELECT COUNT(*) FROM message_attachments ma WHERE ma.message_id = lm.id
    ), 0) AS last_attachment_count,
    COALESCE((
      SELECT COUNT(*) FROM thread_messages um
      WHERE um.thread_id = t.id
        AND um.read_at IS NULL
        AND um.sender_id <> ?
        AND um.deleted_at IS NULL
    ), 0) AS unread_count,
    CASE WHEN EXISTS (
      SELECT 1 FROM message_blocks mb
      WHERE mb.thread_id = t.id AND mb.blocked_by = ? AND mb.removed_at IS NULL
    ) THEN 1 ELSE 0 END AS blocked_by_me,
    CASE WHEN EXISTS (
      SELECT 1 FROM message_blocks mb
      WHERE mb.thread_id = t.id AND mb.blocked_by <> ? AND mb.removed_at IS NULL
    ) THEN 1 ELSE 0 END AS blocked_me
  FROM message_threads t
  JOIN users lu ON lu.id = t.landlord_id
  JOIN users bu ON bu.id = t.boarder_id
  LEFT JOIN properties p ON p.id = t.property_id
  LEFT JOIN thread_messages lm ON lm.id = (
    SELECT id FROM thread_messages m
    WHERE m.thread_id = t.id AND m.deleted_at IS NULL
    ORDER BY m.id DESC LIMIT 1
  )
`;

function threadSummaryBinds(userId: number): unknown[] {
  return [userId, userId, userId, userId, userId, userId, userId];
}

/** The caller's inbox, newest activity first (R2: their own soft-delete filter only). */
export async function listMessageThreadsForUser(
  db: D1Database,
  input: { userId: number; side: MessageSide }
): Promise<MessageThreadSummary[]> {
  const result = await db
    .prepare(
      `
        ${threadSummarySelect}
        WHERE t.${sideColumn(input.side, 'id')} = ?
          AND t.${sideColumn(input.side, 'deleted_at')} IS NULL
        ORDER BY t.last_message_at DESC, t.id DESC
      `
    )
    .bind(...threadSummaryBinds(input.userId), input.userId)
    .all<MessageThreadSummary>();

  return (result.results ?? []).map(row => ({
    ...row,
    unread_count: Number(row.unread_count),
    blocked_by_me: Number(row.blocked_by_me),
    blocked_me: Number(row.blocked_me),
  }));
}

/** One thread with its header context, for a participant of either side. */
export async function findMessageThreadSummary(
  db: D1Database,
  input: { threadId: number; userId: number }
): Promise<MessageThreadSummary | null> {
  const row = await db
    .prepare(
      `
        ${threadSummarySelect}
        WHERE t.id = ?
      `
    )
    .bind(...threadSummaryBinds(input.userId), input.threadId)
    .first<MessageThreadSummary>();

  if (!row) {
    return null;
  }

  return {
    ...row,
    unread_count: Number(row.unread_count),
    blocked_by_me: Number(row.blocked_by_me),
    blocked_me: Number(row.blocked_me),
  };
}

/**
 * A page of messages, oldest-last for direct rendering. `beforeId` pages upward
 * from the top (D24) and `deleted_at` hides moderated rows only — per-side
 * deletes live on the thread, not per message.
 */
export async function listThreadMessages(
  db: D1Database,
  input: { threadId: number; beforeId?: number; limit: number }
): Promise<MessageRow[]> {
  const conditions = ['thread_id = ?', 'deleted_at IS NULL'];
  const binds: unknown[] = [input.threadId];

  if (input.beforeId) {
    conditions.push('id < ?');
    binds.push(input.beforeId);
  }

  binds.push(input.limit);

  const result = await db
    .prepare(
      `
        SELECT * FROM thread_messages
        WHERE ${conditions.join(' AND ')}
        ORDER BY id DESC
        LIMIT ?
      `
    )
    .bind(...binds)
    .all<MessageRow>();

  // Queried newest-first so `LIMIT` takes the newest page; rendered oldest-first.
  return (result.results ?? []).reverse();
}

export async function listAttachmentsForMessages(
  db: D1Database,
  messageIds: number[]
): Promise<MessageAttachmentRow[]> {
  if (messageIds.length === 0) {
    return [];
  }

  const placeholders = messageIds.map(() => '?').join(', ');
  const result = await db
    .prepare(
      `
        SELECT * FROM message_attachments
        WHERE message_id IN (${placeholders})
        ORDER BY message_id, display_order, id
      `
    )
    .bind(...messageIds)
    .all<MessageAttachmentRow>();

  return result.results ?? [];
}

export async function insertMessage(
  db: D1Database,
  input: {
    threadId: number;
    senderId: number;
    body: string;
    propertyId: number | null;
    attachments: MessageAttachmentInput[];
  }
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO thread_messages (thread_id, sender_id, body, property_id)
        VALUES (?, ?, ?, ?)
      `
    )
    .bind(input.threadId, input.senderId, input.body, input.propertyId)
    .run();

  const messageId = Number(result.meta.last_row_id);

  for (const [index, attachment] of input.attachments.entries()) {
    await db
      .prepare(
        `
          INSERT INTO message_attachments (message_id, file_url, file_key, display_order)
          VALUES (?, ?, ?, ?)
        `
      )
      .bind(messageId, attachment.url, attachment.key, index)
      .run();
  }

  return messageId;
}

/**
 * The first listing that started the conversation stays the thread's origin
 * (D21) — a later inquiry about another listing must not rewrite it.
 */
export async function setThreadOriginProperty(
  db: D1Database,
  threadId: number,
  propertyId: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE message_threads
        SET property_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND property_id IS NULL
      `
    )
    .bind(propertyId, threadId)
    .run();
}

/**
 * A send refreshes the thread's activity, hides nothing from the sender and
 * revives the recipient's side if they had deleted the conversation (R10/R11).
 */
export async function touchThreadAfterSend(
  db: D1Database,
  input: { threadId: number; recipientSide: MessageSide }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE message_threads
        SET last_message_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            ${sideColumn(input.recipientSide, 'deleted_at')} = NULL
        WHERE id = ?
      `
    )
    .bind(input.threadId)
    .run();
}

export async function markThreadRead(
  db: D1Database,
  input: { threadId: number; readerId: number }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE thread_messages
        SET read_at = CURRENT_TIMESTAMP
        WHERE thread_id = ? AND sender_id <> ? AND read_at IS NULL
      `
    )
    .bind(input.threadId, input.readerId)
    .run();

  // The bell's row is a pointer to this thread, not a second unread counter: once the
  // thread is open its `message` notifications are read too, so the bell agrees with the
  // nav total instead of nagging about a conversation the reader has already seen (R9).
  await db
    .prepare(
      `
        UPDATE notifications
        SET is_read = 1,
            read_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND type = 'message'
          AND is_read = 0
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.thread_id') = ?
      `
    )
    .bind(input.readerId, input.threadId)
    .run();
}

/** Unread total for the nav badge — same side filter as the inbox (R9). */
export async function countUnreadMessagesForUser(
  db: D1Database,
  input: { userId: number; side: MessageSide }
): Promise<number> {
  const row = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM thread_messages m
        JOIN message_threads t ON t.id = m.thread_id
        WHERE m.sender_id <> ?
          AND m.read_at IS NULL
          AND m.deleted_at IS NULL
          AND t.${sideColumn(input.side, 'id')} = ?
          AND t.${sideColumn(input.side, 'deleted_at')} IS NULL
      `
    )
    .bind(input.userId, input.userId)
    .first<{ total: number }>();

  return Number(row?.total ?? 0);
}

export async function softDeleteThreadForSide(
  db: D1Database,
  input: { threadId: number; side: MessageSide }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE message_threads
        SET ${sideColumn(input.side, 'deleted_at')} = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(input.threadId)
    .run();
}

/** Re-opening a deleted conversation (a deep link or a new message) restores it. */
export async function restoreThreadForSide(
  db: D1Database,
  input: { threadId: number; side: MessageSide }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE message_threads
        SET ${sideColumn(input.side, 'deleted_at')} = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .bind(input.threadId)
    .run();
}

/**
 * The active blocker, as the side that created it, or null. Either side may hold
 * at most one active block per thread (D18).
 */
export async function findActiveThreadBlock(
  db: D1Database,
  threadId: number
): Promise<{ blocked_by: number } | null> {
  const row = await db
    .prepare(
      `
        SELECT mb.blocked_by FROM message_blocks mb
        JOIN message_threads t ON t.id = mb.thread_id
        WHERE mb.thread_id = ? AND mb.removed_at IS NULL
          AND mb.blocked_by IN (t.landlord_id, t.boarder_id)
        LIMIT 1
      `
    )
    .bind(threadId)
    .first<{ blocked_by: number }>();

  return row ?? null;
}

export async function setThreadBlock(
  db: D1Database,
  input: { threadId: number; userId: number; blocked: boolean }
): Promise<void> {
  if (!input.blocked) {
    await db
      .prepare(
        `
          UPDATE message_blocks
          SET removed_at = CURRENT_TIMESTAMP
          WHERE thread_id = ? AND blocked_by = ? AND removed_at IS NULL
        `
      )
      .bind(input.threadId, input.userId)
      .run();

    return;
  }

  // Partial-unique: an existing active block makes this a no-op rather than an error.
  await db
    .prepare(
      `
        INSERT INTO message_blocks (thread_id, blocked_by)
        SELECT ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM message_blocks
          WHERE thread_id = ? AND blocked_by = ? AND removed_at IS NULL
        )
      `
    )
    .bind(input.threadId, input.userId, input.threadId, input.userId)
    .run();
}

/** One open report per reporter per thread; a repeat is a no-op (R7). */
export async function insertMessageReport(
  db: D1Database,
  input: { threadId: number; reportedBy: number; reason: string; details: string | null }
): Promise<boolean> {
  const existing = await db
    .prepare(
      `
        SELECT id FROM message_reports
        WHERE thread_id = ? AND reported_by = ? AND status = 'open'
      `
    )
    .bind(input.threadId, input.reportedBy)
    .first<{ id: number }>();

  if (existing) {
    return false;
  }

  await db
    .prepare(
      `
        INSERT INTO message_reports (thread_id, reported_by, reason, details)
        VALUES (?, ?, ?, ?)
      `
    )
    .bind(input.threadId, input.reportedBy, input.reason, input.details)
    .run();

  return true;
}

export async function findMessageUser(
  db: D1Database,
  userId: number
): Promise<MessageUserRow | null> {
  const row = await db
    .prepare(
      `
        SELECT id, role, account_status, first_name, last_name, avatar_url
        FROM users
        WHERE id = ? AND deleted_at IS NULL
      `
    )
    .bind(userId)
    .first<MessageUserRow>();

  return row ?? null;
}

export async function findInquiryProperty(
  db: D1Database,
  propertyId: number
): Promise<InquiryPropertyRow | null> {
  const row = await db
    .prepare(
      `
        SELECT id, title, landlord_id FROM properties
        WHERE id = ? AND deleted_at IS NULL
      `
    )
    .bind(propertyId)
    .first<InquiryPropertyRow>();

  return row ?? null;
}

/**
 * Titles for the property chips a thread shows (R15): the thread's origin plus
 * every listing its messages reference, in one round trip.
 */
export async function listPropertyTitles(
  db: D1Database,
  propertyIds: number[]
): Promise<Array<{ id: number; title: string }>> {
  if (propertyIds.length === 0) {
    return [];
  }

  const rows = await db
    .prepare(
      `
        SELECT id, title FROM properties
        WHERE id IN (${propertyIds.map(() => '?').join(', ')})
      `
    )
    .bind(...propertyIds)
    .all<{ id: number; title: string }>();

  return rows.results ?? [];
}

/**
 * D25: a landlord may only open a thread with a boarder who is already tied to
 * them by an application (which is also how "their tenant" is modelled here).
 */
export async function landlordHasBoarderLink(
  db: D1Database,
  landlordId: number,
  boarderId: number
): Promise<boolean> {
  const row = await db
    .prepare(
      `
        SELECT id FROM applications
        WHERE landlord_id = ? AND boarder_id = ? AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(landlordId, boarderId)
    .first<{ id: number }>();

  return Boolean(row);
}

/**
 * One `message` notification per send — title only, never a body (D9/R10).
 * Skipped for a recipient whose account cannot sign in (Q4 default).
 */
export async function insertMessageNotification(
  db: D1Database,
  input: { recipientId: number; senderName: string; threadId: number; senderId: number }
): Promise<void> {
  const recipient = await db
    .prepare('SELECT account_status FROM users WHERE id = ?')
    .bind(input.recipientId)
    .first<{ account_status: string }>();

  if (recipient && ['suspended', 'banned'].includes(recipient.account_status)) {
    return;
  }

  await db
    .prepare(
      `
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (?, 'message', ?, '', ?)
      `
    )
    .bind(
      input.recipientId,
      `New message from ${input.senderName || 'Haven Space'}`,
      JSON.stringify({ thread_id: input.threadId, sender_id: input.senderId })
    )
    .run();
}
