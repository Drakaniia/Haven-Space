import { parseTimestamp } from './messages';
import type { ActivityEvent, ActivityEventType } from './types';

/**
 * Activity feed copy and time labels (spec `landlord-dashboard-redesign` §8.2/§8.3).
 *
 * The API returns structured events; all wording lives here so the dashboard and
 * the activity page can never phrase the same event differently.
 */
export const ACTIVITY_SENTENCE: Record<ActivityEventType, string> = {
  payment_received: 'Payment recorded',
  application_received: 'New application received',
  application_accepted: 'Application accepted',
  application_confirmed: 'Application confirmed',
  tenancy_move_in: 'Boarder moved in',
  tenancy_move_out: 'Tenancy ended',
  leave_requested: 'Leave request submitted',
  announcement_publish: 'Announcement published',
  listing_published: 'Property listing published',
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * The mockup's relative-time cadence: just now / Nm ago / Nh ago / Yesterday /
 * short date. Browser-local, matching the existing messages helper; the API's
 * date windows are Manila-local independently.
 */
export function activityTime(value: string, now: Date = new Date()): string {
  const date = parseTimestamp(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diff = now.getTime() - date.getTime();

  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < 24 * HOUR) return `${Math.floor(diff / HOUR)}h ago`;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfEventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  if (startOfEventDay === startOfToday - 24 * HOUR) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** `Property · Room · Boarder`, omitting the parts the event does not have. */
export function activityContext(event: ActivityEvent): string {
  return [event.property?.name, event.room?.name, event.boarder?.name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' · ');
}

/** Local `YYYY-MM-DD`; never a UTC slice (a Manila evening must not roll over). */
export function localDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/** Inclusive `from` and exclusive `to` for the activity page's range presets. */
export function activityWindow(
  days: number,
  now: Date = new Date()
): {
  from: string;
  to: string;
} {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return { from: localDateString(from), to: localDateString(to) };
}
