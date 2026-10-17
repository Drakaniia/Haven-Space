/**
 * Pure helpers for the messaging UI (spec `messages-feature-review` §4.3).
 *
 * Nothing here touches a DOM or a query client, so the inbox rules that are easy
 * to get wrong — what a row previews, how days are grouped, when the composer
 * refuses to send — are unit-testable on their own.
 */
import type { MessageThread, ThreadMessage } from './types';

/** Matches `MAX_BODY_CHARS` in `workers/api/src/routes/messages.ts` (D13/R4). */
export const MAX_MESSAGE_CHARS = 2000;
/** Matches `MAX_ATTACHMENTS` — the server rejects a fifth image (D28/R4). */
export const MAX_MESSAGE_IMAGES = 4;

/** The report reasons the API accepts (`message_reports.reason`). */
export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'off_platform_payment', label: 'Asked me to pay off-platform' },
  { value: 'other', label: 'Something else' },
] as const;

export function counterpartName(
  thread: Pick<MessageThread, 'counterpart_first_name' | 'counterpart_last_name'>
): string {
  const name = `${thread.counterpart_first_name} ${thread.counterpart_last_name}`.trim();

  return name || 'Haven Space user';
}

/**
 * The inbox row's one-line preview. Images-only messages say so rather than
 * showing an empty row, and long text is clipped (R2).
 */
export function messagePreview(body: string | null, attachmentCount = 0, max = 60): string {
  const text = (body ?? '').replace(/\s+/g, ' ').trim();

  if (!text) {
    return attachmentCount > 0
      ? attachmentCount === 1
        ? '📷 Photo'
        : `📷 ${attachmentCount} photos`
      : 'No messages yet';
  }

  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** The nav badge / inbox total (D8/R9). */
export function unreadTotal(threads: Array<Pick<MessageThread, 'unread_count'>>): number {
  return threads.reduce((total, thread) => total + (thread.unread_count ?? 0), 0);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * D1 writes `CURRENT_TIMESTAMP` as `YYYY-MM-DD HH:MM:SS` **in UTC with no offset**.
 * V8 reads a space-separated datetime as *local* time, so a message sent seconds ago
 * rendered as "8h ago" at UTC+8. Give the server's shape an explicit zone before
 * parsing; real ISO strings (`T`/`Z`) pass through untouched.
 */
export function parseTimestamp(value: string): Date {
  const trimmed = (value ?? '').trim();
  const utcShape = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed);

  return new Date(utcShape ? `${trimmed.replace(' ', 'T')}Z` : trimmed);
}

/** Relative label for a timestamp; the absolute value stays available for `title` (spec §7). */
export function relativeTime(value: string, now: Date = new Date()): string {
  const date = parseTimestamp(value);

  if (Number.isNaN(date.getTime())) return '';

  const diff = now.getTime() - date.getTime();

  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Local `YYYY-MM-DD` — the day-separator key, never a UTC slice. */
export function dayKey(value: string): string {
  const date = parseTimestamp(value);

  if (Number.isNaN(date.getTime())) return '';

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

export function dayLabel(value: string, now: Date = new Date()): string {
  const key = dayKey(value);

  if (!key) return '';
  if (key === dayKey(now.toISOString())) return 'Today';
  if (key === dayKey(new Date(now.getTime() - DAY).toISOString())) return 'Yesterday';

  const date = parseTimestamp(value);

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export interface MessageDayGroup {
  key: string;
  label: string;
  messages: ThreadMessage[];
}

/**
 * Splits a thread page into day sections, oldest first — the order the thread
 * renders in (D24). An unparseable timestamp falls into its own `unknown` group
 * rather than dropping the message.
 */
export function groupMessagesByDay(
  messages: ThreadMessage[],
  now: Date = new Date()
): MessageDayGroup[] {
  const groups: MessageDayGroup[] = [];

  for (const message of messages) {
    const key = dayKey(message.created_at) || 'unknown';
    const last = groups[groups.length - 1];

    if (last && last.key === key) {
      last.messages.push(message);
      continue;
    }

    groups.push({ key, label: dayLabel(message.created_at, now), messages: [message] });
  }

  return groups;
}

/** Newest message id in a page — the cursor the live region compares against (spec §7). */
export function latestMessageId(messages: Array<Pick<ThreadMessage, 'id'>>): number | null {
  return messages.length > 0 ? messages[messages.length - 1].id : null;
}

/**
 * Client-side mirror of the send rules so the composer warns before a round trip.
 * Returns `null` when the message is sendable (R3/R4).
 */
export function composerError(input: { body: string; attachmentCount: number }): string | null {
  if (input.body.trim().length > MAX_MESSAGE_CHARS) {
    return `Messages are limited to ${MAX_MESSAGE_CHARS.toLocaleString()} characters.`;
  }

  if (input.attachmentCount > MAX_MESSAGE_IMAGES) {
    return `A message can have at most ${MAX_MESSAGE_IMAGES} images.`;
  }

  if (!input.body.trim() && input.attachmentCount === 0) {
    return 'Write a message or attach an image.';
  }

  return null;
}

/** The first message a boarder sends from a listing's Contact Landlord CTA (R14/§4.4). */
export function inquiryDraft(propertyTitle: string | null | undefined): string {
  const title = (propertyTitle ?? '').trim();

  return title
    ? `Hi, I'm interested in ${title}. Is it still available?`
    : "Hi, I'm interested in your listing. Is it still available?";
}

/** Inbox / thread destinations per role — one place, so links cannot drift (R16). */
export function messagesPath(role: string | undefined): string {
  return role === 'landlord' ? '/landlord/messages' : '/boarder/messages';
}

export function messageThreadPath(role: string | undefined, threadId: number): string {
  return `${messagesPath(role)}/${threadId}`;
}

/** `{ thread_id }` out of a notification's metadata, for the bell's deep link (D15/R16). */
export function notificationThreadId(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).thread_id;
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
