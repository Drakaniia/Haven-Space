import { Link } from '@tanstack/react-router';
import type { LandlordPropertyDetail } from '../../lib/types';
import { listingStatusPill, listingStatusTone } from '../../lib/listing-status';
import { buttonClasses } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import { formatPeso, moderationPill } from './PropertyCard';
import { amenitiesLabel, locationLabel, propertyTypeLabel } from './PropertyOverview';

/**
 * The `Public listing` tab (`landlord-property-detail-page` D12/R8) — everything
 * a boarder sees on `/rooms/$id`, read-only, with the way back to the editor.
 *
 * Deliberately a *view*, not a second editor: editing stays on the edit route
 * (D24), which is what keeps "what boarders see" and "what I edit" from
 * becoming two drifting forms. Publishing moved there too
 * (`edit-listing-property-info` D18).
 */
export function PropertyPublicListing({ detail }: { detail: LandlordPropertyDetail }) {
  const cover = detail.photos[0];

  return (
    <div className="flex flex-col gap-6">
      <Card padding="p-0" className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr]">
          <div className="aspect-[4/3] w-full overflow-hidden bg-subtle md:aspect-auto md:h-full">
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full min-h-[160px] w-full flex-col items-center justify-center gap-1.5 text-muted">
                <Icon name="photo" size={24} />
                <span className="text-xs">No cover photo</span>
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-col p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={listingStatusTone(detail.status, detail.listing_moderation_status)}
                label={listingStatusPill(detail.status, detail.listing_moderation_status).label}
              />
              <StatusBadge
                status={detail.listing_moderation_status}
                label={moderationPill(detail.listing_moderation_status).label}
              />
            </div>
            <h2 className="mt-3 font-display text-[1.625rem] font-medium leading-tight tracking-[-0.015em] text-ink">
              {detail.name}
            </h2>
            <p className="mt-1 text-sm text-gray-ink">
              {propertyTypeLabel(detail.type)} · {locationLabel(detail.city, detail.province)}
            </p>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="tabular font-display text-2xl font-medium leading-none text-clay">
                {formatPeso(detail.monthlyPayment)}
              </span>
              <span className="text-sm text-gray-ink">/ month</span>
            </p>

            {/* One control per destination (`edit-listing-property-info` D18): this
                pane keeps the way to the editor and nothing that mutates status. */}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
              <Link
                to="/landlord/listings/$id/edit"
                params={{ id: String(detail.id) }}
                className={buttonClasses()}
              >
                Edit listing
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <Card padding="p-5 sm:p-6">
        <h3 className="font-display text-xl font-medium tracking-[-0.01em] text-ink">
          Listing details
        </h3>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Row label="Monthly rent" value={formatPeso(detail.monthlyPayment)} />
          <Row label="Deposit" value={formatPeso(detail.monthlyDeposit)} />
          <Row label="Minimum stay" value={detail.min_stay || 'Not specified'} />
          <Row label="Amenities" value={amenitiesLabel(detail.amenities)} />
        </dl>

        <div className="mt-6 border-t border-border pt-5">
          <h4 className="text-sm font-semibold text-ink">Description</h4>
          <p className="mt-1.5 max-w-[68ch] whitespace-pre-line text-sm leading-relaxed text-gray-ink">
            {detail.description?.trim() ? detail.description : 'No description yet.'}
          </p>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <h4 className="text-sm font-semibold text-ink">House rules</h4>
          <p className="mt-1.5 max-w-[68ch] whitespace-pre-line text-sm leading-relaxed text-gray-ink">
            {detail.rules?.trim() ? detail.rules : 'No house rules listed.'}
          </p>
        </div>
      </Card>

      <Card padding="p-5 sm:p-6">
        <h3 className="font-display text-xl font-medium tracking-[-0.01em] text-ink">Photos</h3>
        <p className="mt-1 text-sm text-gray-ink">
          The first photo is the cover boarders see in search results.
        </p>

        {detail.photos.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {detail.photos.map((photo, index) => (
              <li
                key={photo}
                className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-subtle"
              >
                <img src={photo} alt="" className="h-full w-full object-cover" />
                {index === 0 ? (
                  <span className="absolute left-2 top-2 rounded-md bg-surface/95 px-2 py-0.5 text-[11px] font-semibold text-ink shadow-card">
                    Cover photo
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border-strong p-6 text-center text-sm text-gray-ink">
            No photos yet. Add them on the edit page.
          </p>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-ink">{label}</dt>
      <dd className="tabular mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
