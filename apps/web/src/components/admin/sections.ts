import { ADMIN_NAV, type AdminSectionKey, type NavItem } from '../../lib/nav';
import type { ToastItem } from '../../lib/toast';

/** The console's toast pusher, handed to each section that mutates (`useToasts`). */
export type PushToast = (toast: Omit<ToastItem, 'id'>) => void;

/**
 * Locale date for table cells — unchanged from the pre-restructure surface.
 *
 * `PropertyAccessTab` formats its history with a time component instead; that
 * inconsistency is recorded in the spec's open questions and deliberately left
 * alone (`admin-apple-ui-restructure` R49).
 */
export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

/**
 * Section identity for the admin console.
 *
 * Labels and icons are read from `ADMIN_NAV` rather than re-typed here, so the
 * sidebar item, the section heading and the breadcrumb can never disagree about
 * what a section is called (`admin-apple-ui-restructure` R4 — the surface
 * previously had a heading reading "Command Center" next to a nav item reading
 * "Overview").
 */
const SECTION_NAV = new Map<string, NavItem & { search: { tab: AdminSectionKey } }>(
  ADMIN_NAV.map(item => [item.search.tab, item])
);

/** Heading (icon + title) for a section. Falls back safely rather than throwing. */
export function sectionHeading(section: AdminSectionKey): { title: string; icon: string } {
  const item = SECTION_NAV.get(section);
  return { title: item?.label ?? section, icon: item?.icon ?? 'document' };
}

/**
 * The one-line description under each section's heading.
 *
 * `Record<AdminSectionKey, string>` so a new section cannot be added without
 * giving it a subtitle — that is the only place section copy can go missing.
 *
 * These eight lines are the *only* new copy in the whole restructure
 * (`admin-apple-ui-restructure` D6/D22/R14); the Overview line is the surface's
 * existing lead paragraph carried over verbatim.
 */
export const SECTION_SUBTITLES: Record<AdminSectionKey, string> = {
  overview: 'Platform overview — accounts, listings, and applications.',
  users: 'Every account on the platform — boarders, landlords and admins.',
  properties: 'Listings submitted for moderation and their current status.',
  applications: 'Boarder applications across all properties.',
  landlords: 'Verify landlord accounts and review their documents.',
  'property-access': "Grant and revoke a landlord's access to a property.",
  settings: 'Platform-wide configuration values.',
  audit: 'Every administrative action, newest first.',
};
