import { useMemo, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth-context';
import { osmEmbedUrl } from '../../lib/maps';
import {
  BOARDER_MESSAGES_PATH,
  BROWSE_LISTINGS_PATH,
  boarderApplyPath,
  boarderTourPath,
  loginRedirectPath,
} from '../../lib/routes';
import type { ListingDetail, RoomDetail, SimilarProperty } from '../../lib/types';
import { useMapLocation } from '../../lib/use-map-location';
import { buttonClasses } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import { MapLocationControl } from './MapLocationControl';
import { SaveButton } from './SaveButton';
import {
  amenityIcon,
  capitalize,
  cleanRoomType,
  formatAmount,
  formatPrice,
  freeSlotsLabel,
  genderInfo,
  isRoomAvailable,
  roomStatusLabel,
} from './detail-helpers';

const PLACEHOLDER_IMAGE = '/assets/images/placeholder-room.svg';

/** Status-badge key for a room's tenant-facing label (Available / Limited / Full / Maintenance). */
function roomTone(room: RoomDetail): string {
  const { label } = roomStatusLabel(room);
  if (label === 'Available') return 'available';
  if (label === 'Limited') return 'pending';
  if (label === 'Full') return 'rejected';
  return 'maintenance';
}

function listingBadge(badge: string): { status: string; label: string; icon?: string } {
  const key = badge.toLowerCase();
  if (key === 'verified') return { status: 'verified', label: 'Verified property', icon: 'shieldCheck' };
  if (key === 'new') return { status: 'submitted', label: 'New listing' };
  if (key === 'promo') return { status: 'pending', label: 'Promo' };
  return { status: key, label: badge };
}

function Stars({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} aria-hidden="true" className={star <= clamped ? 'text-ink' : 'text-border-strong'}>
          ★
        </span>
      ))}
    </span>
  );
}

function ListingMap({
  latitude,
  longitude,
  title,
}: {
  latitude: number;
  longitude: number;
  title: string;
}) {
  // The bbox math lives in `lib/maps` so the listing marker and the user's position are framed
  // identically (spec `map-use-location` R11).
  return (
    <iframe
      title={`Map of ${title}`}
      src={osmEmbedUrl(latitude, longitude)}
      className="h-[320px] w-full rounded-xl border-0 bg-subtle sm:h-[420px]"
      loading="lazy"
    />
  );
}

/**
 * Photo gallery that is honest about what it has: no photos renders a quiet
 * "no photos yet" panel instead of a stock image; one photo renders alone; many
 * get arrows, a counter and a thumbnail strip.
 */
function Gallery({ images, title }: { images: string[]; title: string }) {
  const [current, setCurrent] = useState(0);
  const count = images.length;

  if (count === 0) {
    return (
      <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong bg-subtle text-center sm:aspect-[21/9]">
        <Icon name="photo" size={28} className="text-muted" />
        <p className="text-sm font-medium text-gray-ink">No photos yet</p>
        <p className="max-w-xs text-xs text-muted">
          The landlord hasn&apos;t added photos of this property.
        </p>
      </div>
    );
  }

  const index = Math.min(current, count - 1);
  const go = (delta: number) => setCurrent(i => (i + delta + count) % count);

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-2xl bg-subtle"
        onKeyDown={e => {
          if (count < 2) return;
          if (e.key === 'ArrowLeft') go(-1);
          if (e.key === 'ArrowRight') go(1);
        }}
      >
        <img
          src={images[index]}
          alt={`${title} — photo ${index + 1} of ${count}`}
          className="aspect-[4/3] w-full object-cover sm:aspect-[16/9] lg:aspect-[2/1]"
          onError={e => {
            e.currentTarget.src = PLACEHOLDER_IMAGE;
          }}
        />
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/95 text-ink shadow-card transition-[background-color,transform] duration-150 hover:bg-surface active:scale-[0.94]"
            >
              <Icon name="chevronLeft" size={22} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/95 text-ink shadow-card transition-[background-color,transform] duration-150 hover:bg-surface active:scale-[0.94]"
            >
              <Icon name="chevronRight" size={22} />
            </button>
            <span className="tabular absolute bottom-3 right-3 rounded-md bg-ink/70 px-2 py-0.5 text-xs font-medium text-cream">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Choose a photo">
          {images.map((image, i) => (
            <button
              key={image + i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-[opacity,border-color] duration-150 sm:h-[72px] sm:w-24 ${
                i === index ? 'border-primary opacity-100' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={image}
                alt=""
                className="h-full w-full object-cover"
                onError={e => {
                  e.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RoomDetailView({
  listing,
  showSave = false,
  applyTo,
  similar = [],
}: {
  listing: ListingDetail;
  showSave?: boolean;
  applyTo?: string;
  similar?: SimilarProperty[];
}) {
  // No auto-apply here: this map's default is the listing itself, and re-centring it on a
  // remembered user position would hide the listing the page opened the map to show.
  const mapLocation = useMapLocation({ autoApply: false });
  const [roomFilter, setRoomFilter] = useState('all');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const { isAuthenticated, user } = useAuth();
  // A signed-in boarder applies through the in-shell form; everyone else has to
  // authenticate first. The session only exists client-side, so the signed-out
  // link is what the server renders — the client re-renders with the real
  // destination once auth hydrates.
  const isBoarder = isAuthenticated && user?.role === 'boarder';

  const images = useMemo(() => {
    if (listing.images.length > 0) return listing.images;
    return listing.coverImage ? [listing.coverImage] : [];
  }, [listing.images, listing.coverImage]);

  const hasCoords = typeof listing.latitude === 'number' && typeof listing.longitude === 'number';
  const availableRooms = useMemo(() => listing.rooms.filter(isRoomAvailable), [listing.rooms]);
  const gender = genderInfo(listing.genderPreference);

  const roomTypeFilters = useMemo(() => {
    const seen = new Set<string>();
    for (const room of listing.rooms) {
      const cleaned = cleanRoomType(room);
      if (cleaned && cleaned !== 'Room') seen.add(cleaned);
    }
    return Array.from(seen);
  }, [listing.rooms]);

  const filteredRooms = useMemo(() => {
    if (roomFilter === 'all') return listing.rooms;
    return listing.rooms.filter(
      room => cleanRoomType(room).toLowerCase() === roomFilter.toLowerCase()
    );
  }, [listing.rooms, roomFilter]);

  const activeRoomId = selectedRoomId ?? availableRooms[0]?.id ?? null;
  const activeRoom = availableRooms.find(room => room.id === activeRoomId) ?? null;
  const roomParam = activeRoomId ? String(activeRoomId) : '';
  const applyPath = boarderApplyPath(listing.id);
  // Guests are sent to login and come back to the form itself, not to this page.
  const authRedirect = loginRedirectPath(applyPath);
  const applyHref = applyTo ?? (isBoarder ? applyPath : authRedirect);
  // Apply/tour/messaging all live inside the boarder shell, so an explicit
  // `applyTo` (in-shell callers) and a signed-in boarder share the same gate.
  const inBoarderFlow = Boolean(applyTo) || isBoarder;
  const tourPath = boarderTourPath(listing.id);
  const secondaryHref = inBoarderFlow ? tourPath : authRedirect;
  // The chosen room travels with the boarder into the apply/tour forms; a guest's
  // login link carries its own `redirect`, so it gets no extra search.
  const roomSearch = inBoarderFlow ? { room: roomParam } : undefined;
  // Messaging lives in the boarder shell and is gated on a session, never on a
  // tenancy (spec `messages-feature-review` D12/R14). Guests still authenticate
  // first, and the inbox then opens the thread for *this* listing.
  const contactHref = inBoarderFlow ? BOARDER_MESSAGES_PATH : authRedirect;
  const contactSearch = inBoarderFlow ? { compose: listing.id } : undefined;
  const browseHref = BROWSE_LISTINGS_PATH;

  const descriptionParagraphs = listing.description
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  const rules =
    listing.houseRules.length > 0
      ? listing.houseRules
      : listing.propertyRules
      ? [listing.propertyRules]
      : [];

  const address = [listing.address, listing.city, listing.province].filter(Boolean).join(', ');
  const hasRating = listing.reviews > 0 && listing.rating > 0;
  const headlinePrice = activeRoom?.price ?? listing.price;
  const canApply = availableRooms.length > 0;
  const openLabel =
    availableRooms.length > 0
      ? `${availableRooms.length} of ${listing.totalRooms || listing.rooms.length} rooms open`
      : 'Fully booked';

  const applyLabel = inBoarderFlow ? 'Apply for this room' : 'Log in to apply';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:pb-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex min-w-0 items-center gap-1.5">
          <li>
            <Link to={browseHref} className="font-medium text-primary hover:underline">
              Find a room
            </Link>
          </li>
          <li aria-hidden="true" className="text-muted">
            <Icon name="chevronRight" size={14} />
          </li>
          <li className="min-w-0">
            <span aria-current="page" className="block truncate text-gray-ink">
              {listing.title}
            </span>
          </li>
        </ol>
      </nav>

      {/* Title block */}
      <header className="rise-in mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {listing.badges.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {listing.badges.map(badge => {
                const meta = listingBadge(badge);
                return <StatusBadge key={badge} status={meta.status} label={meta.label} icon={meta.icon} />;
              })}
            </div>
          ) : null}
          <h1 className="display-lg max-w-3xl text-ink">{listing.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-ink">
            <span className="flex items-center gap-1.5">
              <Icon name="location" size={16} className="shrink-0 text-primary" />
              {address || 'Address shared by the landlord'}
            </span>
            {hasRating ? (
              <span className="tabular flex items-center gap-1.5">
                <span aria-hidden="true" className="text-ink">★</span>
                <span className="font-semibold text-ink">{listing.rating.toFixed(1)}</span>
                ({listing.reviews} review{listing.reviews === 1 ? '' : 's'})
              </span>
            ) : null}
            <span>{openLabel}</span>
          </div>
        </div>
        {showSave || isBoarder ? <SaveButton propertyId={listing.id} /> : null}
      </header>

      {/* Gallery */}
      <section className="mt-6" aria-label="Photos">
        <Gallery images={images} title={listing.title} />
      </section>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        {/* Left column */}
        <div className="flex min-w-0 flex-col gap-10">
          {/* Quick facts */}
          <Card padding="p-0">
            <dl className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x [&>div]:p-4 sm:[&>div]:p-5">
              <Fact icon="users" label="Room types" value={capitalize(listing.roomTypes) || 'Ask the landlord'} />
              <Fact icon="calendar" label="Availability" value={listing.availability || 'Contact for availability'} />
              <Fact icon="clock" label="Minimum stay" value={listing.minStay || 'Flexible'} />
              <Fact icon={gender.icon} label="Who can stay" value={gender.label} />
            </dl>
          </Card>

          <DetailSection title="About this place">
            {descriptionParagraphs.length > 0 ? (
              <div className="max-w-[68ch] space-y-3 leading-relaxed text-gray-ink">
                {descriptionParagraphs.map(paragraph => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-gray-ink">The landlord hasn&apos;t written a description yet.</p>
            )}
          </DetailSection>

          {/* Rooms */}
          <DetailSection
            title="Rooms"
            id="rooms"
            aside={
              roomTypeFilters.length > 1 ? (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter rooms by type">
                  <FilterChip active={roomFilter === 'all'} onClick={() => setRoomFilter('all')}>
                    All
                  </FilterChip>
                  {roomTypeFilters.map(type => (
                    <FilterChip key={type} active={roomFilter === type} onClick={() => setRoomFilter(type)}>
                      {type}
                    </FilterChip>
                  ))}
                </div>
              ) : null
            }
          >
            {filteredRooms.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredRooms.map(room => {
                  const status = roomStatusLabel(room);
                  const bookable = isRoomAvailable(room);
                  const selected = bookable && room.id === activeRoomId;
                  const roomImage = room.images[0];
                  return (
                    <li
                      key={room.id}
                      className={`flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-card transition-[border-color,box-shadow] duration-200 ${
                        selected ? 'border-primary ring-4 ring-primary/10' : 'border-border/80'
                      }`}
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-subtle">
                        {roomImage ? (
                          <img
                            src={roomImage}
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
                        <span className="absolute left-3 top-3">
                          <StatusBadge status={roomTone(room)} label={status.label} />
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="truncate font-semibold text-ink">
                            {cleanRoomType(room)}
                            {room.roomNumber ? (
                              <span className="font-normal text-gray-ink"> · {room.roomNumber}</span>
                            ) : null}
                          </h3>
                          <p className="tabular shrink-0 font-semibold text-ink">
                            {formatPrice(room.price)}
                            <span className="text-xs font-normal text-gray-ink"> / mo</span>
                          </p>
                        </div>
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-ink">
                          <span>
                            {room.capacity} {room.capacity === 1 ? 'person' : 'people'}
                          </span>
                          <span>{freeSlotsLabel(room)}</span>
                          {room.size ? <span>{room.size} sqm</span> : null}
                          {room.furnishing && room.furnishing !== 'Not specified' ? (
                            <span>{room.furnishing}</span>
                          ) : null}
                        </p>
                        {room.deposit > 0 ? (
                          <p className="mt-1 text-sm text-gray-ink">
                            Deposit <span className="tabular font-medium text-ink">{formatPrice(room.deposit)}</span>
                          </p>
                        ) : null}
                        {room.description ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-ink">
                            {room.description}
                          </p>
                        ) : null}
                        <div className="mt-auto pt-4">
                          {bookable ? (
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setSelectedRoomId(room.id)}
                              className={buttonClasses({
                                variant: selected ? 'primary' : 'outline',
                                size: 'sm',
                                className: 'w-full',
                              })}
                            >
                              {selected ? (
                                <>
                                  <Icon name="check" size={14} />
                                  Selected
                                </>
                              ) : (
                                'Choose this room'
                              )}
                            </button>
                          ) : (
                            <p className="text-sm text-muted">Not taking boarders right now</p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border-strong p-6 text-center text-sm text-gray-ink">
                {listing.rooms.length === 0
                  ? 'The landlord hasn’t listed individual rooms yet.'
                  : 'No rooms of this type. Try another filter.'}
              </p>
            )}
          </DetailSection>

          <DetailSection title="Amenities">
            {listing.amenities.length > 0 ? (
              <ul className="grid grid-cols-1 gap-x-6 gap-y-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
                {listing.amenities.map(amenity => (
                  <li key={amenity} className="flex items-center gap-3 text-sm text-ink">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-primary">
                      <Icon name={amenityIcon(amenity)} size={18} />
                    </span>
                    <span className="min-w-0">{amenity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-ink">No amenities listed for this property.</p>
            )}
          </DetailSection>

          <DetailSection title="House rules">
            {rules.length > 0 ? (
              <ul className="divide-y divide-border rounded-2xl border border-border/80 bg-surface">
                {rules.map((rule, index) => (
                  <li key={rule + index} className="flex gap-3 px-4 py-3.5">
                    <Icon name="check" size={18} className="mt-0.5 shrink-0 text-primary" />
                    <p className="text-sm leading-relaxed text-gray-ink">{rule}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-ink">No house rules listed. Ask the landlord before you move in.</p>
            )}
          </DetailSection>

          <DetailSection title="Location">
            <p className="mb-4 flex items-start gap-1.5 text-sm text-gray-ink">
              <Icon name="location" size={16} className="mt-0.5 shrink-0 text-primary" />
              {address || 'Address shared by the landlord'}
            </p>
            {hasCoords ? (
              <>
                <MapLocationControl state={mapLocation} resetLabel="Reset to listing" />
                <ListingMap
                  latitude={mapLocation.coordinates?.latitude ?? (listing.latitude as number)}
                  longitude={mapLocation.coordinates?.longitude ?? (listing.longitude as number)}
                  title={mapLocation.coordinates ? 'your location' : listing.title}
                />
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-border-strong p-6 text-center text-sm text-gray-ink">
                This property hasn&apos;t been pinned on the map yet.
              </p>
            )}
          </DetailSection>

          <DetailSection title="Your landlord">
            <Card>
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
                  <Icon name="userCircle" size={26} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {listing.landlord?.name || 'Property owner'}
                  </p>
                  <p className="tabular mt-0.5 text-sm text-gray-ink">
                    {listing.landlord?.properties ?? 0} propert
                    {(listing.landlord?.properties ?? 0) === 1 ? 'y' : 'ies'} on Haven Space
                    {listing.landlord?.rating ? ` · ${listing.landlord.rating.toFixed(1)} rating` : ''}
                  </p>
                </div>
                <Link
                  to={contactHref}
                  search={contactSearch}
                  className={buttonClasses({ variant: 'outline', size: 'sm' })}
                >
                  <Icon name="chat" size={16} />
                  {inBoarderFlow ? 'Message landlord' : 'Log in to message'}
                </Link>
              </div>
            </Card>
          </DetailSection>

          <DetailSection title="Reviews">
            {hasRating ? (
              <div className="flex flex-wrap items-center gap-5">
                <p className="tabular font-display text-5xl font-medium leading-none tracking-[-0.03em] text-ink">
                  {listing.rating.toFixed(1)}
                </p>
                <div>
                  <Stars rating={listing.rating} />
                  <p className="mt-1 text-sm text-gray-ink">
                    Based on {listing.reviews} review{listing.reviews === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-ink">No reviews yet. Boarders can review a place after their stay.</p>
            )}
          </DetailSection>
        </div>

        {/* Right column: the booking card (desktop). Phones get the action bar below. */}
        <aside className="hidden lg:block" aria-label="Book this place">
          <div className="sticky top-24">
            <Card padding="p-6">
              <p className="text-sm text-gray-ink">{activeRoom ? cleanRoomType(activeRoom) + ' room' : 'Rent from'}</p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="tabular font-display text-[2.25rem] font-medium leading-none tracking-[-0.025em] text-clay">
                  {formatPrice(headlinePrice)}
                </span>
                <span className="text-gray-ink">/ month</span>
              </p>
              <div className="mt-3">
                <StatusBadge status={canApply ? 'available' : 'full'} label={openLabel} />
              </div>

              <dl className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm">
                <SummaryRow label="Move in" value={listing.availability || 'Now'} />
                <SummaryRow
                  label="Deposit"
                  value={activeRoom && activeRoom.deposit > 0 ? formatPrice(activeRoom.deposit) : formatAmount(listing.deposit)}
                />
                <SummaryRow label="Advance" value={listing.advance || '1 month'} />
              </dl>

              {availableRooms.length > 1 ? (
                <div className="mt-5 border-t border-border pt-5">
                  <p id="booking-room-label" className="text-sm font-semibold text-ink">
                    Choose a room
                  </p>
                  <div className="mt-2.5 space-y-2" role="radiogroup" aria-labelledby="booking-room-label">
                    {availableRooms.map(room => {
                      const selected = room.id === activeRoomId;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setSelectedRoomId(room.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-[border-color,background-color] duration-150 ${
                            selected ? 'border-primary bg-mint/50' : 'border-border hover:border-border-strong'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span
                              aria-hidden="true"
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                selected ? 'border-primary' : 'border-border-strong'
                              }`}
                            >
                              {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-ink">
                                {cleanRoomType(room)}
                                {room.roomNumber ? ` · ${room.roomNumber}` : ''}
                              </span>
                              <span className="block text-xs text-gray-ink">{freeSlotsLabel(room)}</span>
                            </span>
                          </span>
                          <span className="tabular shrink-0 text-sm font-semibold text-ink">
                            {formatPrice(room.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-2.5">
                {canApply ? (
                  <Link
                    to={applyHref}
                    search={roomSearch}
                    className={buttonClasses({ size: 'lg', className: 'w-full' })}
                  >
                    {applyLabel}
                  </Link>
                ) : (
                  <p className="rounded-xl bg-subtle px-4 py-3 text-center text-sm text-gray-ink">
                    No rooms are open right now. You can still request a tour or message the landlord.
                  </p>
                )}
                <Link
                  to={secondaryHref}
                  search={roomSearch}
                  className={buttonClasses({ variant: 'outline', size: 'lg', className: 'w-full' })}
                >
                  <Icon name="calendarDays" size={18} />
                  Request a tour
                </Link>
              </div>
              <p className="mt-4 text-center text-xs leading-relaxed text-gray-ink">
                Payment details are shared after the landlord accepts your application.
              </p>
            </Card>
          </div>
        </aside>
      </div>

      {/* Similar properties */}
      {similar.length > 0 ? (
        <section className="mt-16 border-t border-border pt-10" aria-labelledby="similar-heading">
          <h2 id="similar-heading" className="display-md text-ink">
            Similar places nearby
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map(property => (
              <li
                key={property.id}
                className="press-card group relative overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-subtle">
                  <img
                    src={property.coverImage || PLACEHOLDER_IMAGE}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
                    onError={e => {
                      e.currentTarget.src = PLACEHOLDER_IMAGE;
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-lg font-medium leading-snug text-ink">
                    <Link
                      to="/rooms/$id"
                      params={{ id: String(property.id) }}
                      className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
                    >
                      {property.title}
                    </Link>
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-ink">
                    <Icon name="location" size={14} className="shrink-0 text-primary" />
                    <span className="truncate">
                      {property.city || property.address || 'Location on request'}
                    </span>
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="tabular text-gray-ink">
                      {property.rating > 0 ? (
                        <>
                          <span aria-hidden="true" className="text-ink">★</span>{' '}
                          <span className="font-semibold text-ink">{property.rating.toFixed(1)}</span>
                          {property.reviewCount > 0 ? ` (${property.reviewCount})` : ''}
                        </>
                      ) : (
                        'No reviews yet'
                      )}
                    </span>
                    <span className="tabular font-semibold text-ink">
                      {formatPrice(property.price)}
                      <span className="font-normal text-gray-ink"> / mo</span>
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Phones and tablets: the booking summary as a pinned action bar. `sticky` rather than
          `fixed`, so it settles at the end of the page instead of covering the footer. */}
      <div className="chrome-float sticky bottom-0 z-30 -mx-4 mt-10 border-t border-border pb-[env(safe-area-inset-bottom)] sm:-mx-6 lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-1">
              <span className="tabular font-display text-xl font-medium leading-none text-clay">
                {formatPrice(headlinePrice)}
              </span>
              <span className="text-xs text-gray-ink">/ month</span>
            </p>
            <p className="mt-1 truncate text-xs text-gray-ink">
              {activeRoom
                ? `${cleanRoomType(activeRoom)}${activeRoom.roomNumber ? ` · ${activeRoom.roomNumber}` : ''} · ${freeSlotsLabel(activeRoom)}`
                : openLabel}
            </p>
          </div>
          <Link
            to={secondaryHref}
            search={roomSearch}
            aria-label="Request a tour"
            className={buttonClasses({ variant: 'outline', className: 'px-3 sm:px-4' })}
          >
            <Icon name="calendarDays" size={18} />
            <span className="hidden sm:inline">Tour</span>
          </Link>
          {canApply ? (
            <Link to={applyHref} search={roomSearch} className={buttonClasses()}>
              {inBoarderFlow ? 'Apply' : 'Log in to apply'}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  id,
  aside,
  children,
}: {
  title: string;
  id?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-label={title} className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[1.5rem] font-medium leading-tight tracking-[-0.015em] text-ink">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="min-w-0 border-border [&:nth-child(n+3)]:border-t sm:[&:nth-child(n+3)]:border-t-0">
      <dt className="flex items-center gap-1.5 text-xs text-gray-ink">
        <Icon name={icon} size={14} className="shrink-0 text-primary" />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-gray-ink">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-[background-color,border-color,color] duration-150 ${
        active
          ? 'border-primary/40 bg-mint text-primary-dark'
          : 'border-border bg-surface text-gray-ink hover:border-border-strong hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
