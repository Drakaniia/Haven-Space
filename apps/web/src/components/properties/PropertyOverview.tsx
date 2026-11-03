import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { LandlordPropertyDetail } from '../../lib/types';
import { isFullProperty, listingStatusPill, listingStatusTone } from '../../lib/listing-status';
import { buttonClasses } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { formatPeso, moderationPill } from './PropertyCard';

/**
 * The detail page's Overview pane — the three cards from the reference design
 * (`landlord-property-detail-page` §3.1). Presentational only: the route owns
 * the queries and the mutations.
 */

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  'boarding-house': 'Boarding house',
  apartment: 'Apartment',
  dormitory: 'Dormitory',
};

export function propertyTypeLabel(type: string | null | undefined): string {
  const key = String(type ?? '').trim();
  return PROPERTY_TYPE_LABELS[key] ?? (key || 'Not specified');
}

export function locationLabel(
  city: string | null | undefined,
  province: string | null | undefined
): string {
  const parts = [city?.trim(), province?.trim()].filter(Boolean);
  return parts.join(', ') || 'No location yet';
}

export function amenitiesLabel(amenities: string[] | null | undefined): string {
  return amenities && amenities.length > 0 ? amenities.join(' · ') : 'None listed';
}

/**
 * Room-summary rollup (D14): `available = total − occupied`, the **same** numbers
 * the property cards show, so the card list and the detail page can never
 * disagree about a property's occupancy. Clamped at zero because a data glitch
 * should read `0`, never a negative count.
 */
export function availableRooms(
  totalRooms: number | null | undefined,
  occupiedRooms: number | null | undefined
): number {
  return Math.max(Number(totalRooms ?? 0) - Number(occupiedRooms ?? 0), 0);
}

/** The `Available rooms` / `Occupied rooms` tiles read `0` for a roomless property (D20). */
export function hasRooms(totalRooms: number | null | undefined): boolean {
  return Number(totalRooms ?? 0) > 0;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-ink">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl bg-cream px-4 py-3">
      <p className="text-xs font-medium text-gray-ink">{label}</p>
      <p className="mt-1 font-display text-[1.75rem] font-medium leading-none tracking-[-0.02em] text-ink tabular">
        {value}
      </p>
    </div>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">{children}</h2>
  );
}

export function PropertyDetailsCard({ detail }: { detail: LandlordPropertyDetail }) {
  return (
    <Card>
      <CardTitle>Property details</CardTitle>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Fact label="Property type">{propertyTypeLabel(detail.type)}</Fact>
        <Fact label="Location">{locationLabel(detail.city, detail.province)}</Fact>
      </dl>

      <div className="my-4 border-t border-border" />

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Fact label="Rooms">{Number(detail.total_rooms).toLocaleString()}</Fact>
        <Fact label="Status">
          {/* The same pill vocabulary the property cards use, so the list and the
              detail page never label one property two different ways (D-default §8 Q2).
              Occupancy rides beside it instead of replacing it (`edit-listing-property-info` D16). */}
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <StatusBadge
              status={listingStatusTone(detail.status, detail.listing_moderation_status)}
              label={listingStatusPill(detail.status, detail.listing_moderation_status).label}
            />
            {isFullProperty(detail.total_rooms, detail.occupied_rooms) ? (
              <StatusBadge status="full" label="Full" />
            ) : null}
          </span>
        </Fact>
      </dl>
    </Card>
  );
}

export function PublicListingCard({ detail }: { detail: LandlordPropertyDetail }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle>Public listing</CardTitle>
        <StatusBadge
          status={detail.listing_moderation_status}
          label={moderationPill(detail.listing_moderation_status).label}
        />
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Fact label="Monthly rent">
          <span className="font-display text-lg font-medium text-clay tabular">
            {formatPeso(detail.monthlyPayment)}
          </span>
        </Fact>
        <Fact label="Amenities">{amenitiesLabel(detail.amenities)}</Fact>
      </dl>

      {/*
        One control per destination (`edit-listing-property-info` D18): publishing
        and unpublishing live on the Edit listing form's Listing status section, so
        this card only offers the way there.
      */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <p className="text-sm text-gray-ink">Name, pricing, photos and publishing.</p>
        <Link
          to="/landlord/listings/$id/edit"
          params={{ id: String(detail.id) }}
          className={buttonClasses({ variant: 'outline' })}
        >
          Edit listing
        </Link>
      </div>
    </Card>
  );
}

export function RoomSummaryCard({ detail }: { detail: LandlordPropertyDetail }) {
  const populated = hasRooms(detail.total_rooms);
  const total = Number(detail.total_rooms ?? 0);
  const occupied = Math.min(Number(detail.occupied_rooms ?? 0), total);
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle>Room summary</CardTitle>
          <p className="mt-1 text-sm text-gray-ink">
            {populated
              ? `${rate}% occupied across ${total} ${total === 1 ? 'room' : 'rooms'}.`
              : 'Rooms are what boarders apply for.'}
          </p>
        </div>
        <Link
          to="/landlord/properties/$id/rooms"
          params={{ id: String(detail.id) }}
          className={buttonClasses({ variant: populated ? 'outline' : 'primary' })}
        >
          Manage rooms
        </Link>
      </div>

      {populated ? (
        <div
          role="progressbar"
          aria-label={`${detail.name} occupancy`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rate}
          className="mt-4 h-2 overflow-hidden rounded-full bg-subtle"
        >
          <div className="h-full rounded-full bg-primary-strong" style={{ width: `${rate}%` }} />
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <StatTile
          label="Available rooms"
          value={availableRooms(detail.total_rooms, detail.occupied_rooms)}
        />
        <StatTile label="Occupied rooms" value={Number(detail.occupied_rooms)} />
      </div>

      {populated ? null : (
        <p className="mt-3 text-sm text-gray-ink">
          No rooms yet — add your first room to start filling this property.
        </p>
      )}
    </Card>
  );
}
