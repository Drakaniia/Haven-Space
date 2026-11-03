import { Link } from '@tanstack/react-router';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { Skeleton } from '../../ui/Skeleton';

export interface ActionCenterCounts {
  applications: number | null;
  maintenance: number | null;
  rentDue: number | null;
  renewals: number | null;
}

const ROWS: {
  key: keyof ActionCenterCounts;
  label: string;
  action: string;
  to: string;
  chip: string;
}[] = [
  {
    key: 'applications',
    label: 'Pending applications',
    action: 'Review',
    to: '/landlord/applications',
    chip: 'bg-mint text-primary-dark',
  },
  {
    key: 'maintenance',
    label: 'Maintenance requests',
    action: 'Open',
    to: '/landlord/maintenance',
    chip: 'bg-warning-tint text-warning-ink',
  },
  {
    key: 'rentDue',
    label: 'Rent payments due soon',
    action: 'Remind',
    to: '/landlord/payments',
    chip: 'bg-warning-tint text-warning-ink',
  },
  {
    key: 'renewals',
    label: 'Lease renewals',
    action: 'Send offer',
    to: '/landlord/renewals',
    chip: 'bg-mint text-primary-dark',
  },
];

/**
 * The mockup's four counted actions (spec `landlord-dashboard-redesign` §6.3).
 *
 * Counts are live where the app has data; a `null` count means that source is
 * still loading or failed, and the row stays navigable (D7). The whole row is
 * the link, with an explicit accessible name that includes the count.
 */
export function ActionCenterCard({ counts }: { counts: ActionCenterCounts }) {
  return (
    <Card className="flex h-full flex-col">
      <h2 className="text-lg font-semibold tracking-tight text-ink">Action center</h2>

      <div className="mt-3">
        {ROWS.map((row, index) => {
          const count = counts[row.key];
          const accessible =
            count === null
              ? `${row.action} ${row.label.toLowerCase()}`
              : `${row.action} ${count} ${row.label.toLowerCase()}`;

          return (
            <Link
              key={row.key}
              to={row.to}
              aria-label={accessible}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                index < ROWS.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span
                className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold ${row.chip}`}
                aria-hidden="true"
              >
                {count ?? '—'}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium text-ink">{row.label}</span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-ink">
                {row.action}
                <Icon name="arrowRight" size={16} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-border px-3 pt-4 text-sm text-success-ink">
        <Icon name="check" size={16} />
        <span>No overdue payments</span>
      </div>
    </Card>
  );
}

export function ActionCenterCardSkeleton() {
  return (
    <Card className="flex h-full flex-col">
      <h2 className="text-lg font-semibold tracking-tight text-ink">Action center</h2>
      <div className="mt-4 space-y-3">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-auto border-t border-border px-3 pt-4">
        <Skeleton className="h-4 w-40" />
      </div>
    </Card>
  );
}
