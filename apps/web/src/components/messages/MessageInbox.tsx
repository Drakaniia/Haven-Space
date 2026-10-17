import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { getThreads, openThread } from '../../lib/api/messages';
import { ApiRequestError } from '../../lib/api/http';
import { useAuth } from '../../lib/auth-context';
import { PageHeader } from '../ui/PageHeader';
import { ToastStack, useToasts } from '../ui/Toast';
import { EmptyThreadPane, MessageThread } from './MessageThread';
import { ThreadList } from './ThreadList';

/**
 * The inbox (spec `messages-feature-review` §4.3/§4.5, D14).
 *
 * Two panes at `lg` and up; below that the list is the page and a thread is its
 * own route, so `?thread=` deep links work at every size without JS-only state.
 * Rows come from one polled query (15s, D22) shared with the nav badge, so the
 * badge never needs a second request.
 */
export function MessageInbox({
  role,
  threadId,
  composePropertyId = null,
  draftPropertyId = null,
}: {
  role: 'landlord' | 'boarder';
  /** The open conversation, or `null` for the list-only inbox route. */
  threadId: number | null;
  /** `?compose=<propertyId>` — the listing CTA asks the API for the pair thread (R14). */
  composePropertyId?: number | null;
  /** `?draft=<propertyId>` — prefill the first message with that listing (§4.4). */
  draftPropertyId?: number | null;
}) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();
  const composedRef = useRef<number | null>(null);

  const threads = useQuery({
    queryKey: ['message-threads'],
    queryFn: () => getThreads(token!),
    enabled: Boolean(token),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const startThread = useMutation({
    mutationFn: (propertyId: number) => openThread(token!, { property_id: propertyId }),
    onSuccess: response => {
      const id = response.data.thread.id;
      void queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      void queryClient.invalidateQueries({ queryKey: ['message-unread'] });
      void navigate({
        to: role === 'landlord' ? '/landlord/messages/$threadId' : '/boarder/messages/$threadId',
        params: { threadId: String(id) },
        search: composePropertyId ? { draft: composePropertyId } : undefined,
      });
    },
    onError: failure => {
      push({
        tone: 'error',
        message:
          failure instanceof ApiRequestError
            ? failure.message
            : 'That conversation could not be opened.',
      });
      // Drop the intent so a failing compose cannot loop on every render.
      void navigate({ to: role === 'landlord' ? '/landlord/messages' : '/boarder/messages' });
    },
  });

  // One attempt per listing: the mutation is idempotent server-side, but the
  // effect must not refire while it is in flight (R1).
  useEffect(() => {
    if (!composePropertyId || !token || composedRef.current === composePropertyId) return;
    if (threads.isLoading) return;

    composedRef.current = composePropertyId;
    startThread.mutate(composePropertyId);
  }, [composePropertyId, token, threads.isLoading, startThread]);

  const rows = threads.data?.data ?? [];

  return (
    <div>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <PageHeader icon="chat" title="Messages" />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className={threadId === null ? '' : 'hidden lg:block'}>
          <ThreadList
            threads={rows}
            role={role}
            activeId={threadId}
            isLoading={threads.isLoading}
            error={threads.error?.message ?? null}
          />
        </div>

        <div className={threadId === null ? 'hidden lg:block' : ''}>
          {threadId === null ? (
            <EmptyThreadPane />
          ) : (
            <MessageThread role={role} threadId={threadId} draftPropertyId={draftPropertyId} />
          )}
        </div>
      </div>
    </div>
  );
}
