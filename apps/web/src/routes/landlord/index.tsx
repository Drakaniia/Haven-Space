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
import { Icon } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { getLandlordActivity } from '../../lib/api/activity';
import { getDashboardStats, getProperties } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { revenueTrend } from '../../lib/fixtures/dashboard';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/')({
  component: () => (
    <Protected role="landlord">
      <LandlordDashboard />
    </Protected>
  ),
});

/**
 * The landlord dashboard, built around today's decisions.
 *
 * Reading order: the Action Center (verification, applications, payments,
 * renewals) leads at two-thirds width; the portfolio snapshot (occupancy and
 * rent collected — API figures only) supports it; then the collection trend,
 * the properties and the recent activity. Same three queries as before.
 */
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
  // On error the property count is unknown; keep the chart rather than showing
  // a misleading "no properties" empty state.
  const hasProperties = properties.isLoading || properties.isError ? true : propertyList.length > 0;
  const statData = stats.data?.data;
  const alerts = statData?.payment_alerts;

  const attention =
    properties.data && statData && alerts
      ? pendingApplications +
        alerts.due_today +
        alerts.in_grace +
        alerts.overdue +
        alerts.due_soon +
        statData.renewals.upcoming_count
      : null;

  const subtitle =
    attention === null
      ? undefined
      : attention === 0
      ? 'Nothing needs your attention today. Your houses are in order.'
      : `${attention} ${attention === 1 ? 'thing needs' : 'things need'} your attention today.`;

  return (
    <RoleShell nav={LANDLORD_NAV}>
      <PageHeader
        title={user?.first_name ? `Welcome back, ${user.first_name}` : 'Welcome back'}
        subtitle={subtitle}
        actions={
          <Link to="/landlord/listings/create" className={buttonClasses()}>
            <Icon name="plus" size={16} />
            Create listing
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8">
          {stats.isLoading || properties.isLoading ? (
            <ActionCenterCardSkeleton />
          ) : (
            <ActionCenterCard
              verificationStatus={user?.verification_status}
              counts={{
                applications: properties.data ? pendingApplications : null,
                payments: alerts
                  ? {
                      dueToday: alerts.due_today,
                      inGrace: alerts.in_grace,
                      overdue: alerts.overdue,
                    }
                  : null,
                rentDue: alerts?.due_soon ?? null,
                renewals: statData?.renewals.upcoming_count ?? null,
              }}
            />
          )}
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          {stats.isLoading ? (
            <DashboardStatCardsSkeleton />
          ) : stats.error ? (
            <ErrorState message={stats.error.message} />
          ) : !statData ? null : (
            <DashboardStatCards data={statData} />
          )}
        </div>
      </div>

      <div className="mt-6">
        <RevenueTrendCard points={revenueTrend()} hasProperties={hasProperties} sample />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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
