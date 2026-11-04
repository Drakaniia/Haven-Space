import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { FindARoomContent } from '../../components/rooms/FindARoomContent';
import { listPublicRooms } from '../../lib/api/public';
import type { PublicListingsFilters } from '../../lib/types';

const loadRooms = createServerFn({ method: 'GET' })
  .validator((data: PublicListingsFilters) => data)
  // Resolve the API host from `lib/config` rather than the Pages env var: the
  // project's `API_BASE_URL` binding went stale and pointed at a dead workers.dev
  // subdomain, so SSR fetch failed (Cloudflare 530) while the browser worked.
  .handler(({ data }) => listPublicRooms(data));

export const Route = createFileRoute('/find-a-room/')({
  loader: () => loadRooms({ data: { sort_by: 'newest', limit: 20, offset: 0 } }),
  component: () => {
    const initialData = Route.useLoaderData();
    return (
      <PublicLayout>
        <FindARoomContent initialData={initialData} />
      </PublicLayout>
    );
  },
});
