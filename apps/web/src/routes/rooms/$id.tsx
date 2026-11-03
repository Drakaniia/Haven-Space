import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { RoomDetailView } from '../../components/rooms/RoomDetailView';
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
        <main className="mx-auto max-w-4xl p-6 text-center">
          <h1 className="text-2xl font-bold">Room not found</h1>
          <p className="mt-2 text-gray-ink">This listing may have been removed or never existed.</p>
          <Link
            to="/find-a-room"
            className="mt-6 inline-block rounded-full bg-primary-strong px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Browse rooms
          </Link>
        </main>
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
