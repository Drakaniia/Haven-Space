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
    <Card className="mb-4" padding="p-0">
      <dl className="grid grid-cols-3">
        <Figure label="Due this month" value={labels.due} />
        <Figure label="Collected" value={labels.collected} tone="text-success-ink" divided />
        <Figure
          label="Overdue"
          value={labels.overdue}
          tone={summary.overdue_count > 0 ? 'text-error-ink' : undefined}
          divided
        />
      </dl>

      {truncated ? (
        <p className="border-t border-warning-border bg-warning-tint px-4 py-2.5 text-xs text-warning-ink sm:px-5">
          Showing {shown} of {total} events this month. Narrow the property filter to see the rest.
        </p>
      ) : null}

      {total === 0 ? (
        <p className="border-t border-border px-4 py-2.5 text-sm text-gray-ink sm:px-5">
          Nothing scheduled this month.
        </p>
      ) : null}
    </Card>
  );
}

function Figure({
  label,
  value,
  tone,
  divided = false,
}: {
  label: string;
  value: string;
  tone?: string;
  divided?: boolean;
}) {
  return (
    <div className={`min-w-0 px-4 py-3.5 sm:px-5 ${divided ? 'border-l border-border' : ''}`}>
      <dt className="truncate text-xs font-medium text-gray-ink">{label}</dt>
      <dd
        className={`mt-1 truncate font-display text-lg font-medium tracking-[-0.015em] tabular sm:text-xl ${
          tone ?? 'text-ink'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/** The strip's first-load placeholder — the same silhouette, no numbers (D22). */
export function CalendarMonthSummarySkeleton() {
  return (
    <Card className="mb-4" padding="p-0">
      <div className="grid grid-cols-3">
        {[0, 1, 2].map(index => (
          <div
            key={index}
            className={`px-4 py-3.5 sm:px-5 ${index > 0 ? 'border-l border-border' : ''}`}
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-5 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}
