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
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card"
    >
      <div className="grid grid-cols-7 border-b border-border bg-subtle/60 py-2.5">
        {WEEKDAY_LABELS.map(label => (
          <Skeleton key={label} className="mx-auto h-3 w-7" />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map(row => (
        <div key={row} className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((label, column) => (
            <div
              key={`${row}-${label}`}
              className={`min-h-16 border-border p-2 sm:min-h-28 ${row > 0 ? 'border-t' : ''} ${
                column > 0 ? 'border-l' : ''
              }`}
            >
              <Skeleton className="h-4 w-4" />
              {row % 2 === column % 3 ? <Skeleton className="mt-2 h-4 w-full" /> : null}
            </div>
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
 * Adjacent-month days render on a quieter fill **with their own events**, because
 * the window the page fetches is the month's full week matrix (agent default §14-1).
 *
 * The cell is a real `<table>` with `<th scope="col">` headers, and the day number
 * is the select control (the one element in the cell that takes its own keyboard
 * focus) — chips are buttons too, and a button cannot nest inside a button, so the
 * day's accessible name lives on that control.
 *
 * On a phone a column is ~48px wide, so a chip keeps its accessible name but
 * shows only its tinted icon; the day panel beside the grid carries the words.
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
    <div className="rounded-2xl border border-border/80 bg-surface shadow-card">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b border-border">
            {WEEKDAY_LABELS.map((label, column) => (
              <th
                key={label}
                scope="col"
                className={`bg-subtle/60 py-2.5 text-center text-xs font-semibold text-gray-ink ${
                  column === 0 ? 'rounded-tl-2xl' : ''
                } ${column === 6 ? 'rounded-tr-2xl' : ''}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, row) => (
            <tr key={week[0].date} className={row > 0 ? 'border-t border-border' : ''}>
              {week.map((day, column) => {
                const dayEvents = grouped[day.date] ?? [];
                const { visible, hiddenCount } = packDayEvents(dayEvents);
                const selected = day.date === selectedDate;
                const isToday = day.date === today;
                const lastRow = row === weeks.length - 1;

                return (
                  <td
                    key={day.date}
                    className={`relative align-top transition-colors duration-150 ${
                      column > 0 ? 'border-l border-border' : ''
                    } ${
                      selected
                        ? 'bg-mint/70 shadow-[inset_0_0_0_1.5px_var(--color-primary)]'
                        : day.inMonth
                          ? 'bg-surface'
                          : 'bg-subtle/45'
                    } ${lastRow && column === 0 ? 'rounded-bl-2xl' : ''} ${
                      lastRow && column === 6 ? 'rounded-br-2xl' : ''
                    }`}
                  >
                    <div className="flex min-h-16 flex-col p-1 sm:min-h-28 sm:p-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectDate(day.date)}
                        aria-label={dayAriaLabel(day.date, dayEvents)}
                        aria-current={isToday ? 'date' : undefined}
                        aria-pressed={selected}
                        className={`flex h-7 min-w-7 items-center justify-center self-center rounded-full px-1 text-xs font-semibold tabular transition-[background-color,color,transform] duration-150 active:scale-[0.94] sm:self-start motion-reduce:active:scale-100 ${
                          isToday
                            ? 'bg-primary-strong text-white shadow-[0_1px_2px_rgb(28_32_25/0.2)]'
                            : selected
                              ? 'text-primary-dark hover:bg-surface'
                              : day.inMonth
                                ? 'text-ink hover:bg-subtle'
                                : 'text-muted hover:bg-subtle'
                        }`}
                      >
                        {day.dayNumber}
                      </button>

                      <div className="mt-1 flex flex-col gap-0.5 sm:gap-1">
                        {visible.map(event => {
                          const isOpen = open?.event.id === event.id;

                          return (
                            <div key={event.id} className="sm:relative">
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
                                className={`flex w-full items-center justify-center gap-1 rounded-md px-1 py-0.5 text-left text-[11px] font-medium leading-tight transition-[filter,box-shadow] duration-100 hover:brightness-[0.97] sm:justify-start sm:px-1.5 ${statusTone(
                                  event.status
                                )} ${isOpen ? 'shadow-[inset_0_0_0_1px_currentColor]' : ''}`}
                              >
                                <Icon name={eventIcon(event)} size={12} className="shrink-0" />
                                <span className="sr-only sm:not-sr-only sm:truncate">
                                  {eventChipLabel(event)}
                                </span>
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
                            className="rounded-md px-1 py-0.5 text-center text-[11px] font-semibold text-primary transition-colors duration-100 hover:bg-mint sm:px-1.5 sm:text-left"
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
    </div>
  );
}
