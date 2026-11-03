import { useQuery } from '@tanstack/react-query';
import { getMe } from './api/auth';
import { useAuth } from './auth-context';
import { getBoarderNav, type NavItem } from './nav';

/** Query key for the live boarder status (spec R13/R15). */
export const BOARDER_STATUS_KEY = 'boarder-status';

/**
 * Live `boarder_status` for the signed-in boarder.
 *
 * Resolution order (spec R14):
 * 1. The live `/auth/me` payload — `formatUserResponse` recomputes the status
 *    server-side on every call, so it reflects applications/confirmations that
 *    happened since login (spec R13/R15: the sidebar upgrades in-session).
 * 2. The session value from `useAuth()` while the first fetch is in flight, so
 *    the sidebar never flashes the wrong shape.
 * 3. Fail-safe `'new'` (limited nav) when neither is available yet.
 */
export function useBoarderStatus({ enabled = true }: { enabled?: boolean } = {}): string {
  const { token, user } = useAuth();

  const status = useQuery({
    queryKey: [BOARDER_STATUS_KEY],
    queryFn: async () => {
      const response = await getMe(token!);
      return response.user.boarder_status ?? 'new';
    },
    enabled: enabled && Boolean(token),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  return status.data ?? user?.boarder_status ?? 'new';
}

/**
 * Boarder sidebar for the current tenancy state (spec R17): the full
 * `BOARDER_NAV` once the booking is confirmed, otherwise the limited
 * Applications / Find a Room / Settings list.
 */
export function useBoarderNav(): NavItem[] {
  return getBoarderNav(useBoarderStatus());
}
