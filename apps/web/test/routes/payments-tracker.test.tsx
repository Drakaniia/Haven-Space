import { afterEach, expect, mock, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { TrackerRow } from '../../src/lib/types';

/**
 * The payments monitor (spec `landlord-payments-monitoring` §19).
 *
 * The page contract the brief names: six columns, one row per tenant, exactly one
 * action per round state, the four metrics, and none of the tracker's page-level
 * create controls. The single-shell guarantee stays with `payments-shell.test.tsx`.
 */

mock.module('../../src/lib/auth-context', () => ({
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

function row(overrides: Partial<TrackerRow> = {}): TrackerRow {
  return {
    application_id: 200,
    boarder_id: 2,
    boarder_name: 'Maria Santos',
    room_id: 100,
    room_number: 'Room 01',
    room_occupied: 1,
    room_capacity: 2,
    move_in_date: '2026-01-15',
    monthly_rent: 4000,
    next_due_date: '2026-10-05',
    days_remaining: null,
    days_overdue: null,
    status: 'paid',
    status_label: 'Paid',
    current_charge_id: null,
    amount_due: 0,
    last_payment: { date: '2026-10-05', amount: 4000, method: 'gcash', method_label: null },
    has_pending_claim: false,
    pending_claim_charge_id: null,
    has_rejected_claim: false,
    reminder_sent_at: null,
    other_open_charges: 0,
    can_remind: false,
    ...overrides,
  };
}

const PAID = row();
const DUE = row({
  application_id: 201,
  boarder_id: 3,
  boarder_name: 'John Dela Cruz',
  room_number: 'Room 02',
  status: 'due_soon',
  status_label: 'Due soon · 6d',
  next_due_date: '2026-10-12',
  days_remaining: 6,
  current_charge_id: 92,
  amount_due: 4000,
  last_payment: null,
  can_remind: true,
});
const OVERDUE = row({
  application_id: 202,
  boarder_id: 4,
  boarder_name: 'Ana Reyes',
  room_number: 'Room 03',
  status: 'overdue',
  status_label: 'Overdue · 4d',
  next_due_date: '2026-10-01',
  days_overdue: 4,
  current_charge_id: 93,
  amount_due: 4000,
  last_payment: null,
  can_remind: true,
});
const REVIEW = row({
  application_id: 203,
  boarder_id: 5,
  boarder_name: 'Liam Garcia',
  room_number: 'Room 04',
  status: 'due_today',
  status_label: 'Due today',
  next_due_date: '2026-10-20',
  days_remaining: 0,
  current_charge_id: 94,
  amount_due: 4000,
  last_payment: null,
  has_pending_claim: true,
  pending_claim_charge_id: 94,
});

let requested: string[] = [];

function envelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), { status: 200 });
}

const charge = {
  id: 94,
  application_id: 203,
  boarder_id: 5,
  landlord_id: 3,
  room_id: 104,
  property_id: 10,
  property_title: 'Onda Boarding House',
  room_title: 'Room 04',
  boarder_name: 'Liam Garcia',
  charge_type: 'rent',
  description: 'October rent',
  amount: 4000,
  late_fee: 0,
  total_due: 4000,
  due_date: '2026-10-20',
  paid_date: null,
  status: 'awaiting_verification',
  stored_status: 'pending',
  is_overdue: false,
  is_due_soon: true,
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
  created_at: '2026-10-01 01:00:00',
  submissions: [
    {
      id: 900,
      payment_id: 94,
      submitted_by: 5,
      submitted_by_name: 'Liam Garcia',
      amount: 4000,
      payment_method: 'gcash',
      reference_number: '8842',
      proof_url: null,
      notes: null,
      status: 'pending',
      verified_by: null,
      verified_at: null,
      rejection_reason: null,
      created_at: '2026-10-08 02:42:00',
    },
  ],
};

function stubFetch(rows: TrackerRow[]) {
  requested = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);

    if (url.includes('/payments/tracker')) {
      return envelope({
        rows,
        summary: { expected: 12000, paid: 4000, due_today: 0, in_grace: 0, overdue: 4000 },
        counts: { rows: rows.length, needs_review: 1 },
      });
    }

    if (url.includes('/payment-history')) {
      return envelope({
        tenancy: {
          application_id: 203,
          boarder_id: 5,
          boarder_name: 'Liam Garcia',
          room_number: 'Room 04',
          property_title: 'Onda Boarding House',
          move_in_date: '2026-01-15',
          next_due_date: '2026-10-20',
          monthly_rent: 4000,
        },
        charges: [charge],
      });
    }

    if (url.includes('/api/landlord/charges/')) {
      return envelope(charge);
    }

    if (url.includes('/api/landlord/properties')) {
      return envelope({ properties: [{ id: 10, name: 'Onda Boarding House' }] });
    }

    if (url.includes('/api/messages/threads')) {
      return new Response(
        JSON.stringify({ success: true, data: { thread: { id: 55 }, messages: [] } }),
        { status: 201 }
      );
    }

    return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
  }) as unknown as typeof fetch;
}

async function renderPage(rows: TrackerRow[]) {
  stubFetch(rows);

  const { PaymentsMonitoringPage } = await import(
    '../../src/components/payments/PaymentsMonitoringPage'
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <PaymentsMonitoringPage />
    </QueryClientProvider>
  );
}

test('renders the six brief columns with one row per tenant', async () => {
  await renderPage([PAID, DUE, OVERDUE, REVIEW]);

  await screen.findByText('Maria Santos');

  const table = within(screen.getByRole('table', { name: /Payments for/ }));
  const headers = table.getAllByRole('columnheader').map(cell => cell.textContent?.trim());

  expect(headers).toEqual(['Tenant', 'Room', 'Due date', 'Amount', 'Status', 'Action']);
  expect(table.getAllByText('₱4,000.00')).toHaveLength(4);
  expect(table.getAllByText('Room 01')).toHaveLength(1);
});

test('shows the derived status labels and exactly one action per state', async () => {
  await renderPage([PAID, DUE, OVERDUE, REVIEW]);

  await screen.findByText('Maria Santos');

  const table = within(screen.getByRole('table', { name: /Payments for/ }));

  expect(table.getByText('Paid')).toBeDefined();
  expect(table.getByText('Due in 6 days')).toBeDefined();
  expect(table.getByText('Overdue')).toBeDefined();
  expect(table.getByText('Needs review')).toBeDefined();

  expect(screen.getByRole('button', { name: "View Maria Santos's payments" })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Remind John Dela Cruz' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Remind Ana Reyes' })).toBeDefined();
  expect(screen.getByRole('button', { name: "Review Liam Garcia's proof" })).toBeDefined();
});

test('summarises the visible table: tenants, expected, paid, needs attention', async () => {
  await renderPage([PAID, DUE, OVERDUE, REVIEW]);

  await screen.findByText('Maria Santos');

  const metrics = within(screen.getByLabelText('Payment summary'));

  expect(metrics.getByText('Tenants')).toBeDefined();
  expect(metrics.getByText('Expected')).toBeDefined();
  expect(metrics.getByText('Paid')).toBeDefined();
  expect(metrics.getByText('Needs attention')).toBeDefined();
  // 4 tenants: one paid, three owing → 3 × ₱4,000 expected, ₱4,000 paid,
  // and only the overdue + needs-review rows need attention.
  expect(metrics.getByText('₱12,000.00')).toBeDefined();
  expect(metrics.getByText('₱4,000.00')).toBeDefined();
});

test('states the row count and the attention count under the table', async () => {
  await renderPage([PAID, DUE, OVERDUE, REVIEW]);

  await screen.findByText('Maria Santos');

  expect(screen.getByText(/Showing 4 tenants/)).toBeDefined();
  expect(screen.getByText(/2 need attention/)).toBeDefined();
});

test('keeps the tracker’s create controls off the page', async () => {
  await renderPage([PAID]);

  await screen.findByText('Maria Santos');

  expect(screen.queryByRole('button', { name: 'Record a payment' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add a charge' })).toBeNull();
  expect(screen.queryByText('Billing rules')).toBeNull();
  expect(screen.queryByText('Status key')).toBeNull();
  expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDefined();
});

test('asks the tracker for property, month and search only', async () => {
  await renderPage([PAID]);

  await screen.findByText('Maria Santos');

  await waitFor(() => {
    expect(requested.some(url => url.includes('propertyId=10'))).toBe(true);
  });

  const trackerCall = requested.find(
    url => url.includes('/payments/tracker') && url.includes('propertyId=10')
  );

  expect(trackerCall).toMatch(/month=\d{4}-\d{2}/);
  expect(trackerCall).not.toContain('status=');
  expect(trackerCall).not.toContain('needsReview=');
});

test('opens the tenant payment detail from the tenant name', async () => {
  await renderPage([REVIEW]);

  const name = await screen.findByRole('button', {
    name: 'Open payment details for Liam Garcia',
  });

  fireEvent.click(name);

  await screen.findByRole('heading', { name: 'Liam Garcia' });
  expect(screen.getByText('Payment activity')).toBeDefined();
  expect(screen.getByText('Current rent')).toBeDefined();
  expect(await screen.findByText('Proof submitted')).toBeDefined();
});

test('opens the review drawer with the claim’s facts', async () => {
  await renderPage([REVIEW]);

  fireEvent.click(await screen.findByRole('button', { name: "Review Liam Garcia's proof" }));

  await screen.findByRole('heading', { name: 'Liam Garcia' });

  expect(screen.getByText('Payment submission')).toBeDefined();
  expect(screen.getByText('Check the amount and reference before approving.')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Approve payment' })).toBeDefined();
});

test('the Remind action opens a composer prefilled with the payment facts', async () => {
  await renderPage([DUE]);

  fireEvent.click(await screen.findByRole('button', { name: 'Remind John Dela Cruz' }));

  await waitFor(() => {
    expect(requested.some(url => url.includes('/api/messages/threads'))).toBe(true);
  });

  const composer = (await screen.findByPlaceholderText(/Write a message/i)) as HTMLTextAreaElement;

  expect(composer.value).toContain('Hi John');
  expect(composer.value).toContain('rent for');
});

test('explains an empty month', async () => {
  await renderPage([]);

  await screen.findByText(/No tenants to bill for/);
  expect(screen.queryByText('Nothing matches these filters')).toBeNull();
});
