import type { ReactNode } from 'react';
import type { ListingDetail, RoomDetail } from '../../lib/types';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { cleanRoomType, formatPrice, freeSlotsLabel } from './detail-helpers';

/**
 * Shared framing for the boarder booking journey (tour request, application,
 * confirmation): where the boarder is in the flow, and what they are acting on.
 */

const PLACEHOLDER_IMAGE = '/assets/images/placeholder-room.svg';

export interface FlowStep {
  label: string;
}

/**
 * A quiet, numbered step indicator. `current` is the zero-based active step;
 * earlier steps read as done. Announced as an ordered list with the current
 * step marked, so it is useful to a screen reader too.
 */
export function FlowSteps({ steps, current }: { steps: FlowStep[]; current: number }) {
  return (
    <ol aria-label="Progress" className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step.label}
            aria-current={active ? 'step' : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={`tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? 'bg-primary-strong text-white'
                  : active
                  ? 'border-2 border-primary text-primary'
                  : 'border border-border-strong text-muted'
              }`}
            >
              {done ? <Icon name="check" size={12} /> : index + 1}
            </span>
            <span className={active ? 'font-semibold text-ink' : done ? 'text-gray-ink' : 'text-muted'}>
              {step.label}
              {done ? <span className="sr-only"> (done)</span> : null}
            </span>
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="mx-1 h-px w-6 bg-border-strong sm:w-10" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** The listing (and chosen room, if any) the boarder is acting on. */
export function ListingSummary({
  listing,
  room,
  children,
}: {
  listing: ListingDetail;
  room?: RoomDetail | null;
  children?: ReactNode;
}) {
  const address = [listing.address, listing.city, listing.province].filter(Boolean).join(', ');
  const verified = listing.badges.some(badge => badge.toLowerCase() === 'verified');

  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="aspect-[16/9] w-full overflow-hidden bg-subtle">
        {listing.coverImage || listing.images[0] ? (
          <img
            src={listing.coverImage || listing.images[0]}
            alt=""
            className="h-full w-full object-cover"
            onError={e => {
              e.currentTarget.src = PLACEHOLDER_IMAGE;
            }}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted">
            <Icon name="photo" size={24} />
          </span>
        )}
      </div>
      <div className="p-5">
        {verified ? (
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-primary">
            <Icon name="shieldCheck" size={13} />
            Verified property
          </p>
        ) : null}
        <h2 className="font-display text-xl font-medium leading-snug text-ink">{listing.title}</h2>
        {address ? (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-ink">
            <Icon name="location" size={15} className="mt-0.5 shrink-0 text-primary" />
            {address}
          </p>
        ) : null}
        <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border pt-4">
          <span className="min-w-0 text-sm text-gray-ink">
            {room ? (
              <>
                <span className="font-medium text-ink">
                  {cleanRoomType(room)}
                  {room.roomNumber ? ` · ${room.roomNumber}` : ''}
                </span>
                <span className="block text-xs">{freeSlotsLabel(room)}</span>
              </>
            ) : (
              'Rent from'
            )}
          </span>
          <span className="flex shrink-0 items-baseline gap-1">
            <span className="tabular font-display text-2xl font-medium leading-none text-clay">
              {formatPrice(room?.price ?? listing.price)}
            </span>
            <span className="text-xs text-gray-ink">/ month</span>
          </span>
        </div>
        {children}
      </div>
    </Card>
  );
}

/** Loading state for a listing page or flow, shaped like the real layout. */
export function RoomDetailSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-6 h-10 w-3/4 max-w-xl" />
      <Skeleton className="mt-3 h-4 w-1/2 max-w-sm" />
      <Skeleton className="mt-6 aspect-[4/3] w-full rounded-2xl sm:aspect-[16/9] lg:aspect-[2/1]" />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="hidden h-80 w-full rounded-2xl lg:block" />
      </div>
    </div>
  );
}

/** Loading state for the two-column apply / tour forms. */
export function FlowSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}
