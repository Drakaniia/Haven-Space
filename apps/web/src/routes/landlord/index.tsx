import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { buttonClasses } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Icon } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { getDashboardStats } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/')({
  component: () => (
    <Protected role="landlord">
      <LandlordDashboard />
    </Protected>
  ),
});

function StatCard({
  label,
  value,
  sub,
  icon,
  to,
  action,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  /** Optional link out of the card — a destination, not a change to the number. */
  to?: string;
  action?: string;
}) {
  return (
    <Card className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint text-primary">
        <Icon name={icon} size={24} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-ink">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{value}</p>
        {sub ? <p className="mt-1 text-sm text-gray-ink">{sub}</p> : null}
        {to && action ? (
          <Link to={to} className="mt-2 inline-flex text-sm font-semibold text-primary underline">
            {action}
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

function QuickLinkCard({
  title,
  description,
  to,
  action,
}: {
  title: string;
  description?: string;
  to: string;
  action: string;
}) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-ink">{title}</p>
        {description ? <p className="mt-0.5 text-sm text-gray-ink">{description}</p> : null}
      </div>
      <Link to={to} className={buttonClasses({ variant: 'outline', size: 'sm' })}>
        {action}
      </Link>
    </Card>
  );
}

function LandlordDashboard() {
  const { token, user } = useAuth();
  const stats = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboardStats(token!),
    enabled: Boolean(token),
  });

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
        actions={
          <Link to="/landlord/listings/create" className={buttonClasses()}>
            + Create listing
          </Link>
        }
      />

      {stats.isLoading ? (
        <Spinner />
      ) : stats.error ? (
        <ErrorState message={stats.error.message} />
      ) : stats.data ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Occupancy"
            value={`${stats.data.data.occupancy.rate.toFixed(0)}%`}
            sub={`${stats.data.data.occupancy.occupied_rooms} of ${stats.data.data.occupancy.total_rooms} rooms`}
            icon="analytics"
          />
          <StatCard
            label="Monthly revenue"
            value={`₱${stats.data.data.revenue.monthly.toLocaleString()}`}
            sub={`${stats.data.data.revenue.trend >= 0 ? '+' : ''}${
              stats.data.data.revenue.trend
            }% vs last month`}
            icon="payment"
          />
          {/* The calendar is where "what's coming up" actually lives, so the card
              links to it — the count keeps counting exactly what it always did
              (spec `landlord-calendar` D28). */}
          <StatCard
            label="Upcoming renewals"
            value={String(stats.data.data.renewals.upcoming_count)}
            sub={stats.data.data.renewals.period}
            icon="calendar"
            to="/landlord/calendar"
            action="Open calendar"
          />
          <StatCard
            label="Payment alerts"
            value={String(
              stats.data.data.payment_alerts.due_today +
                stats.data.data.payment_alerts.in_grace +
                stats.data.data.payment_alerts.overdue
            )}
            // The tracker's own vocabulary (spec `payments-tracker-redesign` D32),
            // so the dashboard and the payments page never disagree.
            sub={`${stats.data.data.payment_alerts.due_today} due today · ${stats.data.data.payment_alerts.in_grace} in grace · ${stats.data.data.payment_alerts.overdue} overdue`}
            icon="flag"
            // The count is a union of three states, so the card opens the tracker
            // itself rather than a filter that would hide two of them (§8).
            to="/landlord/payments"
            action="Open tracker"
          />
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        <QuickLinkCard title="My properties" to="/landlord/properties" action="Manage" />
        <QuickLinkCard title="Applications" to="/landlord/applications" action="Review" />
        <QuickLinkCard title="Boarders" to="/landlord/boarders" action="Manage" />
      </div>
    </RoleShell>
  );
}
