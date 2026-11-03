import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { RoomDetailView } from '../../components/rooms/RoomDetailView';
import { buttonClasses } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { getRoomDetail, getSimilarRooms } from '../../lib/api/public';
import type { ListingDetailResponse, SimilarPropertiesResponse } from '../../lib/types';

const loadDetail = createServerFn({ method: 'GET' })
  .validator((id: number) => id)
  .handler(({ data }) => getRoomDetail(data, env.API_BASE_URL));

const loadSimilar = createServerFn({ method: 'GET' })
  .validator((id: number) => id)
  .handler(({ data }) => getSimilarRooms(data, 3, env.API_BASE_URL));

type RoomLoaderResult =
  | { found: true; detail: ListingDetailResponse; similar: SimilarPropertiesResponse }
  | { found: false };

export const Route = createFileRoute('/rooms/$id')({
  loader: async ({ params }): Promise<RoomLoaderResult> => {
    const id = Number(params.id);
    try {
      const [detail, similar] = await Promise.all([
        loadDetail({ data: id }),
        loadSimilar({ data: id }),
      ]);
      return { found: true, detail, similar };
    } catch {
      return { found: false };
    }
  },
  component: RoomDetailPage,
});

function RoomDetailPage() {
  const data = Route.useLoaderData();
  if (!data.found) {
    return (
      <PublicLayout>
        {/* PublicLayout already renders the page's <main>; this is a section inside it. */}
        <section className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
          <h1 className="sr-only">Listing not found</h1>
          <EmptyState
            icon="search"
            title="This listing isn't available"
            description="It may have been unpublished by the landlord or removed. Other rooms are still open."
            action={
              <Link to="/find-a-room" className={buttonClasses()}>
                Browse rooms
              </Link>
            }
          />
        </section>
      </PublicLayout>
    );
  }
  const { detail, similar } = data;
  const listing = detail.data;

  return (
    <PublicLayout>
      <RoomDetailView listing={listing} similar={similar.data} />
    </PublicLayout>
  );
}
