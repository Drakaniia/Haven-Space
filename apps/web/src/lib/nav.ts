import { BROWSE_LISTINGS_PATH } from './routes';
import type { AuthUser } from './types';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  group: string;
  /**
   * Search params for a destination that shares its path with its siblings.
   *
   * Admin's eight sections all live on `/admin`, so `to` alone cannot tell them
   * apart — without this, every one of them matches every other one and the
   * whole list renders active at once (`admin-apple-ui-restructure` D16/D28).
   * Optional, so no existing landlord/boarder item changes (D20).
   */
  search?: Record<string, string>;
}

export const BOARDER_NAV: NavItem[] = [
  { to: '/boarder', label: 'Dashboard', icon: 'home', group: 'Main' },
  { to: '/boarder/tenancy', label: 'My Tenancy', icon: 'document', group: 'Main' },
  { to: '/boarder/applications', label: 'Applications', icon: 'application', group: 'Main' },
  { to: BROWSE_LISTINGS_PATH, label: 'Find a Room', icon: 'search', group: 'Discovery' },
  { to: '/boarder/messages', label: 'Messages', icon: 'chat', group: 'Communication' },
  {
    to: '/boarder/announcements',
    label: 'Announcements',
    icon: 'announcement',
    group: 'Communication',
  },
  { to: '/boarder/payments', label: 'Payments', icon: 'payment', group: 'Payments' },
  { to: '/boarder/house-rules', label: 'House Rules', icon: 'book', group: 'Info' },
  { to: '/boarder/settings', label: 'Settings', icon: 'settings', group: 'Account' },
];

/**
 * Sidebar for boarders without a confirmed tenancy (`boarder_status` !==
 * 'confirmed'): enough to discover rooms, apply, and manage the account —
 * nothing that only makes sense once they live in a boarding house (spec
 * `pre-tenancy-boarder-nav` R1/R2/R4). Rendered as a single `Main` group.
 */
export const BOARDER_LIMITED_NAV: NavItem[] = [
  { to: '/boarder/applications', label: 'Applications', icon: 'application', group: 'Main' },
  { to: BROWSE_LISTINGS_PATH, label: 'Find a Room', icon: 'search', group: 'Main' },
  { to: '/boarder/settings', label: 'Settings', icon: 'settings', group: 'Main' },
];

/**
 * Pure status → sidebar mapping for boarders. Only a `confirmed` booking
 * (active tenancy) unlocks the full list; every other status — including an
 * unknown/undefined one (fail-safe, spec R14) — gets the limited list.
 */
export function getBoarderNav(status: string | undefined): NavItem[] {
  return status === 'confirmed' ? BOARDER_NAV : BOARDER_LIMITED_NAV;
}

/**
 * The landlord sidebar.
 *
 * There is no `My Listings` entry any more: `/landlord/listings` was the same
 * card list as `/landlord/properties` and was removed
 * (`landlord-property-detail-page` D2/R3), leaving Properties as the single
 * list. The listing create/edit routes still live under `/landlord/listings`.
 */
export const LANDLORD_NAV: NavItem[] = [
  { to: '/landlord', label: 'Dashboard', icon: 'home', group: 'Main' },
  { to: '/landlord/properties', label: 'Properties', icon: 'buildingOffice', group: 'Main' },
  { to: '/landlord/maps', label: 'Map View', icon: 'map', group: 'Main' },
  { to: '/landlord/invitations', label: 'Invitations', icon: 'document', group: 'Main' },
  { to: '/landlord/applications', label: 'Applications', icon: 'application', group: 'Main' },
  { to: '/landlord/boarders', label: 'Tenants', icon: 'users', group: 'Main' },
  { to: '/landlord/messages', label: 'Messages', icon: 'chat', group: 'Communication' },
  { to: '/landlord/payments', label: 'Payments', icon: 'payment', group: 'Payments' },
  {
    to: '/landlord/announcements',
    label: 'Announcements',
    icon: 'announcement',
    group: 'Communication',
  },
  { to: '/landlord/calendar', label: 'Calendar', icon: 'calendar', group: 'Management' },
  { to: '/landlord/activity', label: 'Activity', icon: 'analytics', group: 'Management' },
  { to: '/landlord/pricing', label: 'Pricing', icon: 'flag', group: 'Management' },
  { to: '/landlord/settings', label: 'Settings', icon: 'settings', group: 'Account' },
];

/**
 * The admin console's sections.
 *
 * `?tab=` values are kebab-case and are the URL contract; internal code should
 * use these keys, never the raw string (`admin-apple-ui-restructure` D30).
 */
export const ADMIN_SECTION_KEYS = [
  'overview',
  'users',
  'properties',
  'applications',
  'landlords',
  'property-access',
  'settings',
  'audit',
] as const;

export type AdminSectionKey = (typeof ADMIN_SECTION_KEYS)[number];

/** An absent or unrecognised `?tab=` lands here, never on a blank pane (D25). */
export const DEFAULT_ADMIN_SECTION: AdminSectionKey = 'overview';

/** Non-throwing: an unknown value resolves to the default rather than erroring. */
export function toAdminSectionKey(value: unknown): AdminSectionKey {
  return typeof value === 'string' && (ADMIN_SECTION_KEYS as readonly string[]).includes(value)
    ? (value as AdminSectionKey)
    : DEFAULT_ADMIN_SECTION;
}

/**
 * The admin console's navigation — the single source of truth for each
 * section's label, icon and search value (`admin-apple-ui-restructure` R2/R4).
 *
 * Section headings and the breadcrumb trail both read their wording from here,
 * so the sidebar, the page and the trail can never drift apart (they did: the
 * heading said "Command Center" while this list said "Overview").
 */
export const ADMIN_NAV: (NavItem & { search: { tab: AdminSectionKey } })[] = [
  {
    to: '/admin',
    label: 'Overview',
    icon: 'home',
    group: 'Operations',
    search: { tab: 'overview' },
  },
  {
    to: '/admin',
    label: 'Users',
    icon: 'users',
    group: 'Operations',
    search: { tab: 'users' },
  },
  {
    to: '/admin',
    label: 'Properties',
    icon: 'list',
    group: 'Operations',
    search: { tab: 'properties' },
  },
  {
    to: '/admin',
    label: 'Applications',
    icon: 'application',
    group: 'Operations',
    search: { tab: 'applications' },
  },
  {
    to: '/admin',
    label: 'Landlords',
    icon: 'shieldCheck',
    group: 'Operations',
    search: { tab: 'landlords' },
  },
  {
    to: '/admin',
    label: 'Property Access',
    icon: 'users',
    group: 'Access & audit',
    search: { tab: 'property-access' },
  },
  {
    to: '/admin',
    label: 'Audit log',
    icon: 'document',
    group: 'Access & audit',
    search: { tab: 'audit' },
  },
  {
    to: '/admin',
    label: 'Settings',
    icon: 'settings',
    group: 'System',
    search: { tab: 'settings' },
  },
];

/**
 * `?tab=` value → section label, for the breadcrumb trail.
 *
 * Lives here rather than in `topbar` so the shared layout component never has
 * to reach into `components/admin/*` (`admin-apple-ui-restructure` R11).
 */
export const ADMIN_SECTION_LABELS: Record<string, string> = Object.fromEntries(
  ADMIN_NAV.map(item => [item.search.tab, item.label])
);

/** Every destination the account menu's primary entry can take. */
export type AccountHomePath = '/admin' | '/landlord' | '/boarder' | '/boarder/applications';

export interface AccountMenuEntry {
  to: AccountHomePath;
  label: string;
}

/**
 * The account menu's primary entry (`UserMenu`).
 *
 * A boarder without a confirmed tenancy lands on their applications list — the
 * dashboard is gated behind a confirmed booking (`pre-tenancy-boarder-nav-spec`
 * D5) — so the entry reads "Application" and links straight there instead of
 * bouncing through `/boarder`. Once the booking is confirmed the entry becomes
 * the real "Dashboard". Landlords and admins are unaffected.
 */
export function accountHomeEntry(
  role: AuthUser['role'] | undefined,
  boarderStatus?: string
): AccountMenuEntry {
  if (role === 'admin') return { to: '/admin', label: 'Dashboard' };
  if (role === 'landlord') return { to: '/landlord', label: 'Dashboard' };

  return boarderStatus === 'confirmed'
    ? { to: '/boarder', label: 'Dashboard' }
    : { to: '/boarder/applications', label: 'Application' };
}
