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
 * Six columns that follow the landlord's decision — who, where, when, how much,
 * how it stands, what to do — and exactly one action per row so the table stays
 * the page's focus. The status cell is the derived label from
 * `monitorStatusMeta`; lateness and any balance that differs from the rent ride
 * underneath their own column as quiet second lines.
 *
 * On a phone the table keeps its columns and scrolls sideways with the tenant
 * column pinned, so a row never loses its name.
 */

const SKELETON_WIDTHS = ['w-32', 'w-16', 'w-24', 'w-20', 'w-24', 'w-20'];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}

function lateness(row: TrackerRow): string | null {
  const days = row.days_overdue ?? 0;
  if (days <= 0) return null;
  return `${days} ${days === 1 ? 'day' : 'days'} late`;
}

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
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 px-5 pb-4 pt-5">
        <div>
          <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">
            {monthName.split(' ')[0]} payments
          </h2>
          <p className="mt-1 text-sm text-gray-ink">
            Rent charges are created automatically from each tenant&apos;s rent cycle.
          </p>
        </div>
      </div>

      {error ? (
        <div className="border-t border-border p-5">
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
        <div className="border-t border-border p-5">
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
          <div className="overflow-x-auto">
            <table
              aria-busy={loading}
              className={`w-full min-w-[760px] border-collapse text-sm transition-opacity duration-150 ${
                loading ? 'opacity-60' : ''
              }`}
            >
              <caption className="sr-only">Payments for {monthName}</caption>
              <thead>
                <tr className="border-y border-border bg-subtle/60 text-left text-xs text-gray-ink">
                  <th
                    scope="col"
                    className="sticky left-0 z-[1] bg-subtle px-5 py-2.5 font-semibold md:static md:bg-transparent"
                  >
                    Tenant
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Room
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Due date
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">
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
                      const late = lateness(row);
                      const owed =
                        row.amount_due > 0 && row.amount_due !== row.monthly_rent
                          ? `${formatPeso(row.amount_due)} owed`
                          : null;
                      // Opaque fills per cell, so the pinned tenant cell never
                      // shows the columns sliding underneath it.
                      const cellBg = active
                        ? 'bg-mint'
                        : 'bg-surface group-hover:bg-cream';

                      return (
                        <tr
                          key={row.application_id}
                          aria-current={active ? 'true' : undefined}
                          className="group border-b border-border/60 align-middle last:border-b-0"
                        >
                          <td
                            className={`sticky left-0 z-[1] max-w-[22ch] px-5 py-3 transition-colors duration-100 md:static ${cellBg}`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                aria-hidden="true"
                                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle text-[11px] font-semibold text-gray-ink sm:inline-flex"
                              >
                                {initials(row.boarder_name)}
                              </span>
                              <button
                                type="button"
                                aria-label={`Open payment details for ${row.boarder_name}`}
                                onClick={() => onOpenTenant(row)}
                                className="min-w-0 truncate rounded-sm text-left font-semibold text-ink underline-offset-2 hover:underline"
                              >
                                {row.boarder_name}
                              </button>
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-gray-ink transition-colors duration-100 ${cellBg}`}>
                            {roomLabel(row.room_number) || '—'}
                          </td>
                          <td className={`px-4 py-3 transition-colors duration-100 ${cellBg}`}>
                            <span className="block whitespace-nowrap text-ink">
                              {row.next_due_date ? formatPaymentDate(row.next_due_date) : '—'}
                            </span>
                            {late ? (
                              <span className="mt-0.5 block text-xs font-medium text-error-ink">
                                {late}
                              </span>
                            ) : null}
                          </td>
                          <td
                            className={`px-4 py-3 text-right transition-colors duration-100 ${cellBg}`}
                          >
                            <span className="block font-semibold text-ink">
                              {formatPeso(row.monthly_rent)}
                            </span>
                            {owed ? (
                              <span className="mt-0.5 block text-xs text-gray-ink">{owed}</span>
                            ) : row.other_open_charges > 0 ? (
                              <span className="mt-0.5 block text-xs text-gray-ink">
                                {`+${row.other_open_charges} other open ${
                                  row.other_open_charges === 1 ? 'charge' : 'charges'
                                }`}
                              </span>
                            ) : null}
                          </td>
                          <td className={`px-4 py-3 transition-colors duration-100 ${cellBg}`}>
                            <StatusBadge status={meta.tone} label={meta.label} />
                          </td>
                          <td
                            className={`px-5 py-3 text-right transition-colors duration-100 ${cellBg}`}
                          >
                            {meta.action === 'view' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`View ${row.boarder_name}'s payments`}
                                onClick={() => onOpenTenant(row)}
                              >
                                View
                              </Button>
                            ) : meta.action === 'review' ? (
                              <Button
                                size="sm"
                                aria-label={`Review ${row.boarder_name}'s proof`}
                                onClick={() => onReview(row)}
                              >
                                Review proof
                              </Button>
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
                              <span aria-hidden="true" className="pr-3 text-muted">
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
            <p className="flex flex-wrap items-center gap-x-2 border-t border-border bg-subtle/40 px-5 py-3 text-sm text-gray-ink">
              Showing {rows.length} {rows.length === 1 ? 'tenant' : 'tenants'} ·{' '}
              {needsAttentionCount} need attention
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}
