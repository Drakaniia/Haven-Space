import { createFileRoute, redirect } from '@tanstack/react-router';
import { BROWSE_LISTINGS_PATH } from '../../../lib/routes';

/**
 * The in-shell browse grid was a duplicate of the public `/find-a-room` page, so
 * this URL is now an alias for it (spec `boarder-find-a-room-redirect`). The
 * redirect runs in `beforeLoad` — before the boarder shell renders — so the user
 * never sees the sidebar flash on the way out. Query strings and hashes are
 * dropped: the legacy URL always lands on the public page's default filters.
 */
export const Route = createFileRoute('/boarder/find-a-room/')({
  beforeLoad: () => {
    throw redirect({ to: BROWSE_LISTINGS_PATH, replace: true });
  },
});
