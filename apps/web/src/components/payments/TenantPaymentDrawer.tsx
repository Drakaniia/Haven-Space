import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { ErrorState } from '../ui/ErrorState';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import { getPaymentHistory } from '../../lib/api/payments';
import { useAuth } from '../../lib/auth-context';
import {
  buildTenantTimeline,
  formatDateTime,
  formatPaymentDate,
  formatPeso,
  monitorStatusMeta,
  roomLabel,
  type TenantTimelineEvent,
} from '../../lib/payments';
import type { TrackerRow } from '../../lib/types';

/**
 * The tenant payment detail (spec `landlord-payments-monitoring` §9).
 *
 * Facts come from the tracker row (already loaded), activity from the tenancy's
 * own payment history — no new endpoint, and a timeline in which every event
 * corresponds to a stored record (D32).
 */

const TIMELINE_STEP = 20;

const DOT_TONES: Record<TenantTimelineEvent['tone'], string> = {
  neutral: 'bg-border-strong',
  info: 'bg-info-ink',
  success: 'bg-success-ink',
  error: 'bg-error-ink',
};

export function TenantPaymentDrawer({
  token,
  row,
  onClose,
  onSendMessage,
  onRemind,
  onReview,
  onLogPayment,
  onAddCharge,
  suspended = false,
}: {
  token: string;
  row: TrackerRow;
  onClose: () => void;
  onSendMessage: () => void;
  onRemind: () => void;
  onReview: () => void;
  onLogPayment: () => void;
  onAddCharge: () => void;
  /** A dialog owned by the page is open above this drawer. */
  suspended?: boolean;
}) {
  const { user } = useAuth();
  const [limit, setLimit] = useState(TIMELINE_STEP);
  const meta = monitorStatusMeta(row);

  const history = useQuery({
    queryKey: ['payment-history', row.application_id],
    queryFn: () => getPaymentHistory(token, row.application_id),
    enabled: Boolean(token),
  });

  const charges = history.data?.data.charges ?? [];
  const events = buildTenantTimeline(charges, { viewerId: user?.id ?? null });
  const visible = events.slice(0, limit);
  const subtitle = [
    row.room_number ? roomLabel(row.room_number) : null,
    history.data?.data.tenancy.property_title ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Drawer
      open
      title={row.boarder_name}
      subtitle={subtitle}
      onClose={onClose}
      width="lg"
      suspended={suspended}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={meta.tone} label={meta.label} />
          {row.reminder_sent_at ? (
            <span className="text-xs text-muted">
              Last reminded {formatPaymentDate(row.reminder_sent_at)}
            </span>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border">
          <div className="px-4 py-3">
            <dt className="text-xs font-medium text-gray-ink">Current rent</dt>
            <dd className="mt-0.5 font-semibold tabular text-ink">
              {formatPeso(row.monthly_rent)}
            </dd>
          </div>
          <div className="border-l border-border px-4 py-3">
            <dt className="text-xs font-medium text-gray-ink">Due date</dt>
            <dd className="mt-0.5 font-semibold text-ink">
              {row.next_due_date ? formatPaymentDate(row.next_due_date) : '—'}
            </dd>
          </div>
          <div className="border-t border-border px-4 py-3">
            <dt className="text-xs font-medium text-gray-ink">Balance due</dt>
            <dd
              className={`mt-0.5 font-semibold tabular ${
                row.amount_due > 0 ? 'text-ink' : 'text-success-ink'
              }`}
            >
              {row.amount_due > 0 ? formatPeso(row.amount_due) : 'Nothing owed'}
            </dd>
          </div>
          <div className="border-l border-t border-border px-4 py-3">
            <dt className="text-xs font-medium text-gray-ink">Last payment</dt>
            <dd className="mt-0.5 text-sm text-ink">
              {row.last_payment
                ? `${formatPaymentDate(row.last_payment.date)} · ${formatPeso(row.last_payment.amount)}`
                : 'None recorded'}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {row.has_pending_claim ? (
              <Button size="sm" onClick={onReview}>
                Review proof
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={onRemind}>
              Remind
            </Button>
            <Button variant="outline" size="sm" onClick={onSendMessage}>
              Send message
            </Button>
          </div>

          <div className="flex flex-wrap gap-1 rounded-xl bg-subtle/60 p-1">
            <Button variant="ghost" size="sm" onClick={onLogPayment}>
              <Icon name="banknotes" size={14} />
              Log offline payment
            </Button>
            <Button variant="ghost" size="sm" onClick={onAddCharge}>
              <Icon name="plus" size={14} />
              Add a charge
            </Button>
          </div>
        </div>

        <section aria-label="Payment activity">
          <h3 className="font-display text-lg font-medium tracking-[-0.01em] text-ink">
            Payment activity
          </h3>

          {history.isLoading ? (
            <div className="mt-3 flex flex-col gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : history.error ? (
            <div className="mt-3">
              <ErrorState
                message={history.error.message}
                action={
                  <Button variant="outline" size="sm" onClick={() => void history.refetch()}>
                    Try again
                  </Button>
                }
              />
            </div>
          ) : visible.length === 0 ? (
            <p className="mt-2 text-sm text-gray-ink">
              No payment activity yet — a rent charge appears here as soon as the tenancy&rsquo;s
              cycle creates one.
            </p>
          ) : (
            <>
              <ol className="mt-3 flex flex-col gap-4 border-l border-border pl-4">
                {visible.map(event => (
                  <li key={event.id} className="relative">
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${
                        DOT_TONES[event.tone]
                      }`}
                    />
                    <p className="text-sm font-semibold text-ink">{event.title}</p>
                    {event.detail ? <p className="text-sm text-gray-ink">{event.detail}</p> : null}
                    <p className="mt-0.5 text-xs text-muted">{formatDateTime(event.at)}</p>
                    {event.proof_url ? (
                      <a
                        href={event.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >
                        View proof
                      </a>
                    ) : null}
                  </li>
                ))}
              </ol>

              {events.length > visible.length ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => setLimit(value => value + TIMELINE_STEP)}
                >
                  Show earlier activity
                </Button>
              ) : null}
            </>
          )}
        </section>
      </div>
    </Drawer>
  );
}
