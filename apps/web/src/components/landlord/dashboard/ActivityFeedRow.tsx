import { Link } from '@tanstack/react-router';
import { activityContext, activityTime, ACTIVITY_SENTENCE } from '../../../lib/activity';
import { parseTimestamp } from '../../../lib/messages';
import type { ActivityEvent } from '../../../lib/types';

/**
 * One activity row (spec `landlord-dashboard-redesign` §7.6/§8.4).
 *
 * The feed is deliberately plain: a sentence, an optional context line, and a
 * relative time. The activity page adds the record link; the dashboard card does
 * not.
 */
export function ActivityFeedRow({
  event,
  showContext = false,
  showLink = false,
}: {
  event: ActivityEvent;
  showContext?: boolean;
  showLink?: boolean;
}) {
  const sentence =
    event.type === 'tenancy_move_out' && event.status === 'left_early'
      ? 'Tenancy ended early'
      : ACTIVITY_SENTENCE[event.type] ?? event.type.replaceAll('_', ' ');
  const context = showContext ? activityContext(event) : '';
  const parsed = parseTimestamp(event.occurred_at);
  const absolute = Number.isNaN(parsed.getTime())
    ? event.date
    : parsed.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{sentence}</p>
        {context ? <p className="mt-0.5 truncate text-xs text-gray-ink">{context}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <time
          dateTime={event.occurred_at}
          title={absolute}
          className="whitespace-nowrap text-xs text-gray-ink"
        >
          {activityTime(event.occurred_at)}
        </time>
        {showLink ? (
          <Link
            to={event.link.to}
            className="whitespace-nowrap text-xs font-semibold text-primary underline"
          >
            {event.link.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
