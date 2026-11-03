import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { AdminPropertyRow, LandlordProperty } from '../../lib/types';
import { listingStatusPill } from '../../lib/listing-status';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';

/**
 * Property card list — the picture-matched layout from
 * `landlord-properties-card-layout-spec.md` (short name
 * `landlord-properties-card-layout`). One wide card per property: thumbnail and
 * status pill on the left, title, address and a five-chip fact row on the right.
 *
 * The card is presentational; the pure helpers below are what the surfaces and
 * the tests share, so the chip vocabulary has exactly one definition.
 *
 * The landlord card is a **pure entry point** now
 * (`landlord-property-detail-page` D3/D13/R1/R15): it opens the property detail
 * page and carries no inline rooms accordion or overflow menu. Admin still uses
 * the `rooms` slot for its read-only per-room inspector, which is why that prop
 * survives here while the landlord caller stopped passing it.
 */

export interface CardPill {
  label: string;
  /** Tailwind background class for the pill's status dot. */
  dot: string;
}

export interface PropertyFact {
  icon: string;
  label: string;
}

const DOT_SUCCESS = 'bg-success';
const DOT_WARNING = 'bg-warning';
const DOT_ERROR = 'bg-error';
const DOT_NEUTRAL = 'bg-muted';

export function formatPeso(value: number): string {
  return `₱${Number(value).toLocaleString()}`;
}

export function formatCardDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

/** R8/D19 — zero-room properties say so instead of "0 of 0 rooms occupied". */
export function occupancyLabel(occupied: number, total: number): string {
  if (total <= 0) return 'No rooms yet';
  return `${occupied} of ${total} room${total === 1 ? '' : 's'} occupied`;
}

export function roomsLabel(total: number): string {
  return `${total} room${total === 1 ? '' : 's'}`;
}

export function propertyAddress(parts: {
  address?: string | null;
  city?: string | null;
  province?: string | null;
}): string {
  const city = parts.city?.trim() ?? '';
  const province = parts.province?.trim() ?? '';
  const tail = city && province && province !== city ? `${city}, ${province}` : city || province;

  return [parts.address?.trim(), tail].filter(Boolean).join(', ') || 'No address yet';
}

/**
 * Landlord surfaces lead with the listing's own status (D7).
 *
 * The words come from the shared helper (`edit-listing-property-info` D15), so the
 * card can never say “Available” while the edit form says something else. An
 * all-rooms-occupied property no longer loses its status to a derived `Full` —
 * that rides beside it as its own badge (D16).
 */
export function listingPill(status: string, moderation?: string | null): CardPill {
  const pill = listingStatusPill(status, moderation);

  return { label: pill.label, dot: pill.tone === 'published' ? DOT_SUCCESS : DOT_NEUTRAL };
}

/** Admin surfaces lead with moderation status (D7). */
export function moderationPill(status: string): CardPill {
  if (status === 'published') return { label: 'Published', dot: DOT_SUCCESS };
  if (status === 'pending_review') return { label: 'Pending review', dot: DOT_WARNING };
  if (status === 'rejected') return { label: 'Rejected', dot: DOT_ERROR };
  if (status === 'flagged') return { label: 'Flagged', dot: DOT_ERROR };
  return { label: status.replaceAll('_', ' '), dot: DOT_NEUTRAL };
}

/** D18/D30 — Rooms · Occupancy · Rent · Revenue · Date, in the picture's slots. */
export function landlordFacts(property: LandlordProperty): PropertyFact[] {
  return [
    { icon: 'list', label: roomsLabel(property.total_rooms) },
    { icon: 'users', label: occupancyLabel(property.occupied_rooms, property.total_rooms) },
    { icon: 'currencyDollar', label: `${formatPeso(property.price)}/mo` },
    { icon: 'chartBar', label: formatPeso(property.monthly_revenue) },
    { icon: 'calendarDays', label: formatCardDate(property.created_at) },
  ];
}

export function adminFacts(property: AdminPropertyRow): PropertyFact[] {
  const totalRooms = Number(property.rooms_count ?? 0);

  return [
    { icon: 'list', label: roomsLabel(totalRooms) },
    {
      icon: 'users',
      label: occupancyLabel(Number(property.occupied_rooms ?? 0), totalRooms),
    },
    { icon: 'currencyDollar', label: `${formatPeso(Number(property.price))}/mo` },
    { icon: 'chartBar', label: formatPeso(Number(property.monthly_revenue ?? 0)) },
    { icon: 'calendarDays', label: formatCardDate(property.created_at) },
  ];
}

/** Status pill that floats on the photo: a dot plus the word, never colour alone. */
function PhotoPill({ pill }: { pill: CardPill }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface/92 px-2 py-0.5 text-xs font-semibold text-ink shadow-card">
      <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} aria-hidden="true" />
      {pill.label}
    </span>
  );
}

function CardPhoto({ imageUrl, className }: { imageUrl?: string | null; className: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden bg-mint ${className}`}>
      {imageUrl ? (
        <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-primary"
        >
          <Icon name="buildingOffice" size={28} />
          <span className="text-xs font-medium text-primary-dark">No photo yet</span>
        </span>
      )}
    </div>
  );
}

/**
 * Photo-led tile for the landlord's own grid. The photo carries the status; the
 * body leads with name and address, then how full the house is (a bar, not just
 * a sentence), then the remaining facts in a compact two-column list.
 */
function PropertyTile({
  title,
  propertyId,
  imageUrl,
  pill,
  badge,
  address,
  facts,
  note,
  occupancy,
}: {
  title: string;
  propertyId?: number;
  imageUrl?: string | null;
  pill: CardPill;
  badge?: string;
  address: string;
  facts: PropertyFact[];
  note?: string;
  occupancy?: { occupied: number; total: number };
}) {
  const total = Math.max(Number(occupancy?.total ?? 0), 0);
  const occupied = Math.max(Number(occupancy?.occupied ?? 0), 0);
  const ratio = total > 0 ? Math.min(occupied / total, 1) : 0;
  // The occupancy fact is drawn as the bar; the rest stay as a list.
  const listed = facts.filter(fact => fact.icon !== 'users');
  const occupancyFact = facts.find(fact => fact.icon === 'users');

  return (
    <li className="press-card relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card focus-within:ring-2 focus-within:ring-primary/30">
      <div className="relative">
        <CardPhoto imageUrl={imageUrl} className="aspect-[16/10] w-full" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <PhotoPill pill={pill} />
          {badge ? (
            <span className="rounded-md bg-warning-tint px-2 py-0.5 text-xs font-semibold text-warning-ink shadow-card">
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-display text-lg font-medium leading-snug tracking-[-0.01em] text-ink">
            {propertyId ? (
              <Link
                to="/landlord/properties/$id"
                params={{ id: String(propertyId) }}
                className="after:absolute after:inset-0 hover:text-primary focus-visible:outline-none"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-ink">
            <Icon name="pin" size={14} className="shrink-0" />
            <span className="truncate">{address}</span>
          </p>
        </div>

        {occupancyFact ? (
          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-ink">{occupancyFact.label}</span>
              {total > 0 ? (
                <span className="text-gray-ink tabular">{Math.round(ratio * 100)}%</span>
              ) : null}
            </div>
            <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full rounded-full bg-primary-strong"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        <ul
          aria-label={`Facts for ${title}`}
          className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs text-gray-ink"
        >
          {listed.map(fact => (
            <li key={fact.label} className="flex min-w-0 items-center gap-1.5">
              <Icon name={fact.icon} size={13} className="shrink-0 text-muted" />
              <span className="truncate tabular">{fact.label}</span>
            </li>
          ))}
        </ul>

        {note ? <p className="text-xs text-muted">{note}</p> : null}
      </div>
    </li>
  );
}

export function PropertyCard({
  title,
  propertyId,
  imageUrl,
  pill,
  badge,
  address,
  facts,
  note,
  actions,
  selection,
  rooms,
  layout = 'row',
  occupancy,
}: {
  /** `row` (default) is the wide admin moderation card; `tile` is the landlord grid. */
  layout?: 'row' | 'tile';
  /** Tile only: draws the occupancy fact as a bar. */
  occupancy?: { occupied: number; total: number };
  title: string;
  /** Landlord surfaces only: makes the title the card's stretched link (D13).
      Points at the property **detail** page, not the edit form (D3/R1). */
  propertyId?: number;
  imageUrl?: string | null;
  pill: CardPill;
  /** A derived fact beside the status — today only the all-rooms-occupied
      “Full” (`edit-listing-property-info` D16). Never replaces the status. */
  badge?: string;
  address: string;
  facts: PropertyFact[];
  /** Muted trailing detail — "Shared access" (D17), or the landlord's name on admin. */
  note?: string;
  actions?: ReactNode;
  selection?: { checked: boolean; onChange: (checked: boolean) => void; label: string };
  rooms?: { id: string; open: boolean; onToggle: () => void; content: ReactNode };
}) {
  if (layout === 'tile') {
    return (
      <PropertyTile
        title={title}
        propertyId={propertyId}
        imageUrl={imageUrl}
        pill={pill}
        badge={badge}
        address={address}
        facts={facts}
        note={note}
        occupancy={occupancy}
      />
    );
  }

  return (
    <li className="press-card relative rounded-2xl border border-border/80 bg-surface shadow-card focus-within:ring-2 focus-within:ring-primary/30">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:gap-4 sm:p-4">
        <div className="relative shrink-0">
          <CardPhoto
            imageUrl={imageUrl}
            className="h-40 w-full rounded-xl sm:h-[112px] sm:w-[136px]"
          />
          <span className="absolute left-2 top-2">
            <PhotoPill pill={pill} />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-display text-[1.0625rem] font-medium leading-snug text-ink">
                {propertyId ? (
                  // Stretched link: the card is clickable, the controls below sit
                  // above this layer (R14/D13).
                  <Link
                    to="/landlord/properties/$id"
                    params={{ id: String(propertyId) }}
                    className="after:absolute after:inset-0 hover:text-primary focus-visible:outline-none"
                  >
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </h3>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-gray-ink">
                <Icon name="pin" size={14} className="shrink-0" />
                <span className="truncate">{address}</span>
              </p>
            </div>
            {badge ? (
              <span className="inline-flex shrink-0 items-center rounded-md bg-warning-tint px-2 py-0.5 text-xs font-semibold text-warning-ink">
                {badge}
              </span>
            ) : null}
            {selection ? (
              <label className="relative z-10 inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-ink">
                <input
                  type="checkbox"
                  checked={selection.checked}
                  aria-label={selection.label}
                  onChange={event => selection.onChange(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Select
              </label>
            ) : null}
          </div>

          <ul aria-label={`Facts for ${title}`} className="flex flex-wrap gap-2">
            {facts.map(fact => (
              <li
                key={fact.label}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cream px-2.5 py-1 text-xs text-gray-ink tabular"
              >
                <Icon name={fact.icon} size={13} className="shrink-0 text-muted" />
                {fact.label}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted">{note}</span>
            <div className="relative z-10 flex flex-wrap items-center gap-2">
              {actions}
              {rooms ? (
                <button
                  type="button"
                  aria-expanded={rooms.open}
                  aria-controls={rooms.id}
                  onClick={rooms.onToggle}
                  className="flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-gray-ink transition-[background-color,transform] hover:bg-subtle active:scale-[0.97] motion-reduce:transition-none"
                >
                  <Icon
                    name="chevronDown"
                    size={13}
                    className={`transition-transform duration-150 ease-settle ${
                      rooms.open ? 'rotate-0' : '-rotate-90'
                    } motion-reduce:transition-none`}
                  />
                  Rooms
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {rooms && rooms.open ? (
        // Above the stretched link, so the room manager stays clickable (R15).
        <div id={rooms.id} className="relative z-10 border-t border-border px-4 pb-4">
          {rooms.content}
        </div>
      ) : null}
    </li>
  );
}

const TILE_GRID = 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3';

/** Independent toggles, collapsed by default (D12). `tile` lays the cards out as a grid. */
export function PropertyCardList({
  children,
  layout = 'row',
}: {
  children: ReactNode;
  layout?: 'row' | 'tile';
}) {
  return <ul className={layout === 'tile' ? TILE_GRID : 'flex flex-col gap-3'}>{children}</ul>;
}

/** Loading state (D26) — same footprint as a real card, so nothing jumps. */
export function PropertyCardSkeletonList({
  count = 4,
  layout = 'row',
}: {
  count?: number;
  layout?: 'row' | 'tile';
}) {
  if (layout === 'tile') {
    return (
      <ul className={TILE_GRID} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <li
            key={index}
            className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card"
          >
            <Skeleton className="aspect-[16/10] w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-1.5 w-full rounded-full" />
              <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                {Array.from({ length: 4 }, (_, chip) => (
                  <Skeleton key={chip} className="h-3 w-20" />
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className="rounded-2xl border border-border bg-surface p-3 shadow-card sm:p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Skeleton className="h-40 w-full rounded-xl sm:h-[104px] sm:w-[104px]" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }, (_, chip) => (
                  <Skeleton key={chip} className="h-7 w-24 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
