import { Card } from '../../ui/Card';
import { Skeleton } from '../../ui/Skeleton';
import type { DashboardStatsResponse } from '../../../lib/types';

type DashboardStats = DashboardStatsResponse['data'];

function peso(value: number): string {
  return `₱${Number(value).toLocaleString()}`;
}

/**
 * Supporting context for the Action Center (spec `landlord-dashboard-redesign`
 * §7.2): how full the houses are and what came in this month.
 *
 * One card with a clear lead figure rather than four equal tiles — occupancy is
 * the number a small landlord steers by, so it gets the size; rent collected
 * sits beneath it. Payment alerts live in the Action Center now, where they are
 * something to act on rather than a statistic. Only the API's own numbers are
 * shown: the month-on-month change appears when the API reports one, never a
 * made-up delta.
 */
export function DashboardStatCards({ data }: { data: DashboardStats }) {
  const { occupancy, revenue } = data;
  const vacant = Math.max(occupancy.total_rooms - occupancy.occupied_rooms, 0);
  const rate = Math.min(Math.max(occupancy.rate, 0), 100);
  const trend = Number(revenue.trend ?? 0);

  return (
    <Card padding="p-0" className="flex h-full flex-col">
      <section aria-labelledby="snapshot-occupancy" className="px-5 pb-5 pt-5">
        <p id="snapshot-occupancy" className="kicker">
          Occupancy
        </p>
        <div className="mt-2 flex items-baseline gap-3">
          <p className="font-display text-[2.75rem] font-medium leading-none tracking-[-0.03em] text-ink tabular">
            {`${occupancy.rate.toFixed(0)}%`}
          </p>
          <p className="text-sm text-gray-ink">of rooms filled</p>
        </div>
        <div
          role="progressbar"
          aria-label="Occupancy"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(occupancy.rate)}
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-subtle"
        >
          <div className="h-full rounded-full bg-primary-strong" style={{ width: `${rate}%` }} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-cream px-3 py-2.5">
            <dt className="text-gray-ink">Occupied</dt>
            <dd className="mt-0.5 font-semibold text-ink tabular">
              {`${occupancy.occupied_rooms} of ${occupancy.total_rooms} rooms`}
            </dd>
          </div>
          <div className="rounded-xl bg-cream px-3 py-2.5">
            <dt className="text-gray-ink">Vacant</dt>
            <dd className="mt-0.5 font-semibold text-ink tabular">
              {`${vacant} ${vacant === 1 ? 'room' : 'rooms'}`}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="snapshot-revenue"
        className="mt-auto border-t border-border px-5 pb-5 pt-4"
      >
        <p id="snapshot-revenue" className="text-sm font-semibold text-gray-ink">
          Rent collected this month
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-display text-[1.75rem] font-medium leading-tight tracking-[-0.02em] text-ink tabular">
            {peso(revenue.monthly)}
          </p>
          {trend !== 0 ? (
            <p className={`text-sm font-semibold ${trend > 0 ? 'text-success-ink' : 'text-error-ink'}`}>
              {`${trend > 0 ? '▲' : '▼'} ${Math.abs(trend)}% vs last month`}
            </p>
          ) : null}
        </div>
      </section>
    </Card>
  );
}

/** Same silhouette as the loaded card, so the page does not jump on resolve. */
export function DashboardStatCardsSkeleton() {
  return (
    <Card padding="p-0" className="flex h-full flex-col" >
      <div className="space-y-3 px-5 pb-5 pt-5" aria-hidden="true">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      </div>
      <div className="mt-auto space-y-2 border-t border-border px-5 pb-5 pt-4" aria-hidden="true">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-32" />
      </div>
    </Card>
  );
}
