import { Link } from '@tanstack/react-router';

import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import { buttonClasses } from '../ui/Button';
import { formatPeso } from '../../lib/payments';
import type { CalendarEvent } from '../../lib/types';
import { daySummary, eventIcon, eventLabel, formatDayLabel } from './calendar-helpers';

/**
 * The selected day's detail (spec `landlord-calendar` §7.4/D13).
 *
 * The event list, the day's money, and only the actions that suit what is on that
 * day: an empty day is inert with one inline line, never a full-page empty state,
 * so the month stays the page's subject.
 */
export function CalendarDayPanel({
  date,
  events,
}: {
  date: string;
  events: CalendarEvent[];
}) {
  const summary = daySummary(events);
  const hasMoney = events.some(event => event.family === 'money');
  const hasApplications = events.some(event => event.family === 'applications');
  const hasLeave = events.some(
    event => event.type === 'leave_requested' || event.type === 'tenancy_move_out'
  );

  return (
    <Card className="lg:sticky lg:top-4" padding="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-ink">
          {formatDayLabel(date)}
        </h2>
        <span className="text-xs text-gray-ink">
          {events.length === 1 ? '1 event' : `${events.length} events`}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-gray-ink">Nothing scheduled.</p>
      ) : (
        <>
          {hasMoney ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-subtle px-3 py-2">
              <span className="text-xs text-gray-ink">
                Due <span className="font-semibold text-ink">{formatPeso(summary.due)}</span>
              </span>
              <span className="text-xs text-gray-ink">
                Collected{' '}
                <span className="font-semibold text-ink">{formatPeso(summary.collected)}</span>
              </span>
              {summary.overdueCount > 0 ? (
                <span className="text-xs text-error-ink">
                  {summary.overdueCount} overdue
                </span>
              ) : null}
            </div>
          ) : null}

          <ul className="mt-3 space-y-3">
            {events.map(event => (
              <li key={event.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-start gap-2">
                  <Icon name={eventIcon(event)} size={16} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">{eventLabel(event)}</p>
                      <StatusBadge status={event.status} />
                    </div>
                    {event.approximate ? (
                      <p className="text-xs text-gray-ink">Accepted date is approximate</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-gray-ink">
                      {[event.room?.name, event.property?.name].filter(Boolean).join(' · ') || '—'}
                    </p>
                    {event.amount !== null ? (
                      <p className="text-sm font-semibold text-ink">{formatPeso(event.amount)}</p>
                    ) : null}
                    <Link
                      to={event.link.to}
                      className="mt-1 inline-flex text-xs font-semibold text-primary underline"
                    >
                      {event.link.label}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {hasMoney || hasApplications || hasLeave ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {hasMoney ? (
            <Link to="/landlord/payments/record" className={buttonClasses({ size: 'sm' })}>
              Record payment
            </Link>
          ) : null}
          {hasApplications ? (
            <Link to="/landlord/applications" className={buttonClasses({ size: 'sm', variant: 'outline' })}>
              Review application
            </Link>
          ) : null}
          {hasLeave ? (
            <Link to="/landlord/boarders" className={buttonClasses({ size: 'sm', variant: 'outline' })}>
              Review leave request
            </Link>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
