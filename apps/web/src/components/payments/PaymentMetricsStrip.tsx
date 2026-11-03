import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { formatPeso, type MonitorMetrics } from '../../lib/payments';

/**
 * The page's four figures (spec `landlord-payments-monitoring` §6).
 *
 * One card with four cells, not four cards: a quiet ledger strip above the
 * table. Each figure carries a one-line meaning so nobody has to guess what
 * "Expected" counts. Read-only on purpose — the Status control already filters,
 * and a clickable strip would duplicate it (A4).
 *
 * The collected bar is derived from the same two numbers it sits under
 * (paid ÷ paid + expected), never a separate source.
 */
export function PaymentMetricsStrip({
  metrics,
  loading,
}: {
  metrics: MonitorMetrics;
  loading: boolean;
}) {
  const billed = metrics.paid + metrics.expected;
  const collectedShare = billed > 0 ? Math.round((metrics.paid / billed) * 100) : 0;
  const attention = metrics.needsAttention;

  const cells: Array<{ label: string; value: string; tone: string; meaning: string }> = [
    {
      label: 'Tenants',
      value: String(metrics.tenants),
      tone: 'text-ink',
      meaning: 'Listed in the table below',
    },
    {
      label: 'Expected',
      value: formatPeso(metrics.expected),
      tone: 'text-ink',
      meaning: 'Rent not yet settled',
    },
    {
      label: 'Paid',
      value: formatPeso(metrics.paid),
      tone: 'text-success-ink',
      meaning: billed > 0 ? `${collectedShare}% of billed rent collected` : 'Nothing billed yet',
    },
    {
      label: 'Needs attention',
      value: String(attention),
      tone: attention > 0 ? 'text-error-ink' : 'text-ink',
      meaning: attention > 0 ? 'Late, in grace, or waiting on you' : 'Everyone is on track',
    },
  ];

  return (
    <Card padding="p-0" className="overflow-hidden">
      <section aria-label="Payment summary">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {cells.map((cell, index) => (
            <div
              key={cell.label}
              className={`flex flex-col border-border px-4 py-4 sm:px-5 ${
                index % 2 === 1 ? 'border-l' : ''
              } ${index === 2 ? 'border-t lg:border-l lg:border-t-0' : ''} ${
                index === 3 ? 'border-t lg:border-t-0' : ''
              }`}
            >
              <dt className="text-sm font-medium text-gray-ink">{cell.label}</dt>
              <dd
                className={`mt-1.5 font-display text-[1.5rem] font-medium leading-none tracking-[-0.02em] tabular sm:text-[1.75rem] ${cell.tone}`}
              >
                {loading ? <Skeleton className="h-7 w-24" /> : cell.value}
              </dd>
              <dd className="mt-2 text-xs leading-snug text-muted">
                {loading ? <Skeleton className="h-3 w-28" /> : cell.meaning}
              </dd>
              {cell.label === 'Paid' && !loading && billed > 0 ? (
                <dd className="mt-2.5">
                  <span
                    role="presentation"
                    className="block h-1.5 w-full overflow-hidden rounded-full bg-subtle"
                  >
                    <span
                      className="block h-full rounded-full bg-success transition-[width] duration-300 ease-out motion-reduce:transition-none"
                      style={{ width: `${collectedShare}%` }}
                    />
                  </span>
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      </section>
    </Card>
  );
}
