import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';

/**
 * Trail + heading for the property sub-routes (`landlord-property-detail-page`
 * D6/D7).
 *
 * The shell's `Topbar` breadcrumb is derived from the URL path alone and
 * deliberately drops numeric ids, so it can never name a property. The trail
 * therefore lives here, where the fetched name is actually available, and the
 * shell's own trail keeps rendering alongside it.
 */
export function PropertyDetailHeader({
  propertyId,
  name,
  subtitle,
  meta,
  imageUrl,
  trailTail,
  action,
}: {
  propertyId: number;
  name: string;
  subtitle?: string;
  /** A quiet line under the title: status pills, address, room count. */
  meta?: ReactNode;
  /** Optional cover photo, shown as a small thumbnail beside the title. */
  imageUrl?: string | null;
  /** Appended after the property name, e.g. `Rooms` (D7). Omit on the detail page. */
  trailTail?: string;
  action?: ReactNode;
}) {
  const linkClass =
    'text-gray-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded';

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm">
          <li className="min-w-0">
            <Link to="/landlord/properties" className={linkClass}>
              Properties
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0 text-muted">
            <Icon name="chevronRight" size={14} />
          </li>
          <li className="min-w-0">
            {trailTail ? (
              <Link
                to="/landlord/properties/$id"
                params={{ id: String(propertyId) }}
                className={linkClass}
              >
                {name}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink">
                {name}
              </span>
            )}
          </li>
          {trailTail ? (
            <>
              <li aria-hidden="true" className="shrink-0 text-muted">
                <Icon name="chevronRight" size={14} />
              </li>
              <li className="min-w-0">
                <span aria-current="page" className="font-semibold text-ink">
                  {trailTail}
                </span>
              </li>
            </>
          ) : null}
        </ol>
      </nav>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-4">
          {imageUrl !== undefined ? (
            <span className="hidden h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-mint text-primary sm:flex">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon name="buildingOffice" size={26} />
              )}
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-[1.75rem] font-medium leading-[1.12] tracking-[-0.02em] text-ink sm:text-[2rem]">
              {trailTail ? (
                <>
                  {trailTail}
                  <span className="text-gray-ink"> · {name}</span>
                </>
              ) : (
                name
              )}
            </h1>
            {subtitle ? <p className="mt-1.5 text-sm text-gray-ink">{subtitle}</p> : null}
            {meta ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-gray-ink">
                {meta}
              </div>
            ) : null}
          </div>
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </header>
    </>
  );
}
