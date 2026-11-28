/* ------------------------------------------------------------------ payments */

export type PaymentChargeType =
  | 'rent'
  | 'deposit'
  | 'advance'
  | 'utility'
  | 'amenity'
  | 'late_fee'
  | 'other';

export type PaymentStatus = 'pending' | 'awaiting_verification' | 'overdue' | 'paid' | 'cancelled';

export interface PaymentSubmission {
  id: number;
  payment_id: number;
  submitted_by: number;
  submitted_by_name: string | null;
  amount: number;
  payment_method: string;
  reference_number: string;
  proof_url: string | null;
  notes: string | null;
  status: string;
  verified_by: number | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface PaymentCharge {
  id: number;
  application_id: number | null;
  boarder_id: number;
  landlord_id: number;
  room_id: number;
  property_id: number;
  property_title: string | null;
  room_title: string | null;
  boarder_name: string | null;
  charge_type: PaymentChargeType | string;
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
  /** Free-text label for a custom `other` method (spec `payments-tracker-redesign` D12). */
  payment_method_label: string | null;
  reference_number: string | null;
  notes: string | null;
  period_start: string | null;
  period_end: string | null;
  /** Set once the landlord has sent this cycle's manual reminder (D14). */
  reminder_sent_at: string | null;
  deposit_resolution: string | null;
  deposit_resolution_amount: number | null;
  deposit_resolution_reason: string | null;
  created_at: string;
  submissions: PaymentSubmission[];
}

export interface PaymentLedgerSummary {
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

export interface PaymentAgingBuckets {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  total_outstanding: number;
}

export interface PaymentCollectionSummary {
  month: string;
  expected: number;
  collected: number;
  outstanding: number;
  paid_count: number;
  unpaid_count: number;
}

export interface BoarderPaymentsResponse {
  success: true;
  data: { charges: PaymentCharge[]; summary: PaymentLedgerSummary };
}

export interface BoarderChargeResponse {
  success: true;
  data: PaymentCharge;
}

export interface PaymentSubmissionResponse {
  success: true;
  message: string;
  data: { submission_id: number; status: string; amount: number };
}

export interface PaymentProofResponse {
  success: true;
  data: { proof_url: string };
}

export interface LandlordPaymentsResponse {
  success: true;
  data: {
    charges: PaymentCharge[];
    summary: PaymentLedgerSummary;
    aging: PaymentAgingBuckets;
    collection: PaymentCollectionSummary;
  };
}

export interface PropertyBillingSettings {
  property_id: number;
  late_fee_amount: number;
  /** The single grace period (R6/D31): the `in_grace` state and the fee timing. */
  late_fee_grace_days: number;
  late_fee_enabled: number;
  late_fee_type: 'fixed' | 'percent' | string;
  late_fee_percent: number;
  electricity_cost: number;
  water_cost: number;
  internet_cost: number;
}

/** The tracker's display vocabulary (spec `payments-tracker-redesign` §3.4). */
export type TrackerStatus =
  | 'paid'
  | 'due_today'
  | 'due_soon'
  | 'in_grace'
  | 'overdue'
  | 'upcoming'
  | 'no_charge';

export interface TrackerLastPayment {
  date: string;
  amount: number;
  method: string;
  method_label: string | null;
}

export interface TrackerRow {
  application_id: number;
  boarder_id: number;
  boarder_name: string;
  room_id: number;
  room_number: string;
  room_occupied: number;
  room_capacity: number;
  move_in_date: string;
  monthly_rent: number;
  next_due_date: string | null;
  days_remaining: number | null;
  days_overdue: number | null;
  status: TrackerStatus;
  status_label: string;
  current_charge_id: number | null;
  amount_due: number;
  last_payment: TrackerLastPayment | null;
  has_pending_claim: boolean;
  /** The charge holding a pending claim — not always the rent cycle
   *  (spec `landlord-payments-monitoring` D40). */
  pending_claim_charge_id: number | null;
  /** `cash` (face to face) or an online method, for the pending claim. */
  pending_claim_method?: string | null;
  /** `confirmed`, or `ended` for a moved-out tenant who still has money to settle. */
  tenancy_status?: 'confirmed' | 'ended';
  /** The open rent charge's newest submission was rejected and nothing newer
   *  arrived — the derived "Payment issue" state (D3/D38). */
  has_rejected_claim: boolean;
  /** When this cycle's reminder was last sent (D41). */
  reminder_sent_at: string | null;
  other_open_charges: number;
  can_remind: boolean;
}

export interface TrackerSummary {
  expected: number;
  paid: number;
  due_today: number;
  in_grace: number;
  overdue: number;
}

export interface PaymentTrackerResponse {
  success: true;
  data: {
    rows: TrackerRow[];
    summary: TrackerSummary;
    counts: { rows: number; needs_review: number };
  };
}

export interface TenancyPaymentHistory {
  tenancy: {
    application_id: number;
    boarder_id: number;
    boarder_name: string;
    room_number: string;
    property_title: string;
    move_in_date: string;
    next_due_date: string | null;
    monthly_rent: number;
  };
  charges: PaymentCharge[];
}

export interface PaymentHistoryResponse {
  success: true;
  data: TenancyPaymentHistory;
}

export interface BillingSettingsResponse {
  success: true;
  data: PropertyBillingSettings;
}

/* ----------------------------------------------------------- paid amenities */

export type AmenityBillingModel = 'monthly' | 'per_use' | 'one_time';

export interface PaidAmenity {
  id: number;
  property_id: number;
  name: string;
  description: string | null;
  icon: string;
  billing_model: AmenityBillingModel;
  price: number;
  unit_label: string;
  is_metered: boolean;
  is_included: boolean;
  max_slots: number | null;
  active_slots: number;
  allow_boarder_request: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TenancyAmenity {
  id: number;
  paid_amenity_id: number;
  amenity_name: string;
  amenity_icon: string;
  unit_label: string;
  application_id: number;
  property_id: number;
  boarder_id: number;
  boarder_name: string;
  room_id: number;
  room_title: string;
  status: string;
  quantity: number;
  unit_price_snapshot: number;
  billing_model_snapshot: AmenityBillingModel;
  next_bill_date: string | null;
  last_billed_date: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface AmenityUsageLog {
  id: number;
  paid_amenity_id: number;
  amenity_name: string;
  unit_label: string;
  is_metered: boolean;
  application_id: number;
  property_id: number;
  boarder_id: number;
  boarder_name: string;
  room_title: string;
  payment_id: number | null;
  payment_status: string | null;
  status: string;
  quantity: number;
  unit_price_snapshot: number;
  previous_reading: number | null;
  current_reading: number | null;
  total_amount: number;
  usage_date: string;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface AmenityBoarderOption {
  application_id: number;
  boarder_id: number;
  boarder_name: string;
  room_id: number;
  room_title: string;
}

export interface LandlordAmenitiesResponse {
  success: true;
  data: {
    property: { id: number; title: string };
    catalog: PaidAmenity[];
    subscriptions: TenancyAmenity[];
    pending_requests: {
      subscriptions: TenancyAmenity[];
      usage: AmenityUsageLog[];
    };
    usage_logs: AmenityUsageLog[];
    boarders: AmenityBoarderOption[];
    summary: {
      active_catalog_count: number;
      monthly_recurring_revenue: number;
      pending_requests_count: number;
      month_billed: number;
      month_collected: number;
    };
  };
}

export interface BoarderAmenitiesResponse {
  success: true;
  data: {
    tenancy: {
      application_id: number;
      property_id: number;
      property_title: string;
      room_title: string;
    };
    active_monthly_total: number;
    catalog: PaidAmenity[];
    subscriptions: TenancyAmenity[];
    usage_logs: AmenityUsageLog[];
    charges: Array<{
      id: number;
      description: string;
      amount: number;
      due_date: string;
      paid_date: string | null;
      status: PaymentStatus;
    }>;
  };
}
