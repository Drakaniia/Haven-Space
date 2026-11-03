import { ADMIN_NAV, type AdminSectionKey, type NavItem } from '../../lib/nav';
import type { ToastItem } from '../../lib/toast';

/** The console's toast pusher, handed to each section that mutates (`useToasts`). */
export type PushToast = (toast: Omit<ToastItem, 'id'>) => void;

/**
 * Parse an API timestamp.
 *
 * D1 writes `CURRENT_TIMESTAMP` as `YYYY-MM-DD HH:MM:SS` in UTC with no zone
 * marker, which `new Date()` would read as *local* time — shifting every audit
 * entry by the viewer's offset and, near midnight, onto the wrong day. Those are
 * read as UTC; anything else (ISO strings) is passed through.
 */
export function parseTimestamp(value: string): Date {
  const sqlite = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
  return new Date(sqlite ? `${value.replace(' ', 'T')}Z` : value);
}

/** Locale date for table cells. Unparseable values are shown as sent. */
export function formatDate(value: string): string {
  const date = parseTimestamp(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

/** Locale time of day ("3:04 PM"), for log entries grouped under a day heading. */
export function formatTime(value: string): string {
  const date = parseTimestamp(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Local calendar-day key (`2026-11-03`) used to group log entries. */
export function dayKey(value: string): string {
  const date = parseTimestamp(value);
  if (Number.isNaN(date.getTime())) return value;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** "Today", "Yesterday", or a full local date for a day key. */
export function dayLabel(value: string, now = new Date()): string {
  const date = parseTimestamp(value);
  if (Number.isNaN(date.getTime())) return value;
  const key = dayKey(value);
  const today = dayKey(now.toISOString());
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === today) return 'Today';
  if (key === dayKey(yesterday.toISOString())) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
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
 * Each line says what the admin *does* here, not just what the list contains.
 */
export const SECTION_SUBTITLES: Record<AdminSectionKey, string> = {
  overview: 'What is waiting for an admin, then how the platform is doing.',
  users: 'Every account on the platform. Suspend, ban or reactivate access.',
  properties: 'Review listings before they go live, and act on flagged ones.',
  applications: 'Boarder applications across all properties.',
  landlords: 'Review landlord documents and approve or reject verification.',
  'property-access': "Grant and revoke a landlord's access to a property.",
  settings: 'Platform-wide configuration. Changes apply as soon as they are saved.',
  audit: 'Every administrative action, newest first.',
};
