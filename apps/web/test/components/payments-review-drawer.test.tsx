import { afterEach, expect, mock, test } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { ReviewPaymentDrawer } from '../../src/components/payments/ReviewPaymentDrawer';
import { REQUEST_NEW_PROOF_MESSAGE } from '../../src/lib/payments';
import type { PaymentCharge, PaymentSubmission, TrackerRow } from '../../src/lib/types';

/**
 * The review drawer (spec `landlord-payments-monitoring` §8, §19).
 *
 * Pins the four decisions that make it safe: the proof is checked before
 * approving, approval calls the existing verify route, a rejection cannot be sent
 * without a reason, and asking for a new proof sends the brief's exact sentence.
 */

mock.module('../../src/lib/auth-context', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    token: 'token-1',
    user: { id: 3, first_name: 'Lara', last_name: 'Landlord', role: 'landlord' },
    isAuthenticated: true,
    isHydrated: true,
  }),
}));

afterEach(() => cleanup());

function submission(overrides: Partial<PaymentSubmission> = {}): PaymentSubmission {
  return {
    id: 900,
    payment_id: 94,
    submitted_by: 5,
    submitted_by_name: 'Liam Garcia',
    amount: 4000,
    payment_method: 'gcash',
    reference_number: '8842',
    proof_url: 'https://cdn.example.com/proof.png',
    notes: null,
    status: 'pending',
    verified_by: null,
    verified_at: null,
    rejection_reason: null,
    created_at: '2026-10-08 02:42:00',
    ...overrides,
  };
}

function charge(overrides: Partial<PaymentCharge> = {}): PaymentCharge {
  return {
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
    due_date: '2026-10-08',
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
    period_start: '2026-10-08',
    period_end: '2026-11-07',
    reminder_sent_at: null,
    deposit_resolution: null,
    deposit_resolution_amount: null,
    deposit_resolution_reason: null,
    created_at: '2026-10-01 01:00:00',
    submissions: [submission()],
    ...overrides,
  };
}

const row: TrackerRow = {
  application_id: 203,
  boarder_id: 5,
  boarder_name: 'Liam Garcia',
  room_id: 104,
  room_number: 'Room 04',
  room_occupied: 1,
  room_capacity: 2,
  move_in_date: '2026-01-15',
  monthly_rent: 4000,
  next_due_date: '2026-10-08',
  days_remaining: 0,
  days_overdue: null,
  status: 'due_today',
  status_label: 'Due today',
  current_charge_id: 94,
  amount_due: 4000,
  last_payment: null,
  has_pending_claim: true,
  pending_claim_charge_id: 94,
  has_rejected_claim: false,
  reminder_sent_at: null,
  other_open_charges: 0,
  can_remind: false,
};

let requested: Array<{ url: string; body: string | null }> = [];

function stubFetch(payload: PaymentCharge) {
  requested = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requested.push({ url, body: typeof init?.body === 'string' ? init.body : null });

    if (url.includes('/api/landlord/charges/')) {
      return new Response(JSON.stringify({ success: true, data: payload }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true, message: 'ok' }), { status: 200 });
  }) as unknown as typeof fetch;
}

function renderDrawer(payload: PaymentCharge) {
  stubFetch(payload);

  const calls = { changed: 0, closest: 0, composed: [] as Array<{ title: string; body: string }> };
  const notes: Array<{ tone: string; message: string }> = [];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <ReviewPaymentDrawer
        token="token-1"
        chargeId={payload.id}
        row={row}
        onClose={() => (calls.closest += 1)}
        onChanged={() => (calls.changed += 1)}
        onNotify={note => notes.push(note)}
        onCompose={input => calls.composed.push(input)}
      />
    </QueryClientProvider>
  );

  return { calls, notes };
}

test('shows the submission exactly as the reference does', async () => {
  renderDrawer(charge());

  await screen.findByText('Payment proof');

  expect(screen.getByRole('heading', { name: 'Liam Garcia' })).toBeDefined();
  expect(screen.getByText('Payment submission')).toBeDefined();
  expect(screen.getByText('Room 04 · October rent')).toBeDefined();
  expect(screen.getByText('Needs review')).toBeDefined();
  expect(screen.getByText('₱4,000.00')).toBeDefined();
  expect(screen.getByText('GCash / e-wallet')).toBeDefined();
  expect(screen.getByText('8842')).toBeDefined();
  expect(screen.getByText('Check the amount and reference before approving.')).toBeDefined();
  expect(screen.getByRole('img', { name: 'Payment proof from Liam Garcia' })).toBeDefined();
});

test('approves through the existing verify route and refreshes the page', async () => {
  const { calls, notes } = renderDrawer(charge());

  fireEvent.click(await screen.findByRole('button', { name: 'Approve payment' }));

  await waitFor(() => {
    expect(
      requested.some(entry => entry.url.includes('/api/landlord/submissions/900/verify'))
    ).toBe(true);
  });

  await waitFor(() => expect(calls.changed).toBe(1));
  expect(notes.at(-1)?.message).toBe('Payment approved');
});

test('blocks an approval that does not cover the full amount', async () => {
  renderDrawer(
    charge({
      total_due: 4000,
      submissions: [submission({ amount: 3500 })],
    })
  );

  const approve = (await screen.findByRole('button', {
    name: 'Approve payment',
  })) as HTMLButtonElement;

  expect(approve.disabled).toBe(true);
  expect(screen.getByText(/The tenant submitted ₱3,500.00 of the ₱4,000.00 due/)).toBeDefined();
});

test('requires a reason before rejecting, then shows the rejected state', async () => {
  renderDrawer(charge());

  fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));

  const reason = (await screen.findByLabelText('Reason')) as HTMLTextAreaElement;
  const confirm = screen.getByRole('button', { name: 'Reject payment' }) as HTMLButtonElement;

  expect(confirm.disabled).toBe(true);

  fireEvent.change(reason, { target: { value: 'No transfer matching this reference' } });
  expect(confirm.disabled).toBe(false);

  fireEvent.click(confirm);

  await waitFor(() => {
    const rejectCall = requested.find(entry => entry.url.includes('/submissions/900/reject'));

    expect(rejectCall).toBeDefined();
    expect(rejectCall?.body).toContain('No transfer matching this reference');
  });

  await screen.findByText('Payment rejected');
  expect(screen.getByText(/status stays Payment issue/)).toBeDefined();
  expect(screen.getByRole('button', { name: 'Message tenant' })).toBeDefined();
});

test('stands its own trap down while a confirmation dialog is on top', async () => {
  const { calls } = renderDrawer(charge());

  fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
  await screen.findByLabelText('Reason');

  // The drawer's Escape handler is unregistered while suspended, so the same
  // keystroke that dismisses the dialog can no longer close the drawer beneath.
  fireEvent.keyDown(document, { key: 'Escape' });

  expect(calls.closest).toBe(0);
  expect(screen.getByRole('heading', { name: 'Liam Garcia' })).toBeDefined();

  // The dialog keeps its own handler, so it still dismisses normally.
  fireEvent.keyDown(window, { key: 'Escape' });

  // The dialog is gone (its exit animation finishes in a later frame, so assert
  // on a boolean: a failed element diff here would print the whole node tree).
  await waitFor(() => expect(screen.queryByLabelText('Reason') === null).toBe(true), {
    timeout: 3000,
  });
  expect(calls.closest).toBe(0);
});

test('asks for a clearer proof with the brief’s exact sentence', async () => {
  const { calls } = renderDrawer(charge());

  fireEvent.click(await screen.findByRole('button', { name: 'Request new proof' }));

  expect(calls.composed).toHaveLength(1);
  expect(calls.composed[0].body).toBe(REQUEST_NEW_PROOF_MESSAGE);
  expect(calls.composed[0].title).toBe('Message Liam');
});

test('a settled submission shows the approval instead of an approve button', async () => {
  renderDrawer(
    charge({
      status: 'paid',
      stored_status: 'paid',
      submissions: [
        submission({ status: 'verified', verified_by: 3, verified_at: '2026-10-09 03:00:00' }),
      ],
    })
  );

  await screen.findByText('Payment proof');

  expect(screen.queryByRole('button', { name: 'Approve payment' })).toBeNull();
  expect(screen.getByText(/Paid · approved/)).toBeDefined();
  expect(screen.getByText(/Approved by you/)).toBeDefined();
  // The header's icon button and the footer's action both close the drawer.
  expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThan(0);
});
