import { afterEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MessageComposer } from '../../src/components/messages/MessageComposer';
import {
  MAX_MESSAGE_IMAGES,
  composerError,
  counterpartName,
  dayKey,
  dayLabel,
  groupMessagesByDay,
  inquiryDraft,
  messagePreview,
  notificationThreadId,
  relativeTime,
  unreadTotal,
} from '../../src/lib/messages';
import type { MessageThread, ThreadMessage } from '../../src/lib/types';

// Auto-cleanup isn't registered in this environment; unmount between tests so
// queries never see elements from a previous render.
afterEach(() => cleanup());

/** Reads one source file under `apps/web/src`, for the contract assertions below. */
function source(...parts: string[]): string {
  return readFileSync(join(import.meta.dir, '../..', 'src', ...parts), 'utf8');
}

function message(overrides: Partial<ThreadMessage>): ThreadMessage {
  return {
    id: 1,
    sender_id: 1,
    body: 'Hello',
    property_id: null,
    read_at: null,
    created_at: '2026-10-08T09:00:00Z',
    attachments: [],
    ...overrides,
  };
}

test('an inbox row previews text, images and nothing at all', () => {
  expect(messagePreview('Hi there')).toBe('Hi there');
  expect(messagePreview('  spaced   out\nlines ')).toBe('spaced out lines');
  expect(messagePreview('', 1)).toBe('📷 Photo');
  expect(messagePreview('', 3)).toBe('📷 3 photos');
  expect(messagePreview(null)).toBe('No messages yet');

  const long = messagePreview('x'.repeat(200));
  expect(long.length).toBeLessThanOrEqual(60);
  expect(long.endsWith('…')).toBe(true);
});

test('the unread total sums every row', () => {
  expect(unreadTotal([{ unread_count: 2 }, { unread_count: 0 }, { unread_count: 3 }])).toBe(5);
  expect(unreadTotal([])).toBe(0);
});

test('messages group into day sections with a readable label', () => {
  const now = new Date('2026-10-08T12:00:00');
  const groups = groupMessagesByDay(
    [
      message({ id: 1, created_at: '2026-10-08T01:00:00' }),
      message({ id: 2, created_at: '2026-10-08T09:00:00' }),
      message({ id: 3, created_at: '2026-10-07T22:00:00' }),
    ],
    now
  );

  expect(groups.length).toBe(2);
  expect(groups[0].label).toBe('Today');
  expect(groups[0].messages.map(row => row.id)).toEqual([1, 2]);
  expect(groups[1].label).toBe('Yesterday');
  expect(dayLabel('not-a-date', now)).toBe('');
});

test('the composer mirror rejects what the API rejects', () => {
  expect(composerError({ body: '', attachmentCount: 0 })).toBe(
    'Write a message or attach an image.'
  );
  expect(composerError({ body: '', attachmentCount: 1 })).toBeNull();
  expect(composerError({ body: 'x'.repeat(2001), attachmentCount: 0 })).toContain('2,000');
  expect(composerError({ body: 'hi', attachmentCount: MAX_MESSAGE_IMAGES + 1 })).toContain(
    '4 images'
  );
  expect(composerError({ body: 'hi', attachmentCount: 4 })).toBeNull();
});

test('the listing CTA draft names the listing it came from', () => {
  expect(inquiryDraft('Sunny Room')).toContain('Sunny Room');
  expect(inquiryDraft(null)).toContain('your listing');
});

test('relative times stay short and never throw on a bad timestamp', () => {
  const now = new Date('2026-10-08T12:00:00Z');

  expect(relativeTime('2026-10-08T11:59:30Z', now)).toBe('just now');
  expect(relativeTime('2026-10-08T11:30:00Z', now)).toBe('30m ago');
  expect(relativeTime('2026-10-08T09:00:00Z', now)).toBe('3h ago');
  expect(relativeTime('2026-10-06T12:00:00Z', now)).toBe('2d ago');
  expect(relativeTime('nonsense', now)).toBe('');
});

test("D1's UTC timestamps are never read as local time", () => {
  const now = new Date('2026-10-08T12:00:00Z');

  // `CURRENT_TIMESTAMP` shape: UTC, space-separated, no zone marker. Read as local
  // time this said "8h ago" for a message sent seconds earlier (UTC+8).
  expect(relativeTime('2026-10-08 11:59:30', now)).toBe('just now');
  expect(relativeTime('2026-10-08 09:00:00', now)).toBe('3h ago');

  // Which day a message lands in must not depend on the reader's offset either.
  expect(dayKey('2026-10-08 23:30:00')).toBe(dayKey('2026-10-08T23:30:00Z'));
});

test('a notification only deep-links when it carries a thread id', () => {
  expect(notificationThreadId({ thread_id: 12 })).toBe(12);
  expect(notificationThreadId({ thread_id: '12' })).toBe(12);
  expect(notificationThreadId({ invitation_id: 3 })).toBeNull();
  expect(notificationThreadId(null)).toBeNull();
  expect(notificationThreadId('12')).toBeNull();
});

test('the counterpart name falls back rather than rendering a blank header', () => {
  const thread = {
    counterpart_first_name: 'Lara',
    counterpart_last_name: 'Cruz',
  } as MessageThread;

  expect(counterpartName(thread)).toBe('Lara Cruz');
  expect(
    counterpartName({ ...thread, counterpart_first_name: '', counterpart_last_name: '' })
  ).toBe('Haven Space user');
});

test('the composer sends the trimmed draft and clears it', async () => {
  const sent: Array<{ text: string; files: File[] }> = [];

  render(
    <MessageComposer
      onSend={async input => {
        sent.push(input);
      }}
    />
  );

  const send = screen.getByRole('button', { name: 'Send' });
  expect(send.hasAttribute('disabled')).toBe(true);

  const box = screen.getByLabelText('Message') as HTMLTextAreaElement;
  fireEvent.change(box, { target: { value: '  Hello there  ' } });
  expect(send.hasAttribute('disabled')).toBe(false);

  fireEvent.click(send);

  // The draft clears only because the send resolved.
  await waitFor(() => expect(box.value).toBe(''));
  expect(sent).toEqual([{ text: 'Hello there', files: [] }]);
});

test('a failed send restores the draft and shows the reason (R19)', async () => {
  render(
    <MessageComposer
      onSend={async () => {
        throw new Error('Message could not be sent.');
      }}
    />
  );

  const box = screen.getByLabelText('Message') as HTMLTextAreaElement;
  fireEvent.change(box, { target: { value: 'Still here?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));

  await screen.findByText('Message could not be sent.');
  expect(box.value).toBe('Still here?');
});

test('the picker refuses a fifth image instead of silently dropping it', async () => {
  render(<MessageComposer onSend={async () => {}} />);

  const picker = screen.getByLabelText('Add photos') as HTMLInputElement;
  const files = Array.from(
    { length: MAX_MESSAGE_IMAGES + 1 },
    (_, index) => new File(['x'], `photo-${index}.png`, { type: 'image/png' })
  );

  fireEvent.change(picker, { target: { files } });

  await screen.findByText(`A message can have at most ${MAX_MESSAGE_IMAGES} images.`);
});

test('no "coming soon" copy survives on the two messages screens (R20)', () => {
  for (const role of ['boarder', 'landlord']) {
    expect(source('routes', role, 'messages.tsx').toLowerCase()).not.toContain('coming soon');
  }
});

test('the boarder inbox is not gated behind a confirmed tenancy (F4/R14)', () => {
  const boarderRoute = source('routes', 'boarder', 'messages.tsx');

  // No element *and* no import: the comment may name the gate, the code must not use it.
  expect(boarderRoute).not.toContain('RequireTenancy>');
  expect(boarderRoute).not.toContain('boarder/FeatureGate');
  expect(boarderRoute).toContain('useBoarderNav');
});

test('both roles render the same inbox with their own deep-link routes (R16)', () => {
  for (const role of ['boarder', 'landlord']) {
    expect(source('routes', role, 'messages', 'index.tsx')).toContain('MessageInbox');
    expect(source('routes', role, 'messages', '$threadId.tsx')).toContain('MessageInbox');
  }

  // Composer prefill travels as `?draft=`, the listing CTA intent as `?compose=`.
  expect(source('routes', 'boarder', 'messages', 'index.tsx')).toContain('compose');
  expect(source('routes', 'boarder', 'messages', '$threadId.tsx')).toContain('draft');
});

test('the listing CTA carries the listing into the thread (R14/§4.4)', () => {
  const detail = source('components', 'rooms', 'RoomDetailView.tsx');

  expect(detail).toContain('compose: listing.id');
  expect(detail).toContain('search={contactSearch}');
});

test('the non-inbox entry points name a real counterpart (R17)', () => {
  // Landlord side: the tenant row's `id` is the boarder's user id.
  expect(source('routes', 'landlord', 'boarders.tsx')).toContain('counterpartId={row.id}');
  // Landlord applications use the application's boarder id, boarders its landlord id.
  expect(source('routes', 'landlord', 'applications.tsx')).toContain(
    'counterpartId={row.boarder_id}'
  );
  expect(source('routes', 'boarder', 'applications', '$id.tsx')).toContain(
    'counterpartId={app.landlord_id}'
  );
});

test('the bell deep-links message notifications without bodies (R9)', () => {
  const bell = source('components', 'layout', 'NotificationBell.tsx');

  expect(bell).toContain('notificationThreadId');
  expect(bell).toContain('/landlord/messages/$threadId');
  expect(bell).toContain('/boarder/messages/$threadId');
});

test('the nav badge reads the shared unread total (R9)', () => {
  expect(source('components', 'layout', 'Sidebar.tsx')).toContain('useUnreadMessages');
  expect(source('lib', 'use-unread-messages.ts')).toContain('MESSAGE_UNREAD_KEY');
});
