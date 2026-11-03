import { Link } from '@tanstack/react-router';

import { Button, buttonClasses } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import {
  PAYMENTS_ERROR_HINT,
  formatPaymentDate,
  formatPeso,
  monitorStatusMeta,
  needsAttention,
  roomLabel,
} from '../../lib/payments';
import type { TrackerRow } from '../../lib/types';

/**
 * The monitoring table (spec `landlord-payments-monitoring` §7).
 *
 * Six columns, one row per tenant, exactly one action per row so the table stays
 * the page's focus. The status cell is the derived label from
 * `monitorStatusMeta`, and the whole card owns its four states so a filter can
 * never blank the page's structure.
 */

const SKELETON_WIDTHS = ['w-32', 'w-16', 'w-24', 'w-20', 'w-24', 'w-20'];

const LINK_ACTION =
  'rounded-sm text-sm font-medium text-primary underline-offset-2 hover:underline disabled:opacity-60';

export function PaymentMonitorTable({
  rows,
  monthName,
  loading,
  activeApplicationId,
  hasProperties,
  hasFilters,
  error,
  onRetry,
  onClearFilters,
  onOpenTenant,
  onReview,
  onRemind,
}: {
  rows: TrackerRow[];
  monthName: string;
  loading: boolean;
  /** The tenant whose drawer is open, so the row stays findable behind it. */
  activeApplicationId: number | null;
  hasProperties: boolean;
  hasFilters: boolean;
  error: string | null;
  onRetry: () => void;
  onClearFilters: () => void;
  onOpenTenant: (row: TrackerRow) => void;
  onReview: (row: TrackerRow) => void;
  onRemind: (row: TrackerRow) => void;
}) {
  const needsAttentionCount = rows.filter(needsAttention).length;

  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="px-5 pt-5">
        <h2 className="font-semibold text-ink">{monthName.split(' ')[0]} payments</h2>
        <p className="mt-1 text-sm text-gray-ink">
          Rent charges are created automatically from each tenant&apos;s rent cycle.
        </p>
      </div>

      {error ? (
        <div className="p-5">
          <ErrorState
            message={error}
            hint={PAYMENTS_ERROR_HINT}
            action={
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            }
          />
        </div>
      ) : !loading && rows.length === 0 ? (
        <div className="p-5">
          {!hasProperties ? (
            <EmptyState
              icon="buildingOffice"
              title="No properties yet"
              description="Add a property and confirm a tenancy before there is any rent to monitor."
              action={
                <Link to="/landlord/properties" className={buttonClasses({ variant: 'outline' })}>
                  Go to properties
                </Link>
              }
            />
          ) : hasFilters ? (
            <EmptyState
              icon="search"
              title="Nothing matches these filters"
              description="No tenant in this property has a rent cycle that fits the status, room, due-date, method or search filters you applied."
              action={
                <Button variant="outline" onClick={onClearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="payment"
              title={`No tenants to bill for ${monthName}`}
              description="Rent charges are created automatically from each tenant's rent cycle. Confirm a tenancy or pick another month."
              action={
                <Link to="/landlord/boarders" className={buttonClasses({ variant: 'outline' })}>
                  See your tenants
                </Link>
              }
            />
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table
              aria-busy={loading}
              className={`w-full min-w-[720px] border-collapse text-sm ${
                loading ? 'opacity-60' : ''
              }`}
            >
              <caption className="sr-only">Payments for {monthName}</caption>
              <thead>
                <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-gray-ink">
                  <th scope="col" className="px-5 py-3 font-medium">
                    Tenant
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Room
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Due date
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0
                  ? SKELETON_WIDTHS.map((_, rowIndex) => (
                      <tr key={`skeleton-${rowIndex}`} className="border-b border-border/60">
                        {SKELETON_WIDTHS.map((width, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-4">
                            <Skeleton className={`h-4 ${width}`} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : rows.map(row => {
                      const meta = monitorStatusMeta(row);
                      const active = activeApplicationId === row.application_id;

                      return (
                        <tr
                          key={row.application_id}
                          className={`border-b border-border/60 align-middle ${
                            active ? 'bg-subtle/40' : 'hover:bg-subtle/40'
                          }`}
                        >
                          <td className="max-w-[18ch] truncate px-5 py-3">
                            <button
                              type="button"
                              aria-label={`Open payment details for ${row.boarder_name}`}
                              onClick={() => onOpenTenant(row)}
                              className="rounded-sm text-left font-medium text-ink underline-offset-2 hover:underline"
                            >
                              {row.boarder_name}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-gray-ink">
                            {roomLabel(row.room_number) || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-ink">
                            {row.next_due_date ? formatPaymentDate(row.next_due_date) : '—'}
                          </td>
                          <td className="px-4 py-3 text-ink">{formatPeso(row.monthly_rent)}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={meta.tone} label={meta.label} />
                          </td>
                          <td className="px-5 py-3">
                            {meta.action === 'view' ? (
                              <button
                                type="button"
                                aria-label={`View ${row.boarder_name}'s payments`}
                                onClick={() => onOpenTenant(row)}
                                className={LINK_ACTION}
                              >
                                View
                              </button>
                            ) : meta.action === 'review' ? (
                              <button
                                type="button"
                                aria-label={`Review ${row.boarder_name}'s proof`}
                                onClick={() => onReview(row)}
                                className={LINK_ACTION}
                              >
                                Review proof
                              </button>
                            ) : meta.action === 'remind' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                aria-label={`Remind ${row.boarder_name}`}
                                onClick={() => onRemind(row)}
                              >
                                Remind
                              </Button>
                            ) : (
                              <span aria-hidden="true" className="text-gray-ink">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {!loading && rows.length > 0 ? (
            <p className="border-t border-border px-5 py-3 text-sm text-gray-ink">
              Showing {rows.length} {rows.length === 1 ? 'tenant' : 'tenants'} ·{' '}
              {needsAttentionCount} need attention
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}
