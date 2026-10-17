import { getApiBaseUrl } from '../config';
import type {
  MessageAttachmentsResponse,
  MessageThreadOpenResponse,
  MessageThreadResponse,
  MessageThreadsResponse,
  MessageUnreadCountResponse,
  SendMessageResponse,
} from '../types';
import { ApiRequestError, apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();

/** Inbox rows for the signed-in participant (`messages-feature-review` §4.2). */
export function getThreads(token: string): Promise<MessageThreadsResponse> {
  return apiFetch<MessageThreadsResponse>(base(), '/api/messages/threads', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Opens (or returns) the pair thread. Idempotent by design: the same pair always
 * resolves to one conversation, so a double tap cannot create a second one (R1).
 * A boarder may pass `property_id` alone — the listing names the landlord.
 */
export function openThread(
  token: string,
  input: { counterpart_id?: number; property_id?: number }
): Promise<MessageThreadOpenResponse> {
  return apiFetch<MessageThreadOpenResponse>(
    base(),
    '/api/messages/threads',
    jsonOptions(token, { method: 'POST', body: JSON.stringify(input) })
  );
}

export function getThread(
  token: string,
  threadId: number,
  before?: number | null
): Promise<MessageThreadResponse> {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';

  return apiFetch<MessageThreadResponse>(base(), `/api/messages/threads/${threadId}${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function sendMessage(
  token: string,
  threadId: number,
  input: { body: string; attachments?: Array<{ url: string; key?: string | null }>; property_id?: number | null }
): Promise<SendMessageResponse> {
  return apiFetch<SendMessageResponse>(
    base(),
    `/api/messages/threads/${threadId}/messages`,
    jsonOptions(token, { method: 'POST', body: JSON.stringify(input) })
  );
}

/** The only writer of read state (R8). */
export function markThreadRead(token: string, threadId: number): Promise<{ message: string }> {
  return apiFetch(
    base(),
    `/api/messages/threads/${threadId}/read`,
    jsonOptions(token, { method: 'POST' })
  );
}

/** Hides the conversation for the caller's side only (R11). */
export function deleteThread(token: string, threadId: number): Promise<{ message: string }> {
  return apiFetch(
    base(),
    `/api/messages/threads/${threadId}`,
    jsonOptions(token, { method: 'DELETE' })
  );
}

export function setThreadBlock(
  token: string,
  threadId: number,
  blocked: boolean
): Promise<{ data: { blocked: boolean } }> {
  return apiFetch(
    base(),
    `/api/messages/threads/${threadId}/block`,
    jsonOptions(token, { method: 'POST', body: JSON.stringify({ blocked }) })
  );
}

export function reportThread(
  token: string,
  threadId: number,
  input: { reason: string; details?: string }
): Promise<{ data: { reported: boolean; already_reported: boolean } }> {
  return apiFetch(
    base(),
    `/api/messages/threads/${threadId}/report`,
    jsonOptions(token, { method: 'POST', body: JSON.stringify(input) })
  );
}

export function getUnreadMessages(token: string): Promise<MessageUnreadCountResponse> {
  return apiFetch<MessageUnreadCountResponse>(base(), '/api/messages/unread-count', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Uploads composer images. Nothing is persisted as a message here — the returned
 * URLs are what the send call stores, so a failed upload never leaves a
 * half-written message behind (R13).
 */
export async function uploadMessageAttachments(
  token: string,
  files: File[]
): Promise<MessageAttachmentsResponse> {
  const form = new FormData();
  files.forEach(file => form.append('attachments[]', file));

  const response = await fetch(`${base()}/api/messages/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = (await response.json().catch(() => ({}))) as MessageAttachmentsResponse &
    Record<string, unknown>;

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      String(body.error ?? body.message ?? `Upload failed (${response.status})`),
      body
    );
  }

  return body;
}
