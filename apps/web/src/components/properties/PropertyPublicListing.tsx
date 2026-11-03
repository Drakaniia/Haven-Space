import { Link } from '@tanstack/react-router';
import type { LandlordPropertyDetail } from '../../lib/types';
import { listingStatusPill, listingStatusTone } from '../../lib/listing-status';
import { buttonClasses } from '../ui/Button';
import { Card } from '../ui/Card';
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
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-ink">{detail.name}</h2>
            <p className="mt-1 text-sm text-gray-ink">
              {propertyTypeLabel(detail.type)} · {locationLabel(detail.city, detail.province)}
            </p>
          </div>
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
        </div>

        {/* One control per destination (`edit-listing-property-info` D18): this
            pane keeps the way to the editor and nothing that mutates status. */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Link
            to="/landlord/listings/$id/edit"
            params={{ id: String(detail.id) }}
            className={buttonClasses()}
          >
            Edit listing
          </Link>
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-semibold tracking-tight text-ink">Listing details</h3>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Row label="Monthly rent" value={formatPeso(detail.monthlyPayment)} />
          <Row label="Deposit" value={formatPeso(detail.monthlyDeposit)} />
          <Row label="Minimum stay" value={detail.min_stay || 'Not specified'} />
          <Row label="Amenities" value={amenitiesLabel(detail.amenities)} />
        </dl>

        <div className="mt-5 border-t border-border pt-4">
          <h4 className="text-sm font-medium text-ink">Description</h4>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-ink">
            {detail.description?.trim() ? detail.description : 'No description yet.'}
          </p>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <h4 className="text-sm font-medium text-ink">House rules</h4>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-ink">
            {detail.rules?.trim() ? detail.rules : 'No house rules listed.'}
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-semibold tracking-tight text-ink">Photos</h3>
        <p className="mt-1 text-sm text-gray-ink">
          The first photo is the cover boarders see in search results.
        </p>

        {detail.photos.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {detail.photos.map((photo, index) => (
              <li key={photo} className="overflow-hidden rounded-xl border border-border">
                <img src={photo} alt="" className="h-28 w-full object-cover" />
                {index === 0 ? (
                  <p className="border-t border-border bg-subtle px-2 py-1 text-[11px] text-gray-ink">
                    Cover photo
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border-strong p-5 text-center text-sm text-gray-ink">
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
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
