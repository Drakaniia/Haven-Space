import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { authorizeUser, type AuthenticatedUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { HttpError, errorResponse, jsonResponse } from '../lib/http';
import { uploadFilesToUploadThing } from '../lib/uploadthing';
import { isJsonRecord, readJsonObject } from '../lib/validation';
import { insertAdminAuditLog } from '../repositories/admin-dashboard';
import {
  countRecentBoarderThreads,
  countRecentThreadMessages,
  countUnreadMessagesForUser,
  findActiveThreadBlock,
  findInquiryProperty,
  findMessageThreadById,
  findMessageThreadByPair,
  findMessageThreadSummary,
  findMessageUser,
  insertMessage,
  insertMessageNotification,
  insertMessageReport,
  insertMessageThread,
  landlordHasBoarderLink,
  listAttachmentsForMessages,
  listMessageThreadsForUser,
  listThreadMessages,
  listPropertyTitles,
  markThreadRead,
  restoreThreadForSide,
  setThreadOriginProperty,
  setThreadBlock,
  softDeleteThreadForSide,
  touchThreadAfterSend,
  type MessageAttachmentInput,
  type MessageRow,
  type MessageSide,
  type MessageThreadRow,
} from '../repositories/messages';
import { maxPhotoSizeBytes } from './landlord/shared';

/**
 * Landlord ↔ boarder messaging (spec `messages-feature-review` §4.2).
 *
 * Every handler resolves the caller's side of the thread and rejects anyone who
 * is not a participant, so a thread id is never enough to read or write it.
 * Errors are thrown as `HttpError`; `index.ts` turns them into the standard JSON
 * error body.
 */
const messageRoutes = new Hono<{ Bindings: Env }>();

const MAX_BODY_CHARS = 2000;
const MAX_ATTACHMENTS = 4;
const MESSAGES_PER_PAGE = 50;
const IN_THREAD_RATE_LIMIT = 30;
const MAX_DAILY_THREADS = 5;
const MAX_REPORT_DETAILS = 500;
const ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const REPORT_REASONS = ['spam', 'harassment', 'off_platform_payment', 'other'];

function positiveInt(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function requireMessagingUser(c: Context<{ Bindings: Env }>): Promise<AuthenticatedUser> {
  return authorizeUser(requireD1(c.env), c.req.raw, ['boarder', 'landlord'], c.env.JWT_SECRET);
}

function sideForUser(thread: MessageThreadRow, userId: number): MessageSide | null {
  if (thread.landlord_id === userId) return 'landlord';
  if (thread.boarder_id === userId) return 'boarder';

  return null;
}

function counterpartIdFor(thread: MessageThreadRow, side: MessageSide): number {
  return side === 'landlord' ? thread.boarder_id : thread.landlord_id;
}

/** 404 for an unknown thread, 403 for a real thread the caller is not part of. */
async function requireParticipant(
  db: D1Database,
  threadId: number,
  userId: number
): Promise<{ thread: MessageThreadRow; side: MessageSide }> {
  const thread = await findMessageThreadById(db, threadId);

  if (!thread) {
    throw new HttpError(404, 'Conversation not found', { code: 'thread_not_found' });
  }

  const side = sideForUser(thread, userId);

  if (!side) {
    throw new HttpError(403, 'You are not part of this conversation', {
      code: 'not_a_participant',
    });
  }

  return { thread, side };
}

/** An active block stops sends from both sides until it is removed (D18/R6). */
function blockedError(): HttpError {
  return new HttpError(403, 'You can no longer message this person', { code: 'thread_blocked' });
}

function parseAttachments(value: unknown): MessageAttachmentInput[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new HttpError(400, 'attachments must be an array', { code: 'invalid_attachments' });
  }

  if (value.length > MAX_ATTACHMENTS) {
    throw new HttpError(400, `A message can have at most ${MAX_ATTACHMENTS} images`, {
      code: 'too_many_attachments',
    });
  }

  return value.map(entry => {
    if (!isJsonRecord(entry)) {
      throw new HttpError(400, 'Each attachment needs a url', { code: 'invalid_attachments' });
    }

    const url = typeof entry.url === 'string' ? entry.url.trim() : '';

    if (!/^https?:\/\//i.test(url)) {
      throw new HttpError(400, 'Each attachment needs a url', { code: 'invalid_attachments' });
    }

    const key = typeof entry.key === 'string' && entry.key.trim() ? entry.key.trim() : null;

    return { url, key };
  });
}

async function messageWithAttachments(db: D1Database, message: MessageRow) {
  const attachments = await listAttachmentsForMessages(db, [message.id]);

  return {
    id: message.id,
    sender_id: message.sender_id,
    body: message.body,
    property_id: message.property_id,
    read_at: message.read_at,
    created_at: message.created_at,
    attachments: attachments.map(attachment => ({
      url: attachment.file_url,
      key: attachment.file_key,
    })),
  };
}

async function threadPayload(
  db: D1Database,
  input: { thread: MessageThreadRow; userId: number }
) {
  const summary = await findMessageThreadSummary(db, {
    threadId: input.thread.id,
    userId: input.userId,
  });

  if (!summary) {
    throw new HttpError(404, 'Conversation not found', { code: 'thread_not_found' });
  }

  return summary;
}

/** `GET /api/messages/unread-count` — the nav badge (R9). */
messageRoutes.get('/api/messages/unread-count', async c => {
  const db = requireD1(c.env);
  const user = await requireMessagingUser(c);
  const side: MessageSide = user.role === 'landlord' ? 'landlord' : 'boarder';

  return jsonResponse({
    data: {
      unread_count: await countUnreadMessagesForUser(db, { userId: user.user_id, side }),
    },
  });
});

/** `GET /api/messages/threads` — the caller's inbox (R2). */
messageRoutes.get('/api/messages/threads', async c => {
  const db = requireD1(c.env);
  const user = await requireMessagingUser(c);
  const side: MessageSide = user.role === 'landlord' ? 'landlord' : 'boarder';
  const threads = await listMessageThreadsForUser(db, { userId: user.user_id, side });

  return jsonResponse({
    data: threads,
    unread_count: threads.reduce((total, thread) => total + thread.unread_count, 0),
  });
});

/**
 * `POST /api/messages/threads` — open (or return) the pair thread (R1/D25).
 *
 * Boarder-initiated threads carry the listing that prompted the inquiry and are
 * capped at 5 new ones per 24h (D13); landlord-initiated threads need an existing
 * application link to that boarder and consume no boarder allowance.
 */
messageRoutes.post('/api/messages/threads', async c => {
  const db = requireD1(c.env);
  const user = await requireMessagingUser(c);
  const body = await readJsonObject(c.req.raw);
  const propertyId = positiveInt(body.property_id);
  let property: { id: number; title: string; landlord_id: number } | null = null;

  if (propertyId) {
    property = await findInquiryProperty(db, propertyId);

    if (!property) {
      throw new HttpError(404, 'Listing not found', { code: 'property_not_found' });
    }
  }

  // A boarder reaching the inbox from a listing CTA (`?compose=<propertyId>`)
  // names no landlord, so the listing itself identifies the counterpart.
  const counterpartId =
    positiveInt(body.counterpart_id) ??
    (user.role === 'boarder' ? property?.landlord_id ?? null : null);

  if (!counterpartId) {
    throw new HttpError(400, 'counterpart_id is required', { code: 'missing_counterpart' });
  }

  if (counterpartId === user.user_id) {
    throw new HttpError(400, 'You cannot message yourself', { code: 'self_thread' });
  }

  const counterpart = await findMessageUser(db, counterpartId);
  const expectedRole = user.role === 'landlord' ? 'boarder' : 'landlord';

  if (!counterpart || counterpart.role !== expectedRole) {
    throw new HttpError(404, 'That account cannot be messaged', { code: 'counterpart_not_found' });
  }

  const landlordId = user.role === 'landlord' ? user.user_id : counterpartId;
  const boarderId = user.role === 'landlord' ? counterpartId : user.user_id;

  if (property && property.landlord_id !== landlordId) {
    throw new HttpError(400, 'That listing belongs to another landlord', {
      code: 'property_landlord_mismatch',
    });
  }

  const existing = await findMessageThreadByPair(db, landlordId, boarderId);

  if (existing) {
    // The first listing that started the conversation stays the thread's origin (D21).
    if (property && !existing.property_id) {
      await setThreadOriginProperty(db, existing.id, property.id);
    }

    // Opening a conversation the caller had deleted restores it for their side only (R11).
    await restoreThreadForSide(db, {
      threadId: existing.id,
      side: sideForUser(existing, user.user_id) ?? 'boarder',
    });

    return jsonResponse({
      data: { thread: await threadPayload(db, { thread: existing, userId: user.user_id }) },
    });
  }

  if (user.role === 'boarder') {
    const recent = await countRecentBoarderThreads(db, user.user_id);

    if (recent >= MAX_DAILY_THREADS) {
      throw new HttpError(
        429,
        `You have started ${MAX_DAILY_THREADS} conversations today. Try again tomorrow.`,
        { code: 'inquiry_limit_reached' }
      );
    }
  } else if (!(await landlordHasBoarderLink(db, landlordId, boarderId))) {
    throw new HttpError(403, 'You can only message boarders linked to your properties', {
      code: 'boarder_not_linked',
    });
  }

  const threadId = await insertMessageThread(db, {
    landlordId,
    boarderId,
    propertyId: property?.id ?? null,
    createdBy: user.user_id,
  });
  const thread = await findMessageThreadById(db, threadId);

  if (!thread) {
    throw new HttpError(500, 'Conversation could not be created');
  }

  return jsonResponse(
    { data: { thread: await threadPayload(db, { thread, userId: user.user_id }) } },
    201
  );
});

/** `GET /api/messages/threads/:id` — header context plus a 50-message page (D24). */
messageRoutes.get('/api/messages/threads/:id', async c => {
  const db = requireD1(c.env);
  const user = await requireMessagingUser(c);
  const threadId = positiveInt(c.req.param('id'));

  if (!threadId) {
    throw new HttpError(404, 'Conversation not found', { code: 'thread_not_found' });
  }

  const { thread, side } = await requireParticipant(db, threadId, user.user_id);
  const beforeId = positiveInt(c.req.query('before'));
  const rows = await listThreadMessages(db, {
    threadId,
    beforeId: beforeId ?? undefined,
    limit: MESSAGES_PER_PAGE,
  });
  const attachments = await listAttachmentsForMessages(
    db,
    rows.map(row => row.id)
  );
  const block = await findActiveThreadBlock(db, threadId);
  // Chip labels for the origin listing and any listing a message references (R15).
  const propertyIds = [
    ...new Set(
      [thread.property_id, ...rows.map(row => row.property_id)].filter(
        (id): id is number => typeof id === 'number'
      )
    ),
  ];
  const properties = Object.fromEntries(
    (await listPropertyTitles(db, propertyIds)).map(property => [property.id, property.title])
  );

  return jsonResponse({
    data: {
      thread: await threadPayload(db, { thread, userId: user.user_id }),
      side,
      messages: rows.map(row => ({
        id: row.id,
        sender_id: row.sender_id,
        body: row.body,
        property_id: row.property_id,
        read_at: row.read_at,
        created_at: row.created_at,
        attachments: attachments
          .filter(attachment => attachment.message_id === row.id)
          .map(attachment => ({ url: attachment.file_url, key: attachment.file_key })),
      })),
      has_more: rows.length === MESSAGES_PER_PAGE,
      next_before: rows.length > 0 ? rows[0].id : null,
      blocked_by: block ? (block.blocked_by === user.user_id ? 'you' : 'them') : null,
      properties,
    },
  });
});

/** `POST /api/messages/threads/:id/messages` — send (R3/R4/R6/R10/R13). */
messageRoutes.post('/api/messages/threads/:id/messages', async c => {
  const db = requireD1(c.env);
  const user = await requireMessagingUser(c);
  const threadId = positiveInt(c.req.param('id'));

  if (!threadId) {
    throw new HttpError(404, 'Conversation not found', { code: 'thread_not_found' });
  }

  const { thread, side } = await requireParticipant(db, threadId, user.user_id);
  const body = await readJsonObject(c.req.raw);
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  const attachments = parseAttachments(body.attachments);

  if (text.length > MAX_BODY_CHARS) {
    throw new HttpError(400, `Messages are limited to ${MAX_BODY_CHARS} characters`, {
      code: 'body_too_long',
    });
  }

  if (!text && attachments.length === 0) {
    throw new HttpError(400, 'Write a message or attach an image', { code: 'empty_message' });
  }

  if (await findActiveThreadBlock(db, threadId)) {
    throw blockedError();
  }

  if ((await countRecentThreadMessages(db, threadId)) >= IN_THREAD_RATE_LIMIT) {
    throw new HttpError(429, 'You are sending messages too quickly. Try again in a minute.', {
      code: 'message_rate_limited',
    });
  }

  let propertyId = positiveInt(body.property_id) ?? thread.property_id;

  if (propertyId && propertyId !== thread.property_id) {
    const property = await findInquiryProperty(db, propertyId);

    if (!property || property.landlord_id !== thread.landlord_id) {
      throw new HttpError(400, 'That listing belongs to another landlord', {
        code: 'property_landlord_mismatch',
      });
    }
  }

  const messageId = await insertMessage(db, {
    threadId,
    senderId: user.user_id,
    body: text,
    propertyId: propertyId ?? null,
    attachments,
  });
  const message = (await listThreadMessages(db, { threadId, limit: MESSAGES_PER_PAGE })).find(
    row => row.id === messageId
  );

  if (!message) {
    throw new HttpError(500, 'Message could not be created');
  }

  const recipientSide: MessageSide = side === 'landlord' ? 'boarder' : 'landlord';
  const sender = await findMessageUser(db, user.user_id);

  await touchThreadAfterSend(db, { threadId, recipientSide });
  await insertMessageNotification(db, {
    recipientId: counterpartIdFor(thread, side),
    senderName: `${sender?.first_name ?? ''} ${sender?.last_name ?? ''}`.trim(),
    threadId,
    senderId: user.user_id,
  });

  return jsonResponse({ data: { message: await messageWithAttachments(db, message) } }, 201);
});

/** `POST /api/messages/threads/:id/read` — the only writer of read state (R8). */
messageRoutes.post('/api/messages/threads/:id/read', async c => {
  const db = requireD1(c.env);
  const user = await requireMessagingUser(c);
  const threadId = positiveInt(c.req.param('id'));

  if (!threadId) {
    throw new HttpError(404, 'Conversation not found', { code: 'thread_not_found' });
  }

  await requireParticipant(db, threadId, user.user_id);
  await markThreadRead(db, { threadId, readerId: user.user_id });

  return jsonResponse({ message: 'Conversation marked as read' });
});

/** `DELETE /api/messages/threads/:id` — per-side soft delete (R11). */
messageRoutes.delete('/api/messages/threads/:id', async c => {
  const db = requireD1(c.env);
  const user = await requireMessagingUser(c);
  const threadId = positiveInt(c.req.param('id'));

  if (!threadId) {
    throw new HttpError(404, 'Conversation not found', { code: 'thread_not_found' });
  }

  const { side } = await requireParticipant(db, threadId, user.user_id);
  await softDeleteThreadForSide(db, { threadId, side });

  return jsonResponse({ message: 'Conversation removed' });
});

/** `POST /api/messages/threads/:id/block` — reversible, messaging-only (D18/R6). */
messageRoutes.post('/api/messages/threads/:id/block', async c => {
  const db = requireD1(c.env);
  const user = await requireMessagingUser(c);
  const threadId = positiveInt(c.req.param('id'));

  if (!threadId) {
    throw new HttpError(404, 'Conversation not found', { code: 'thread_not_found' });
  }

  await requireParticipant(db, threadId, user.user_id);
  const body = await readJsonObject(c.req.raw);

  if (typeof body.blocked !== 'boolean') {
    throw new HttpError(400, 'blocked must be true or false', { code: 'invalid_block' });
  }

  await setThreadBlock(db, { threadId, userId: user.user_id, blocked: body.blocked });

  return jsonResponse({ data: { blocked: body.blocked } });
});

/**
 * `POST /api/messages/threads/:id/report` — metadata-only report (R7/R12/D26).
 *
 * The body is never stored; the admin audit log records the report's existence so
 * triage stays possible without admins reading content.
 */
messageRoutes.post('/api/messages/threads/:id/report', async c => {
  const db = requireD1(c.env);
  const user = await requireMessagingUser(c);
  const threadId = positiveInt(c.req.param('id'));

  if (!threadId) {
    throw new HttpError(404, 'Conversation not found', { code: 'thread_not_found' });
  }

  await requireParticipant(db, threadId, user.user_id);
  const body = await readJsonObject(c.req.raw);
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!REPORT_REASONS.includes(reason)) {
    throw new HttpError(400, `reason must be one of ${REPORT_REASONS.join(', ')}`, {
      code: 'invalid_reason',
    });
  }

  const details = typeof body.details === 'string' ? body.details.trim().slice(0, MAX_REPORT_DETAILS) : null;
  const created = await insertMessageReport(db, {
    threadId,
    reportedBy: user.user_id,
    reason,
    details: details || null,
  });

  if (!created) {
    return jsonResponse({ data: { reported: false, already_reported: true } });
  }

  await insertAdminAuditLog(db, user.user_id, 'message_report', [threadId], `reported:${reason}`);

  return jsonResponse({ data: { reported: true, already_reported: false } }, 201);
});

/**
 * `POST /api/messages/attachments` — image upload for the composer (D28/R13).
 *
 * Uploads only; the URLs are what `POST .../messages` persists, so a failed
 * upload never leaves a half-written message behind.
 */
messageRoutes.post('/api/messages/attachments', async c => {
  const user = await requireMessagingUser(c);
  const formData = await c.req.formData();
  const files = [
    ...(formData.getAll('attachments[]') as unknown[]),
    ...(formData.getAll('attachments') as unknown[]),
  ].filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    throw new HttpError(400, 'Choose at least one image', { code: 'no_files' });
  }

  if (files.length > MAX_ATTACHMENTS) {
    throw new HttpError(400, `A message can have at most ${MAX_ATTACHMENTS} images`, {
      code: 'too_many_attachments',
    });
  }

  for (const file of files) {
    if (!ATTACHMENT_TYPES.includes(file.type)) {
      throw new HttpError(400, 'Messages only accept PNG, JPEG, WebP or GIF images', {
        code: 'unsupported_file_type',
      });
    }

    if (file.size > maxPhotoSizeBytes) {
      throw new HttpError(400, 'Each image must be 5 MB or smaller', {
        code: 'file_too_large',
      });
    }
  }

  const results = await uploadFilesToUploadThing(c.env, files, {
    source: 'message',
    user_id: user.user_id,
  });
  const uploaded = results
    .map(result => result.data)
    .filter((data): data is NonNullable<typeof data> => Boolean(data))
    .map(data => ({
      url: data.ufsUrl ?? data.url ?? data.appUrl ?? '',
      key: data.key,
    }))
    .filter(attachment => attachment.url);

  if (uploaded.length !== files.length) {
    throw new HttpError(502, 'Some images could not be uploaded', { code: 'upload_failed' });
  }

  return jsonResponse({ data: uploaded }, 201);
});

export default messageRoutes;
