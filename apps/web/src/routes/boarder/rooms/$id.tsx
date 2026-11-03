import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { RequireTenancy } from '../../../components/boarder/FeatureGate';
import { Protected } from '../../../components/auth/Protected';
import { RoleShell } from '../../../components/layout/RoleShell';
import { RoomDetailSkeleton } from '../../../components/rooms/BookingFlow';
import { RoomDetailView } from '../../../components/rooms/RoomDetailView';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/ErrorState';
import { getRoomDetail } from '../../../lib/api/public';
import { useBoarderNav } from '../../../lib/use-boarder-nav';

export const Route = createFileRoute('/boarder/rooms/$id')({
  component: () => (
    <Protected role="boarder">
      <RoomDetailPage />
    </Protected>
  ),
});

function RoomDetailPage() {
  const { id } = Route.useParams();
  const nav = useBoarderNav();
  const detail = useQuery({
    queryKey: ['listing', Number(id)],
    queryFn: () => getRoomDetail(Number(id)),
  });

  return (
    <RoleShell nav={nav}>
      <RequireTenancy>
        {detail.isLoading ? (
          <RoomDetailSkeleton />
        ) : detail.error ? (
          <ErrorState
            message="We couldn't load this listing."
            hint={detail.error.message}
            action={
              <Button variant="outline" size="sm" onClick={() => void detail.refetch()}>
                Try again
              </Button>
            }
          />
        ) : detail.data ? (
          <RoomDetailView listing={detail.data.data} />
        ) : null}
      </RequireTenancy>
    </RoleShell>
  );
}
