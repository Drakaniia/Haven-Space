import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { notificationThreadId } from '../../lib/messages';
import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
} from '../../lib/api/notifications';
import { acceptInvitation, rejectInvitation } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';

function invitationIdFromMetadata(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).invitation_id;
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Where a notification should navigate, when its metadata names a route
 * (spec `approve-leave-request` §4.6). Only routes the app can render are
 * accepted — an unknown string renders as plain text rather than a dead link.
 */
function notificationRoute(metadata: unknown): '/boarder/tenancy' | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const route = (metadata as Record<string, unknown>).route;

  return route === '/boarder/tenancy' ? route : null;
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell() {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // A popover closes the way people expect: a click outside it, or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => getUnreadCount(token!),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });

  const list = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => getNotifications(token!),
    enabled: Boolean(token) && open,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markOne = useMutation({
    mutationFn: (id: number) => markRead(token!, id),
    onSuccess: refresh,
  });

  const markAll = useMutation({
    mutationFn: () => markAllRead(token!),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteNotification(token!, id),
    onSuccess: refresh,
  });

  const respondInvitation = useMutation({
    mutationFn: ({ invitationId, action }: { invitationId: number; action: 'accept' | 'reject' }) =>
      action === 'accept'
        ? acceptInvitation(token!, invitationId)
        : rejectInvitation(token!, invitationId),
    onSettled: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: ['landlord-invitations'] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
    },
  });

  const unreadCount = unread.data?.data.unread_count ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(value => !value)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors active:scale-[0.96] ${
          open ? 'bg-surface text-ink' : 'text-gray-ink hover:bg-surface hover:text-ink'
        }`}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold leading-none text-white ring-2 ring-cream">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="menu-pop absolute -right-12 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-pop sm:right-0"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-display text-lg font-medium tracking-[-0.01em] text-ink">
              Notifications
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:bg-mint disabled:opacity-50"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {list.isLoading ? (
            <p className="px-4 py-6 text-center text-sm text-gray-ink">Loading…</p>
          ) : list.error ? (
            <p className="px-4 py-6 text-center text-sm text-error-ink">{list.error.message}</p>
          ) : list.data && list.data.data.length > 0 ? (
            <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto overscroll-contain">
              {list.data.data.map(notification => {
                const invitationId =
                  notification.type === 'property_invitation'
                    ? invitationIdFromMetadata(notification.metadata)
                    : null;
                // A message row carries no body — just the thread it belongs to,
                // which is where tapping it goes (spec `messages-feature-review`
                // R9/R16).
                const threadId =
                  notification.type === 'message'
                    ? notificationThreadId(notification.metadata)
                    : null;
                // A leave approval opens the tenancy it changes, so the date
                // and the leave-now path are one tap away.
                const directRoute =
                  notification.type === 'leave_request_approved'
                    ? notificationRoute(notification.metadata)
                    : null;

                return (
                  <li
                    key={notification.id}
                    className={`relative flex items-start gap-3 px-4 py-3.5 ${
                      notification.is_read ? '' : 'bg-mint/35'
                    }`}
                  >
                    {!notification.is_read ? (
                      <span
                        aria-hidden="true"
                        className="absolute left-1.5 top-5 h-1.5 w-1.5 rounded-full bg-primary"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      {threadId !== null ? (
                        <Link
                          to={
                            user?.role === 'landlord'
                              ? '/landlord/messages/$threadId'
                              : '/boarder/messages/$threadId'
                          }
                          params={{ threadId: String(threadId) }}
                          onClick={() => {
                            setOpen(false);
                            if (!notification.is_read) markOne.mutate(notification.id);
                          }}
                          className={`block text-sm ${
                            notification.is_read
                              ? 'text-primary hover:underline'
                              : 'font-semibold text-primary hover:underline'
                          }`}
                        >
                          {notification.title}
                        </Link>
                      ) : directRoute !== null ? (
                        <Link
                          to={directRoute}
                          onClick={() => {
                            setOpen(false);
                            if (!notification.is_read) markOne.mutate(notification.id);
                          }}
                          className={`block text-sm ${
                            notification.is_read
                              ? 'text-primary hover:underline'
                              : 'font-semibold text-primary hover:underline'
                          }`}
                        >
                          {notification.title}
                        </Link>
                      ) : (
                        <p
                          className={`text-sm ${
                            notification.is_read ? 'text-gray-ink' : 'font-semibold'
                          }`}
                        >
                          {notification.title}
                        </p>
                      )}
                      {notification.message ? (
                        <p className="mt-0.5 text-sm text-gray-ink">{notification.message}</p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-muted">
                        {formatWhen(notification.created_at)}
                      </p>
                      {invitationId !== null ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={respondInvitation.isPending}
                            className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-subtle disabled:opacity-50"
                            onClick={() =>
                              respondInvitation.mutate({ invitationId, action: 'reject' })
                            }
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={respondInvitation.isPending}
                            className="rounded-lg bg-primary-strong px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                            onClick={() =>
                              respondInvitation.mutate({ invitationId, action: 'accept' })
                            }
                          >
                            Accept
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!notification.is_read ? (
                        <button
                          type="button"
                          aria-label="Mark as read"
                          title="Mark as read"
                          className="rounded-md px-1.5 py-1 text-xs font-medium text-primary hover:bg-mint"
                          onClick={() => markOne.mutate(notification.id)}
                        >
                          Read
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Delete notification"
                        title="Delete"
                        className="rounded-md px-1.5 py-1 text-xs font-medium text-gray-ink hover:bg-error-tint hover:text-error-ink"
                        onClick={() => remove.mutate(notification.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-6 py-10 text-center">
              <p className="font-display text-lg font-medium text-ink">You&apos;re all caught up</p>
              <p className="mt-1 text-sm text-gray-ink">
                New messages, payment updates and invitations will show up here.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
