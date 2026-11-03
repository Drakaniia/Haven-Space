import { afterEach, expect, mock, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';

/**
 * The redesigned payments page (spec `payments-tracker-redesign` §10.1).
 *
 * Asserts the brief's contract: one row per boarder with every listed column, a
 * status that carries a text label *and* an icon (never colour alone), a visible
 * legend, summary cards that act as filters, and the two empty states. The
 * single-shell guarantee stays with `payments-shell.test.tsx`.
 */

// The page only needs a signed-in landlord; stubbing the context keeps the test
// focused on the tracker rather than on session plumbing.
mock.module('../src/lib/auth-context', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    token: 'token-1',
    user: {
      id: 3,
      first_name: 'Lara',
      last_name: 'Landlord',
      role: 'landlord',
      email: 'landlord@example.com',
    },
    isAuthenticated: true,
    isHydrated: true,
  }),
}));

mock.module('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ to, children }: { to: unknown; children: ReactNode }) => (
    <a href={String(to)}>{children}</a>
  ),
  Outlet: () => null,
  useNavigate: () => () => {},
  useLocation: () => ({
    href: '/landlord/payments',
    searchStr: '',
    pathname: '/landlord/payments',
  }),
}));

afterEach(() => cleanup());

const trackerRow = {
  application_id: 200,
  boarder_id: 2,
  boarder_name: 'Benny Boarder',
  room_id: 100,
  room_number: 'A1',
  room_occupied: 2,
  room_capacity: 4,
  move_in_date: '2026-01-15',
  monthly_rent: 6500,
  next_due_date: '2026-10-20',
  days_remaining: 21,
  days_overdue: null,
  status: 'upcoming',
  status_label: 'Upcoming · 21d',
  current_charge_id: 91,
  amount_due: 6500,
  last_payment: null,
  has_pending_claim: false,
  other_open_charges: 1,
  can_remind: true,
};

// Deliberately a different room and share, so the “Room or bed” column assertions
// can never pass on the wrong row.
const overdueRow = {
  ...trackerRow,
  application_id: 201,
  boarder_id: 7,
  boarder_name: 'Other Boarder',
  room_id: 101,
  room_number: 'B2',
  room_occupied: 1,
  room_capacity: 2,
  status: 'overdue',
  status_label: 'Overdue · 4d',
  days_remaining: null,
  days_overdue: 4,
  amount_due: 6500,
  can_remind: false,
};

const settings = {
  property_id: 10,
  late_fee_amount: 500,
  late_fee_grace_days: 3,
  late_fee_enabled: 1,
  late_fee_type: 'fixed',
  late_fee_percent: 0,
  electricity_cost: 800,
  water_cost: 0,
  internet_cost: 0,
};

const historyCharge = {
  id: 91,
  application_id: 200,
  boarder_id: 2,
  landlord_id: 3,
  room_id: 100,
  property_id: 10,
  property_title: 'Flow House',
  room_title: 'A1',
  boarder_name: 'Benny Boarder',
  charge_type: 'rent',
  description: 'Monthly rent — October 2026',
  amount: 6500,
  late_fee: 0,
  total_due: 6500,
  due_date: '2026-10-20',
  paid_date: null,
  status: 'pending',
  stored_status: 'pending',
  is_overdue: false,
  is_due_soon: false,
  days_overdue: 0,
  payment_method: null,
  payment_method_label: null,
  reference_number: null,
  notes: null,
  period_start: '2026-10-20',
  period_end: '2026-11-19',
  reminder_sent_at: null,
  deposit_resolution: null,
  deposit_resolution_amount: null,
  deposit_resolution_reason: null,
  created_at: '2026-10-01 08:00:00',
  submissions: [],
};

let requested: string[] = [];

function envelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), { status: 200 });
}

function stubFetch(rows: unknown[]) {
  requested = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);

    if (url.includes('/payments/tracker')) {
      return envelope({
        rows,
        summary: { expected: 13000, paid: 0, due_today: 0, in_grace: 0, overdue: 6500 },
        counts: { rows: rows.length, needs_review: 0 },
      });
    }

    if (url.includes('/payment-history')) {
      return envelope({
        tenancy: {
          application_id: 200,
          boarder_id: 2,
          boarder_name: 'Benny Boarder',
          room_number: 'A1',
          property_title: 'Flow House',
          move_in_date: '2026-01-15',
          next_due_date: '2026-10-20',
          monthly_rent: 6500,
        },
        charges: [historyCharge],
      });
    }

    if (url.includes('/billing-settings')) {
      return envelope(settings);
    }

    if (url.includes('/api/landlord/properties')) {
      return envelope({ properties: [{ id: 10, name: 'Flow House' }] });
    }

    return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
  }) as unknown as typeof fetch;
}

async function renderPage(rows: unknown[]) {
  stubFetch(rows);

  const { PaymentsTrackerPage } = await import('../src/components/payments/PaymentsTrackerPage');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <PaymentsTrackerPage />
    </QueryClientProvider>
  );
}

test('renders one row per boarder with every column from the brief', async () => {
  await renderPage([trackerRow, overdueRow]);

  await screen.findByText('Benny Boarder');

  expect(screen.getByText('Other Boarder')).toBeDefined();
  expect(screen.getByText('Room A1 · 2/4')).toBeDefined();
  expect(screen.getByText('Room B2 · 1/2')).toBeDefined();
  // One monthly-rent cell per row, both formatted as pesos. Scoped to the table,
  // because the summary cards render the same amount.
  const table = within(screen.getByRole('table', { name: 'Monthly boarder payment tracker' }));

  expect(table.getAllByText('₱6,500.00')).toHaveLength(2);
  expect(screen.getByText('21d left')).toBeDefined();
  expect(screen.getAllByRole('button', { name: /Record payment for/ })).toHaveLength(2);

  // The reminder action only appears where it applies (D14/D18).
  expect(screen.getAllByRole('button', { name: /Send reminder to/ })).toHaveLength(1);

  // No profile photos anywhere in the tracker (status icons are the only images).
  expect(document.querySelectorAll('img[alt*="Benny"], img[src*="avatar"]')).toHaveLength(0);
});

test('carries the status as a label and an icon, plus a visible legend', async () => {
  await renderPage([overdueRow]);

  const badge = await screen.findByText('Overdue · 4d');

  expect(badge.querySelector('img, svg')).not.toBeNull();

  // D25: the key is on the page, so the five states never depend on colour alone.
  // Scoped to the legend, because the status filter and badges reuse the labels.
  const legend = within(screen.getByLabelText('Payment status key'));

  expect(legend.getByText('In grace')).toBeDefined();
  expect(legend.getByText('Due today')).toBeDefined();
  expect(legend.getByText('Overdue')).toBeDefined();
});

test('filters the table from the summary cards', async () => {
  await renderPage([trackerRow, overdueRow]);

  await screen.findByText('Benny Boarder');

  const overdueCard = screen.getByRole('button', { name: /Overdue/ });

  expect(overdueCard.getAttribute('aria-pressed')).toBe('false');

  overdueCard.click();

  await waitFor(() => {
    expect(requested.some(url => url.includes('status=overdue'))).toBe(true);
  });
});

test('explains the two empty causes differently', async () => {
  await renderPage([]);

  await screen.findByText('No boarders to bill this month');
  expect(screen.queryByText('Nothing matches these filters')).toBeNull();
});

test('expands a row into that boarder’s payment history', async () => {
  await renderPage([trackerRow]);

  await screen.findByText('Benny Boarder');

  const toggle = screen.getByRole('button', { name: 'History' });

  expect(toggle.getAttribute('aria-expanded')).toBe('false');

  toggle.click();

  await screen.findByText('Monthly rent — October 2026');

  // D16/R5: the history panel also carries the manual next-due editor.
  expect(screen.getByLabelText('Next due date')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Save next due date' })).toBeDefined();
});
