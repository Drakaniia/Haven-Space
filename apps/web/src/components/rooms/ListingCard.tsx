import { Link } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth-context';
import { BROWSE_LISTINGS_PATH, loginRedirectPath } from '../../lib/routes';
import type { PublicProperty } from '../../lib/types';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import { SaveButton } from './SaveButton';

/**
 * The public browse card for one boarding house (`/find-a-room`).
 *
 * Photo-led with a fixed 4:3 frame so a grid of mixed uploads still lines up;
 * the monthly price is the card's one clay moment. The title is a stretched
 * link, so the whole card is a target while the save control on the photo stays
 * its own button.
 */

export const LISTING_PLACEHOLDER_IMAGE = '/assets/images/placeholder-room.svg';

/** Peso amount for a card or summary, e.g. `₱4,500`. */
export function pesos(value: number): string {
  return `₱${Math.max(0, Number(value) || 0).toLocaleString()}`;
}

/** Badge keys the API sends, as readable pills in the status vocabulary. */
function listingBadge(badge: string): { status: string; label: string; icon?: string } {
  const key = badge.toLowerCase();
  if (key === 'verified') return { status: 'verified', label: 'Verified', icon: 'shieldCheck' };
  if (key === 'new') return { status: 'submitted', label: 'New' };
  if (key === 'promo') return { status: 'pending', label: 'Promo' };
  return { status: key, label: badge };
}

/** `2 of 6 rooms open` / `Fully booked`, from the counts the API reports. */
export function openRoomsLabel(available: number, total: number): string {
  if (available <= 0) return 'Fully booked';
  if (total > 0) return `${available} of ${total} room${total === 1 ? '' : 's'} open`;
  return `${available} room${available === 1 ? '' : 's'} open`;
}

/**
 * Save on the photo. Boarders get the real, persisted toggle; guests are sent
 * to log in (and back here); landlords and admins see nothing, since saving is
 * a boarder feature.
 */
function CardSave({ propertyId, title }: { propertyId: number; title: string }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user?.role === 'boarder') {
    return <SaveButton propertyId={propertyId} variant="icon" label={title} />;
  }
  if (isAuthenticated) return null;

  return (
    <Link
      to={loginRedirectPath(BROWSE_LISTINGS_PATH)}
      aria-label={`Log in to save ${title}`}
      title="Log in to save"
      className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-surface/95 text-ink shadow-card transition-[background-color,transform] duration-150 ease-out hover:bg-surface active:scale-[0.94]"
    >
      <Icon name="bookmark" size={18} />
    </Link>
  );
}

export function ListingCard({
  property,
  detailTo,
  listView = false,
}: {
  property: PublicProperty;
  detailTo: string;
  listView?: boolean;
}) {
  const image = property.image || LISTING_PLACEHOLDER_IMAGE;
  const previewAmenities = property.amenities.slice(0, 3);
  const moreCount = Math.max(0, property.amenities.length - previewAmenities.length);
  const available = property.availableRooms > 0;
  const place = [property.city, property.province].filter(Boolean).join(', ');
  const hasRating = property.reviews > 0 && property.rating > 0;

  return (
    <li
      className={`press-card group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card ${
        listView ? 'sm:grid sm:grid-cols-[minmax(0,300px)_1fr]' : ''
      }`}
    >
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden bg-subtle ${
          listView ? 'sm:aspect-auto sm:h-full sm:min-h-[220px]' : ''
        }`}
      >
        <img
          src={image}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
          onError={e => {
            e.currentTarget.src = LISTING_PLACEHOLDER_IMAGE;
          }}
        />
        {property.badges.length > 0 ? (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {property.badges.map(badge => {
              const meta = listingBadge(badge);
              return (
                <span key={badge} className="rounded-md shadow-card">
                  <StatusBadge status={meta.status} label={meta.label} icon={meta.icon} />
                </span>
              );
            })}
          </div>
        ) : null}
        <div className="absolute right-3 top-3">
          <CardSave propertyId={property.id} title={property.title} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3 text-sm text-gray-ink">
          <p className="flex min-w-0 items-center gap-1.5">
            <Icon name="location" size={15} className="shrink-0 text-primary" />
            <span className="truncate">{place || property.address || 'Location on request'}</span>
          </p>
          {hasRating ? (
            <p className="tabular flex shrink-0 items-center gap-1 text-ink">
              <span aria-hidden="true">★</span>
              <span className="font-semibold">{property.rating.toFixed(1)}</span>
              <span className="text-gray-ink">({property.reviews})</span>
              <span className="sr-only">
                rated {property.rating.toFixed(1)} from {property.reviews} reviews
              </span>
            </p>
          ) : null}
        </div>

        <h3 className="mt-2 font-display text-[1.25rem] font-medium leading-snug text-ink">
          <Link
            to={detailTo}
            params={{ id: String(property.id) }}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
          >
            {property.title}
          </Link>
        </h3>
        {property.address ? (
          <p className="mt-1 line-clamp-1 text-sm text-gray-ink">{property.address}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-ink">
          <StatusBadge
            status={available ? 'available' : 'full'}
            label={openRoomsLabel(property.availableRooms, property.totalRooms)}
          />
          {property.roomTypes ? (
            <span className="flex items-center gap-1.5">
              <Icon name="users" size={14} className="shrink-0 text-muted" />
              <span className="first-letter:uppercase">{property.roomTypes}</span>
            </span>
          ) : null}
        </div>

        {previewAmenities.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Amenities">
            {previewAmenities.map(amenity => (
              <li
                key={amenity}
                className="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-gray-ink"
              >
                {amenity}
              </li>
            ))}
            {moreCount > 0 ? (
              <li className="px-1 py-0.5 text-xs font-medium text-muted">+{moreCount} more</li>
            ) : null}
          </ul>
        ) : null}

        <div className="mt-auto pt-4" />
        <div className="flex items-end justify-between gap-3 border-t border-border pt-4">
          <p className="flex items-baseline gap-1">
            <span className="text-xs text-gray-ink">from</span>
            <span className="tabular font-display text-[1.5rem] font-medium leading-none tracking-[-0.02em] text-clay">
              {pesos(property.price)}
            </span>
            <span className="text-sm text-gray-ink">/ month</span>
          </p>
          <span
            aria-hidden="true"
            className="flex items-center gap-1 text-sm font-semibold text-primary"
          >
            View
            <Icon name="chevronRight" size={16} />
          </span>
        </div>
      </div>
    </li>
  );
}

/** Loading state shaped like a real card, so the grid does not jump when data lands. */
export function ListingCardSkeleton({ listView = false }: { listView?: boolean }) {
  return (
    <li
      aria-hidden="true"
      className={`flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card ${
        listView ? 'sm:grid sm:grid-cols-[minmax(0,300px)_1fr]' : ''
      }`}
    >
      <Skeleton
        className={`aspect-[4/3] w-full rounded-none ${listView ? 'sm:aspect-auto sm:h-full sm:min-h-[220px]' : ''}`}
      />
      <div className="flex flex-col p-5">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-3 h-6 w-4/5" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="mt-3 flex gap-1.5">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </li>
  );
}
