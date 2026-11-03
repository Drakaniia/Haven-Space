import { Link } from '@tanstack/react-router';
import { Button, buttonClasses } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { Icon } from '../../ui/Icon';
import { Skeleton } from '../../ui/Skeleton';
import { StatusBadge } from '../../ui/StatusBadge';
import type { LandlordProperty } from '../../../lib/types';

/** One property: thumbnail, name, how full it is, and a quiet low-occupancy flag. */
function PropertyRow({ property }: { property: LandlordProperty }) {
  const total = Number(property.total_rooms ?? 0);
  const occupied = Number(property.occupied_rooms ?? 0);
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const low = total > 0 && rate < 50;
  const photo = property.photos?.[0];

  return (
    <li className="relative flex items-center gap-3 py-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mint text-primary">
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon name="buildingOffice" size={20} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/landlord/properties/$id"
            params={{ id: String(property.id) }}
            title={property.name}
            className="min-w-0 truncate text-sm font-semibold text-ink after:absolute after:inset-0 hover:text-primary"
          >
            {property.name}
          </Link>
          <p className="flex shrink-0 items-center gap-1.5 text-xs text-gray-ink tabular">
            {total > 0 ? `${occupied} / ${total} occupied` : 'No rooms yet'}
            {low ? <StatusBadge status="low" label="low" /> : null}
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
          <div
            className={`h-full rounded-full ${low ? 'bg-warning' : 'bg-primary-strong'}`}
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>
    </li>
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
        <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">
          Your properties
        </h2>
        <Link to="/landlord/properties" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          Manage
          <Icon name="chevronRight" size={14} />
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-2 divide-y divide-border" aria-hidden="true">
          {[0, 1, 2].map(index => (
            <div key={index} className="flex items-center gap-3 py-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
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
        <ul className="mt-1 divide-y divide-border">
          {properties.map(property => (
            <PropertyRow key={property.id} property={property} />
          ))}
        </ul>
      )}
    </Card>
  );
}
