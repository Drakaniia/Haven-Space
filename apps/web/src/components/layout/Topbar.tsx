import { Link, useLocation } from '@tanstack/react-router';
import { Fragment } from 'react';
import { ADMIN_SECTION_LABELS } from '../../lib/nav';
import { Icon } from '../ui/Icon';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

/**
 * How each route segment reads in a breadcrumb trail. Segments that aren't
 * listed fall back to a de-hyphenated title-case form, so a new route still
 * gets a readable crumb without touching this map.
 *
 * Section labels deliberately match the sidebar's wording (e.g. `boarders` →
 * "Tenants") so the bar and the nav agree about what a place is called.
 */
const SEGMENT_LABELS: Record<string, string> = {
  landlord: 'Landlord',
  boarder: 'Boarder',
  admin: 'Admin',
  onboarding: 'Onboarding',
  listings: 'Listings',
  properties: 'Properties',
  applications: 'Applications',
  boarders: 'Tenants',
  invitations: 'Invitations',
  announcements: 'Announcements',
  calendar: 'Calendar',
  activity: 'Activity',
  messages: 'Messages',
  maps: 'Map view',
  payments: 'Payments',
  pricing: 'Pricing',
  settings: 'Settings',
  verification: 'Verification',
  rooms: 'Rooms',
  create: 'Create listing',
  record: 'Record a payment',
};

export interface Crumb {
  label: string;
  /** Absent on the current page — the last crumb is text, not a link. */
  to?: string;
}

function titleCase(segment: string): string {
  const words = segment.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Pathname (+ search) → breadcrumb trail.
 *
 * Route params (ids) are dropped rather than rendered as a bare number: the
 * record's own name isn't in the URL, so the static segment names the step
 * instead — `Listings / Edit`, not `Listings / 3 / Edit`.
 *
 * A `?tab=` value adds one trailing crumb naming the open section, so a
 * deep-linkable section is visible to wayfinding and the trail agrees with the
 * sidebar (`admin-apple-ui-restructure` R11).
 *
 * That lookup is scoped to the admin console, which is the only route whose
 * `?tab=` values *are* admin section keys. It used to run on every route on the
 * assumption that no other route declared a `tab` param — no longer true: the
 * landlord property detail page uses `?tab=` too
 * (`landlord-property-detail-page` R6), and its `applications` key collided with
 * the admin section of the same name, adding a bogus "Applications" crumb to a
 * landlord page.
 */
export function buildTrail(pathname: string, search?: Record<string, unknown>): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];
  let href = '';

  for (const segment of segments) {
    href += `/${segment}`;
    if (/^\d+$/.test(segment)) continue;
    crumbs.push({ label: SEGMENT_LABELS[segment] ?? titleCase(segment), to: href });
  }

  const tab = typeof search?.tab === 'string' ? search.tab : undefined;
  const sectionLabel = tab && pathname === '/admin' ? ADMIN_SECTION_LABELS[tab] : undefined;
  if (sectionLabel) crumbs.push({ label: sectionLabel });

  return crumbs;
}

/**
 * Wayfinding for the role shells: where am I, and how do I get back up.
 *
 * The shell's topbar carries this instead of the page title — each page names
 * itself exactly once, in its own `PageHeader` (`landlord-apple-ui-restructure`
 * D7/D10/R7). A route with no derivable trail renders nothing rather than a
 * broken crumb.
 */
export function Breadcrumbs() {
  const { pathname, search } = useLocation();
  const crumbs = buildTrail(pathname, search as Record<string, unknown>);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.to ?? crumb.label}>
              {index > 0 ? (
                <li aria-hidden="true" className="hidden shrink-0 text-muted sm:block">
                  <Icon name="chevronRight" size={14} />
                </li>
              ) : null}
              <li className={isLast ? 'min-w-0' : 'hidden min-w-0 sm:block'}>
                {isLast ? (
                  <span aria-current="page" className="block truncate font-semibold text-ink">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.to}
                    className="block truncate text-gray-ink transition-colors hover:text-primary"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Shell topbar: floating chrome, not a titled banner.
 *
 * Rendered as a translucent material (`.chrome-topbar`) that content scrolls
 * underneath — which is why it carries a soft scroll-edge underlay instead of a
 * hard `border-b` divider (apple-design §12). The underlay is a child of this
 * element, so it never needs a hardcoded topbar height.
 *
 * Pinned at every size. Below `lg` the sidebar is hidden, so the bar also
 * carries the menu button that opens the navigation drawer (`onOpenNav`).
 */
export function Topbar({ onOpenNav }: { onOpenNav?: () => void } = {}) {
  return (
    <header className="chrome-topbar sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenNav ? (
          <button
            type="button"
            aria-label="Open navigation"
            onClick={onOpenNav}
            className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-subtle active:scale-[0.96] lg:hidden"
          >
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none">
              <path
                d="M3 6h14M3 10h14M3 14h9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        <Breadcrumbs />
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <NotificationBell />
        <UserMenu />
      </div>
      <span
        aria-hidden="true"
        className="chrome-scroll-edge pointer-events-none absolute inset-x-0 top-full h-6"
      />
    </header>
  );
}
