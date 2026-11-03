import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth-context';
import { getPopularLocations, listPublicRooms } from '../../lib/api/public';
import type {
  PublicListingsFilters,
  PublicListingsResponse,
  PublicProperty,
} from '../../lib/types';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Spinner } from '../ui/Spinner';
import { MapModal } from './MapModal';

const DEFAULT_FILTERS: PublicListingsFilters = { sort_by: 'newest', limit: 20, offset: 0 };

const PRICE_OPTIONS = [
  { value: 'any', label: 'Any Price' },
  { value: '0-3000', label: '₱0 - ₱3,000' },
  { value: '3000-5000', label: '₱3,000 - ₱5,000' },
  { value: '5000-8000', label: '₱5,000 - ₱8,000' },
  { value: '8000+', label: '₱8,000+' },
];

const TYPE_OPTIONS = [
  { value: 'any', label: 'Select type' },
  { value: 'boarding-house', label: 'Boarding House' },
  { value: 'dormitory', label: 'Dormitory' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'studio-unit', label: 'Studio Unit' },
  { value: 'others', label: 'Others' },
];

const AMENITY_OPTIONS = [
  'WiFi',
  'Air conditioning',
  'Furnished',
  'Parking',
  'Laundry',
  'Kitchen',
  'CCTV',
  'Security',
];

// Values must match the filenames in apps/web/public/assets/svg exactly — the
// dev server and Cloudflare Pages are case-sensitive, so a wrong name 404s the icon.
const AMENITY_ICONS: Record<string, string> = {
  wifi: 'wfifi',
  'Air conditioning': 'aircon',
  ac: 'aircon',
  furnished: 'furnished',
  parking: 'parking',
  laundry: 'Laundry',
  kitchen: 'Kitchen',
  cctv: 'cctv',
  security: 'shieldCheck',
};

export function amenityIcon(amenity: string): string {
  const key = amenity.toLowerCase();
  return AMENITY_ICONS[key] ?? AMENITY_ICONS[amenity] ?? 'checkSimple';
}

function Badge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    verified: 'bg-primary-strong text-white',
    new: 'bg-green-400 text-white',
    promo: 'bg-pink-600 text-white',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide ${
        styles[type] ?? 'bg-gray-ink text-white'
      }`}
    >
      {type === 'verified' ? (
        <img src="/assets/svg/verified.svg" alt="" width={12} height={12} className="shrink-0" />
      ) : null}
      {type}
    </span>
  );
}

function PropertyCard({
  property,
  detailTo,
  listView,
}: {
  property: PublicProperty;
  detailTo: string;
  listView: boolean;
}) {
  const [favorite, setFavorite] = useState(false);
  const image = property.image || '/assets/images/placeholder-room.svg';
  const previewAmenities = property.amenities.slice(0, 3);
  const moreCount = Math.max(0, property.amenities.length - 3);
  const available = property.availableRooms > 0;

  return (
    <li
      className={`group overflow-hidden rounded-2xl bg-surface shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-pop ${
        listView ? 'grid sm:grid-cols-[320px_1fr]' : ''
      }`}
    >
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={image}
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 flex flex-col gap-2">
          {property.badges.map(badge => (
            <Badge key={badge} type={badge} />
          ))}
        </div>
        <button
          type="button"
          aria-label={favorite ? 'Remove from saved' : 'Save this property'}
          onClick={() => setFavorite(f => !f)}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface/95 shadow-card transition-transform hover:scale-110"
        >
          <img
            src="/assets/svg/bookmark.svg"
            alt=""
            width={20}
            height={20}
            className={`shrink-0 transition-colors ${
              favorite
                ? '[filter:invert(29%)_sepia(72%)_saturate(5438%)_hue-rotate(322deg)_brightness(92%)_contrast(97%)]'
                : ''
            }`}
          />
        </button>
        {previewAmenities.length > 0 ? (
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-full bg-black/30 p-2 backdrop-blur-sm">
            {previewAmenities.map(amenity => (
              <span
                key={amenity}
                title={amenity}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-white"
              >
                <img
                  src={`/assets/svg/${amenityIcon(amenity)}.svg`}
                  alt=""
                  width={14}
                  height={14}
                  className="shrink-0"
                />
              </span>
            ))}
            {moreCount > 0 ? (
              <span className="ml-1 text-xs font-semibold text-white">+{moreCount}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className={`flex flex-col p-5 ${listView ? 'justify-between' : ''}`}>
        <div className={`flex items-center justify-between gap-2 ${listView ? '' : ''}`}>
          <p className="flex items-center gap-1.5 text-sm text-gray-ink">
            <img
              src="/assets/svg/location.svg"
              alt=""
              width={14}
              height={14}
              className="shrink-0"
            />
            <span className="truncate">{property.city || property.address}</span>
          </p>
          <p className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink">
            <span className="text-amber-400">★</span>
            <span>{property.rating}</span>
            <span className="font-normal text-gray-ink">({property.reviews})</span>
          </p>
        </div>
        <h3 className="mt-2 text-lg font-bold leading-snug text-ink">{property.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-gray-ink">{property.address}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-ink">
          <span className="flex items-center gap-1.5">
            <img src="/assets/svg/user.svg" alt="" width={14} height={14} className="shrink-0" />
            {property.roomTypes || 'Rooms available'}
          </span>
          <span className="flex items-center gap-1.5">
            <img
              src="/assets/svg/calendar.svg"
              alt=""
              width={14}
              height={14}
              className="shrink-0"
            />
            {available ? 'Available Now' : 'No Availability'}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <p className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-primary">
              ₱{property.price.toLocaleString()}
            </span>
            <span className="text-sm text-gray-ink">/month</span>
          </p>
          <Link
            to={detailTo}
            params={{ id: String(property.id) }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-strong px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-hover"
          >
            View Details
            <img
              src="/assets/svg/chevron-right.svg"
              alt=""
              width={16}
              height={16}
              className="shrink-0"
            />
          </Link>
        </div>
      </div>
    </li>
  );
}

export function FindARoomContent({
  initialData,
  detailTo = '/rooms/$id',
}: {
  initialData?: PublicListingsResponse;
  detailTo?: string;
}) {
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<PublicListingsFilters>(DEFAULT_FILTERS);
  const [priceRange, setPriceRange] = useState('any');
  const [roomType, setRoomType] = useState('any');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchInput, setSearchInput] = useState('');
  // The map opens in place so a visitor never loses their filters or scroll position
  // (spec `find-a-room-map-modal` D1/D6).
  const [mapOpen, setMapOpen] = useState(false);

  const query = useQuery({
    queryKey: ['rooms', filters],
    queryFn: () => listPublicRooms(filters),
    initialData,
  });

  const popular = useQuery({
    queryKey: ['popular-locations'],
    queryFn: () => getPopularLocations(5),
  });

  function applyPriceRange(value: string) {
    setPriceRange(value);
    if (value === 'any') {
      setFilters(f => ({ ...f, price_min: undefined, price_max: undefined }));
      return;
    }
    const [min, max] = value.split('-');
    if (max) {
      setFilters(f => ({ ...f, price_min: Number(min), price_max: Number(max) }));
    } else {
      setFilters(f => ({ ...f, price_min: Number(min), price_max: undefined }));
    }
  }

  function toggleAmenity(amenity: string) {
    setSelectedAmenities(list =>
      list.includes(amenity) ? list.filter(a => a !== amenity) : [...list, amenity]
    );
  }

  function resetFilters() {
    setPriceRange('any');
    setRoomType('any');
    setSelectedAmenities([]);
    setSearchInput('');
    setFilters({ ...DEFAULT_FILTERS, limit: 20, offset: 0 });
  }

  function runSearch() {
    setFilters(f => ({ ...f, search: searchInput.trim() || undefined, offset: 0 }));
  }

  // Client-side filtering for amenities + property type (API filters by search/price/sort only)
  let properties = query.data?.data.properties ?? [];
  if (selectedAmenities.length > 0) {
    properties = properties.filter(p =>
      selectedAmenities.every(sel =>
        p.amenities.some(a => a.toLowerCase().includes(sel.toLowerCase()))
      )
    );
  }
  if (roomType !== 'any') {
    const normalized = roomType.replace('-', ' ');
    properties = properties.filter(
      p =>
        p.rooms.some(
          r =>
            r.type.toLowerCase().includes(normalized) ||
            r.room_name.toLowerCase().includes(normalized)
        ) || p.title.toLowerCase().includes(normalized)
    );
  }

  const totalCount = query.data?.data.total_count ?? properties.length;
  const hasMore = properties.length >= (filters.limit ?? 20);

  function loadMore() {
    setFilters(f => ({ ...f, offset: (f.offset ?? 0) + (f.limit ?? 20) }));
  }

  return (
    <div className="bg-cream">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark px-4 py-16 text-white md:py-20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Explore Rooms</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg opacity-95">
            Discover verified boarding houses near your university with all the amenities you need
          </p>

          {/* Search box */}
          <form
            className="mt-8 flex items-center gap-2 rounded-2xl bg-surface p-2 shadow-pop"
            onSubmit={e => {
              e.preventDefault();
              runSearch();
            }}
          >
            <img
              src="/assets/svg/search.svg"
              alt=""
              width={22}
              height={22}
              className="ml-2 shrink-0 opacity-70"
            />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by location, university, or property name..."
              className="flex-1 border-none bg-transparent px-2 py-2 text-ink outline-none placeholder:text-gray-ink"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-strong px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover"
            >
              Search
              <img
                src="/assets/svg/chevron-right.svg"
                alt=""
                width={16}
                height={16}
                className="shrink-0"
              />
            </button>
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-mint"
              title="View Map"
            >
              <img src="/assets/svg/maps.svg" alt="" width={20} height={20} className="shrink-0" />
              Map
            </button>
          </form>

          {/* Location chips */}
          {popular.data ? (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm font-medium opacity-90">Popular:</span>
              {popular.data.data.locations.map(location => (
                <button
                  key={location.name}
                  type="button"
                  onClick={() => {
                    setSearchInput(location.search_value);
                    setFilters(f => ({ ...f, search: location.search_value, offset: 0 }));
                  }}
                  className="rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/25"
                >
                  {location.name}
                </button>
              ))}
            </div>
          ) : null}

          {/* Guest CTA — hidden for signed-in users */}
          {!isAuthenticated ? (
            <p className="mt-6 text-sm opacity-95">
              Want to apply for a room?{' '}
              <Link
                to="/auth/login"
                className="font-semibold underline underline-offset-2 hover:text-mint"
              >
                Log in or sign up
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      {/* ================= FILTER BAR ================= */}
      <div className="sticky top-0 z-40 border-b border-border bg-surface shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end gap-6 px-4 py-4">
          {/* Price range */}
          <div className="flex min-w-[9rem] flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-ink">
              <img
                src="/assets/svg/payment.svg"
                alt=""
                width={16}
                height={16}
                className="shrink-0"
              />
              Price Range
            </label>
            <select
              value={priceRange}
              onChange={e => applyPriceRange(e.target.value)}
              className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none transition-colors hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {PRICE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Property type */}
          <div className="flex min-w-[9rem] flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-ink">
              <img src="/assets/svg/home.svg" alt="" width={16} height={16} className="shrink-0" />
              Property Type
            </label>
            <select
              value={roomType}
              onChange={e => setRoomType(e.target.value)}
              className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none transition-colors hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amenities */}
          <div className="flex min-w-[10rem] flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-ink">
              <img
                src="/assets/svg/ameneties.svg"
                alt=""
                width={16}
                height={16}
                className="shrink-0"
              />
              Amenities
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setAmenitiesOpen(o => !o)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm text-ink transition-colors hover:border-primary"
              >
                {selectedAmenities.length > 0
                  ? `${selectedAmenities.length} selected`
                  : 'Select Amenities'}
                <img
                  src="/assets/svg/chevron-down.svg"
                  alt=""
                  width={16}
                  height={16}
                  className={`shrink-0 transition-transform ${amenitiesOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {amenitiesOpen ? (
                <div className="absolute left-0 top-full z-50 mt-2 flex min-w-[14rem] flex-col gap-1 rounded-xl border border-border bg-surface p-3 shadow-pop">
                  {AMENITY_OPTIONS.map(amenity => (
                    <label
                      key={amenity}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors hover:bg-mint/40"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      {amenity}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Distance */}
          <div className="flex min-w-[9rem] flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-ink">
              <img
                src="/assets/svg/LocationPin.svg"
                alt=""
                width={16}
                height={16}
                className="shrink-0"
              />
              Distance
            </label>
            <select
              className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none transition-colors hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/10"
              defaultValue="any"
            >
              <option value="any">Any Distance</option>
              <option value="1">Within 1 km</option>
              <option value="2">Within 2 km</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
            </select>
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-ink transition-colors hover:border-border-strong hover:text-ink"
          >
            <img src="/assets/svg/history.svg" alt="" width={16} height={16} className="shrink-0" />
            Reset
          </button>
        </div>

        {/* Active filter tags */}
        {selectedAmenities.length > 0 || priceRange !== 'any' || roomType !== 'any' ? (
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 border-t border-border px-4 py-3">
            {priceRange !== 'any' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-xs font-medium text-primary-dark">
                {PRICE_OPTIONS.find(o => o.value === priceRange)?.label}
                <button
                  type="button"
                  onClick={() => applyPriceRange('any')}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-strong/20 text-[0.6rem] hover:bg-primary-strong hover:text-white"
                  aria-label="Remove price filter"
                >
                  ✕
                </button>
              </span>
            ) : null}
            {roomType !== 'any' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-xs font-medium text-primary-dark">
                {TYPE_OPTIONS.find(o => o.value === roomType)?.label}
                <button
                  type="button"
                  onClick={() => setRoomType('any')}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-strong/20 text-[0.6rem] hover:bg-primary-strong hover:text-white"
                  aria-label="Remove type filter"
                >
                  ✕
                </button>
              </span>
            ) : null}
            {selectedAmenities.map(amenity => (
              <span
                key={amenity}
                className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-xs font-medium text-primary-dark"
              >
                {amenity}
                <button
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-strong/20 text-[0.6rem] hover:bg-primary-strong hover:text-white"
                  aria-label={`Remove ${amenity} filter`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* ================= RESULTS ================= */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 py-8">
          <div>
            <h2 className="text-2xl font-bold text-ink">{totalCount} Rooms Available</h2>
            <p className="mt-1 text-sm text-gray-ink">
              {query.isLoading ? 'Loading properties...' : 'Verified boarding houses near you.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setView('grid')}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                  view === 'grid'
                    ? 'border-primary bg-primary-strong text-white'
                    : 'border-border bg-surface hover:border-primary'
                }`}
              >
                <img
                  src="/assets/svg/grid2x2.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="shrink-0"
                />
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setView('list')}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                  view === 'list'
                    ? 'border-primary bg-primary-strong text-white'
                    : 'border-border bg-surface hover:border-primary'
                }`}
              >
                <img
                  src="/assets/svg/property.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="shrink-0"
                />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-ink">Sort by:</label>
              <select
                value={filters.sort_by ?? 'newest'}
                onChange={e => setFilters(f => ({ ...f, sort_by: e.target.value }))}
                className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none transition-colors hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest Listings</option>
              </select>
            </div>
          </div>
        </div>

        {query.isLoading ? (
          <Spinner />
        ) : query.error ? (
          <ErrorState message={query.error.message} />
        ) : properties.length === 0 ? (
          <div className="py-16 text-center">
            <img
              src="/assets/svg/alert.svg"
              alt=""
              width={80}
              height={80}
              className="mx-auto mb-6 opacity-50"
            />
            <h3 className="text-2xl font-bold text-ink">No Properties Found</h3>
            <p className="mx-auto mt-2 max-w-md text-gray-ink">
              We couldn&apos;t find any properties matching your criteria. Try adjusting your
              filters or search area.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 rounded-full bg-primary-strong px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            <ul
              className={`grid gap-6 pb-8 ${
                view === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {properties.map(property => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  detailTo={detailTo}
                  listView={view === 'list'}
                />
              ))}
            </ul>
            {hasMore ? (
              <div className="pb-12 pt-4 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  className="inline-flex items-center gap-3 rounded-xl border-2 border-primary bg-surface px-8 py-4 text-base font-semibold text-primary transition-all hover:-translate-y-0.5 hover:bg-primary-strong hover:text-white hover:shadow-lg"
                >
                  <img
                    src="/assets/svg/history.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="shrink-0"
                  />
                  Load More Properties
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
      <MapModal open={mapOpen} onClose={() => setMapOpen(false)} />
    </div>
  );
}
