import { Link } from '@tanstack/react-router';

import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { StatusBadge, statusTone } from '../ui/StatusBadge';
import { buttonClasses, Button } from '../ui/Button';
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
  onApproveLeave,
}: {
  date: string;
  events: CalendarEvent[];
  onApproveLeave?: (event: CalendarEvent) => void;
}) {
  const summary = daySummary(events);
  const hasMoney = events.some(event => event.family === 'money');
  const hasApplications = events.some(event => event.family === 'applications');
  const hasLeave = events.some(
    event => event.type === 'leave_requested' || event.type === 'tenancy_move_out'
  );

  return (
    <Card className="lg:sticky lg:top-24" padding="p-0">
      <section aria-label="Selected day">
        <div className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-medium tracking-[-0.015em] text-ink">
            {formatDayLabel(date)}
          </h2>
          <span className="shrink-0 text-xs font-medium text-gray-ink">
            {events.length === 1 ? '1 event' : `${events.length} events`}
          </span>
        </div>

        {events.length === 0 ? (
          <p className="px-5 py-5 text-sm text-gray-ink">Nothing scheduled.</p>
        ) : (
          <>
            {hasMoney ? (
              <dl className="grid grid-cols-2 border-b border-border bg-cream/60">
                <div className="px-5 py-3">
                  <dt className="text-xs text-gray-ink">Due</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular text-ink">
                    {formatPeso(summary.due)}
                  </dd>
                </div>
                <div className="border-l border-border px-5 py-3">
                  <dt className="text-xs text-gray-ink">Collected</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular text-success-ink">
                    {formatPeso(summary.collected)}
                  </dd>
                </div>
                {summary.overdueCount > 0 ? (
                  <div className="col-span-2 border-t border-border px-5 py-2">
                    <dt className="sr-only">Overdue charges</dt>
                    <dd className="text-xs font-semibold text-error-ink">
                      {summary.overdueCount} overdue
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            <ul className="divide-y divide-border">
              {events.map(event => {
                const isLeave =
                  event.type === 'leave_requested' || event.type === 'tenancy_move_out';

                return (
                  <li key={event.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${statusTone(
                        event.status
                      )}`}
                    >
                      <Icon name={eventIcon(event)} size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold text-ink">{eventLabel(event)}</p>
                        <StatusBadge status={event.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-ink">
                        {[event.room?.name, event.property?.name].filter(Boolean).join(' · ') ||
                          '—'}
                      </p>
                      {event.approximate ? (
                        <p className="text-xs text-muted">Accepted date is approximate</p>
                      ) : null}
                      {/* Approval is blocked while anything is unsettled, so the
                          amount rides on the leave row instead of only surfacing
                          in the dialog (spec `approve-leave-request` §5.3). */}
                      {isLeave && (event.outstanding_amount ?? 0) > 0 ? (
                        <p className="mt-0.5 text-xs font-semibold text-warning-ink">
                          {formatPeso(event.outstanding_amount ?? 0)} due
                        </p>
                      ) : null}
                      {event.amount !== null ? (
                        <p className="mt-1 text-sm font-semibold tabular text-ink">
                          {formatPeso(event.amount)}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <Link
                          to={event.link.to}
                          className="inline-flex rounded-sm text-xs font-semibold text-primary underline-offset-2 hover:underline"
                        >
                          {event.link.label}
                        </Link>
                        {onApproveLeave &&
                        event.status === 'pending' &&
                        event.application_id !== null &&
                        isLeave ? (
                          <Button variant="outline" size="sm" onClick={() => onApproveLeave(event)}>
                            Approve
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {hasMoney || hasApplications || hasLeave ? (
          <div className="flex flex-wrap gap-2 border-t border-border bg-subtle/40 px-5 py-3.5">
            {hasMoney ? (
              <Link to="/landlord/payments/record" className={buttonClasses({ size: 'sm' })}>
                Record payment
              </Link>
            ) : null}
            {hasApplications ? (
              <Link
                to="/landlord/applications"
                className={buttonClasses({ size: 'sm', variant: 'outline' })}
              >
                Review application
              </Link>
            ) : null}
            {hasLeave ? (
              <Link
                to="/landlord/boarders"
                className={buttonClasses({ size: 'sm', variant: 'outline' })}
              >
                Review leave request
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </Card>
  );
}
