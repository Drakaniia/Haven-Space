import { Link } from '@tanstack/react-router';
import { Button, buttonClasses } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { Skeleton } from '../../ui/Skeleton';
import { StatusBadge } from '../../ui/StatusBadge';
import type { LandlordProperty } from '../../../lib/types';

function PropertyRow({ property }: { property: LandlordProperty }) {
  const total = Number(property.total_rooms ?? 0);
  const occupied = Number(property.occupied_rooms ?? 0);
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const low = total > 0 && rate < 50;

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-ink" title={property.name}>
          {property.name}
        </p>
        <p className="shrink-0 text-sm text-gray-ink">
          {occupied} / {total} occupied{low ? ' ·' : ''}
          {low ? (
            <span className="ml-1.5">
              <StatusBadge status="low" label="low" />
            </span>
          ) : null}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`${property.name} occupancy: ${rate}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rate}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-subtle"
      >
        <div className="h-full rounded-full bg-primary-strong" style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

export function MyPropertiesCard({
  properties,
  isLoading,
  error,
  onRetry,
}: {
  properties?: LandlordProperty[];
  isLoading: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">My properties</h2>
        <Link
          to="/landlord/properties"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          Manage
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-4">
          {[0, 1, 2].map(index => (
            <div key={index} className="space-y-2 py-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-3">
          <ErrorState
            message={error}
            action={
              onRetry ? (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  Try again
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : !properties || properties.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon="buildingOffice"
            title="No properties yet"
            description="Create your first listing to see occupancy here."
            action={
              <Link to="/landlord/listings/create" className={buttonClasses()}>
                Create a listing
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-1 divide-y divide-border">
          {properties.map(property => (
            <PropertyRow key={property.id} property={property} />
          ))}
        </div>
      )}
    </Card>
  );
}
