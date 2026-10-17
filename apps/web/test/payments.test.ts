import { describe, expect, test } from 'bun:test';

import {
  fetchLandlordPaymentsCsv,
  getBoarderPayments,
  getLandlordPayments,
  submitBoarderPayment,
} from '../src/lib/api/payments';
import {
  chargeTypeLabel,
  formatPeso,
  groupChargesByMonth,
  isChargeOpen,
  latestSubmission,
  manilaToday,
  paymentMethodLabel,
  paymentStatusMeta,
  pendingReviewCount,
  roomOrBedLabel,
} from '../src/lib/payments';
import type { PaymentCharge } from '../src/lib/types';

function charge(overrides: Partial<PaymentCharge> = {}): PaymentCharge {
  return {
    id: 1,
    application_id: 200,
    boarder_id: 2,
    landlord_id: 3,
    room_id: 100,
    property_id: 10,
    property_title: 'Flow House',
    room_title: 'A1',
    boarder_name: 'Benny Boarder',
    charge_type: 'rent',
    description: 'Monthly rent — February 2026',
    amount: 6500,
    late_fee: 0,
    total_due: 6500,
    due_date: '2026-02-15',
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
    period_start: '2026-02-15',
    period_end: '2026-03-14',
    reminder_sent_at: null,
    deposit_resolution: null,
    deposit_resolution_amount: null,
    deposit_resolution_reason: null,
    created_at: '2026-01-15 08:00:00',
    submissions: [],
    ...overrides,
  };
}

function submission(status: string) {
  return {
    id: 11,
    payment_id: 1,
    submitted_by: 2,
    submitted_by_name: 'Benny Boarder',
    amount: 6500,
    payment_method: 'gcash',
    payment_method_label: null,
    reference_number: 'REF-1',
    proof_url: null,
    notes: null,
    status,
    verified_by: null,
    verified_at: null,
    rejection_reason: null,
    created_at: '2026-02-10 08:00:00',
  };
}

function captureFetch(response: Response | (() => Response)): { calls: string[] } {
  const calls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${String(input)}`);

    return typeof response === 'function' ? response() : response;
  }) as unknown as typeof fetch;

  return { calls };
}

describe('payment display helpers', () => {
  test('labels every charge state the ledger can show', () => {
    // An explicit `today` keeps the date-derived states out of this fixture's way.
    const before = '2026-01-01';

    expect(paymentStatusMeta(charge(), before).label).toBe('Unpaid');
    expect(paymentStatusMeta(charge({ is_due_soon: true }), before).status).toBe('due_soon');
    expect(paymentStatusMeta(charge({ status: 'awaiting_verification' }), before).label).toBe(
      'Awaiting verification'
    );
    expect(paymentStatusMeta(charge({ status: 'overdue', days_overdue: 12 }), before).label).toBe(
      'Overdue · 12d'
    );
    expect(paymentStatusMeta(charge({ stored_status: 'paid', status: 'paid' }), before).label).toBe(
      'Paid'
    );
    expect(
      paymentStatusMeta(charge({ stored_status: 'cancelled', status: 'cancelled' }), before).label
    ).toBe('Cancelled');
  });

  test('derives due today and in grace from the due date (Q7)', () => {
    const today = '2026-03-15';

    // The server keeps a past-due charge `pending` until the grace period ends,
    // so the two dates the brief names are derived here, in Asia/Manila.
    expect(paymentStatusMeta(charge({ due_date: today }), today)).toEqual({
      status: 'due_today',
      label: 'Due today',
    });
    expect(paymentStatusMeta(charge({ due_date: '2026-03-13' }), today)).toEqual({
      status: 'in_grace',
      label: 'In grace',
    });

    // Past grace the server says `overdue`, and a claim outranks both.
    expect(paymentStatusMeta(charge({ status: 'overdue', days_overdue: 5 }), today).status).toBe(
      'overdue'
    );
    expect(
      paymentStatusMeta(charge({ status: 'awaiting_verification', due_date: '2026-03-01' }), today)
        .label
    ).toBe('Awaiting verification');

    // Manila, not the host's timezone: 17:00 UTC is already the next day there.
    expect(manilaToday(new Date('2026-03-15T17:30:00Z'))).toBe('2026-03-16');
  });

  test('labels the room or bed without doubling a seeded “Room”', () => {
    expect(roomOrBedLabel('4', 2, 4)).toBe('Room 4 · 2/4');
    // The seed names its rooms `Room 1`, which must not become `Room Room 1`.
    expect(roomOrBedLabel('Room 1', 0, 1)).toBe('Room 1 · 0/1');
    expect(roomOrBedLabel(null, 1, 2)).toBe('Room · 1/2');
  });

  test('formats money, dates and vocabulary', () => {
    expect(formatPeso(6500)).toBe('₱6,500.00');
    expect(paymentMethodLabel('bank_transfer')).toBe('Bank transfer');
    expect(paymentMethodLabel(null)).toBe('—');
    expect(chargeTypeLabel('late_fee')).toBe('Late fee');
    expect(chargeTypeLabel('something_else')).toBe('something else');
  });

  test('groups the ledger by due month, newest first', () => {
    const groups = groupChargesByMonth([
      charge({ id: 1, due_date: '2026-02-15' }),
      charge({ id: 2, due_date: '2026-03-15' }),
      charge({ id: 3, due_date: '2026-02-28' }),
    ]);

    expect(groups.map(group => group.month)).toEqual(['2026-03', '2026-02']);
    expect(groups[1].charges.map(item => item.id)).toEqual([3, 1]);
    expect(groups[0].label).toContain('2026');
  });

  test('treats only settled charges as closed and surfaces pending review', () => {
    const paid = charge({ id: 1, stored_status: 'paid', status: 'paid' });
    const open = charge({ id: 2 });
    const claimed = charge({ id: 3, submissions: [submission('pending')] });
    const rejected = charge({ id: 4, submissions: [submission('rejected')] });

    expect(isChargeOpen(paid)).toBe(false);
    expect(isChargeOpen(open)).toBe(true);
    expect(latestSubmission(claimed)?.status).toBe('pending');
    expect(latestSubmission(open)).toBeNull();
    expect(pendingReviewCount([paid, open, claimed, rejected])).toBe(1);
  });
});

describe('payments API client', () => {
  test('reads the boarder ledger with the bearer token', async () => {
    const { calls } = captureFetch(
      new Response(JSON.stringify({ success: true, data: { charges: [], summary: {} } }), {
        status: 200,
      })
    );

    await getBoarderPayments('token-1');

    // The base URL depends on the build config, so assert the path contract.
    expect(calls[0]).toStartWith('GET ');
    expect(calls[0]).toEndWith('/api/boarder/payments');
  });

  test('submits a payment to the charge’s submissions endpoint', async () => {
    const { calls } = captureFetch(
      new Response(JSON.stringify({ success: true, message: 'ok', data: { submission_id: 5 } }), {
        status: 201,
      })
    );

    await submitBoarderPayment('token-1', 42, {
      payment_method: 'gcash',
      reference_number: 'REF-9',
    });

    expect(calls[0]).toStartWith('POST ');
    expect(calls[0]).toEndWith('/api/boarder/payments/42/submissions');
  });

  test('builds the landlord ledger query string', async () => {
    const { calls } = captureFetch(
      new Response(JSON.stringify({ success: true, data: { charges: [] } }), { status: 200 })
    );

    await getLandlordPayments('token-1', { propertyId: 10, month: '2026-02' });

    expect(calls[0]).toEndWith('/api/landlord/payments?propertyId=10&month=2026-02');
  });

  test('returns CSV text and throws when the export fails', async () => {
    captureFetch(new Response('due_date,charge_type\n2026-02-15,rent\n', { status: 200 }));

    expect(await fetchLandlordPaymentsCsv('token-1', { propertyId: 10 })).toContain('rent');

    captureFetch(new Response('nope', { status: 500 }));

    expect(fetchLandlordPaymentsCsv('token-1')).rejects.toThrow(
      'Could not export the payments ledger'
    );
  });
});
