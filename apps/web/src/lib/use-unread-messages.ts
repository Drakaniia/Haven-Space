import { useQuery } from '@tanstack/react-query';
import { getUnreadMessages } from './api/messages';
import { useAuth } from './auth-context';

/** One query key for the unread total, so the sidebar badge and the inbox share a cache. */
export const MESSAGE_UNREAD_KEY = ['message-unread'];

/**
 * The caller's unread total (spec `messages-feature-review` R9).
 *
 * Read by the sidebar badge and invalidated by every messaging mutation, so the
 * badge stays honest without a second poll (D22). The interval matches the inbox's
 * 15s list poll (D22) rather than running slower: a badge that disagreed with the
 * "1 unread message" header right beside it was the bug the walkthrough found.
 */
export function useUnreadMessages(enabled = true): number {
  const { token } = useAuth();

  const unread = useQuery({
    queryKey: MESSAGE_UNREAD_KEY,
    queryFn: () => getUnreadMessages(token!),
    enabled: enabled && Boolean(token),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  return unread.data?.data.unread_count ?? 0;
}
