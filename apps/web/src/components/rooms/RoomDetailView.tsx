import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { ListingDetail, RoomDetail, SimilarProperty } from '../../lib/types';
import { Icon } from '../ui/Icon';
import { SaveButton } from './SaveButton';

const AMENITY_ICONS: Record<string, string> = {
  kitchen: 'kitchen',
  'own kitchen': 'kitchen',
  toilet: 'toilet',
  'own bathroom': 'toilet',
  'own toilet': 'toilet',
  'private bathroom': 'toilet',
  laundry: 'laundry',
  'laundry room': 'laundry',
  aircon: 'aircon',
  'air conditioning': 'aircon',
  cctv: 'cctv',
  'cctv security': 'cctv',
  parking: 'parking',
  'parking space': 'parking',
  furnished: 'furnished',
  'fully furnished': 'furnished',
  wifi: 'wifi',
  'free wifi': 'wifi',
  'high-speed wifi': 'wifi',
  pool: 'sparkles',
  'study area': 'book',
  generator: 'lightbulb',
};

function amenityIcon(name: string): string {
  const key = name.toLowerCase();
  for (const [match, icon] of Object.entries(AMENITY_ICONS)) {
    if (key.includes(match)) return icon;
  }
  return 'check';
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return `₱${value.toLocaleString()}`;
}

/** Format a deposit/advance that may arrive as a raw number string or plain text. */
function formatAmount(value: string): string {
  if (!value) return 'Contact for details';
  const numeric = Number(value.replace(/[^\d.]/g, ''));
  if (
    !Number.isNaN(numeric) &&
    String(value).trim() !== '' &&
    /^[₱\s]*[\d.,]+$/.test(value.trim())
  ) {
    return formatPrice(numeric);
  }
  return value;
}

/** Strip a trailing "-X" suffix (e.g. "Room 1-1" -> "Room 1") and capitalize. */
function cleanRoomType(room: RoomDetail): string {
  const raw = room.roomType && room.roomType !== 'N/A' ? room.roomType : room.roomNumber || 'Room';
  return capitalize(raw.replace(/-\d+$/, ''));
}

function isRoomAvailable(room: RoomDetail): boolean {
  const status = (room.status || '').toLowerCase();
  return status !== 'occupied' && status !== 'full';
}

function roomStatusLabel(room: RoomDetail): { label: string; className: string } {
  const status = (room.status || '').toLowerCase();
  if (status === 'occupied' || status === 'full') {
    return { label: 'Occupied', className: 'bg-red-100 text-red-700' };
  }
  if (status === 'limited' || status === 'few-left') {
    return { label: 'Limited', className: 'bg-amber-100 text-amber-700' };
  }
  return { label: 'Available', className: 'bg-green-100 text-green-700' };
}

function genderInfo(preference: string): { label: string; icon: string; description: string } {
  switch ((preference || 'any').toLowerCase()) {
    case 'male':
      return {
        label: 'Male Only',
        icon: 'user',
        description: 'This property accepts male boarders.',
      };
    case 'female':
      return {
        label: 'Female Only',
        icon: 'user',
        description: 'This property accepts female boarders.',
      };
    default:
      return {
        label: 'Open to All Genders',
        icon: 'users',
        description: 'This property accepts boarders of all genders.',
      };
  }
}

function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-amber-400 ${className}`}
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          aria-hidden="true"
          className={star <= clamped ? 'text-amber-400' : 'text-gray-300'}
        >
          ★
        </span>
      ))}
    </span>
  );
}

const PLACEHOLDER_IMAGE = '/assets/images/placeholder-room.svg';

function MapEmbed({
  latitude,
  longitude,
  title,
}: {
  latitude: number;
  longitude: number;
  title: string;
}) {
  const dLng = 0.012;
  const dLat = 0.009;
  const bbox = `${longitude - dLng},${latitude - dLat},${longitude + dLng},${latitude + dLat}`;
  return (
    <iframe
      title={`Map of ${title}`}
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
        bbox
      )}&layer=mapnik&marker=${latitude},${longitude}`}
      className="h-[420px] w-full rounded-xl border-0 sm:h-[480px]"
      loading="lazy"
    />
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
  const [currentImage, setCurrentImage] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [roomFilter, setRoomFilter] = useState('all');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const images = useMemo(() => {
    const sources = listing.images.length > 0 ? listing.images : [];
    if (sources.length > 0) return sources;
    return [listing.coverImage || PLACEHOLDER_IMAGE];
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
  const roomParam = activeRoomId ? String(activeRoomId) : '';
  const publicDetailHref = `/rooms/${listing.id}`;
  const authRedirect = `/auth/login?redirect=${encodeURIComponent(publicDetailHref)}`;
  const applyHref = applyTo ?? authRedirect;
  const tourPath = `/boarder/find-a-room/${listing.id}/tour`;
  const secondaryHref = applyTo ? tourPath : authRedirect;
  const contactHref = applyTo ? '/boarder/messages' : authRedirect;
  const browseHref = applyTo ? '/boarder/find-a-room' : '/find-a-room';

  function prevImage() {
    setCurrentImage(index => (index - 1 + images.length) % images.length);
  }
  function nextImage() {
    setCurrentImage(index => (index + 1) % images.length);
  }

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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
        <Link
          to={browseHref}
          className="flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <Icon name="home" size={16} />
          Find a Room
        </Link>
        <Icon name="chevronRight" size={14} className="text-gray-ink" />
        <span className="max-w-[60vw] truncate font-semibold text-ink">{listing.title}</span>
      </nav>

      {/* Gallery / Map */}
      <section className="mt-4 rounded-2xl bg-white p-3 shadow-card sm:p-5" aria-label="Photos">
        {showMap && hasCoords ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMap(false)}
              className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-sm font-medium text-gray-ink shadow-card transition hover:bg-white"
            >
              <Icon name="chevronLeft" size={16} />
              Back to Images
            </button>
            <MapEmbed
              latitude={listing.latitude as number}
              longitude={listing.longitude as number}
              title={listing.title}
            />
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-xl">
              <img
                src={images[currentImage]}
                alt={`${listing.title} — photo ${currentImage + 1}`}
                className="h-[280px] w-full object-cover sm:h-[420px]"
                onError={e => {
                  e.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
              />

              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-card transition hover:bg-white hover:shadow-pop"
                  >
                    <Icon name="chevronLeft" size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-card transition hover:bg-white hover:shadow-pop"
                  >
                    <Icon name="chevronRight" size={22} />
                  </button>
                </>
              ) : null}

              {hasCoords ? (
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-sm font-medium text-gray-ink shadow-card transition hover:bg-white"
                >
                  <Icon name="map" size={16} />
                  Show Map
                </button>
              ) : null}
            </div>

            {images.length > 1 ? (
              <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={image + index}
                    type="button"
                    onClick={() => setCurrentImage(index)}
                    aria-label={`View photo ${index + 1}`}
                    className={`h-[60px] w-[80px] shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-[72px] sm:w-[96px] ${
                      index === currentImage
                        ? 'border-primary opacity-100'
                        : 'border-transparent opacity-60 hover:opacity-100'
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
          </>
        )}
      </section>

      {/* Main grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left column */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Header */}
          <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                {listing.badges.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {listing.badges.map(badge => {
                      const key = badge.toLowerCase();
                      if (key === 'verified') {
                        return (
                          <span
                            key={badge}
                            className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-primary"
                          >
                            <Icon name="shieldCheck" size={14} />
                            Verified Property
                          </span>
                        );
                      }
                      if (key === 'new') {
                        return (
                          <span
                            key={badge}
                            className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-primary-light"
                          >
                            New Listing
                          </span>
                        );
                      }
                      if (key === 'promo') {
                        return (
                          <span
                            key={badge}
                            className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                          >
                            Promo
                          </span>
                        );
                      }
                      return (
                        <span
                          key={badge}
                          className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-ink"
                        >
                          {badge}
                        </span>
                      );
                    })}
                  </div>
                ) : null}

                <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                  {listing.title}
                </h1>

                <p className="mt-2 flex items-start gap-1.5 text-gray-ink">
                  <Icon name="location" size={18} className="mt-0.5 shrink-0" />
                  <span>
                    {[listing.address, listing.city, listing.province].filter(Boolean).join(', ')}
                  </span>
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  {listing.reviews > 0 && listing.rating > 0 ? (
                    <>
                      <span className="flex items-center gap-1.5 font-semibold text-ink">
                        <span className="text-amber-400">★</span>
                        {listing.rating.toFixed(1)}
                        <span className="font-normal text-gray-ink">
                          ({listing.reviews} review{listing.reviews === 1 ? '' : 's'})
                        </span>
                      </span>
                      <span className="text-gray-ink">•</span>
                    </>
                  ) : null}
                  <span className="text-gray-ink">
                    {availableRooms.length} of {listing.totalRooms} rooms available
                  </span>
                  {showSave ? (
                    <span className="ml-auto">
                      <SaveButton propertyId={listing.id} />
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* Quick info cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Quick facts">
            <QuickInfoCard icon="users" label="Room Types" value={capitalize(listing.roomTypes)} />
            <QuickInfoCard
              icon="calendar"
              label="Availability"
              value={listing.availability || 'Contact for availability'}
            />
            <QuickInfoCard
              icon="clock"
              label="Minimum Stay"
              value={listing.minStay || 'Flexible'}
            />
          </section>

          {/* Description */}
          <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
            <SectionTitle>About This Property</SectionTitle>
            {descriptionParagraphs.length > 0 ? (
              <div className="space-y-3 leading-relaxed text-gray-ink">
                {descriptionParagraphs.map(paragraph => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-gray-ink">No description provided for this property.</p>
            )}
          </section>

          {/* Amenities */}
          <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
            <SectionTitle>Amenities</SectionTitle>
            {listing.amenities.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {listing.amenities.map(amenity => (
                  <li
                    key={amenity}
                    className="flex items-center gap-2.5 rounded-lg bg-cream px-3.5 py-3 text-sm font-medium text-ink"
                  >
                    <Icon name={amenityIcon(amenity)} size={20} className="shrink-0 text-primary" />
                    <span className="truncate">{amenity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-ink">No amenities listed for this property.</p>
            )}
          </section>

          {/* Property rules */}
          <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
            <SectionTitle>Property Rules</SectionTitle>
            {rules.length > 0 ? (
              <ul className="space-y-3">
                {rules.map((rule, index) => (
                  <li key={rule + index} className="flex gap-3 rounded-lg bg-cream p-4">
                    <Icon name="check" size={20} className="mt-0.5 shrink-0 text-primary" />
                    <p className="text-sm leading-relaxed text-gray-ink">{rule}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-ink">No property rules specified.</p>
            )}
          </section>

          {/* Gender preference */}
          <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
            <SectionTitle>Gender Preferences</SectionTitle>
            <div className="flex gap-3 rounded-lg bg-cream p-4">
              <Icon name={gender.icon} size={20} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <h4 className="text-sm font-semibold text-ink">{gender.label}</h4>
                <p className="mt-0.5 text-sm text-gray-ink">{gender.description}</p>
              </div>
            </div>
          </section>

          {/* Reviews */}
          <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
            <SectionTitle>Reviews &amp; Ratings</SectionTitle>
            {listing.reviews > 0 && listing.rating > 0 ? (
              <div className="flex flex-wrap items-center gap-4 rounded-lg bg-cream p-5">
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-primary">
                    {listing.rating.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-ink">out of 5</p>
                </div>
                <div className="min-w-0 flex-1">
                  <Stars rating={listing.rating} />
                  <p className="mt-1.5 text-sm text-gray-ink">
                    Based on {listing.reviews} review{listing.reviews === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-cream p-6 text-center">
                <p className="font-medium text-ink">No reviews yet</p>
                <p className="mt-1 text-sm text-gray-ink">
                  Be the first to review this property after your stay.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right column: booking card */}
        <aside className="h-fit lg:sticky lg:top-6">
          <div className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
            <div>
              <span className="text-3xl font-extrabold text-primary">
                {formatPrice(listing.price)}
              </span>
              <span className="text-base font-medium text-gray-ink">/month</span>
            </div>

            <div className="mt-4 space-y-2.5 text-sm text-gray-ink">
              <div className="flex items-center gap-2">
                <Icon name="calendar" size={18} className="shrink-0 text-primary" />
                <span>
                  Available:{' '}
                  <strong className="font-semibold text-ink">
                    {listing.availability || 'Now'}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="banknotes" size={18} className="shrink-0 text-primary" />
                <span>
                  Deposit:{' '}
                  <strong className="font-semibold text-ink">
                    {formatAmount(listing.deposit)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="clock" size={18} className="shrink-0 text-primary" />
                <span>
                  Advance:{' '}
                  <strong className="font-semibold text-ink">{listing.advance || '1 month'}</strong>
                </span>
              </div>
            </div>

            <div className="my-5 h-px bg-gray-200" />

            <h3 className="text-sm font-semibold text-ink">Available Room Types</h3>
            {availableRooms.length > 0 ? (
              <div className="mt-3 space-y-2.5" role="radiogroup" aria-label="Select a room">
                {availableRooms.map(room => {
                  const selected = room.id === activeRoomId;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border-2 px-3.5 py-3 text-left transition ${
                        selected
                          ? 'border-primary bg-mint/40 shadow-[0_0_0_3px_rgba(74,124,35,0.1)]'
                          : 'border-gray-200 bg-cream/50 hover:border-primary/60'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
                        <Icon
                          name={room.capacity > 1 ? 'users' : 'user'}
                          size={16}
                          className="shrink-0 text-primary"
                        />
                        <span className="truncate">{cleanRoomType(room)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="text-sm font-bold text-primary">
                          {formatPrice(room.price)}/mo
                        </span>
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                            selected ? 'border-primary bg-primary' : 'border-gray-300'
                          }`}
                        >
                          {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-cream p-4 text-center text-sm text-gray-ink">
                No rooms currently available
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3">
              {applyTo ? (
                <Link
                  to={applyTo}
                  search={{ room: roomParam }}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-pop"
                >
                  <Icon name="application" size={18} />
                  Apply Now
                </Link>
              ) : (
                <Link
                  to={applyHref}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-pop"
                >
                  <Icon name="application" size={18} />
                  Apply Now
                </Link>
              )}
              <Link
                to={secondaryHref}
                search={applyTo ? { room: roomParam } : undefined}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-primary bg-white px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-mint"
              >
                <Icon name="calendarDays" size={18} />
                Schedule a Tour
              </Link>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-ink">Questions about this property?</p>
              <Link
                to={contactHref}
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <Icon name="chat" size={16} />
                Contact Landlord
              </Link>
            </div>
          </div>

          {/* Landlord info */}
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-card">
            <h4 className="text-sm font-semibold text-ink">Property Managed by</h4>
            <div className="mt-3 flex gap-3 rounded-lg bg-cream p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
                <Icon name="userCircle" size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {listing.landlord?.name || 'Property Owner'}
                </p>
                <p className="text-xs font-medium text-primary">Verified Landlord</p>
                <div className="mt-2 flex gap-5">
                  <div>
                    <p className="text-base font-bold text-ink">
                      {listing.landlord?.properties ?? 0}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-gray-ink">Properties</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-ink">
                      {listing.landlord?.rating ? listing.landlord.rating.toFixed(1) : '—'}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-gray-ink">Rating</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Available rooms */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-ink">Available Rooms</h2>
          {roomTypeFilters.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <FilterChip active={roomFilter === 'all'} onClick={() => setRoomFilter('all')}>
                All Rooms
              </FilterChip>
              {roomTypeFilters.map(type => (
                <FilterChip
                  key={type}
                  active={roomFilter === type}
                  onClick={() => setRoomFilter(type)}
                >
                  {type} Rooms
                </FilterChip>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.length > 0 ? (
            filteredRooms.map(room => {
              const status = roomStatusLabel(room);
              const roomImage = room.images[0] || PLACEHOLDER_IMAGE;
              return (
                <article
                  key={room.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card transition-shadow hover:shadow-pop"
                >
                  <div className="relative h-40 w-full overflow-hidden bg-mint/40">
                    <img
                      src={roomImage}
                      alt={cleanRoomType(room)}
                      className="h-full w-full object-cover"
                      onError={e => {
                        e.currentTarget.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    <span
                      className={`absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-semibold text-ink">{cleanRoomType(room)}</h3>
                      <p className="shrink-0 font-bold text-primary">
                        {formatPrice(room.price)}/mo
                      </p>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-ink">
                      <span className="flex items-center gap-1.5">
                        <Icon name="users" size={14} className="text-primary" />
                        {room.capacity} {room.capacity === 1 ? 'person' : 'persons'}
                      </span>
                      {room.size ? (
                        <span className="flex items-center gap-1.5">
                          <Icon name="grid" size={14} className="text-primary" />
                          {room.size} sqm
                        </span>
                      ) : null}
                      {room.furnishing && room.furnishing !== 'Not specified' ? (
                        <span className="flex items-center gap-1.5">
                          <Icon name="building" size={14} className="text-primary" />
                          {room.furnishing}
                        </span>
                      ) : null}
                    </div>
                    {room.deposit > 0 ? (
                      <p className="mt-2 text-xs text-gray-ink">
                        Deposit:{' '}
                        <span className="font-medium text-ink">{formatPrice(room.deposit)}</span>
                      </p>
                    ) : null}
                    {room.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-ink">
                        {room.description}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="col-span-full rounded-xl bg-white p-8 text-center text-gray-ink shadow-card">
              <p className="font-medium text-ink">No rooms match the selected filter.</p>
              <p className="mt-1 text-sm">Try a different room type.</p>
            </div>
          )}
        </div>
      </section>

      {/* Similar properties */}
      {similar.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-ink">Similar Properties</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map(property => {
              const verified = property.rating >= 4.5;
              return (
                <Link
                  key={property.id}
                  to="/rooms/$id"
                  params={{ id: String(property.id) }}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-pop"
                >
                  <div className="relative h-40 w-full overflow-hidden bg-mint/40">
                    <img
                      src={property.coverImage || PLACEHOLDER_IMAGE}
                      alt={property.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={e => {
                        e.currentTarget.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    {verified ? (
                      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                        <Icon name="shieldCheck" size={12} />
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h3 className="truncate font-semibold text-ink">{property.title}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-ink">
                      <Icon name="location" size={14} className="shrink-0 text-primary" />
                      <span className="truncate">
                        {property.city || property.address || 'Location unavailable'}
                      </span>
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-semibold text-ink">
                        <span className="text-amber-400">★</span>
                        {property.rating > 0 ? property.rating.toFixed(1) : 'New'}
                        {property.reviewCount > 0 ? (
                          <span className="font-normal text-gray-ink">
                            ({property.reviewCount})
                          </span>
                        ) : null}
                      </span>
                      <span className="font-bold text-primary">
                        {formatPrice(property.price)}
                        <span className="text-xs font-normal text-gray-ink">/mo</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-lg font-bold tracking-tight text-ink">{children}</h2>;
}

function QuickInfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-card">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint text-primary">
        <Icon name={icon} size={24} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-ink">{label}</p>
        <p className="mt-0.5 truncate font-semibold text-ink">{value}</p>
      </div>
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
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-primary text-white'
          : 'border border-gray-200 bg-white text-gray-ink hover:border-primary hover:text-primary'
      }`}
    >
      {children}
    </button>
  );
}
