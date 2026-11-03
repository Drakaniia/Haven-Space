import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { Skeleton } from '../../ui/Skeleton';
import type { DashboardStatsResponse } from '../../../lib/types';

type DashboardStats = DashboardStatsResponse['data'];

function StatCard({
  label,
  value,
  sub,
  icon,
  children,
  link,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  children?: ReactNode;
  /** Optional action word under the sub-line — a destination, not a change. */
  link?: ReactNode;
}) {
  return (
    <Card className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint text-primary">
        <Icon name={icon} size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-ink">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{value}</p>
        {sub ? <p className="mt-1 text-sm text-gray-ink">{sub}</p> : null}
        {children}
        {link ? <div className="mt-2">{link}</div> : null}
      </div>
    </Card>
  );
}

/**
 * The four live metric cards (spec `landlord-dashboard-redesign` §7.2).
 *
 * Values stay on `dashboard-stats`; only the occupancy sub-line gains the
 * vacancy count and bar the mockup shows. The renewals card has no link and the
 * payment card keeps its tracker link (D28).
 */
export function DashboardStatCards({ data }: { data: DashboardStats }) {
  const { occupancy, revenue, renewals, payment_alerts: alerts } = data;
  const vacant = Math.max(occupancy.total_rooms - occupancy.occupied_rooms, 0);
  const alertsTotal = alerts.due_today + alerts.in_grace + alerts.overdue;
  const trend =
    revenue.trend === 0
      ? '0% vs last month'
      : `${revenue.trend > 0 ? '▲' : '▼'} ${Math.abs(revenue.trend)}% vs last month`;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Occupancy"
        value={`${occupancy.rate.toFixed(0)}%`}
        sub={`${occupancy.occupied_rooms} of ${occupancy.total_rooms} rooms · ${vacant} vacant`}
        icon="analytics"
      >
        <div
          role="progressbar"
          aria-label="Occupancy"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(occupancy.rate)}
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-subtle"
        >
          <div
            className="h-full rounded-full bg-primary-strong"
            style={{ width: `${Math.min(Math.max(occupancy.rate, 0), 100)}%` }}
          />
        </div>
      </StatCard>

      <StatCard
        label="Monthly revenue"
        value={`₱${revenue.monthly.toLocaleString()}`}
        sub={trend}
        icon="payment"
      />

      <StatCard
        label="Upcoming renewals"
        value={String(renewals.upcoming_count)}
        sub={renewals.period}
        icon="calendar"
      />

      <StatCard
        label="Payment alerts"
        value={String(alertsTotal)}
        sub={`${alerts.due_today} due today · ${alerts.in_grace} in grace · ${alerts.overdue} overdue`}
        icon="flag"
        link={
          <Link
            to="/landlord/payments"
            className="inline-flex text-sm font-semibold text-primary underline"
          >
            Open tracker
          </Link>
        }
      />
    </div>
  );
}

/** Same silhouette as the loaded grid, so the page does not jump on resolve. */
export function DashboardStatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map(index => (
        <Card key={index} className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        </Card>
      ))}
    </div>
  );
}
