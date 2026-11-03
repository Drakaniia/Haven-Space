import { useEffect, useRef, useState } from 'react';

import { Button } from '../ui/Button';
import { Field, SelectInput, TextInput } from '../ui/Field';
import { Icon } from '../ui/Icon';
import {
  MONITOR_STATUS_OPTIONS,
  PAYMENT_METHODS,
  formatPaymentDate,
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
 * The four everyday controls sit in one row; the rarer ones live behind "More
 * filters", and whatever is set there is echoed back as removable chips so a
 * narrowed table never hides why it is narrow.
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

  const chips: Array<{ key: string; label: string; clear: Partial<MonitorFilters> }> = [];
  if (value.room) chips.push({ key: 'room', label: value.room, clear: { room: '' } });
  if (value.dueFrom) {
    chips.push({
      key: 'dueFrom',
      label: `Due from ${formatPaymentDate(value.dueFrom)}`,
      clear: { dueFrom: '' },
    });
  }
  if (value.dueTo) {
    chips.push({
      key: 'dueTo',
      label: `Due by ${formatPaymentDate(value.dueTo)}`,
      clear: { dueTo: '' },
    });
  }
  if (value.method) {
    const method = PAYMENT_METHODS.find(option => option.value === value.method);
    chips.push({ key: 'method', label: method?.label ?? value.method, clear: { method: '' } });
  }
  if (value.overdue) chips.push({ key: 'overdue', label: 'Overdue only', clear: { overdue: false } });
  if (value.needsReview) {
    chips.push({ key: 'needsReview', label: 'Needs review only', clear: { needsReview: false } });
  }

  const extraFilters = chips.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]">
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
            placeholder="Name or room number"
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

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <div className="relative">
            <Button
              ref={moreButtonRef}
              variant="outline"
              aria-expanded={moreOpen}
              aria-controls="monitor-more-filters"
              onClick={() => setMoreOpen(open => !open)}
            >
              More filters
              {extraFilters > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-mint px-1.5 text-xs font-semibold tabular text-primary-dark">
                  {extraFilters}
                </span>
              ) : null}
              <Icon
                name="chevronDown"
                size={14}
                className={`transition-transform duration-150 ease-out motion-reduce:transition-none ${
                  moreOpen ? 'rotate-180' : ''
                }`}
              />
            </Button>

            {moreOpen ? (
              <div
                ref={morePanelRef}
                id="monitor-more-filters"
                className="menu-pop absolute left-0 top-full z-30 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 shadow-pop lg:left-auto lg:right-0"
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

                  <div className="grid grid-cols-2 gap-3">
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

                  <fieldset className="flex flex-col gap-2 border-t border-border pt-3">
                    <legend className="sr-only">Only show</legend>
                    <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={value.overdue}
                        onChange={event => patch({ overdue: event.target.checked })}
                        className="h-4 w-4 rounded border-border-strong accent-[var(--color-primary-strong)]"
                      />
                      Overdue only
                    </label>
                    <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={value.needsReview}
                        onChange={event => patch({ needsReview: event.target.checked })}
                        className="h-4 w-4 rounded border-border-strong accent-[var(--color-primary-strong)]"
                      />
                      Needs review only
                    </label>
                  </fieldset>

                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setMoreOpen(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

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

      {chips.length > 0 ? (
        <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
          {chips.map(chip => (
            <li key={chip.key}>
              <button
                type="button"
                aria-label={`Remove filter: ${chip.label}`}
                onClick={() => patch(chip.clear)}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-mint/60 pl-2.5 pr-1.5 text-xs font-semibold text-primary-dark transition-[background-color,transform] duration-150 ease-out hover:bg-mint active:scale-[0.97] motion-reduce:active:scale-100"
              >
                {chip.label}
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
