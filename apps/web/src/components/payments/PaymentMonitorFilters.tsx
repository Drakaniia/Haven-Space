import { useEffect, useRef, useState } from 'react';

import { Button } from '../ui/Button';
import { Field, SelectInput, TextInput } from '../ui/Field';
import { Icon } from '../ui/Icon';
import {
  MONITOR_STATUS_OPTIONS,
  PAYMENT_METHODS,
  hasActiveFilters,
  type MonitorFilters,
} from '../../lib/payments';

/**
 * The monitoring page's filter bar (spec `landlord-payments-monitoring` §5).
 *
 * Property, month and search are answered by the server; the status, room,
 * due-date range, the two toggles and the method narrow the rows on the client so
 * the metrics always describe the table (RES-3). Everything lives in the URL, so
 * a filtered view is shareable and reloadable (D16).
 *
 * No `Card` wrapper: the reference puts these controls straight on the page
 * surface, which is a layout choice, not a token one.
 */
export function PaymentMonitorFilters({
  properties,
  rooms,
  value,
  onChange,
  onClear,
}: {
  properties: Array<{ id: number; name: string }>;
  /** Distinct room labels present in the loaded rows. */
  rooms: string[];
  value: MonitorFilters;
  onChange: (next: MonitorFilters) => void;
  onClear: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;

      if (
        target &&
        (morePanelRef.current?.contains(target) || moreButtonRef.current?.contains(target))
      ) {
        return;
      }

      setMoreOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;

      setMoreOpen(false);
      moreButtonRef.current?.focus({ preventScroll: true });
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreOpen]);

  const patch = (changes: Partial<MonitorFilters>) => onChange({ ...value, ...changes });
  const extraFilters = [
    value.room,
    value.dueFrom,
    value.dueTo,
    value.overdue ? 'overdue' : '',
    value.needsReview ? 'needs-review' : '',
    value.method,
  ].filter(Boolean).length;

  return (
    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <Field label="Property" htmlFor="monitor-property">
        <SelectInput
          id="monitor-property"
          value={value.propertyId}
          onChange={event => patch({ propertyId: event.target.value })}
        >
          {properties.length === 0 ? <option value="">No properties yet</option> : null}
          {properties.map(property => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label="Month" htmlFor="monitor-month">
        <TextInput
          id="monitor-month"
          type="month"
          value={value.month}
          onChange={event => patch({ month: event.target.value })}
        />
      </Field>

      <Field label="Search tenant or room" htmlFor="monitor-search">
        <TextInput
          id="monitor-search"
          type="search"
          placeholder="Search tenant or room"
          value={value.search}
          onChange={event => patch({ search: event.target.value })}
        />
      </Field>

      <Field label="Status" htmlFor="monitor-status">
        <SelectInput
          id="monitor-status"
          value={value.status}
          onChange={event => patch({ status: event.target.value })}
        >
          <option value="">Any status</option>
          {MONITOR_STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
      </Field>

      <div className="relative flex flex-col justify-end">
        <Button
          ref={moreButtonRef}
          variant={extraFilters > 0 ? 'outline' : 'ghost'}
          aria-expanded={moreOpen}
          aria-controls="monitor-more-filters"
          onClick={() => setMoreOpen(open => !open)}
        >
          <span className="inline-flex items-center gap-1.5">
            More filters{extraFilters > 0 ? ` · ${extraFilters}` : ''}
            <Icon name="chevronDown" size={14} />
          </span>
        </Button>

        {moreOpen ? (
          <div
            ref={morePanelRef}
            id="monitor-more-filters"
            className="absolute right-0 top-full z-30 mt-2 w-full min-w-[260px] rounded-xl border border-border bg-surface p-4 shadow-pop sm:w-[320px]"
          >
            <div className="flex flex-col gap-3">
              <Field label="Room or bed" htmlFor="monitor-room">
                <SelectInput
                  id="monitor-room"
                  value={value.room}
                  onChange={event => patch({ room: event.target.value })}
                >
                  <option value="">Any room</option>
                  {rooms.map(room => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Due from" htmlFor="monitor-due-from">
                  <TextInput
                    id="monitor-due-from"
                    type="date"
                    value={value.dueFrom}
                    onChange={event => patch({ dueFrom: event.target.value })}
                  />
                </Field>

                <Field label="Due to" htmlFor="monitor-due-to">
                  <TextInput
                    id="monitor-due-to"
                    type="date"
                    value={value.dueTo}
                    onChange={event => patch({ dueTo: event.target.value })}
                  />
                </Field>
              </div>

              <Field label="Payment method" htmlFor="monitor-method">
                <SelectInput
                  id="monitor-method"
                  value={value.method}
                  onChange={event => patch({ method: event.target.value })}
                >
                  <option value="">Any method</option>
                  {PAYMENT_METHODS.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={value.overdue}
                    onChange={event => patch({ overdue: event.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  Overdue only
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={value.needsReview}
                    onChange={event => patch({ needsReview: event.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  Needs review only
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-end">
        <Button
          variant="ghost"
          disabled={!hasActiveFilters(value)}
          onClick={() => {
            setMoreOpen(false);
            onClear();
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
