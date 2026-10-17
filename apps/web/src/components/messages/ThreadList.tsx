import { Link } from '@tanstack/react-router';
import {
  counterpartName,
  messagePreview,
  messageThreadPath,
  relativeTime,
} from '../../lib/messages';
import type { MessageThread } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';

/**
 * The inbox column (spec `messages-feature-review` §4.3/R2).
 *
 * Rows are links, not buttons: every conversation has a deep-linkable URL at
 * every screen size (D14/R16), and the `?thread=` pane on desktop is the same
 * destination. Unread counts are text with an `aria-label`, never colour-only
 * (spec §7).
 */
export function ThreadList({
  threads,
  role,
  activeId = null,
  isLoading = false,
  error = null,
}: {
  threads: MessageThread[];
  role: string | undefined;
  activeId?: number | null;
  isLoading?: boolean;
  error?: string | null;
}) {
  if (isLoading) {
    return (
      <ul className="space-y-2" aria-busy="true">
        {[0, 1, 2].map(index => (
          <li key={index} className="rounded-xl border border-border/70 bg-surface p-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return <p className="rounded-xl border border-error-border bg-error-tint p-3 text-sm text-error-ink">{error}</p>;
  }

  if (threads.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-strong bg-surface/60 p-6 text-center text-sm text-gray-ink">
        No conversations yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {threads.map(thread => {
        const active = thread.id === activeId;
        const blocked = thread.blocked_by_me === 1 || thread.blocked_me === 1;

        return (
          <li key={thread.id}>
            <Link
              to={messageThreadPath(role, thread.id)}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                active
                  ? 'border-primary bg-mint/40'
                  : 'border-border/70 bg-surface hover:border-primary/60 hover:bg-mint/20'
              }`}
            >
              <Avatar
                user={{
                  avatar_url: thread.counterpart_avatar_url,
                  first_name: thread.counterpart_first_name,
                  last_name: thread.counterpart_last_name,
                }}
                size={40}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-ink">
                    {counterpartName(thread)}
                  </span>
                  <span
                    className="shrink-0 text-xs text-muted"
                    title={new Date(thread.last_message_at).toLocaleString()}
                  >
                    {relativeTime(thread.last_message_at)}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-sm text-gray-ink">
                  {messagePreview(thread.last_body, thread.last_attachment_count)}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  {thread.property_title ? (
                    <span className="truncate rounded-full bg-subtle px-2 py-0.5 text-[11px] text-gray-ink">
                      {thread.property_title}
                    </span>
                  ) : null}
                  {blocked ? (
                    <span className="rounded-full bg-warning-tint px-2 py-0.5 text-[11px] text-warning-ink">
                      {thread.blocked_by_me ? 'You blocked' : 'Blocked you'}
                    </span>
                  ) : null}
                  {thread.unread_count > 0 ? (
                    <span
                      aria-label={`${thread.unread_count} unread ${
                        thread.unread_count === 1 ? 'message' : 'messages'
                      }`}
                      className="rounded-full bg-primary-strong px-2 py-0.5 text-[11px] font-semibold text-white"
                    >
                      {thread.unread_count}
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
