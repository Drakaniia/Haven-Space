import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';

import { PaymentMonitorTable } from '../../src/components/payments/PaymentMonitorTable';
import {
  buildTenantTimeline,
  formatDateTime,
  matchesFilters,
  monitorFilterKey,
  monitorMetrics,
  monitorStatusMeta,
  needsAttention,
  emptyMonitorFilters,
} from '../../src/lib/payments';
import type { PaymentCharge, TrackerRow } from '../../src/lib/types';

/**
 * The monitoring table and its status vocabulary (spec
 * `landlord-payments-monitoring` §3, §7, §19).
 *
 * The seven labels are the page's contract, so every server state is pinned here,
 * along with the precedence rules that decide which label wins.
 */

mock.module('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ to, children }: { to: unknown; children: ReactNode }) => (
    <a href={String(to)}>{children}</a>
  ),
  Outlet: () => null,
  useNavigate: () => () => {},
  useLocation: () => ({ href: '/landlord/payments', searchStr: '', pathname: '/landlord/payments' }),
}));

afterEach(() => cleanup());

function row(overrides: Partial<TrackerRow> = {}): TrackerRow {
  return {
    application_id: 1,
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
    last_payment: null,
    has_pending_claim: false,
    pending_claim_charge_id: null,
    has_rejected_claim: false,
    reminder_sent_at: null,
    other_open_charges: 0,
    can_remind: false,
    ...overrides,
  };
}

function renderTable(
  rows: TrackerRow[],
  overrides: Partial<Parameters<typeof PaymentMonitorTable>[0]> = {}
) {
  const calls = { tenant: 0, review: 0, remind: 0, retry: 0, clear: 0 };

  render(
    <PaymentMonitorTable
      rows={rows}
      monthName="October 2026"
      loading={false}
      activeApplicationId={null}
      hasProperties
      hasFilters={false}
      error={null}
      onRetry={() => (calls.retry += 1)}
      onClearFilters={() => (calls.clear += 1)}
      onOpenTenant={() => (calls.tenant += 1)}
      onReview={() => (calls.review += 1)}
      onRemind={() => (calls.remind += 1)}
      {...overrides}
    />
  );

  return calls;
}

describe('status vocabulary', () => {
  test('every server state maps onto the approved labels', () => {
    expect(monitorStatusMeta(row({ status: 'paid' }))).toEqual({
      tone: 'paid',
      label: 'Paid',
      action: 'view',
    });
    expect(monitorStatusMeta(row({ status: 'due_today' }))).toEqual({
      tone: 'due_today',
      label: 'Due today',
      action: 'remind',
    });
    expect(monitorStatusMeta(row({ status: 'in_grace' }))).toEqual({
      tone: 'in_grace',
      label: 'In grace',
      action: 'remind',
    });
    expect(monitorStatusMeta(row({ status: 'overdue' }))).toEqual({
      tone: 'overdue',
      label: 'Overdue',
      action: 'remind',
    });
    expect(monitorStatusMeta(row({ status: 'due_soon', days_remaining: 2 }))).toEqual({
      tone: 'due_soon',
      label: 'Due in 2 days',
      action: 'remind',
    });
    // `upcoming` reads the same sentence with a quieter tone, never a sixth phrase.
    expect(monitorStatusMeta(row({ status: 'upcoming', days_remaining: 21 }))).toEqual({
      tone: 'upcoming',
      label: 'Due in 21 days',
      action: 'remind',
    });
    expect(monitorStatusMeta(row({ status: 'no_charge' }))).toEqual({
      tone: 'no_charge',
      label: 'No charge yet',
      action: 'none',
    });
  });

  test('a claim outranks the date states: pending, then rejected', () => {
    const claimed = row({
      status: 'overdue',
      days_overdue: 9,
      has_pending_claim: true,
      pending_claim_charge_id: 91,
    });

    expect(monitorStatusMeta(claimed).label).toBe('Needs review');
    expect(monitorStatusMeta(claimed).action).toBe('review');

    const rejected = row({ status: 'in_grace', has_rejected_claim: true });

    expect(monitorStatusMeta(rejected).label).toBe('Payment issue');
    expect(monitorStatusMeta(rejected).tone).toBe('rejected');
    expect(monitorStatusMeta(rejected).action).toBe('remind');
  });

  test('folds due_soon and upcoming into one filter key', () => {
    expect(monitorFilterKey(row({ status: 'due_soon', days_remaining: 1 }))).toBe('due_soon');
    expect(monitorFilterKey(row({ status: 'upcoming', days_remaining: 20 }))).toBe('due_soon');
    expect(monitorFilterKey(row({ has_pending_claim: true }))).toBe('needs_review');
    expect(monitorFilterKey(row({ has_rejected_claim: true }))).toBe('payment_issue');
  });

  test('due today is business as usual; grace, overdue, review and issues are not', () => {
    expect(needsAttention(row({ status: 'due_today' }))).toBe(false);
    expect(needsAttention(row({ status: 'due_soon', days_remaining: 3 }))).toBe(false);
    expect(needsAttention(row({ status: 'paid' }))).toBe(false);
    expect(needsAttention(row({ status: 'in_grace' }))).toBe(true);
    expect(needsAttention(row({ status: 'overdue' }))).toBe(true);
    expect(needsAttention(row({ has_pending_claim: true }))).toBe(true);
    expect(needsAttention(row({ status: 'overdue', has_rejected_claim: true }))).toBe(true);
  });
});

describe('metrics', () => {
  test('describes the visible table: 12 tenants · ₱48,000 · ₱32,000 · 3', () => {
    const paid = Array.from({ length: 8 }, (_, index) =>
      row({ application_id: index + 1, status: 'paid' })
    );
    const rows = [
      ...paid,
      row({ application_id: 20, status: 'due_soon', days_remaining: 6 }),
      row({ application_id: 21, status: 'overdue', days_overdue: 4 }),
      row({ application_id: 22, status: 'in_grace', days_overdue: 1 }),
      row({ application_id: 23, has_pending_claim: true, status: 'due_today' }),
    ];

    expect(monitorMetrics(rows)).toEqual({
      tenants: 12,
      expected: 16000,
      paid: 32000,
      needsAttention: 3,
    });
  });

  test('a settled row is never counted as expected, and no-charge rows count as neither', () => {
    const metrics = monitorMetrics([
      row({ status: 'paid' }),
      row({ status: 'no_charge', monthly_rent: 4000 }),
    ]);

    expect(metrics).toEqual({ tenants: 2, expected: 0, paid: 4000, needsAttention: 0 });
  });
});

describe('client filters', () => {
  const at = (overrides: Partial<TrackerRow> = {}) =>
    row({ room_number: 'Room 02', next_due_date: '2026-10-12', ...overrides });

  test('status, room, due range and method narrow the rows', () => {
    const base = emptyMonitorFilters('2026-10');

    expect(matchesFilters(at(), base)).toBe(true);
    expect(matchesFilters(at(), { ...base, status: 'due_soon' })).toBe(false);
    expect(
      matchesFilters(at({ status: 'upcoming', days_remaining: 20 }), {
        ...base,
        status: 'due_soon',
      })
    ).toBe(true);
    expect(matchesFilters(at(), { ...base, room: 'Room 03' })).toBe(false);
    expect(matchesFilters(at(), { ...base, dueFrom: '2026-10-13' })).toBe(false);
    expect(matchesFilters(at(), { ...base, dueTo: '2026-10-11' })).toBe(false);
    expect(
      matchesFilters(at({ last_payment: { date: '2026-10-12', amount: 4000, method: 'gcash', method_label: null } }), {
        ...base,
        method: 'cash',
      })
    ).toBe(false);
  });

  test('the two toggles match their own labels only', () => {
    const base = emptyMonitorFilters('2026-10');

    expect(matchesFilters(at({ status: 'overdue' }), { ...base, overdue: true })).toBe(true);
    expect(matchesFilters(at({ status: 'in_grace' }), { ...base, overdue: true })).toBe(false);
    expect(matchesFilters(at({ has_pending_claim: true }), { ...base, needsReview: true })).toBe(
      true
    );
    expect(matchesFilters(at(), { ...base, needsReview: true })).toBe(false);
  });
});

describe('formatting', () => {
  test('renders a stored UTC timestamp as Manila wall-clock time', () => {
    const formatted = formatDateTime('2026-10-08 02:42:00').replace(/\s+/g, ' ');

    expect(formatted).toMatch(/^October 8, 2026 · \d{1,2}:42 (AM|PM)$/i);
  });

  test('an empty timestamp is a dash, never "Invalid Date"', () => {
    expect(formatDateTime(null)).toBe('—');
  });
});

describe('tenant timeline', () => {
  function charge(overrides: Partial<PaymentCharge> = {}): PaymentCharge {
    return {
      id: 91,
      application_id: 200,
      boarder_id: 2,
      landlord_id: 3,
      room_id: 100,
      property_id: 10,
      property_title: 'Onda Boarding House',
      room_title: 'Room 01',
      boarder_name: 'Maria Santos',
      charge_type: 'rent',
      description: 'October rent',
      amount: 4000,
      late_fee: 0,
      total_due: 4000,
      due_date: '2026-10-05',
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
      period_start: '2026-10-05',
      period_end: '2026-11-04',
      reminder_sent_at: null,
      deposit_resolution: null,
      deposit_resolution_amount: null,
      deposit_resolution_reason: null,
      created_at: '2026-10-01 01:00:00',
      submissions: [],
      ...overrides,
    };
  }

  function submission(overrides: Record<string, unknown> = {}) {
    return {
      id: 900,
      payment_id: 91,
      submitted_by: 2,
      submitted_by_name: 'Maria Santos',
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
      ...overrides,
    } as PaymentCharge['submissions'][number];
  }

  test('lists every stored record newest first', () => {
    const events = buildTenantTimeline(
      [
        charge({
          submissions: [
            submission({ status: 'rejected', verified_at: '2026-10-09 03:00:00', rejection_reason: 'Blurry proof' }),
            submission({ id: 901, status: 'pending', created_at: '2026-10-10 04:00:00' }),
          ],
        }),
      ],
      { viewerId: 3 }
    );

    expect(events.map(event => event.title)).toEqual([
      'Proof submitted',
      'Payment rejected',
      'Rent charge created',
    ]);
    expect(events[1].detail).toContain('Blurry proof');
  });

  test('names the approver only when it is the viewer', () => {
    const mine = buildTenantTimeline(
      [
        charge({
          stored_status: 'paid',
          submissions: [
            submission({ status: 'verified', verified_by: 3, verified_at: '2026-10-09 03:00:00' }),
          ],
        }),
      ],
      { viewerId: 3 }
    );

    expect(mine[0].title).toBe('Payment approved');
    expect(mine[0].detail).toContain('by you');

    const theirs = buildTenantTimeline(
      [
        charge({
          submissions: [
            submission({ status: 'verified', verified_by: 9, verified_at: '2026-10-09 03:00:00' }),
          ],
        }),
      ],
      { viewerId: 3 }
    );

    expect(theirs[0].detail).not.toContain('by you');
  });
});

describe('table rendering', () => {
  test('renders the six brief columns and one action per state', () => {
    renderTable([
      row({ application_id: 1, status: 'paid' }),
      row({ application_id: 2, boarder_name: 'John Dela Cruz', status: 'overdue' }),
      row({
        application_id: 3,
        boarder_name: 'Liam Garcia',
        has_pending_claim: true,
        pending_claim_charge_id: 93,
      }),
      row({ application_id: 4, boarder_name: 'Nina Cruz', status: 'no_charge', current_charge_id: null }),
    ]);

    const table = within(screen.getByRole('table', { name: 'Payments for October 2026' }));

    expect(table.getAllByRole('columnheader').map(cell => cell.textContent?.trim())).toEqual([
      'Tenant',
      'Room',
      'Due date',
      'Amount',
      'Status',
      'Action',
    ]);
    expect(table.getByRole('button', { name: "View Maria Santos's payments" })).toBeDefined();
    expect(table.getByRole('button', { name: 'Remind John Dela Cruz' })).toBeDefined();
    expect(table.getByRole('button', { name: "Review Liam Garcia's proof" })).toBeDefined();
    // A tenant with nothing billed this month is listed, but has no action at all.
    const ninaRow = table
      .getByRole('button', { name: 'Open payment details for Nina Cruz' })
      .closest('tr') as HTMLTableRowElement;

    expect(ninaRow.lastElementChild?.textContent?.trim()).toBe('—');
    expect(table.getByText('No charge yet')).toBeDefined();
  });

  test('raises the row actions through the callbacks', () => {
    const calls = renderTable([
      row({ application_id: 1, status: 'overdue' }),
      row({ application_id: 2, boarder_name: 'Liam Garcia', has_pending_claim: true }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Remind Maria Santos' }));
    fireEvent.click(screen.getByRole('button', { name: "Review Liam Garcia's proof" }));
    fireEvent.click(screen.getByRole('button', { name: 'Open payment details for Maria Santos' }));

    expect(calls.remind).toBe(1);
    expect(calls.review).toBe(1);
    expect(calls.tenant).toBe(1);
  });

  test('states the count and the attention count in the footer', () => {
    renderTable([
      row({ application_id: 1, status: 'paid' }),
      row({ application_id: 2, boarder_name: 'John Dela Cruz', status: 'overdue' }),
      row({ application_id: 3, boarder_name: 'Ana Reyes', status: 'in_grace' }),
      row({ application_id: 4, boarder_name: 'Liam Garcia', has_pending_claim: true }),
    ]);

    expect(screen.getByText(/Showing 4 tenants · 3 need attention/)).toBeDefined();
  });

  test('shows skeleton rows while loading, without leaking a false empty state', () => {
    renderTable([], { loading: true });

    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText(/No tenants to bill/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'October payments' })).toBeDefined();
  });

  test('distinguishes the empty causes', () => {
    renderTable([], { hasProperties: false });

    expect(screen.getByText('No properties yet')).toBeDefined();

    cleanup();

    const calls = renderTable([], { hasFilters: true });

    expect(screen.getByText('Nothing matches these filters')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(calls.clear).toBe(1);
  });

  test('renders the request error with a retry', () => {
    const calls = renderTable([], { error: 'Internal server error' });

    expect(screen.getByText('Internal server error')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(calls.retry).toBe(1);
  });
});
