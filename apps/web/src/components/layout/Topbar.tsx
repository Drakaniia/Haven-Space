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
                <li aria-hidden="true" className="shrink-0 text-muted">
                  <Icon name="chevronRight" size={14} />
                </li>
              ) : null}
              <li className="min-w-0">
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
 * Pinned at `lg` and up only, mirroring the sidebar's `lg` pin; below that it
 * stays in the page flow and nothing changes.
 */
export function Topbar() {
  return (
    <header className="chrome-topbar relative flex h-16 shrink-0 items-center justify-between gap-4 px-6 lg:sticky lg:top-0 lg:z-30">
      <Breadcrumbs />
      <div className="flex shrink-0 items-center gap-3">
        <NotificationBell />
        <UserMenu />
      </div>
      <span
        aria-hidden="true"
        className="chrome-scroll-edge pointer-events-none absolute inset-x-0 top-full hidden h-6 lg:block"
      />
    </header>
  );
}
