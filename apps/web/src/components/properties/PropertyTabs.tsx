import { Link } from '@tanstack/react-router';
import {
  PROPERTY_TAB_BAR_KEYS,
  PROPERTY_TAB_LABELS,
  type PropertyTabKey,
} from '../../lib/property-tabs';

/**
 * The property detail page's tab bar (`landlord-property-detail-page` R6/R7).
 *
 * Every tab is a `Link` so the open section is addressable and shareable, the
 * same contract the admin console uses for its sections. The bar lists the page's
 * panes only: rooms are managed on their own page, reached from the Overview
 * pane's `Manage rooms` button, so there is no Rooms entry here (D26).
 */
export function PropertyTabs({
  propertyId,
  active,
}: {
  propertyId: number;
  active: PropertyTabKey;
}) {
  return (
    <nav aria-label="Property sections" className="mb-6 border-b border-border">
      {/* Scrolls sideways on a narrow phone instead of wrapping into two rows. */}
      <ul className="-mb-px flex items-center gap-1 overflow-x-auto">
        {PROPERTY_TAB_BAR_KEYS.map(key => {
          const isActive = key === active;
          const className = `flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-4 ${
            isActive
              ? 'border-primary font-semibold text-ink'
              : 'border-transparent font-medium text-gray-ink hover:border-border-strong hover:text-ink'
          }`;

          return (
            <li key={key}>
              <Link
                to="/landlord/properties/$id"
                params={{ id: String(propertyId) }}
                // Every tab passes a concrete `tab`, including the default.
                // An *empty* search matches any search in TanStack's link
                // comparison, which left Overview permanently marked active
                // alongside whichever tab was really open.
                search={{ tab: key }}
                aria-current={isActive ? 'page' : undefined}
                className={className}
              >
                {PROPERTY_TAB_LABELS[key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
