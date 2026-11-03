import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { getAcceptedApplications, getTenancy } from '../../lib/api/boarder';
import { useAuth } from '../../lib/auth-context';
import { getBoarderNav } from '../../lib/nav';
import { BROWSE_LISTINGS_PATH } from '../../lib/routes';
import { useBoarderStatus } from '../../lib/use-boarder-nav';

export const Route = createFileRoute('/boarder/')({
  component: () => (
    <Protected role="boarder">
      <BoarderDashboard />
    </Protected>
  ),
});

function BoarderDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const status = useBoarderStatus();
  const nav = getBoarderNav(status);
  const tenancy = useQuery({
    queryKey: ['tenancy'],
    queryFn: () => getTenancy(token!),
    enabled: Boolean(token),
  });
  const accepted = useQuery({
    queryKey: ['accepted'],
    queryFn: () => getAcceptedApplications(token!),
    enabled: Boolean(token),
  });

  const tenancyData = tenancy.data?.data;
  const acceptedCount = accepted.data?.data.length ?? 0;

  // Spec R9: the dashboard is tenancy-scoped — non-confirmed boarders are
  // redirected to Applications instead of seeing a dashboard for a home they
  // don't have yet.
  useEffect(() => {
    if (status !== 'confirmed') void navigate({ to: '/boarder/applications', replace: true });
  }, [status, navigate]);

  if (status !== 'confirmed') return null;

  return (
    <RoleShell nav={nav}>
      {/* Greeting */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Welcome home{user?.first_name ? `, ${user.first_name}` : ''}
          </h1>
        </div>
        <Link
          to="/boarder/payments/pay"
          className="rounded-full bg-primary-strong px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Pay rent
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-start gap-3">
          <Icon name="document" size={24} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-gray-ink">Tenancy</p>
            {tenancy.isLoading ? (
              <Spinner />
            ) : tenancyData ? (
              <>
                <p className="truncate font-semibold text-ink">
                  {String(tenancyData.property_name ?? 'Active tenancy')}
                </p>
                <p className="text-sm text-gray-ink">{String(tenancyData.room_number ?? '')}</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-ink">No active tenancy</p>
                <Link to={BROWSE_LISTINGS_PATH} className="text-sm text-primary hover:underline">
                  Find a room
                </Link>
              </>
            )}
          </div>
        </Card>

        <Card className="flex items-start gap-3">
          <Icon name="application" size={24} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-gray-ink">Accepted applications</p>
            {accepted.isLoading ? (
              <Spinner />
            ) : (
              <>
                <p className="font-semibold text-ink">{acceptedCount} accepted</p>
                {acceptedCount > 0 ? (
                  <Link
                    to="/boarder/confirm-booking"
                    className="text-sm text-primary hover:underline"
                  >
                    Confirm your booking
                  </Link>
                ) : (
                  <Link to="/boarder/applications" className="text-sm text-primary hover:underline">
                    View applications
                  </Link>
                )}
              </>
            )}
          </div>
        </Card>

        <Card className="flex items-start gap-3">
          <Icon name="payment" size={24} className="shrink-0" />
          <div>
            <p className="text-sm text-gray-ink">Payments</p>
            <p className="font-semibold text-ink">Rent & bills</p>
            <Link to="/boarder/payments" className="text-sm text-primary hover:underline">
              View payments
            </Link>
          </div>
        </Card>

        <Card className="flex items-start gap-3">
          <Icon name="announcement" size={24} className="shrink-0" />
          <div>
            <p className="text-sm text-gray-ink">Announcements</p>
            <p className="font-semibold text-ink">House updates</p>
            <Link to="/boarder/announcements" className="text-sm text-primary hover:underline">
              View announcements
            </Link>
          </div>
        </Card>
      </div>

      {/* Tenancy detail card */}
      {tenancyData ? (
        <Card className="mt-6">
          <h2 className="font-semibold text-ink">Your tenancy</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-gray-ink">Monthly rent</dt>
              <dd className="font-medium text-ink">
                ₱{Number(tenancyData.monthly_rent ?? 0).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-ink">Move-in date</dt>
              <dd className="font-medium text-ink">
                {String(tenancyData.tenancy_start_date ?? '—')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-ink">Deposit</dt>
              <dd className="font-medium text-ink">
                ₱{Number(tenancyData.deposit ?? 0).toLocaleString()}
              </dd>
            </div>
          </dl>
          <Link
            to="/boarder/tenancy"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            View full tenancy details
          </Link>
        </Card>
      ) : null}
    </RoleShell>
  );
}
