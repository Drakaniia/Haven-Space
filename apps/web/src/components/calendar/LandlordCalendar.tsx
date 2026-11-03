import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { getLandlordCalendar } from '../../lib/api/calendar';
import { approveLeaveRequest, getProperties } from '../../lib/api/landlord';
import { ApiRequestError } from '../../lib/api/http';
import { useAuth } from '../../lib/auth-context';
import type { CalendarEvent } from '../../lib/types';
import { ApproveLeaveDialog, type ApproveLeaveDetails } from '../tenancy/ApproveLeaveDialog';
import { Button, buttonClasses } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Field, SelectInput } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { CalendarDayPanel } from './CalendarDayPanel';
import { CalendarMonthGrid, CalendarMonthGridSkeleton } from './CalendarMonthGrid';
import { CalendarMonthSummary, CalendarMonthSummarySkeleton } from './CalendarMonthSummary';
import {
  FAMILY_FILTERS,
  groupEventsByDate,
  monthKeyOf,
  monthLabelOf,
  monthWindow,
  shiftMonth,
} from './calendar-helpers';

/**
 * The landlord calendar (spec `landlord-calendar`): one read-only month view over
 * charge due dates, tenancy dates, application milestones and scheduled
 * announcements.
 *
 * The window is always the visible month's full week matrix (D16), so every
 * rendered cell has its events, and the adjacent months are prefetched so paging
 * never shows a spinner. Nothing here derives a status or adds money up — the API
 * owns both, so this page can never disagree with the ledger (D6).
 */

/** The month to open on, before the server's `today` says otherwise (D20). */
function initialManilaMonth(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

function MonthNavButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-ink transition-[background-color,color,transform] duration-150 hover:bg-subtle hover:text-ink active:scale-[0.94] motion-reduce:active:scale-100"
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

export function LandlordCalendar() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [monthKey, setMonthKey] = useState(initialManilaMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState('');
  const [family, setFamily] = useState<string>('all');
  const [pendingApprove, setPendingApprove] = useState<CalendarEvent | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  const activePropertyId = propertyId ? Number(propertyId) : null;
  const familyTypes = FAMILY_FILTERS.find(option => option.value === family)?.types ?? null;
  const { from, to } = monthWindow(monthKey);

  const properties = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token),
  });

  const calendar = useQuery({
    queryKey: ['landlord-calendar', from, to, activePropertyId, familyTypes],
    queryFn: () =>
      getLandlordCalendar(token!, {
        from,
        to,
        propertyId: activePropertyId,
        types: familyTypes,
      }),
    enabled: Boolean(token),
    staleTime: 60_000,
    // Keep the previous month on screen while the next one loads, so paging never
    // collapses the grid (D16).
    placeholderData: keepPreviousData,
  });

  const approve = useMutation({
    mutationFn: (applicationId: number) => approveLeaveRequest(token!, applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['boarders'] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      setPendingApprove(null);
      setApproveError(null);
    },
    onError: err =>
      setApproveError(
        err instanceof ApiRequestError ? err.message : 'Failed to approve leave request.'
      ),
  });

  const data = calendar.data?.data;
  const events = data?.events ?? [];

  // Today comes from the server (D20); a month the landlord navigated to has no
  // "today" in it, so it opens on its first day instead.
  const selection =
    selectedDate ?? (data && monthKeyOf(data.today) === monthKey ? data.today : `${monthKey}-01`);

  useEffect(() => {
    if (!token || !data) return;

    for (const delta of [-1, 1]) {
      const key = shiftMonth(monthKey, delta);
      const window = monthWindow(key);

      void queryClient.prefetchQuery({
        queryKey: ['landlord-calendar', window.from, window.to, activePropertyId, familyTypes],
        queryFn: () =>
          getLandlordCalendar(token, {
            from: window.from,
            to: window.to,
            propertyId: activePropertyId,
            types: familyTypes,
          }),
        staleTime: 60_000,
      });
    }
  }, [token, data, monthKey, activePropertyId, familyTypes, queryClient]);

  const propertyList = properties.data?.data.properties ?? [];
  const dayEvents = groupEventsByDate(events)[selection] ?? [];
  const showNoProperties = properties.isSuccess && propertyList.length === 0;
  const approveDetails: ApproveLeaveDetails | null =
    pendingApprove && pendingApprove.application_id !== null
      ? {
          applicationId: pendingApprove.application_id,
          boarderName: pendingApprove.boarder?.name ?? pendingApprove.subject,
          propertyName: pendingApprove.property?.name ?? '',
          roomName: pendingApprove.room?.name ?? '',
          leaveDate: pendingApprove.leave_request?.leave_date ?? pendingApprove.date,
          requestedOn: pendingApprove.leave_request?.requested_on ?? null,
          reason: pendingApprove.leave_request?.reason ?? null,
          outstandingAmount: pendingApprove.outstanding_amount ?? 0,
        }
      : null;

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Rent due dates, move-ins and move-outs, and application milestones across your properties."
      />

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            aria-live="polite"
            className="min-w-[11ch] font-display text-2xl font-medium tracking-[-0.02em] text-ink"
          >
            {monthLabelOf(monthKey)}
          </h2>
          <div className="flex items-center rounded-xl border border-border bg-surface p-0.5 shadow-card">
            <MonthNavButton
              label="Previous month"
              icon="chevronLeft"
              onClick={() => setMonthKey(current => shiftMonth(current, -1))}
            />
            <MonthNavButton
              label="Next month"
              icon="chevronRight"
              onClick={() => setMonthKey(current => shiftMonth(current, 1))}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMonthKey(initialManilaMonth());
              setSelectedDate(null);
            }}
          >
            Today
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div
            role="group"
            aria-label="Filter events by family"
            className="flex w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-subtle p-1 sm:w-auto"
          >
            {FAMILY_FILTERS.map(option => (
              <button
                key={option.value}
                type="button"
                aria-pressed={family === option.value}
                onClick={() => setFamily(option.value)}
                className={`inline-flex h-8 flex-1 items-center justify-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 sm:flex-none ${
                  family === option.value
                    ? 'bg-surface text-ink shadow-card'
                    : 'text-gray-ink hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Field label="Property" htmlFor="calendar-property">
            <SelectInput
              id="calendar-property"
              value={propertyId}
              onChange={event => setPropertyId(event.target.value)}
            >
              <option value="">All properties</option>
              {propertyList.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </div>

      {showNoProperties ? (
        <EmptyState
          icon="buildingOffice"
          title="No properties yet"
          description="Create a listing first — rent, tenancy and application dates will show up here."
          action={
            <Link to="/landlord/listings/create" className={buttonClasses()}>
              Create listing
            </Link>
          }
        />
      ) : calendar.isLoading ? (
        <>
          <CalendarMonthSummarySkeleton />
          <CalendarMonthGridSkeleton />
        </>
      ) : calendar.error ? (
        <ErrorState
          message={calendar.error.message}
          hint="The calendar reads the same data as your ledger and applications pages, so this is usually a connection or migration problem."
          action={
            <Button variant="outline" size="sm" onClick={() => void calendar.refetch()}>
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <CalendarMonthSummary
            summary={data!.summary}
            shown={events.length}
            total={data!.total}
            truncated={data!.truncated}
          />

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <CalendarMonthGrid
              monthKey={monthKey}
              today={data!.today}
              selectedDate={selection}
              events={events}
              onSelectDate={setSelectedDate}
            />
            <CalendarDayPanel
              date={selection}
              events={dayEvents}
              onApproveLeave={event => {
                setApproveError(null);
                setPendingApprove(event);
              }}
            />
          </div>
        </>
      )}

      <ApproveLeaveDialog
        details={approveDetails}
        busy={approve.isPending}
        error={approveError}
        onConfirm={() => {
          if (
            pendingApprove?.application_id !== null &&
            pendingApprove?.application_id !== undefined
          ) {
            approve.mutate(pendingApprove.application_id);
          }
        }}
        onCancel={() => {
          setPendingApprove(null);
          setApproveError(null);
        }}
      />
    </>
  );
}
