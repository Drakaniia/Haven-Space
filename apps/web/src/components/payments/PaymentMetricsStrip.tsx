import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { formatPeso, type MonitorMetrics } from '../../lib/payments';

/**
 * The page's four figures (spec `landlord-payments-monitoring` §6).
 *
 * One card with four cells, not four cards: the reference keeps this as a quiet
 * strip above the table. Read-only on purpose — the Status control already
 * filters, and a clickable strip would duplicate it (A4).
 */
export function PaymentMetricsStrip({
  metrics,
  loading,
}: {
  metrics: MonitorMetrics;
  loading: boolean;
}) {
  const cells: Array<{ label: string; value: string; tone: string }> = [
    { label: 'Tenants', value: String(metrics.tenants), tone: 'text-ink' },
    { label: 'Expected', value: formatPeso(metrics.expected), tone: 'text-ink' },
    { label: 'Paid', value: formatPeso(metrics.paid), tone: 'text-success-ink' },
    { label: 'Needs attention', value: String(metrics.needsAttention), tone: 'text-error-ink' },
  ];

  return (
    <Card padding="p-0" className="overflow-hidden">
      <section aria-label="Payment summary">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {cells.map((cell, index) => (
            <div
              key={cell.label}
              className={`border-border px-5 py-4 ${index % 2 === 1 ? 'border-l' : ''} ${
                index === 2 ? 'border-t lg:border-l lg:border-t-0' : ''
              } ${index === 3 ? 'border-t lg:border-t-0' : ''}`}
            >
              <dt className="text-sm text-gray-ink">{cell.label}</dt>
              <dd className={`mt-1 text-2xl font-bold tracking-tight ${cell.tone}`}>
                {loading ? <Skeleton className="h-7 w-20" /> : cell.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </Card>
  );
}
