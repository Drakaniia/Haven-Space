import {
  daysOverdue,
  effectiveStatus,
  isDueSoon,
  isOpenStatus,
  roundMoney,
  toDateOnly,
  manilaToday,
  type PaymentMethod,
  type PaymentStatus,
} from './helpers';

/** Raw `payments` row plus the joins the ledger queries add. */
export interface ChargeRow {
  id: number;
  application_id: number | null;
  boarder_id: number;
  landlord_id: number;
  room_id: number;
  property_id: number;
  amount: number | string;
  late_fee: number | string;
  due_date: string;
  paid_date: string | null;
  status: string;
  payment_method: string | null;
  /** Free-text label for `payment_method = 'other'` (spec `payments-tracker-redesign` D12). */
  payment_method_label?: string | null;
  reference_number: string | null;
  notes: string | null;
  charge_type?: string | null;
  description?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  generation_key?: string | null;
  reminder_sent_at?: string | null;
  due_soon_reminded_at?: string | null;
  deposit_resolution?: string | null;
  deposit_resolution_amount?: number | string | null;
  deposit_resolution_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
  property_title?: string | null;
  room_title?: string | null;
  grace_days?: number | string | null;
  late_fee_amount?: number | string | null;
  boarder_first_name?: string | null;
  boarder_last_name?: string | null;
  boarder_email?: string | null;
}

export interface SubmissionRow {
  id: number;
  payment_id: number;
  submitted_by: number;
  amount: number | string;
  payment_method: string;
  payment_method_label?: string | null;
  reference_number: string;
  proof_url: string | null;
  notes: string | null;
  status: string;
  verified_by: number | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  submitted_by_name?: string | null;
}

export interface SubmissionDto {
  id: number;
  payment_id: number;
  submitted_by: number;
  submitted_by_name: string | null;
  amount: number;
  payment_method: PaymentMethod | string;
  payment_method_label: string | null;
  reference_number: string;
  proof_url: string | null;
  notes: string | null;
  status: string;
  verified_by: number | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface ChargeDto {
  id: number;
  application_id: number | null;
  boarder_id: number;
  landlord_id: number;
  room_id: number;
  property_id: number;
  property_title: string | null;
  room_title: string | null;
  boarder_name: string | null;
  charge_type: string;
  description: string | null;
  amount: number;
  late_fee: number;
  total_due: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  stored_status: string;
  is_overdue: boolean;
  is_due_soon: boolean;
  days_overdue: number;
  payment_method: string | null;
  payment_method_label: string | null;
  reference_number: string | null;
  notes: string | null;
  period_start: string | null;
  period_end: string | null;
  /** Set when the landlord has sent this cycle's manual reminder (D14). */
  reminder_sent_at: string | null;
  deposit_resolution: string | null;
  deposit_resolution_amount: number | null;
  deposit_resolution_reason: string | null;
  created_at: string;
  submissions: SubmissionDto[];
}

export interface LedgerSummary {
  total_due: number;
  overdue_total: number;
  overdue_count: number;
  pending_count: number;
  awaiting_verification_count: number;
  paid_count: number;
  collected_total: number;
  next_due_date: string | null;
  next_due_amount: number | null;
}

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function boarderName(row: ChargeRow): string | null {
  const name = [row.boarder_first_name, row.boarder_last_name].filter(Boolean).join(' ').trim();

  return name || null;
}

export function formatSubmission(row: SubmissionRow): SubmissionDto {
  return {
    id: Number(row.id),
    payment_id: Number(row.payment_id),
    submitted_by: Number(row.submitted_by),
    submitted_by_name: row.submitted_by_name ?? null,
    amount: roundMoney(numeric(row.amount)),
    payment_method: row.payment_method,
    payment_method_label: row.payment_method_label ?? null,
    reference_number: row.reference_number,
    proof_url: row.proof_url ?? null,
    notes: row.notes ?? null,
    status: row.status,
    verified_by: row.verified_by === null ? null : Number(row.verified_by),
    verified_at: row.verified_at ?? null,
    rejection_reason: row.rejection_reason ?? null,
    created_at: row.created_at,
  };
}

export function formatCharge(
  row: ChargeRow,
  today: string = manilaToday(),
  submissions: SubmissionDto[] = []
): ChargeDto {
  const graceDays = Math.max(numeric(row.grace_days ?? undefined), 0);
  const dueDate = toDateOnly(row.due_date);
  const status = effectiveStatus(row.status, dueDate, graceDays, today);
  const amount = roundMoney(numeric(row.amount));
  const lateFee = roundMoney(numeric(row.late_fee));

  return {
    id: Number(row.id),
    application_id: row.application_id === null ? null : Number(row.application_id),
    boarder_id: Number(row.boarder_id),
    landlord_id: Number(row.landlord_id),
    room_id: Number(row.room_id),
    property_id: Number(row.property_id),
    property_title: row.property_title ?? null,
    room_title: row.room_title ?? null,
    boarder_name: boarderName(row),
    charge_type: row.charge_type ?? 'rent',
    description: row.description ?? null,
    amount,
    late_fee: lateFee,
    total_due: roundMoney(amount + lateFee),
    due_date: dueDate,
    paid_date: row.paid_date ?? null,
    status,
    stored_status: row.status,
    is_overdue: status === 'overdue',
    is_due_soon: isOpenStatus(status) && isDueSoon(dueDate, today),
    days_overdue: status === 'overdue' ? daysOverdue(dueDate, today) : 0,
    payment_method: row.payment_method ?? null,
    payment_method_label: row.payment_method_label ?? null,
    reference_number: row.reference_number ?? null,
    notes: row.notes ?? null,
    period_start: row.period_start ?? null,
    period_end: row.period_end ?? null,
    reminder_sent_at: row.reminder_sent_at ?? null,
    deposit_resolution: row.deposit_resolution ?? null,
    deposit_resolution_amount:
      row.deposit_resolution_amount === null || row.deposit_resolution_amount === undefined
        ? null
        : roundMoney(numeric(row.deposit_resolution_amount)),
    deposit_resolution_reason: row.deposit_resolution_reason ?? null,
    created_at: row.created_at,
    submissions,
  };
}

/** Outstanding money on one charge (0 once paid or cancelled). */
export function outstandingFor(charge: ChargeDto): number {
  if (charge.stored_status === 'paid' || charge.stored_status === 'cancelled') {
    return 0;
  }

  return charge.total_due;
}

export function summarizeCharges(charges: ChargeDto[]): LedgerSummary {
  const summary: LedgerSummary = {
    total_due: 0,
    overdue_total: 0,
    overdue_count: 0,
    pending_count: 0,
    awaiting_verification_count: 0,
    paid_count: 0,
    collected_total: 0,
    next_due_date: null,
    next_due_amount: null,
  };

  for (const charge of charges) {
    if (charge.stored_status === 'paid') {
      summary.paid_count += 1;
      summary.collected_total += charge.total_due;
      continue;
    }

    if (charge.stored_status === 'cancelled') {
      continue;
    }

    const outstanding = outstandingFor(charge);
    summary.total_due += outstanding;

    if (charge.status === 'overdue') {
      summary.overdue_count += 1;
      summary.overdue_total += outstanding;
    }

    if (charge.status === 'awaiting_verification') {
      summary.awaiting_verification_count += 1;
    } else {
      summary.pending_count += 1;
    }

    if (summary.next_due_date === null || charge.due_date < summary.next_due_date) {
      summary.next_due_date = charge.due_date;
      summary.next_due_amount = outstanding;
    }
  }

  summary.total_due = roundMoney(summary.total_due);
  summary.overdue_total = roundMoney(summary.overdue_total);
  summary.collected_total = roundMoney(summary.collected_total);

  return summary;
}
