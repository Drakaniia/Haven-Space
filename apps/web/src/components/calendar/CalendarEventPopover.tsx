import { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';

import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import { formatPeso } from '../../lib/payments';
import type { CalendarEvent } from '../../lib/types';
import { eventLabel, eventTypeLabel, formatShortDayLabel } from './calendar-helpers';

/**
 * The read-only detail behind a day chip (spec `landlord-calendar` §7.5/D12).
 *
 * Dismissed by Escape, an outside click, or a second click on the chip that
 * opened it, and it carries exactly one action: the deep link to the surface
 * that owns the record.
 *
 * Anchored to its chip rather than centred — `align` flips it to the right edge
 * for chips in the grid's later columns, so a narrow cell cannot push it off the
 * page. Focus moves into the panel on open and returns to the chip on close;
 * it is deliberately **not** a tab trap (the panel sits directly after its chip
 * in the DOM, so the tab order is already chip → panel → next chip), which is the
 * one place this departs from §7.5's wording.
 */
export function CalendarEventPopover({
  event,
  trigger,
  align,
  onClose,
  id,
}: {
  event: CalendarEvent;
  /** The chip that opened this panel, so a click on it is a toggle, not an outside click. */
  trigger: HTMLElement | null;
  /** `right` anchors the panel's right edge to the chip, for the last columns. */
  align: 'left' | 'right';
  onClose: () => void;
  id: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });

    function handleKeyDown(pointer: KeyboardEvent) {
      if (pointer.key === 'Escape') onClose();
    }

    function handlePointerDown(pointer: MouseEvent) {
      const target = pointer.target as Node | null;

      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (trigger && trigger.contains(target)) return;

      onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);

      if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
    };
  }, [onClose, trigger]);

  const party = [event.boarder?.name, event.room?.name, event.property?.name]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      tabIndex={-1}
      aria-label={eventLabel(event)}
      className={`menu-pop fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-border bg-surface p-4 text-left shadow-pop outline-none sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:z-30 sm:mt-1.5 sm:w-72 ${
        align === 'left' ? 'sm:left-0 sm:origin-top-left' : 'sm:right-0 sm:origin-top-right'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{eventLabel(event)}</p>
          <p className="mt-0.5 text-xs text-gray-ink">
            {formatShortDayLabel(event.date)} · {eventTypeLabel(event)}
            {event.approximate ? ' (approx. date)' : ''}
          </p>
        </div>
        <StatusBadge status={event.status} />
      </div>

      {party ? <p className="mt-2.5 text-xs text-gray-ink">{party}</p> : null}

      {event.amount !== null ? (
        <p className="mt-2.5 font-display text-xl font-medium tracking-[-0.01em] tabular text-ink">
          {formatPeso(event.amount)}
          {event.late_fee ? (
            <span className="ml-1.5 font-sans text-xs font-normal text-warning-ink">
              (incl. {formatPeso(event.late_fee)} late fee)
            </span>
          ) : null}
        </p>
      ) : null}

      {event.period_start && event.period_end ? (
        <p className="text-xs text-gray-ink">
          Covers {formatShortDayLabel(event.period_start)} – {formatShortDayLabel(event.period_end)}
        </p>
      ) : null}

      {event.reference_number ? (
        <p className="text-xs text-gray-ink">Ref {event.reference_number}</p>
      ) : null}

      {event.description && event.type !== 'announcement_publish' ? (
        <p className="mt-1 text-xs text-gray-ink">{event.description}</p>
      ) : null}

      <div className="mt-3 border-t border-border pt-3">
        <Link
          to={event.link.to}
          className="inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          {event.link.label}
          <Icon name="chevronRight" size={14} />
        </Link>
      </div>
    </div>
  );
}
