import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/ErrorState';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { Toggle } from '../ui/Toggle';
import { ApiRequestError } from '../../lib/api/http';
import { getNotificationPreferences, updateNotificationPreferences } from '../../lib/api/account';
import type { NotificationPreferences, NotificationPreferencesResponse } from '../../lib/types';
import type { PushSettingsToast } from './SettingsSection';

const QUERY_KEY = ['notification-preferences'] as const;

const ROWS: Array<{
  key: keyof NotificationPreferences;
  label: string;
  boarder: string;
  landlord: string;
}> = [
  {
    key: 'application_updates',
    label: 'Application updates',
    boarder: 'Status changes to your applications',
    landlord: 'New applications and status changes',
  },
  {
    key: 'messages',
    label: 'Messages',
    boarder: 'New messages from landlords',
    landlord: 'New messages from tenants',
  },
  {
    key: 'announcements',
    label: 'Announcements',
    boarder: 'Updates about properties and the platform',
    landlord: 'Updates about properties and the platform',
  },
];

/**
 * The PREFERENCES card. Flips save immediately: the cache is updated first, the
 * full set is PUT, and a failed save puts the previous values back so the switch
 * never lies about what the server has (spec `settings-signin-method` §5.4).
 */
export function NotificationPreferencesCard({
  token,
  role,
  pushToast,
}: {
  token: string;
  role: 'boarder' | 'landlord' | 'admin';
  pushToast: PushSettingsToast;
}) {
  const queryClient = useQueryClient();
  const preferences = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getNotificationPreferences(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const save = useMutation({
    mutationFn: (next: NotificationPreferences) => updateNotificationPreferences(token, next),
    onMutate: async next => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous =
        queryClient.getQueryData<NotificationPreferencesResponse>(QUERY_KEY)?.preferences;
      queryClient.setQueryData<NotificationPreferencesResponse>(QUERY_KEY, { preferences: next });
      return { previous };
    },
    onError: (error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData<NotificationPreferencesResponse>(QUERY_KEY, {
          preferences: context.previous,
        });
      }
      pushToast({
        tone: 'error',
        message:
          error instanceof ApiRequestError
            ? error.message
            : "Couldn't save your notification preferences. Please try again.",
      });
    },
    onSuccess: () => pushToast({ tone: 'success', message: 'Preferences updated.' }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  function flip(key: keyof NotificationPreferences, checked: boolean) {
    const current = preferences.data?.preferences;
    if (!current) return;
    save.mutate({ ...current, [key]: checked });
  }

  return (
    <Card>
      <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Icon name="notification" size={20} /> Notifications
      </h3>
      <p className="mt-1 text-sm text-gray-ink">
        Choose what you want Haven Space to let you know about.
      </p>

      {preferences.isLoading ? (
        <div className="mt-4 flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : preferences.isError || !preferences.data ? (
        <div className="mt-4">
          <ErrorState
            message="Couldn't load your notification preferences."
            action={
              <Button variant="outline" size="sm" onClick={() => void preferences.refetch()}>
                Retry
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-2 divide-y divide-border">
          {ROWS.map(row => (
            <Toggle
              key={row.key}
              id={`notify-${row.key}`}
              label={row.label}
              description={role === 'landlord' ? row.landlord : row.boarder}
              checked={preferences.data.preferences[row.key]}
              disabled={save.isPending}
              onChange={checked => flip(row.key, checked)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
