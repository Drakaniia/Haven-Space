import { Link } from '@tanstack/react-router';
import { ActivityFeedRow } from './ActivityFeedRow';
import { Card } from '../../ui/Card';
import { ErrorState } from '../../ui/ErrorState';
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
        <h2 className="text-lg font-semibold tracking-tight text-ink">Recent activity</h2>
        <Link
          to="/landlord/activity"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          View all
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-2 divide-y divide-border">
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
        <div className="mt-4">
          <p className="text-sm font-medium text-ink">No activity yet</p>
          <p className="mt-1 text-sm text-gray-ink">
            New applications, payments, and tenancy changes will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-1 divide-y divide-border">
          {events.slice(0, 4).map(event => (
            <ActivityFeedRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </Card>
  );
}
