import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { monthSummaryLabel } from './calendar-helpers';
import type { CalendarSummary } from '../../lib/types';

/**
 * The month strip (spec `landlord-calendar` §7.6/D27): the visible month's money
 * at a glance, the payload-cap notice, and the "nothing scheduled" line for a
 * month with no events.
 *
 * The figures are the API's own sums — the client never adds money up, so the
 * strip and the ledger cannot drift apart.
 */
export function CalendarMonthSummary({
  summary,
  shown,
  total,
  truncated,
}: {
  summary: CalendarSummary;
  /** How many events this window actually returned. */
  shown: number;
  /** The window's pre-cap total, which differs only when `truncated`. */
  total: number;
  truncated: boolean;
}) {
  const labels = monthSummaryLabel(summary);

  return (
    <Card className="mb-4" padding="p-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <Figure label="Due this month" value={labels.due} />
        <Figure label="Collected" value={labels.collected} />
        <Figure
          label="Overdue"
          value={labels.overdue}
          tone={summary.overdue_count > 0 ? 'text-error-ink' : undefined}
        />
      </div>

      {truncated ? (
        <p className="mt-3 rounded-xl border border-warning-border bg-warning-tint p-2.5 text-xs text-warning-ink">
          Showing {shown} of {total} events this month. Narrow the property filter to see the rest.
        </p>
      ) : null}

      {total === 0 ? (
        <p className="mt-3 text-sm text-gray-ink">Nothing scheduled this month.</p>
      ) : null}
    </Card>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-ink">{label}</p>
      <p className={`text-lg font-bold tracking-tight ${tone ?? 'text-ink'}`}>{value}</p>
    </div>
  );
}

/** The strip's first-load placeholder — the same silhouette, no numbers (D22). */
export function CalendarMonthSummarySkeleton() {
  return (
    <Card className="mb-4" padding="p-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {[0, 1, 2].map(index => (
          <div key={index}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1.5 h-5 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}
