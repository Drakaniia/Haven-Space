import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
} from '../../lib/api/notifications';
import { acceptInvitation, rejectInvitation } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../ui/Button';

function invitationIdFromMetadata(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).invitation_id;
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

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
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        onClick={() => setOpen(value => !value)}
        className="relative rounded-md p-2 text-gray-700 hover:bg-gray-100"
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
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-96 max-w-[90vw] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-sm text-primary hover:underline disabled:opacity-50"
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
            <p className="px-4 py-6 text-center text-sm text-red-600">{list.error.message}</p>
          ) : list.data && list.data.data.length > 0 ? (
            <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
              {list.data.data.map(notification => {
                const invitationId =
                  notification.type === 'property_invitation'
                    ? invitationIdFromMetadata(notification.metadata)
                    : null;

                return (
                  <li key={notification.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${
                          notification.is_read ? 'text-gray-700' : 'font-semibold'
                        }`}
                      >
                        {notification.title}
                      </p>
                      {notification.message ? (
                        <p className="mt-0.5 text-sm text-gray-ink">{notification.message}</p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatWhen(notification.created_at)}
                      </p>
                      {invitationId !== null ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={respondInvitation.isPending}
                            className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-ink transition-colors hover:bg-gray-50 disabled:opacity-50"
                            onClick={() =>
                              respondInvitation.mutate({ invitationId, action: 'reject' })
                            }
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={respondInvitation.isPending}
                            className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
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
                          className="text-xs text-primary hover:underline"
                          onClick={() => markOne.mutate(notification.id)}
                        >
                          Read
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Delete notification"
                        title="Delete"
                        className="text-xs text-red-500 hover:underline"
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
            <p className="px-4 py-6 text-center text-sm text-gray-ink">You're all caught up.</p>
          )}

          {list.data && list.data.data.length > 0 ? (
            <div className="border-t border-gray-200 px-4 py-2">
              <Button type="button" className="w-full text-sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
