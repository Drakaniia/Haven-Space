import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import {
  ActionCenterCard,
  ActionCenterCardSkeleton,
} from '../../components/landlord/dashboard/ActionCenterCard';
import {
  DashboardStatCards,
  DashboardStatCardsSkeleton,
} from '../../components/landlord/dashboard/DashboardStatCards';
import { MyPropertiesCard } from '../../components/landlord/dashboard/MyPropertiesCard';
import { RecentActivityCard } from '../../components/landlord/dashboard/RecentActivityCard';
import { RevenueTrendCard } from '../../components/landlord/dashboard/RevenueTrendCard';
import { buttonClasses } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { getLandlordActivity } from '../../lib/api/activity';
import { getDashboardStats, getProperties } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { maintenanceRequests, revenueTrend } from '../../lib/fixtures/dashboard';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/')({
  component: () => (
    <Protected role="landlord">
      <LandlordDashboard />
    </Protected>
  ),
});

function LandlordDashboard() {
  const { token, user } = useAuth();

  const stats = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboardStats(token!),
    enabled: Boolean(token),
  });

  const properties = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token),
  });

  const activity = useQuery({
    queryKey: ['landlord-activity', 'recent'],
    queryFn: () => getLandlordActivity(token!, { limit: 4 }),
    enabled: Boolean(token),
  });

  const propertyList = properties.data?.data.properties ?? [];
  const pendingApplications = propertyList.reduce(
    (total, property) => total + Number(property.pending_applications ?? 0),
    0
  );
  // On error the property count is unknown; keep the chart (its fixtures) rather
  // than showing a misleading "no properties" empty state.
  const hasProperties = properties.isLoading || properties.isError ? true : propertyList.length > 0;
  const maintenance = properties.data ? (hasProperties ? maintenanceRequests : 0) : null;
  const statData = stats.data?.data;

  const attention =
    properties.data && statData
      ? pendingApplications +
        (maintenance ?? 0) +
        statData.payment_alerts.due_soon +
        statData.renewals.upcoming_count
      : null;

  const subtitle =
    attention === null
      ? undefined
      : attention === 0
      ? 'You have nothing that needs attention today.'
      : `You have ${attention} ${attention === 1 ? 'thing' : 'things'} that need attention today.`;

  return (
    <RoleShell nav={LANDLORD_NAV}>
      {user?.verification_status === 'pending' ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-border bg-warning-tint px-5 py-4">
          <p className="text-sm text-warning-ink">
            Your account is pending verification. You can browse the dashboard, but your listings
            won&apos;t be visible to boarders until your identity is verified.
          </p>
          <Link
            to="/landlord/verification"
            className={buttonClasses({ size: 'sm', variant: 'warning' })}
          >
            Complete verification
          </Link>
        </div>
      ) : null}

      <PageHeader
        title={user?.first_name ? `Welcome back, ${user.first_name}` : 'Welcome back'}
        subtitle={subtitle}
        actions={
          <Link to="/landlord/listings/create" className={buttonClasses()}>
            + Create listing
          </Link>
        }
      />

      {stats.isLoading ? (
        <DashboardStatCardsSkeleton />
      ) : stats.error ? (
        <ErrorState message={stats.error.message} />
      ) : !statData ? null : (
        <DashboardStatCards data={statData} />
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueTrendCard points={revenueTrend()} hasProperties={hasProperties} />
        </div>
        <div className="lg:col-span-1">
          {stats.isLoading || properties.isLoading ? (
            <ActionCenterCardSkeleton />
          ) : (
            <ActionCenterCard
              counts={{
                applications: properties.data ? pendingApplications : null,
                maintenance,
                rentDue: statData?.payment_alerts.due_soon ?? null,
                renewals: statData?.renewals.upcoming_count ?? null,
              }}
            />
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <MyPropertiesCard
          properties={properties.data ? propertyList : undefined}
          isLoading={properties.isLoading}
          error={properties.error?.message}
          onRetry={() => void properties.refetch()}
        />
        <RecentActivityCard
          events={activity.data?.data.events}
          isLoading={activity.isLoading}
          error={activity.error?.message}
        />
      </div>
    </RoleShell>
  );
}
