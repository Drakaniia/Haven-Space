import { useQuery } from '@tanstack/react-query';
import { getSummary } from '../../../lib/api/admin';
import { AdminSection, StatCard } from '../AdminSection';
import { StatsGridSkeleton } from '../AdminSkeletons';

/**
 * The console's landing section: the four platform-wide counters.
 *
 * These tiles used to render above the tab bar on *every* tab, so all six work
 * surfaces paid for a summary they didn't need. They now live here and only here
 * (`admin-apple-ui-restructure` D7/R17); the Applications section keeps its own
 * four stats because those describe that section's data.
 */
export function OverviewSection({ token }: { token: string }) {
  const summary = useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: () => getSummary(token),
    enabled: Boolean(token),
  });

  const counts = summary.data?.data.counts;

  return (
    <AdminSection
      section="overview"
      isLoading={summary.isLoading}
      error={summary.error}
      empty={!counts}
      emptyTitle="No platform data yet"
      emptyIcon="analytics"
      skeleton={<StatsGridSkeleton count={4} />}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Users"
          value={String(counts?.users_total ?? 0)}
          sub={`${counts?.users_boarder ?? 0} boarders · ${counts?.users_landlord ?? 0} landlords`}
          icon="users"
        />
        <StatCard
          label="Properties"
          value={String(counts?.properties_total ?? 0)}
          sub={`${counts?.properties_pending_moderation ?? 0} pending review`}
          icon="list"
        />
        <StatCard
          label="Applications"
          value={String(counts?.applications_total ?? 0)}
          icon="application"
        />
        <StatCard
          label="Landlord verification"
          value={String(counts?.landlords_pending_verification ?? 0)}
          sub="awaiting approval"
          icon="shieldCheck"
        />
      </div>
    </AdminSection>
  );
}
