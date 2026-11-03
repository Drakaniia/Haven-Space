import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { getApplications, getAuditLog, getProperties, getSummary } from '../../../lib/api/admin';
import type { AdminSectionKey } from '../../../lib/nav';
import type { AdminAuditLogEntry } from '../../../lib/types';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { Skeleton } from '../../ui/Skeleton';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection } from '../AdminSection';
import { OverviewSkeleton } from '../AdminSkeletons';
import { auditActor, describeAuditEntry } from '../audit-format';
import { dayLabel, formatTime } from '../sections';

/**
 * The console's landing section, built around the one question an admin opens
 * it with: *what is waiting for me?*
 *
 * 1. **Needs attention** — every queue that requires an admin decision, with
 *    its real count, linking straight to the section (`?tab=`) where the
 *    decision is made. Queues with work sort to the top; empty ones stay listed
 *    (so "nothing waiting" is a visible fact, not an absence) but recede.
 * 2. **Platform** — supporting context: who is on the platform, listings and
 *    applications throughput, the fee in force.
 * 3. **Recent activity** — the last few audit entries, so an admin sees what
 *    colleagues already handled before acting.
 *
 * Every number is read from the API. Queries share their keys with the
 * sections they link to, so following a link opens on cached data.
 */
export function OverviewSection({ token }: { token: string }) {
  const summary = useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: () => getSummary(token),
    enabled: Boolean(token),
  });
  const applications = useQuery({
    queryKey: ['admin', 'applications'],
    queryFn: () => getApplications(token),
    enabled: Boolean(token),
  });
  const properties = useQuery({
    queryKey: ['admin', 'properties'],
    queryFn: () => getProperties(token),
    enabled: Boolean(token),
  });
  const audit = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => getAuditLog(token),
    enabled: Boolean(token),
  });

  const counts = summary.data?.data.counts;
  const revenue = summary.data?.data.revenue;
  const appStats = applications.data?.data.stats;
  const propertyRows = properties.data?.data;
  const flagged = propertyRows?.filter(row => row.listing_moderation_status === 'flagged').length;
  // The properties endpoint returns the 100 newest listings, so a flagged count
  // read from it is only complete when the platform has no more than that.
  const flaggedPartial = Boolean(counts && propertyRows && counts.properties_total > propertyRows.length);

  const queues: QueueItem[] = counts
    ? [
        {
          key: 'verifications',
          tab: 'landlords',
          icon: 'shieldCheck',
          title: 'Landlord verifications',
          description: 'Landlords waiting for their documents to be reviewed.',
          count: counts.landlords_pending_verification,
          cta: 'Review documents',
        },
        {
          key: 'moderation',
          tab: 'properties',
          icon: 'list',
          title: 'Listings awaiting review',
          description: 'New or edited listings that are not live until approved.',
          count: counts.properties_pending_moderation,
          cta: 'Moderate listings',
        },
        {
          key: 'flagged',
          tab: 'properties',
          icon: 'flag',
          title: 'Flagged listings',
          description: flaggedPartial
            ? 'Flagged among the 100 most recent listings.'
            : 'Listings an admin marked for a closer look.',
          count: flagged,
          loading: properties.isLoading,
          failed: Boolean(properties.error),
          cta: 'Open properties',
        },
        {
          key: 'applications',
          tab: 'applications',
          icon: 'application',
          title: 'Pending applications',
          description: 'Boarder applications no landlord has answered yet.',
          count: appStats?.pending,
          loading: applications.isLoading,
          failed: Boolean(applications.error),
          cta: 'View applications',
        },
      ]
    : [];

  // Work first, then the quiet queues, keeping the authored order within each.
  const ordered = [...queues].sort((a, b) => Number((b.count ?? 0) > 0) - Number((a.count ?? 0) > 0));
  const waiting = queues.reduce((total, item) => total + (item.count ?? 0), 0);
  const busyQueues = queues.filter(item => (item.count ?? 0) > 0).length;

  return (
    <AdminSection
      section="overview"
      isLoading={summary.isLoading}
      error={summary.error}
      onRetry={() => void summary.refetch()}
      empty={!counts}
      emptyTitle="No platform data yet"
      emptyDescription="The summary came back empty. Once people sign up and landlords list properties, their numbers appear here."
      emptyIcon="analytics"
      skeleton={<OverviewSkeleton />}
    >
      {counts ? (
        <div className="space-y-10">
          <section aria-labelledby="overview-attention">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="overview-attention" className="font-display text-xl font-medium text-ink">
                Needs attention
              </h2>
              <p className="text-sm text-gray-ink" aria-live="polite">
                {waiting > 0
                  ? `${waiting} waiting across ${busyQueues} ${busyQueues === 1 ? 'queue' : 'queues'}`
                  : 'All clear — nothing is waiting for a decision.'}
              </p>
            </div>
            <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card">
              {ordered.map(item => (
                <li key={item.key}>
                  <QueueRow item={item} />
                </li>
              ))}
            </ul>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
            <section aria-labelledby="overview-platform">
              <Card className="h-full">
                <h2 id="overview-platform" className="font-display text-lg font-medium text-ink">
                  Platform
                </h2>

                <PeopleBreakdown
                  total={counts.users_total}
                  boarders={counts.users_boarder}
                  landlords={counts.users_landlord}
                  admins={counts.users_admin}
                />

                <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:grid-cols-3">
                  <Figure
                    label="Listings"
                    value={counts.properties_total}
                    sub={`${counts.properties_pending_moderation} awaiting review`}
                  />
                  <Figure
                    label="Applications"
                    value={counts.applications_total}
                    sub={
                      appStats
                        ? `${appStats.processed_rate_percent}% answered · ${appStats.approved} approved`
                        : applications.isLoading
                          ? 'Loading breakdown…'
                          : undefined
                    }
                  />
                  <Figure
                    label="Platform fee"
                    value={revenue ? `${revenue.platform_fee_percent}%` : '—'}
                    sub="Set in Settings"
                    to="settings"
                  />
                </dl>
              </Card>
            </section>

            <section aria-labelledby="overview-activity">
              <Card className="h-full">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id="overview-activity" className="font-display text-lg font-medium text-ink">
                    Recent activity
                  </h2>
                  <Link
                    to="/admin"
                    search={{ tab: 'audit' }}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Full log
                  </Link>
                </div>
                <RecentActivity
                  isLoading={audit.isLoading}
                  error={audit.error}
                  entries={audit.data?.data.slice(0, 5) ?? []}
                />
              </Card>
            </section>
          </div>
        </div>
      ) : null}
    </AdminSection>
  );
}

interface QueueItem {
  key: string;
  tab: AdminSectionKey;
  icon: string;
  title: string;
  description: string;
  /** `undefined` while a secondary query is loading or failed. */
  count: number | undefined;
  loading?: boolean;
  failed?: boolean;
  cta: string;
}

function QueueRow({ item }: { item: QueueItem }) {
  const hasWork = (item.count ?? 0) > 0;
  return (
    <Link
      to="/admin"
      search={{ tab: item.tab }}
      className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-cream/70 focus-visible:bg-cream/70 sm:px-5"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          hasWork ? 'bg-warning-tint text-warning-ink' : 'bg-subtle text-muted'
        }`}
      >
        <Icon name={item.icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${hasWork ? 'text-ink' : 'text-gray-ink'}`}>
          {item.title}
        </span>
        <span className="mt-0.5 block text-sm text-gray-ink">
          {item.failed ? "Couldn't count this queue — open the section to check." : item.description}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {item.loading ? (
          <Skeleton className="h-7 w-8" />
        ) : (
          <span
            className={`tabular font-display text-[1.75rem] font-medium leading-none tracking-[-0.02em] ${
              hasWork ? 'text-ink' : 'text-muted'
            }`}
          >
            {item.count ?? '—'}
            <span className="sr-only"> waiting</span>
          </span>
        )}
        <span className="hidden text-sm font-semibold text-primary group-hover:underline md:inline">
          {hasWork ? item.cta : 'Open'}
        </span>
        <Icon name="chevronRight" size={16} className="text-muted" />
      </span>
    </Link>
  );
}

/** Users split by role as one proportional bar plus a legend (real counts only). */
function PeopleBreakdown({
  total,
  boarders,
  landlords,
  admins,
}: {
  total: number;
  boarders: number;
  landlords: number;
  admins: number;
}) {
  const parts = [
    { label: 'Boarders', value: boarders, swatch: 'bg-primary-strong' },
    { label: 'Landlords', value: landlords, swatch: 'bg-primary-light' },
    { label: 'Admins', value: admins, swatch: 'bg-border-strong' },
  ];
  return (
    <div className="mt-4">
      <p className="flex items-baseline gap-2">
        <span className="tabular font-display text-[2rem] font-medium leading-none tracking-[-0.02em] text-ink">
          {total}
        </span>
        <span className="text-sm text-gray-ink">{total === 1 ? 'account' : 'accounts'}</span>
        <Link
          to="/admin"
          search={{ tab: 'users' }}
          className="ml-auto text-sm font-semibold text-primary hover:underline"
        >
          Manage users
        </Link>
      </p>
      {total > 0 ? (
        <div
          className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-subtle"
          role="img"
          aria-label={parts.map(p => `${p.value} ${p.label.toLowerCase()}`).join(', ')}
        >
          {parts.map(part =>
            part.value > 0 ? (
              <span
                key={part.label}
                className={`${part.swatch} h-full border-r-2 border-surface last:border-r-0`}
                style={{ width: `${(part.value / total) * 100}%` }}
              />
            ) : null
          )}
        </div>
      ) : null}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-ink" aria-hidden="true">
        {parts.map(part => (
          <li key={part.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${part.swatch}`} />
            <span className="tabular font-semibold text-ink">{part.value}</span> {part.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Figure({
  label,
  value,
  sub,
  to,
}: {
  label: string;
  value: number | string;
  sub?: string;
  to?: AdminSectionKey;
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-xs font-medium text-gray-ink">{label}</dt>
      <dd className="tabular mt-1 text-xl font-semibold tracking-[-0.01em] text-ink">{value}</dd>
      {sub ? (
        <dd className="mt-0.5 text-xs text-gray-ink">
          {to ? (
            <Link to="/admin" search={{ tab: to }} className="text-primary hover:underline">
              {sub}
            </Link>
          ) : (
            sub
          )}
        </dd>
      ) : null}
    </div>
  );
}

function RecentActivity({
  isLoading,
  error,
  entries,
}: {
  isLoading: boolean;
  error: Error | null;
  entries: AdminAuditLogEntry[];
}) {
  if (isLoading) {
    return (
      <div className="mt-4 space-y-3" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <p className="mt-4 text-sm text-error-ink">
        Couldn't load recent activity ({error.message}). The full log may still open.
      </p>
    );
  }
  if (entries.length === 0) {
    return (
      <p className="mt-4 text-sm text-gray-ink">
        No admin actions recorded yet. Approvals, moderation and account changes will appear here.
      </p>
    );
  }
  return (
    <ol className="mt-3 divide-y divide-border/70">
      {entries.map(entry => {
        const description = describeAuditEntry(entry);
        return (
          <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{description.summary}</p>
              <p className="mt-0.5 truncate text-xs text-gray-ink">
                {auditActor(entry)} · {dayLabel(entry.created_at)}, {formatTime(entry.created_at)}
              </p>
            </div>
            <StatusBadge status={description.status} label={description.label} />
          </li>
        );
      })}
    </ol>
  );
}
