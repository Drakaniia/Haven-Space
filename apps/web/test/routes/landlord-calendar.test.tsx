import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CalendarDayPanel } from '../../src/components/calendar/CalendarDayPanel';
import { CalendarMonthGrid } from '../../src/components/calendar/CalendarMonthGrid';
import {
  FAMILY_FILTERS,
  MAX_DAY_CHIPS,
  dayAriaLabel,
  daySummary,
  eventChipLabel,
  eventIcon,
  eventLabel,
  formatDayLabel,
  formatShortDayLabel,
  groupEventsByDate,
  monthDays,
  monthKeyOf,
  monthSummaryLabel,
  monthWindow,
  packDayEvents,
  shiftMonth,
} from '../../src/components/calendar/calendar-helpers';
import { calendarQueryString } from '../../src/lib/api/calendar';
import type { CalendarEvent } from '../../src/lib/types';

/**
 * `landlord-calendar`: the month matrix, the day-cell vocabulary, the query the
 * page sends, and the markup contracts behind the read-only calendar.
 */

const ROOT = join(import.meta.dir, '../..');

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const draft: CalendarEvent = {
    id: 'charge:1:charge_due',
    type: 'charge_due',
    family: 'money',
    date: '2026-10-13',
    subject: 'Ana Reyes',
    status: 'pending',
    approximate: false,
    amount: 6500,
    late_fee: 0,
    charge_type: 'rent',
    description: null,
    period_start: '2026-10-01',
    period_end: '2026-10-31',
    reference_number: null,
    boarder: { id: 12, name: 'Ana Reyes' },
    room: { id: 7, name: 'Room 3' },
    property: { id: 1, name: 'Onda Boarding House' },
    link: { to: '/landlord/payments', label: 'View ledger' },
    ...overrides,
  };

  return draft;
}

let uiSlot: ReactNode = null;

const rootRoute = createRootRoute({ component: () => uiSlot });
const paymentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landlord/payments',
});
const recordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landlord/payments/record',
});
const applicationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landlord/applications',
});
const boardersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landlord/boarders',
});
const router = createRouter({
  routeTree: rootRoute.addChildren([paymentRoute, recordRoute, applicationsRoute, boardersRoute]),
  history: createMemoryHistory({ initialEntries: ['/landlord/payments'] }),
});

function renderInApp(node: ReactNode) {
  uiSlot = node;

  return render(<RouterProvider router={router} />);
}

afterEach(() => cleanup());

describe('calendar month matrix (D25/D26)', () => {
  test('starts the week on Sunday and asks for the whole week matrix', () => {
    // 1 October 2026 is a Thursday, so the grid starts on Sunday 27 September.
    expect(monthWindow('2026-10')).toEqual({ from: '2026-09-27', to: '2026-11-01' });
  });

  test('renders five rows for a short month and six for a long one', () => {
    expect(monthDays('2026-10').length).toBe(35);
    expect(monthDays('2026-10').filter(day => day.inMonth).length).toBe(31);
    // August 2026 starts on a Saturday and ends on a Monday: six full weeks.
    expect(monthDays('2026-08').length).toBe(42);
  });

  test('keeps the first cell a Sunday and every row seven cells wide', () => {
    const days = monthDays('2026-08');

    expect(formatShortDayLabel(days[0].date).startsWith('Sun')).toBe(true);
    expect(days.length % 7).toBe(0);
  });

  test('moves months across a year boundary', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthKeyOf('2026-10-13')).toBe('2026-10');
  });

  test('renders adjacent-month days greyed but present', () => {
    const days = monthDays('2026-10');
    const leading = days[0];

    expect(leading.date).toBe('2026-09-27');
    expect(leading.inMonth).toBe(false);
    expect(leading.dayNumber).toBe(27);
  });
});

describe('day cell vocabulary (D8)', () => {
  test('shows at most three chips and reports the rest', () => {
    const events = [1, 2, 3, 4, 5].map(index => event({ id: `charge:${index}:charge_due` }));
    const packed = packDayEvents(events);

    expect(MAX_DAY_CHIPS).toBe(3);
    expect(packed.visible.length).toBe(3);
    expect(packed.hiddenCount).toBe(2);
    expect(packDayEvents(events.slice(0, 2)).hiddenCount).toBe(0);
  });

  test('leads a chip with the charge type and the surname', () => {
    expect(eventChipLabel(event())).toBe('Rent · Reyes');
    // A nameless boarder keeps the API's whole fallback rather than a bare number.
    expect(eventChipLabel(event({ subject: 'Boarder 12' }))).toBe('Rent · Boarder 12');
    expect(eventChipLabel(event({ type: 'payment_received', status: 'paid' }))).toBe(
      'Payment received · Reyes'
    );
    expect(eventChipLabel(event({ type: 'tenancy_move_in', family: 'tenancy' }))).toBe(
      'Move-in · Reyes'
    );
    expect(eventChipLabel(event({ type: 'tenancy_move_out', family: 'tenancy' }))).toBe(
      'Leaving · Reyes'
    );
    expect(
      eventChipLabel(
        event({
          type: 'announcement_publish',
          family: 'content',
          subject: 'Water interruption',
        })
      )
    ).toBe('Water interruption');
  });

  test('names the whole thing in the day panel, and labels the deposit charge', () => {
    expect(eventLabel(event())).toBe('Rent · Ana Reyes');
    expect(eventLabel(event({ charge_type: 'deposit' }))).toBe('Security deposit · Ana Reyes');
    expect(eventLabel(event({ type: 'application_received', family: 'applications' }))).toBe(
      'Application · Ana Reyes'
    );
  });

  test('picks an icon that already exists in the icon set', () => {
    expect(eventIcon(event())).toBe('payment');
    expect(eventIcon(event({ type: 'payment_received' }))).toBe('currencyDollar');
    expect(eventIcon(event({ type: 'tenancy_move_in' }))).toBe('users');
    expect(eventIcon(event({ type: 'announcement_publish', family: 'content' }))).toBe(
      'announcement'
    );
  });

  test('groups events by day and keeps the order it was given', () => {
    const grouped = groupEventsByDate([
      event({ id: 'a' }),
      event({ id: 'b' }),
      event({ id: 'c', date: '2026-10-14' }),
    ]);

    expect(Object.keys(grouped).sort()).toEqual(['2026-10-13', '2026-10-14']);
    expect(grouped['2026-10-13'].map(item => item.id)).toEqual(['a', 'b']);
  });

  test('sums a day’s money and counts its overdue charges', () => {
    expect(
      daySummary([
        event({ amount: 6500 }),
        event({ id: 'b', status: 'overdue', amount: 800 }),
        event({ id: 'c', type: 'payment_received', status: 'paid', amount: 7000 }),
      ])
    ).toEqual({ due: 7300, collected: 7000, overdueCount: 1 });
  });

  test('names a day for assistive tech', () => {
    const label = dayAriaLabel('2026-10-13', [
      event(),
      event({ id: 'b', status: 'overdue' }),
      event({ id: 'c', type: 'payment_received', status: 'paid' }),
    ]);

    expect(label.startsWith(formatDayLabel('2026-10-13'))).toBe(true);
    expect(label).toContain('3 events');
    expect(label).toContain('1 overdue');
  });

  test('formats the month strip and offers no content pill', () => {
    expect(
      monthSummaryLabel({ due_amount: 14300, collected_amount: 7000, overdue_count: 1 })
    ).toEqual({ due: '₱14,300.00', collected: '₱7,000.00', overdue: '1 overdue' });
    expect(FAMILY_FILTERS.map(option => option.value)).toEqual([
      'all',
      'money',
      'tenancy',
      'applications',
    ]);
    expect(FAMILY_FILTERS[0].types).toBeNull();
    expect(FAMILY_FILTERS[1].types).toEqual(['money']);
  });
});

describe('calendar request (D16)', () => {
  test('always sends a window, and a property or family filter only when chosen', () => {
    expect(calendarQueryString({ from: '2026-10-01', to: '2026-11-01' })).toBe(
      '?from=2026-10-01&to=2026-11-01'
    );
    expect(
      calendarQueryString({
        from: '2026-10-01',
        to: '2026-11-01',
        propertyId: 7,
        types: ['money', 'tenancy'],
      })
    ).toBe('?from=2026-10-01&to=2026-11-01&propertyId=7&types=money%2Ctenancy');
  });
});

describe('calendar rendering', () => {
  test('renders chips, a +N more control that selects the day, and the popover', async () => {
    const events = [1, 2, 3, 4].map(index =>
      event({ id: `charge:${index}:charge_due`, subject: `Boarder ${index}` })
    );
    const selected: string[] = [];

    renderInApp(
      <CalendarMonthGrid
        monthKey="2026-10"
        today="2026-10-05"
        selectedDate="2026-10-05"
        events={events}
        onSelectDate={date => selected.push(date)}
      />
    );

    const more = await screen.findByRole('button', { name: '+1 more' });
    fireEvent.click(more);

    expect(selected).toEqual(['2026-10-13']);

    const chip = screen.getAllByRole('button', { name: /Rent · Boarder/ })[0];
    fireEvent.click(chip);

    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Rent · Boarder 1');
    expect(screen.getByRole('link', { name: 'View ledger' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('marks today and the selected day', async () => {
    renderInApp(
      <CalendarMonthGrid
        monthKey="2026-10"
        today="2026-10-05"
        selectedDate="2026-10-13"
        events={[]}
        onSelectDate={() => {}}
      />
    );

    const today = await screen.findByRole('button', { name: /Monday, October 5/ });
    expect(today.getAttribute('aria-current')).toBe('date');

    const selected = screen.getByRole('button', { name: /Tuesday, October 13/ });
    expect(selected.getAttribute('aria-pressed')).toBe('true');
  });

  test('shows the day panel with its money summary and quick actions', async () => {
    renderInApp(
      <CalendarDayPanel
        date="2026-10-13"
        events={[
          event(),
          event({ id: 'b', type: 'application_received', family: 'applications', amount: null }),
        ]}
      />
    );

    expect(await screen.findByText('Tuesday, October 13')).toBeTruthy();
    expect(screen.getByText('2 events')).toBeTruthy();
    // The day's due figure in the summary strip and on the charge's own row.
    expect(screen.getAllByText('₱6,500.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Due')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Record payment' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Review application' })).toBeTruthy();
  });

  test('shows the tenant balance on a leave row', async () => {
    renderInApp(
      <CalendarDayPanel
        date="2026-10-13"
        events={[
          event({
            id: 'application:204:tenancy_move_out',
            type: 'tenancy_move_out',
            family: 'tenancy',
            status: 'pending',
            amount: null,
            application_id: 204,
            leave_request: {
              reason: 'New job downtown',
              requested_on: '2026-10-01',
              leave_date: '2026-10-20',
            },
            outstanding_amount: 6500,
          }),
        ]}
        onApproveLeave={() => {}}
      />
    );

    expect(await screen.findByText('₱6,500.00 due')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  test('keeps an empty day inert', async () => {
    renderInApp(<CalendarDayPanel date="2026-10-14" events={[]} />);

    expect(await screen.findByText('Nothing scheduled.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Record payment' })).toBeNull();
  });
});

describe('calendar wiring', () => {
  test('the route renders the page component instead of the placeholder', () => {
    const route = readFileSync(join(ROOT, 'src/routes/landlord/calendar.tsx'), 'utf8');

    expect(route).toContain("createFileRoute('/landlord/calendar')");
    expect(route).toContain('LandlordCalendar');
    expect(route).toContain('<RoleShell nav={LANDLORD_NAV}>');
    expect(route).not.toContain('PlaceholderPage');
  });

  test('the dashboard keeps the renewals count and the sidebar keeps the calendar route', () => {
    const dashboard = readFileSync(join(ROOT, 'src/routes/landlord/index.tsx'), 'utf8');

    // The renewals card no longer carries a calendar link (dashboard redesign
    // D28); the calendar stays reachable from the sidebar.
    expect(dashboard).toContain('renewals.upcoming_count');
    expect(dashboard).not.toContain('to="/landlord/calendar"');

    const nav = readFileSync(join(ROOT, 'src/lib/nav.ts'), 'utf8');
    expect(nav).toContain("to: '/landlord/calendar'");
  });

  test('the page fetches one window per month and keeps the previous month on screen', () => {
    const page = readFileSync(join(ROOT, 'src/components/calendar/LandlordCalendar.tsx'), 'utf8');

    expect(page).toContain("['landlord-calendar', from, to, activePropertyId, familyTypes]");
    expect(page).toContain('keepPreviousData');
    expect(page).toContain('prefetchQuery');
    // The client never re-derives a status or adds money up (D6).
    expect(page).not.toContain('effectiveStatus');
  });
});
