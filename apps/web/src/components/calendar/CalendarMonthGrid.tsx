import { useEffect, useState } from 'react';

import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { statusTone } from '../ui/StatusBadge';
import type { CalendarEvent } from '../../lib/types';
import {
  WEEKDAY_LABELS,
  dayAriaLabel,
  eventChipLabel,
  eventIcon,
  groupEventsByDate,
  monthDays,
  packDayEvents,
  type CalendarDay,
} from './calendar-helpers';
import { CalendarEventPopover } from './CalendarEventPopover';

/**
 * The grid's first-load placeholder: the same 7 columns and 5 week rows, so the
 * page does not jump when the events arrive (D22).
 */
export function CalendarMonthGridSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-1">
      <div className="grid grid-cols-7 gap-1 pb-1">
        {WEEKDAY_LABELS.map(label => (
          <Skeleton key={label} className="mx-auto h-3 w-8" />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map(row => (
        <div key={row} className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map(label => (
            <Skeleton key={`${row}-${label}`} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The month grid (spec `landlord-calendar` §7.3).
 *
 * Sunday-first, only the weeks the month needs (D25/D26), up to three chips per
 * day plus a `+N more` control that hands the day to the detail panel (D8).
 * Adjacent-month days render greyed **with their own events**, because the window
 * the page fetches is the month's full week matrix (agent default §14-1).
 *
 * The cell is a real `<table>` with `<th scope="col">` headers, and the day number
 * is the select control (the one element in the cell that takes its own keyboard
 * focus) — chips are buttons too, and a button cannot nest inside a button, so the
 * day's accessible name lives on that control.
 */
export function CalendarMonthGrid({
  monthKey,
  today,
  selectedDate,
  events,
  onSelectDate,
}: {
  monthKey: string;
  /** Manila today from the API, so the highlight is never the browser's guess (D20). */
  today: string;
  selectedDate: string;
  events: CalendarEvent[];
  onSelectDate: (date: string) => void;
}) {
  const [open, setOpen] = useState<{ event: CalendarEvent; trigger: HTMLElement | null } | null>(
    null
  );

  // A new month or a refetch invalidates whatever chip was open.
  useEffect(() => {
    setOpen(null);
  }, [monthKey, events]);

  const days = monthDays(monthKey);
  const grouped = groupEventsByDate(events);
  const weeks: CalendarDay[][] = [];

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return (
    <table className="w-full table-fixed border-separate border-spacing-1">
      <thead>
        <tr>
          {WEEKDAY_LABELS.map(label => (
            <th
              key={label}
              scope="col"
              className="pb-1 text-center text-xs font-medium text-gray-ink"
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map(week => (
          <tr key={week[0].date}>
            {week.map((day, column) => {
              const dayEvents = grouped[day.date] ?? [];
              const { visible, hiddenCount } = packDayEvents(dayEvents);
              const selected = day.date === selectedDate;
              const isToday = day.date === today;

              return (
                <td key={day.date} className="align-top">
                  <div
                    className={`flex min-h-24 flex-col rounded-xl border p-1.5 ${
                      selected ? 'border-primary-strong bg-mint' : 'border-border bg-surface'
                    } ${day.inMonth ? '' : 'opacity-60'}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectDate(day.date)}
                      aria-label={dayAriaLabel(day.date, dayEvents)}
                      aria-current={isToday ? 'date' : undefined}
                      aria-pressed={selected}
                      className={`mx-auto flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums transition-colors ${
                        isToday
                          ? 'bg-primary-strong text-white'
                          : selected
                          ? 'bg-mint text-primary-dark'
                          : 'text-ink hover:bg-subtle'
                      }`}
                    >
                      {day.dayNumber}
                    </button>

                    <div className="mt-1 flex flex-col gap-1">
                      {visible.map(event => {
                        const isOpen = open?.event.id === event.id;

                        return (
                          <div key={event.id} className="relative">
                            <button
                              type="button"
                              onClick={clickEvent => {
                                if (isOpen) {
                                  setOpen(null);
                                  return;
                                }

                                setOpen({
                                  event,
                                  trigger: clickEvent.currentTarget,
                                });
                              }}
                              aria-expanded={isOpen}
                              aria-haspopup="dialog"
                              className={`flex w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight ${statusTone(
                                event.status
                              )}`}
                            >
                              <Icon name={eventIcon(event)} size={12} className="shrink-0" />
                              <span className="truncate">{eventChipLabel(event)}</span>
                            </button>

                            {isOpen ? (
                              <CalendarEventPopover
                                id={`calendar-event-${event.id}`}
                                event={event}
                                trigger={open?.trigger ?? null}
                                align={column >= 4 ? 'right' : 'left'}
                                onClose={() => setOpen(null)}
                              />
                            ) : null}
                          </div>
                        );
                      })}

                      {hiddenCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => onSelectDate(day.date)}
                          className="rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold text-primary hover:bg-subtle"
                        >
                          +{hiddenCount} more
                        </button>
                      ) : null}
                    </div>
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
