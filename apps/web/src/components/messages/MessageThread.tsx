import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import {
  counterpartName,
  groupMessagesByDay,
  inquiryDraft,
  latestMessageId,
  messagesPath,
  relativeTime,
  REPORT_REASONS,
} from '../../lib/messages';
import { ApiRequestError } from '../../lib/api/http';
import {
  deleteThread,
  getThread,
  markThreadRead,
  reportThread,
  sendMessage,
  setThreadBlock,
  uploadMessageAttachments,
} from '../../lib/api/messages';
import { useAuth } from '../../lib/auth-context';
import type { MessageThread as MessageThreadRow, ThreadMessage } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Field, SelectInput, TextArea } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { Spinner } from '../ui/Spinner';
import { ToastStack, useToasts } from '../ui/Toast';
import { MessageComposer } from './MessageComposer';

interface PendingMessage extends ThreadMessage {
  pending: true;
}

/**
 * One open conversation (spec `messages-feature-review` §4.3/§4.5).
 *
 * Polls every 5s (D22) but the draft lives in `MessageComposer`'s state, so a
 * refetch can never clear typing (F13/R18). Sends are optimistic with a rollback
 * on failure (R19); opening the thread is the only writer of read state (R8).
 */
export function MessageThread({
  role,
  threadId,
  draftPropertyId = null,
}: {
  role: 'landlord' | 'boarder';
  threadId: number;
  /** Set by the listing CTA: prefill the first message with that listing (R14/§4.4). */
  draftPropertyId?: number | null;
}) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();
  const [olderMessages, setOlderMessages] = useState<ThreadMessage[]>([]);
  const [olderCursor, setOlderCursor] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const readCursorRef = useRef<number | null>(null);
  const announceRef = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const thread = useQuery({
    queryKey: ['message-thread', threadId],
    queryFn: () => getThread(token!, threadId),
    enabled: Boolean(token),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });

  const payload = thread.data?.data;
  const row: MessageThreadRow | undefined = payload?.thread;
  const messages = [...olderMessages, ...(payload?.messages ?? [])];
  const me = user?.id ?? null;
  const blockedBy = payload?.blocked_by ?? null;

  const refreshInbox = () => {
    void queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    void queryClient.invalidateQueries({ queryKey: ['message-unread'] });
  };

  // R8: opening a thread clears its unread state once per new inbound message.
  useEffect(() => {
    if (!token || !payload) return;

    const newestInbound = payload.messages.filter(message => message.sender_id !== me).at(-1);

    if (!newestInbound || readCursorRef.current === newestInbound.id) return;

    readCursorRef.current = newestInbound.id;
    void markThreadRead(token, threadId).then(refreshInbox);
  }, [token, threadId, payload, me]);

  // A message arriving by poll is announced once, politely (spec §7).
  useEffect(() => {
    const newest = latestMessageId(payload?.messages ?? []);

    if (newest === null) return;
    if (announceRef.current === null) {
      announceRef.current = newest;
      return;
    }
    if (newest !== announceRef.current) {
      announceRef.current = newest;
      setAnnouncement('New message received');
    }
  }, [payload]);

  // Reset paging when the pane switches threads.
  useEffect(() => {
    setOlderMessages([]);
    setOlderCursor(null);
    setPending([]);
    readCursorRef.current = null;
  }, [threadId]);

  // Land at the newest message when the thread opens, and follow new sends.
  useEffect(() => {
    const container = scrollRef.current;

    if (!container) return;

    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    if (nearBottom) container.scrollTop = container.scrollHeight;
  }, [messages.length, threadId]);

  const loadEarlier = useMutation({
    mutationFn: () => {
      const oldest = messages[0]?.id ?? null;
      const before = olderCursor ?? (olderMessages.length > 0 ? oldest : payload?.next_before ?? null);

      return getThread(token!, threadId, before);
    },
    onSuccess: response => {
      const container = scrollRef.current;
      const previousHeight = container?.scrollHeight ?? 0;
      setOlderMessages(previous => [...response.data.messages, ...previous]);
      setOlderCursor(response.data.next_before);
      // "Load earlier" must not jump the reader: keep the same content in view.
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - previousHeight;
      });
    },
    onError: failure =>
      push({
        tone: 'error',
        message:
          failure instanceof ApiRequestError ? failure.message : 'Could not load earlier messages.',
      }),
  });

  const send = useMutation({
    mutationFn: async ({ text, files }: { text: string; files: File[] }) => {
      const attachments = files.length
        ? (await uploadMessageAttachments(token!, files)).data
        : [];

      return sendMessage(token!, threadId, { body: text, attachments });
    },
    onMutate: ({ text, files }) => {
      const previews = files.map(file => URL.createObjectURL(file));
      const optimistic: PendingMessage = {
        id: -Date.now(),
        sender_id: me ?? 0,
        body: text,
        property_id: null,
        read_at: null,
        created_at: new Date().toISOString(),
        attachments: previews.map(url => ({ url, key: null })),
        pending: true,
      };

      setPending(previous => [...previous, optimistic]);

      return { optimisticId: optimistic.id, previews };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['message-thread', threadId] });
      refreshInbox();
    },
    onError: failure =>
      push({
        tone: 'error',
        message: failure instanceof ApiRequestError ? failure.message : 'Message could not be sent.',
      }),
    // The optimistic bubble is dropped once the real row is in the cache, so a
    // failed send never leaves a phantom message behind (R19).
    onSettled: (_data, _error, _variables, context) => {
      const saved = context as { optimisticId?: number; previews?: string[] } | undefined;

      saved?.previews?.forEach(url => URL.revokeObjectURL(url));
      setPending(previous => previous.filter(message => message.id !== saved?.optimisticId));
    },
  });

  const block = useMutation({
    mutationFn: (blocked: boolean) => setThreadBlock(token!, threadId, blocked),
    onSuccess: (_data, blocked) => {
      setMenuOpen(false);
      refreshInbox();
      void queryClient.invalidateQueries({ queryKey: ['message-thread', threadId] });
      push({
        tone: 'success',
        message: blocked ? 'You blocked this conversation.' : 'You unblocked this conversation.',
      });
    },
    onError: failure =>
      push({
        tone: 'error',
        message: failure instanceof ApiRequestError ? failure.message : 'Could not update the block.',
      }),
  });

  const remove = useMutation({
    mutationFn: () => deleteThread(token!, threadId),
    onSuccess: () => {
      refreshInbox();
      push({ tone: 'success', message: 'Conversation removed.' });
      void navigate({ to: role === 'landlord' ? '/landlord/messages' : '/boarder/messages' });
    },
    onError: failure =>
      push({
        tone: 'error',
        message:
          failure instanceof ApiRequestError ? failure.message : 'Could not remove the conversation.',
      }),
  });

  const report = useMutation({
    mutationFn: () =>
      reportThread(token!, threadId, {
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      }),
    onSuccess: response => {
      setReportOpen(false);
      setReportDetails('');
      push({
        tone: 'success',
        message: response.data.already_reported
          ? 'You already reported this conversation.'
          : 'Report submitted. Our team will review it.',
      });
    },
    onError: failure =>
      push({
        tone: 'error',
        message: failure instanceof ApiRequestError ? failure.message : 'Could not send the report.',
      }),
  });

  if (thread.isLoading) return <Spinner />;

  if (thread.error || !payload || !row) {
    return <ErrorState message={thread.error?.message ?? 'Conversation not found'} />;
  }

  const title = counterpartName(row);
  const originPropertyTitle = row.property_id
    ? payload.properties[String(row.property_id)] ?? row.property_title
    : row.property_title;
  const draftText =
    draftPropertyId && draftPropertyId === row.property_id
      ? inquiryDraft(originPropertyTitle)
      : draftPropertyId
      ? inquiryDraft(null)
      : '';

  const groups = groupMessagesByDay([...messages, ...pending]);

  return (
    <div className="flex min-h-[60vh] flex-col rounded-2xl border border-border bg-cream/60">
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      {/* Below `lg` the list pane is hidden, so the thread owns the way back (D14). */}
      <Link
        to={messagesPath(role)}
        className="flex items-center gap-1.5 border-b border-border px-4 py-2 text-sm font-medium text-primary lg:hidden"
      >
        <span aria-hidden="true">←</span> All conversations
      </Link>

      <header className="flex items-start justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            user={{
              avatar_url: row.counterpart_avatar_url,
              first_name: row.counterpart_first_name,
              last_name: row.counterpart_last_name,
            }}
            size={40}
          />
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-ink">{title}</h2>
            {originPropertyTitle ? (
              <p className="truncate text-xs text-gray-ink">About {originPropertyTitle}</p>
            ) : null}
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Conversation actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(value => !value)}
            onKeyDown={event => {
              if (event.key === 'Escape') setMenuOpen(false);
            }}
            className="rounded-full px-2 py-1 text-lg leading-none text-gray-ink hover:bg-subtle"
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-border bg-surface py-1 shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-gray-ink hover:bg-subtle"
                onClick={() => block.mutate(row.blocked_by_me !== 1)}
              >
                {row.blocked_by_me === 1 ? 'Unblock this person' : 'Block this person'}
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-gray-ink hover:bg-subtle"
                onClick={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
              >
                Report conversation
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-error-ink hover:bg-error-tint"
                onClick={() => remove.mutate()}
              >
                Delete for me
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {payload.has_more || olderMessages.length > 0 ? (
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loadEarlier.isPending}
              onClick={() => loadEarlier.mutate()}
            >
              {loadEarlier.isPending ? 'Loading…' : 'Load earlier messages'}
            </Button>
          </div>
        ) : null}

        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-ink">
            No messages yet — say hello to {title}.
          </p>
        ) : (
          groups.map(group => (
            <section key={group.key}>
              <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted">
                {group.label}
              </p>
              <ul className="space-y-3">
                {group.messages.map(message => {
                  const mine = message.sender_id === me;
                  const chipTitle = message.property_id
                    ? payload.properties[String(message.property_id)]
                    : null;

                  return (
                    <li
                      key={message.id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-card ${
                          mine ? 'bg-mint text-ink' : 'bg-surface text-ink'
                        } ${'pending' in message ? 'opacity-60' : ''}`}
                      >
                        {chipTitle ? (
                          <p className="mb-1 inline-block rounded-full bg-subtle px-2 py-0.5 text-[11px] text-gray-ink">
                            {chipTitle}
                          </p>
                        ) : null}
                        {message.body ? (
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        ) : null}
                        {message.attachments.length > 0 ? (
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {message.attachments.map((attachment, index) => (
                              <li key={`${message.id}-${index}`}>
                                <a href={attachment.url} target="_blank" rel="noreferrer">
                                  <img
                                    src={attachment.url}
                                    alt={`Attached image ${index + 1}`}
                                    className="h-28 w-28 rounded-lg object-cover"
                                  />
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <p
                          className="mt-1 text-right text-[11px] text-gray-ink"
                          title={new Date(message.created_at).toLocaleString()}
                        >
                          {'pending' in message ? 'Sending…' : relativeTime(message.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <div className="border-t border-border bg-surface/60 p-3">
        {blockedBy === 'you' ? (
          <div className="rounded-xl border border-border bg-cream px-4 py-3">
            <p className="text-sm text-ink">You blocked this conversation.</p>
            <p className="mt-0.5 text-xs text-gray-ink">
              They cannot message you, and you cannot message them, until you unblock.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={block.isPending}
              onClick={() => block.mutate(false)}
            >
              Unblock
            </Button>
          </div>
        ) : blockedBy === 'them' ? (
          <div className="rounded-xl border border-border bg-cream px-4 py-3">
            <p className="text-sm text-ink">You can no longer message this person.</p>
            <p className="mt-0.5 text-xs text-gray-ink">
              This conversation stays readable. If you think it is abuse, report it from the menu
              above.
            </p>
          </div>
        ) : (
          <MessageComposer
            initialText={draftText}
            onSend={async ({ text, files }) => {
              await send.mutateAsync({ text, files });
            }}
          />
        )}
      </div>

      <Modal open={reportOpen} title="Report conversation" onClose={() => setReportOpen(false)}>
        <div className="flex flex-col gap-4">
          <Field label="What is wrong?" htmlFor="report_reason">
            <SelectInput
              id="report_reason"
              value={reportReason}
              onChange={event => setReportReason(event.target.value)}
            >
              {REPORT_REASONS.map(reason => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Anything to add? (optional)" htmlFor="report_details">
            <TextArea
              id="report_details"
              rows={3}
              maxLength={500}
              value={reportDetails}
              onChange={event => setReportDetails(event.target.value)}
            />
          </Field>
          <p className="text-xs text-gray-ink">
            Reports are reviewed by our team. Admins see that a report exists — never your messages.
          </p>
          <Button
            type="button"
            disabled={report.isPending}
            onClick={() => report.mutate()}
          >
            {report.isPending ? 'Submitting…' : 'Submit report'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** Skeleton used while the inbox decides which thread to show. */
export function EmptyThreadPane() {
  return (
    <EmptyState
      icon="chat"
      title="Select a conversation"
      description="Pick a conversation on the left, or contact a landlord from a listing."
    />
  );
}

export function ThreadSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
