import { Link } from '@tanstack/react-router';
import { ActivityFeedRow } from './ActivityFeedRow';
import { buttonClasses } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ErrorState } from '../../ui/ErrorState';
import { Icon } from '../../ui/Icon';
import { Skeleton } from '../../ui/Skeleton';
import type { ActivityEvent } from '../../../lib/types';

export function RecentActivityCard({
  events,
  isLoading,
  error,
}: {
  events?: ActivityEvent[];
  isLoading: boolean;
  error?: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">
          Recent activity
        </h2>
        <Link to="/landlord/activity" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          View all
          <Icon name="chevronRight" size={14} />
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-2 divide-y divide-border" aria-hidden="true">
          {[0, 1, 2, 3].map(index => (
            <div key={index} className="flex items-center justify-between gap-4 py-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-3">
          <ErrorState message={error} />
        </div>
      ) : !events || events.length === 0 ? (
        <div className="mt-4 rounded-xl bg-cream px-4 py-5">
          <p className="text-sm font-semibold text-ink">No activity yet</p>
          <p className="mt-1 text-sm text-gray-ink">
            New applications, payments, and tenancy changes will show up here.
          </p>
        </div>
      ) : (
        <ol className="mt-1 divide-y divide-border">
          {events.slice(0, 4).map(event => (
            <li key={event.id}>
              <ActivityFeedRow event={event} />
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
