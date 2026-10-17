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
  trailTail,
  action,
}: {
  propertyId: number;
  name: string;
  subtitle?: string;
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

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{name}</h1>
          {subtitle ? <p className="mt-1 text-sm text-gray-ink">{subtitle}</p> : null}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </header>
    </>
  );
}
