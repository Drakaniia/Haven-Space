import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth-context';
import { getPopularLocations, listPublicRooms } from '../../lib/api/public';
import type { PublicListingsFilters, PublicListingsResponse } from '../../lib/types';
import { Button, buttonClasses } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Field, SelectInput } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { ListingCard, ListingCardSkeleton } from './ListingCard';
import { MapModal } from './MapModal';

const DEFAULT_FILTERS: PublicListingsFilters = { sort_by: 'newest', limit: 20, offset: 0 };

const PRICE_OPTIONS = [
  { value: 'any', label: 'Any price' },
  { value: '0-3000', label: '₱0 – ₱3,000' },
  { value: '3000-5000', label: '₱3,000 – ₱5,000' },
  { value: '5000-8000', label: '₱5,000 – ₱8,000' },
  { value: '8000+', label: '₱8,000 and up' },
];

const TYPE_OPTIONS = [
  { value: 'any', label: 'Any property type' },
  { value: 'boarding-house', label: 'Boarding house' },
  { value: 'dormitory', label: 'Dormitory' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'studio-unit', label: 'Studio unit' },
  { value: 'others', label: 'Others' },
];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest listings' },
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

/** The loader's first page is only valid for the default query, never for a filtered one. */
function isDefaultQuery(filters: PublicListingsFilters): boolean {
  return (
    !filters.search &&
    filters.price_min === undefined &&
    filters.price_max === undefined &&
    (filters.sort_by ?? 'newest') === DEFAULT_FILTERS.sort_by &&
    (filters.offset ?? 0) === 0 &&
    (filters.limit ?? 20) === DEFAULT_FILTERS.limit
  );
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchInput, setSearchInput] = useState('');
  // The map opens in place so a visitor never loses their filters or scroll position
  // (spec `find-a-room-map-modal` D1/D6).
  const [mapOpen, setMapOpen] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const amenitiesRef = useRef<HTMLDivElement>(null);
  const amenitiesMenuId = useId();

  const query = useQuery({
    queryKey: ['rooms', filters],
    queryFn: () => listPublicRooms(filters),
    initialData: isDefaultQuery(filters) ? initialData : undefined,
    // Keep the current results on screen while a new filter loads, instead of
    // flashing the skeleton on every change.
    placeholderData: keepPreviousData,
  });

  const popular = useQuery({
    queryKey: ['popular-locations'],
    queryFn: () => getPopularLocations(5),
  });

  // The amenities menu closes on an outside press or Escape, like any menu.
  useEffect(() => {
    if (!amenitiesOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && amenitiesRef.current?.contains(event.target)) return;
      setAmenitiesOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setAmenitiesOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [amenitiesOpen]);

  function applyPriceRange(value: string) {
    setPriceRange(value);
    if (value === 'any') {
      setFilters(f => ({ ...f, price_min: undefined, price_max: undefined, offset: 0 }));
      return;
    }
    const [min, max] = value.replace('+', '').split('-');
    if (max) {
      setFilters(f => ({ ...f, price_min: Number(min), price_max: Number(max), offset: 0 }));
    } else {
      setFilters(f => ({ ...f, price_min: Number(min), price_max: undefined, offset: 0 }));
    }
  }

  function applySort(value: string) {
    setFilters(f => ({ ...f, sort_by: value, offset: 0 }));
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

  function clearSearch() {
    setSearchInput('');
    setFilters(f => ({ ...f, search: undefined, offset: 0 }));
  }

  function goToPage(offset: number) {
    setFilters(f => ({ ...f, offset: Math.max(0, offset) }));
    resultsRef.current?.scrollIntoView({ block: 'start' });
  }

  const pageProperties = query.data?.data.properties ?? [];

  // Client-side filtering for amenities + property type (API filters by search/price/sort only)
  let properties = pageProperties;
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

  const apiTotal = query.data?.data.total_count;
  const totalCount = apiTotal ?? pageProperties.length;
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  // A full page means there may be more; the API's total, when present, settles it.
  const hasNext =
    pageProperties.length >= limit && (apiTotal === undefined || offset + limit < apiTotal);
  const hasPrev = offset > 0;
  const pageNumber = Math.floor(offset / limit) + 1;

  const clientFiltered = selectedAmenities.length > 0 || roomType !== 'any';
  const filterCount = (priceRange !== 'any' ? 1 : 0) + (roomType !== 'any' ? 1 : 0) + selectedAmenities.length;
  const hasActiveFilters = filterCount > 0 || Boolean(filters.search);
  const updating = query.isFetching && query.isPlaceholderData;

  const countHeading = clientFiltered
    ? `${plural(properties.length, 'match', 'matches')} on this page`
    : plural(totalCount, 'place to stay', 'places to stay');

  return (
    <div className="bg-cream">
      {/* ================= HEADER ================= */}
      <section className="paper-grain border-b border-border">
        <div className="rise-in mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 md:pt-14 lg:px-8">
          <p className="kicker">Find a room</p>
          <h1 className="display-lg mt-3 max-w-3xl text-ink">
            Boarding houses near your school and work
          </h1>
          <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-gray-ink">
            Browse verified rooms, compare rent and amenities, then request a tour or apply in a
            few steps.
          </p>

          <form
            role="search"
            className="mt-8 flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={e => {
              e.preventDefault();
              runSearch();
            }}
          >
            <div className="relative flex-1">
              <label htmlFor="find-a-room-search" className="sr-only">
                Search by location, university or property name
              </label>
              <Icon
                name="search"
                size={20}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                id="find-a-room-search"
                type="search"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Location, university or property name"
                className="h-12 w-full rounded-xl border border-border-strong bg-surface pl-11 pr-4 text-base text-ink shadow-card transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="lg" className="flex-1 sm:flex-none">
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setMapOpen(true)}
                aria-haspopup="dialog"
              >
                <Icon name="map" size={18} />
                Map
              </Button>
            </div>
          </form>

          {popular.data && popular.data.data.locations.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-ink">Popular:</span>
              {popular.data.data.locations.map(location => {
                const active = filters.search === location.search_value;
                return (
                  <button
                    key={location.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSearchInput(location.search_value);
                      setFilters(f => ({ ...f, search: location.search_value, offset: 0 }));
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-[background-color,border-color,color] duration-150 ${
                      active
                        ? 'border-primary/40 bg-mint text-primary-dark'
                        : 'border-border bg-surface text-gray-ink hover:border-border-strong hover:text-ink'
                    }`}
                  >
                    {location.name}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Guest CTA — hidden for signed-in users */}
          {!isAuthenticated ? (
            <p className="mt-6 text-sm text-gray-ink">
              Want to apply for a room?{' '}
              <Link
                to="/auth/login"
                className="font-semibold text-primary underline underline-offset-[3px] hover:text-primary-hover"
              >
                Log in or sign up
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      {/* ================= FILTER BAR ================= */}
      <div className="chrome-topbar sticky top-16 z-30 border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
          {/* Phones and small tablets: one button opens the filter sheet. */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            className="md:hidden"
          >
            <Icon name="settings" size={16} />
            Filters
            {filterCount > 0 ? (
              <span className="tabular ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-strong px-1.5 text-xs text-white">
                {filterCount}
              </span>
            ) : null}
          </Button>

          {/* Tablet and desktop: the filters themselves. */}
          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <SelectInput
              aria-label="Price range"
              value={priceRange}
              onChange={e => applyPriceRange(e.target.value)}
              className="w-auto min-w-[9.5rem] cursor-pointer"
            >
              {PRICE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
            <SelectInput
              aria-label="Property type"
              value={roomType}
              onChange={e => setRoomType(e.target.value)}
              className="w-auto min-w-[10.5rem] cursor-pointer"
            >
              {TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>

            <div className="relative" ref={amenitiesRef}>
              <button
                type="button"
                aria-expanded={amenitiesOpen}
                aria-controls={amenitiesMenuId}
                onClick={() => setAmenitiesOpen(o => !o)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl border bg-surface px-3.5 py-2.5 text-base text-ink transition-[border-color,box-shadow] duration-150 hover:border-primary/50 ${
                  selectedAmenities.length > 0 ? 'border-primary/60' : 'border-border-strong'
                }`}
              >
                {selectedAmenities.length > 0
                  ? `Amenities · ${selectedAmenities.length}`
                  : 'Amenities'}
                <Icon
                  name="chevronDown"
                  size={16}
                  className={`text-muted transition-transform duration-150 ${amenitiesOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {amenitiesOpen ? (
                <div
                  id={amenitiesMenuId}
                  role="group"
                  aria-label="Amenities"
                  className="menu-pop absolute left-0 top-full z-50 mt-2 w-60 rounded-2xl border border-border bg-surface p-2 shadow-pop [transform-origin:top_left]"
                >
                  {AMENITY_OPTIONS.map(amenity => (
                    <AmenityCheckbox
                      key={amenity}
                      amenity={amenity}
                      checked={selectedAmenities.includes(amenity)}
                      onToggle={() => toggleAmenity(amenity)}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {hasActiveFilters ? (
              <Button type="button" variant="ghost" onClick={resetFilters}>
                Clear all
              </Button>
            ) : null}
          </div>

          {/* Always visible: sort and layout. */}
          <div className="ml-auto flex items-center gap-2">
            <SelectInput
              aria-label="Sort by"
              value={filters.sort_by ?? 'newest'}
              onChange={e => applySort(e.target.value)}
              className="w-auto max-w-[11rem] cursor-pointer sm:max-w-none"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
            <div
              role="group"
              aria-label="Layout"
              className="hidden items-center rounded-xl border border-border-strong bg-surface p-1 sm:flex"
            >
              <ViewToggle
                label="Grid view"
                icon="grid"
                active={view === 'grid'}
                onClick={() => setView('grid')}
              />
              <ViewToggle
                label="List view"
                icon="list"
                active={view === 'list'}
                onClick={() => setView('list')}
              />
            </div>
          </div>
        </div>

        {/* Active filters, each removable on its own. */}
        {hasActiveFilters ? (
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 pb-3 sm:px-6 lg:px-8">
            {filters.search ? (
              <FilterTag label={`“${filters.search}”`} onRemove={clearSearch} removeLabel="Clear search" />
            ) : null}
            {priceRange !== 'any' ? (
              <FilterTag
                label={PRICE_OPTIONS.find(o => o.value === priceRange)?.label ?? priceRange}
                onRemove={() => applyPriceRange('any')}
                removeLabel="Remove price filter"
              />
            ) : null}
            {roomType !== 'any' ? (
              <FilterTag
                label={TYPE_OPTIONS.find(o => o.value === roomType)?.label ?? roomType}
                onRemove={() => setRoomType('any')}
                removeLabel="Remove type filter"
              />
            ) : null}
            {selectedAmenities.map(amenity => (
              <FilterTag
                key={amenity}
                label={amenity}
                onRemove={() => toggleAmenity(amenity)}
                removeLabel={`Remove ${amenity} filter`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* ================= RESULTS ================= */}
      <section
        ref={resultsRef}
        aria-labelledby="find-a-room-results"
        className="mx-auto max-w-7xl scroll-mt-32 px-4 pb-16 sm:px-6 lg:px-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 pb-6 pt-8">
          <div aria-live="polite">
            <h2 id="find-a-room-results" className="display-md text-ink">
              {query.isPending ? 'Finding rooms…' : countHeading}
            </h2>
            <p className="mt-1.5 text-sm text-gray-ink">
              {clientFiltered
                ? `Amenity and type filters narrow the ${plural(pageProperties.length, 'place')} on this page.`
                : filters.search
                ? `Results for “${filters.search}”.`
                : 'Boarding houses, dorms and apartments listed on Haven Space.'}
            </p>
          </div>
          {updating ? (
            <p className="text-sm text-gray-ink" role="status">
              Updating…
            </p>
          ) : null}
        </div>

        {query.isPending ? (
          <ul
            aria-label="Loading rooms"
            className={`grid gap-6 ${view === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}
          >
            {Array.from({ length: 6 }, (_, index) => (
              <ListingCardSkeleton key={index} listView={view === 'list'} />
            ))}
          </ul>
        ) : query.error ? (
          <ErrorState
            message="We couldn't load rooms right now."
            hint={query.error.message}
            action={
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : properties.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon="search"
              title="No rooms match these filters"
              description="Try a wider price range, fewer amenities or a different area."
              action={
                <Button variant="outline" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="buildingOffice"
              title="No rooms listed yet"
              description="New boarding houses appear here as soon as landlords publish them."
            />
          )
        ) : (
          <ul
              aria-busy={updating}
              className={`grid gap-6 transition-opacity duration-200 ${updating ? 'opacity-60' : ''} ${
                view === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {properties.map(property => (
                <ListingCard
                  key={property.id}
                  property={property}
                  detailTo={detailTo}
                  listView={view === 'list'}
                />
              ))}
            </ul>
        )}

        {!query.isPending && !query.error && (hasPrev || hasNext) ? (
          <nav
            aria-label="Pages"
            className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6"
          >
            <Button
              variant="outline"
              disabled={!hasPrev || updating}
              onClick={() => goToPage(offset - limit)}
            >
              <Icon name="chevronLeft" size={16} />
              Previous
            </Button>
            <p className="tabular text-sm text-gray-ink">Page {pageNumber}</p>
            <Button
              variant="outline"
              disabled={!hasNext || updating}
              onClick={() => goToPage(offset + limit)}
            >
              Next
              <Icon name="chevronRight" size={16} />
            </Button>
          </nav>
        ) : null}
      </section>

      {/* ================= MOBILE FILTER SHEET ================= */}
      <Drawer
        open={sheetOpen}
        title="Filters"
        onClose={() => setSheetOpen(false)}
        footer={
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Clear all
            </Button>
            <Button type="button" className="flex-1" onClick={() => setSheetOpen(false)}>
              {query.isPending ? 'Show results' : `Show ${countHeading}`}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label="Price range" htmlFor="sheet-price">
            <SelectInput
              id="sheet-price"
              value={priceRange}
              onChange={e => applyPriceRange(e.target.value)}
            >
              {PRICE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Property type" htmlFor="sheet-type">
            <SelectInput id="sheet-type" value={roomType} onChange={e => setRoomType(e.target.value)}>
              {TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">Amenities</legend>
            <div className="grid grid-cols-1 gap-1 min-[380px]:grid-cols-2">
              {AMENITY_OPTIONS.map(amenity => (
                <AmenityCheckbox
                  key={amenity}
                  amenity={amenity}
                  checked={selectedAmenities.includes(amenity)}
                  onToggle={() => toggleAmenity(amenity)}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </Drawer>

      <MapModal open={mapOpen} onClose={() => setMapOpen(false)} />
    </div>
  );
}

function AmenityCheckbox({
  amenity,
  checked,
  onToggle,
}: {
  amenity: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink transition-colors duration-100 hover:bg-subtle">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
      />
      {amenity}
    </label>
  );
}

function FilterTag({
  label,
  onRemove,
  removeLabel,
}: {
  label: string;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-mint py-1 pl-2.5 pr-1 text-xs font-medium text-primary-dark">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="flex h-5 w-5 items-center justify-center rounded-md transition-colors duration-100 hover:bg-primary-strong/15"
      >
        <Icon name="close" size={12} />
      </button>
    </span>
  );
}

function ViewToggle({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 ${
        active ? 'bg-mint text-primary-dark' : 'text-gray-ink hover:bg-subtle hover:text-ink'
      }`}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}
