import { csvEscape, monthKey, manilaToday, roundMoney, toDateOnly } from './helpers';
import type { TrackerRow } from './tracker';
import { outstandingFor, summarizeCharges, type ChargeDto } from './types';

/**
 * Reporting (spec `payments-feature` D15/I9). Pure functions over an already
 * fetched ledger, so the aging buckets and the CSV are unit-testable and the
 * route stays a thin read.
 */

export interface AgingBuckets {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  total_outstanding: number;
}

export function buildAgingReport(charges: ChargeDto[]): AgingBuckets {
  const buckets: AgingBuckets = {
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_over_90: 0,
    total_outstanding: 0,
  };

  for (const charge of charges) {
    const outstanding = outstandingFor(charge);

    if (outstanding <= 0) {
      continue;
    }

    buckets.total_outstanding += outstanding;

    if (charge.days_overdue === 0) {
      buckets.current += outstanding;
    } else if (charge.days_overdue <= 30) {
      buckets.days_1_30 += outstanding;
    } else if (charge.days_overdue <= 60) {
      buckets.days_31_60 += outstanding;
    } else if (charge.days_overdue <= 90) {
      buckets.days_61_90 += outstanding;
    } else {
      buckets.days_over_90 += outstanding;
    }
  }

  buckets.current = roundMoney(buckets.current);
  buckets.days_1_30 = roundMoney(buckets.days_1_30);
  buckets.days_31_60 = roundMoney(buckets.days_31_60);
  buckets.days_61_90 = roundMoney(buckets.days_61_90);
  buckets.days_over_90 = roundMoney(buckets.days_over_90);
  buckets.total_outstanding = roundMoney(buckets.total_outstanding);

  return buckets;
}

export interface CollectionSummary {
  month: string;
  expected: number;
  collected: number;
  outstanding: number;
  paid_count: number;
  unpaid_count: number;
}

/** Expected vs collected for one `YYYY-MM` billing month (by due date). */
export function buildCollectionSummary(
  charges: ChargeDto[],
  month: string = monthKey(manilaToday())
): CollectionSummary {
  const summary: CollectionSummary = {
    month,
    expected: 0,
    collected: 0,
    outstanding: 0,
    paid_count: 0,
    unpaid_count: 0,
  };

  for (const charge of charges) {
    if (charge.stored_status === 'cancelled' || monthKey(charge.due_date) !== month) {
      continue;
    }

    const total = charge.total_due;
    summary.expected += total;

    if (charge.stored_status === 'paid') {
      summary.collected += total;
      summary.paid_count += 1;
    } else {
      summary.outstanding += total;
      summary.unpaid_count += 1;
    }
  }

  summary.expected = roundMoney(summary.expected);
  summary.collected = roundMoney(summary.collected);
  summary.outstanding = roundMoney(summary.outstanding);

  return summary;
}

export interface PaymentAlerts {
  due_soon: number;
  due_today: number;
  in_grace: number;
  overdue: number;
  collected_this_month: number;
  outstanding_total: number;
}

/** Replaces the hard-coded `{ due_soon: 0, overdue: 0 }` dashboard literals (spec F6). */
export function buildPaymentAlerts(
  charges: ChargeDto[],
  today: string = manilaToday()
): PaymentAlerts {
  const month = monthKey(today);
  let dueSoon = 0;
  let dueToday = 0;
  let inGrace = 0;
  let overdue = 0;
  let collected = 0;
  let outstanding = 0;

  for (const charge of charges) {
    if (charge.stored_status === 'paid') {
      if (monthKey(charge.paid_date ?? charge.due_date) === month) {
        collected += charge.total_due;
      }
      continue;
    }

    if (charge.stored_status === 'cancelled') {
      continue;
    }

    outstanding += outstandingFor(charge);

    // The tracker's vocabulary (spec `payments-tracker-redesign` D32): a charge due
    // today is its own count, and “past due but inside grace” is `in_grace` because
    // `status` only turns `overdue` once the grace period has run out.
    if (charge.status === 'overdue') {
      overdue += 1;
    } else if (toDateOnly(charge.due_date) === today) {
      dueToday += 1;
    } else if (toDateOnly(charge.due_date) < today) {
      inGrace += 1;
    } else if (charge.is_due_soon) {
      dueSoon += 1;
    }
  }

  return {
    due_soon: dueSoon,
    due_today: dueToday,
    in_grace: inGrace,
    overdue,
    collected_this_month: roundMoney(collected),
    outstanding_total: roundMoney(outstanding),
  };
}

const CSV_COLUMNS = [
  'due_date',
  'charge_type',
  'description',
  'property',
  'room',
  'boarder',
  'amount',
  'late_fee',
  'total',
  'status',
  'paid_date',
  'payment_method',
  'reference_number',
] as const;

export function chargesToCsv(charges: ChargeDto[]): string {
  const lines = [CSV_COLUMNS.join(',')];

  for (const charge of charges) {
    lines.push(
      [
        toDateOnly(charge.due_date),
        charge.charge_type,
        charge.description ?? '',
        charge.property_title ?? '',
        charge.room_title ?? '',
        charge.boarder_name ?? '',
        charge.amount.toFixed(2),
        charge.late_fee.toFixed(2),
        charge.total_due.toFixed(2),
        charge.status,
        charge.paid_date ? toDateOnly(charge.paid_date) : '',
        charge.payment_method ?? '',
        charge.reference_number ?? '',
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  return `${lines.join('\n')}\n`;
}

/**
 * The tracker's export (spec `payments-tracker-redesign` §5.7, D29): the per-boarder
 * rows first, then the per-charge detail they summarize, in one file.
 */
export function trackerToCsv(input: {
  rows: TrackerRow[];
  charges: ChargeDto[];
  title: string;
}): string {
  const trackerColumns = [
    'Boarder',
    'Room',
    'Move-in',
    'Monthly rent',
    'Current due date',
    'Days remaining/overdue',
    'Last payment date',
    'Method',
    'Status',
  ];
  const chargeColumns = [
    'Boarder',
    'Charge',
    'Due',
    'Period',
    'Amount',
    'Late fee',
    'Total',
    'Status',
    'Paid date',
    'Method',
    'Reference',
    'Notes',
    'Receipt',
  ];

  const lines = [`# Tracker — ${input.title}`, trackerColumns.join(',')];

  for (const row of input.rows) {
    lines.push(
      [
        row.boarder_name,
        `${row.room_number} · ${row.room_occupied}/${row.room_capacity}`,
        row.move_in_date,
        row.monthly_rent.toFixed(2),
        row.next_due_date ?? '',
        row.days_overdue !== null
          ? `${row.days_overdue} overdue`
          : row.days_remaining !== null
          ? `${row.days_remaining} remaining`
          : '',
        row.last_payment?.date ?? '',
        row.last_payment ? row.last_payment.method_label || row.last_payment.method : '',
        row.status,
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  lines.push('', `# Charges — ${input.title}`, chargeColumns.join(','));

  for (const charge of input.charges) {
    lines.push(
      [
        charge.boarder_name ?? '',
        charge.description || charge.charge_type,
        toDateOnly(charge.due_date),
        charge.period_start && charge.period_end
          ? `${toDateOnly(charge.period_start)}…${toDateOnly(charge.period_end)}`
          : '',
        charge.amount.toFixed(2),
        charge.late_fee.toFixed(2),
        charge.total_due.toFixed(2),
        charge.status,
        charge.paid_date ? toDateOnly(charge.paid_date) : '',
        charge.payment_method_label || charge.payment_method || '',
        charge.reference_number ?? '',
        charge.notes ?? '',
        charge.submissions.find(submission => submission.proof_url)?.proof_url ?? '',
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  return `${lines.join('\n')}\n`;
}

export interface LedgerResponse {
  charges: ChargeDto[];
  summary: ReturnType<typeof summarizeCharges>;
  aging: AgingBuckets;
  collection: CollectionSummary;
}

export function buildLedgerResponse(
  charges: ChargeDto[],
  month: string = monthKey(manilaToday())
): LedgerResponse {
  return {
    charges,
    summary: summarizeCharges(charges),
    aging: buildAgingReport(charges),
    collection: buildCollectionSummary(charges, month),
  };
}
