export interface RoomSummary {
  id: number;
  room_number: string;
  room_name: string;
  type: string;
  capacity: number;
  occupied: number;
  free_slots: number;
  status: string;
  availability: string;
  description: string;
  price: number;
  photos: string[];
  image: string;
}

export interface PublicProperty {
  id: number;
  title: string;
  description: string;
  address: string;
  city: string;
  province: string;
  price: number;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  reviews: number;
  roomTypes: string;
  availableRooms: number;
  totalRooms: number;
  capacity: string;
  minStay: string;
  availability: string;
  amenities: string[];
  image: string;
  images: string[];
  badges: string[];
  rooms: RoomSummary[];
  landlord: { id: number; name: string };
  createdAt: string | null;
}

export interface PublicListingsResponse {
  data: {
    properties: PublicProperty[];
    total_count: number;
    limit: number;
    offset: number;
  };
}

export interface RoomDetail {
  id: number;
  roomNumber: string;
  roomType: string;
  price: number;
  deposit: number;
  status: string;
  capacity: number;
  occupied: number;
  freeSlots: number;
  description: string;
  size: number | null;
  images: string[];
  furnishing: string;
}

export interface ListingDetail {
  id: number;
  title: string;
  description: string;
  address: string;
  city: string;
  province: string;
  price: number;
  latitude: number | null;
  longitude: number | null;
  propertyType: string;
  deposit: string;
  advance: string;
  minStay: string;
  capacity: string;
  availabilityStatus: string;
  rating: number;
  reviews: number;
  roomTypes: string;
  availability: string;
  availableRooms: number;
  totalRooms: number;
  amenities: string[];
  houseRules: string[];
  genderPreference: string;
  propertyRules: string;
  images: string[];
  coverImage: string;
  badges: string[];
  rooms: RoomDetail[];
  landlord: { id: number; name: string; properties: number; rating: number };
  createdAt: string | null;
}

export interface ListingDetailResponse {
  data: ListingDetail;
}

export interface PublicListingsFilters {
  search?: string;
  price_min?: number;
  price_max?: number;
  sort_by?: string;
  limit?: number;
  offset?: number;
}

export interface AuthUser {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'boarder' | 'landlord' | 'admin';
  is_verified: boolean;
  email_verified: boolean;
  account_status: string;
  avatar_url: string | null;
  phone_number: string | null;
  verification_status: string | null;
  boarder_status?: string;
}

export interface LoginResponse {
  success: true;
  access_token: string;
  user: AuthUser;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'boarder' | 'landlord';
  businessName?: string;
  businessDescription?: string;
  city?: string;
  province?: string;
  phoneNumber?: string;
  idType?: string;
  idNumber?: string;
}

export interface RegisterResponse {
  success: true;
  message: string;
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  nextSteps: string[];
}

export interface SavedStatusResponse {
  success: true;
  is_saved: boolean;
  saved_at: string | null;
}

export interface SaveListingResponse {
  success: true;
  message: string;
  data: { id: number; property_id: number; room_id: number | null; saved_at: string };
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
}

export interface SimilarProperty {
  id: number;
  title: string;
  description: string;
  price: number;
  address: string;
  city: string;
  province: string;
  rating: number;
  reviewCount: number;
  coverImage: string;
}

export interface SimilarPropertiesResponse {
  data: SimilarProperty[];
}

export interface PopularLocation {
  name: string;
  search_value: string;
  property_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_range: string;
}

export interface PopularLocationsResponse {
  data: { locations: PopularLocation[] };
}

export interface CheckEmailResponse {
  exists: boolean;
  is_google_account: boolean;
}

export interface MeResponse {
  success: true;
  user: AuthUser;
}

export interface ResetResponse {
  success?: boolean;
  message: string;
}

export interface ForgotPasswordResponse {
  message: string;
  request_id?: number;
  is_google_user?: boolean;
  action?: string;
}

export interface VerifyResetCodeResponse {
  message: string;
  valid: boolean;
  user_id?: number;
  request_id?: number;
}

export interface ProfileResponse {
  user: AuthUser & Record<string, unknown>;
  message?: string;
  avatar_url?: string;
}

export interface UpdateProfileInput {
  first_name: string;
  last_name: string;
  phone_number: string | null;
  city?: string | null;
  province?: string | null;
}

export interface SavedListingsResponse {
  success: true;
  data: unknown[];
  count: number;
}

export interface ApplicationSummary {
  id: number;
  boarder_id: number;
  landlord_id: number;
  room_id: number;
  message: string | null;
  status: string;
  payment_method: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  room_title: string | null;
  room_price: number;
  property_title: string;
  property_address: string;
  property_id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  landlord_email?: string | null;
}

export interface ApplicationsResponse {
  data: ApplicationSummary[];
}

export interface ApplicationDetailResponse {
  data: ApplicationSummary;
  success?: boolean;
  message?: string;
}

export interface CreateApplicationInput {
  room_id: number;
  landlord_id: number;
  message: string;
}

export interface TenancyResponse {
  success: true;
  data: Record<string, unknown> | null;
  message?: string;
}

export interface LeaveRequestInput {
  reason: string;
  leave_date: string;
  message: string;
}

export interface OnboardingStatusResponse {
  data: Record<string, unknown>;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  category: string;
  priority: string;
  property_id: number | null;
  created_at: string;
  is_viewed?: boolean;
}

export interface BoarderAnnouncementsResponse {
  success: true;
  data: { announcements: Announcement[]; total_count: number };
}

export interface AcceptedApplicationsResponse {
  data: Array<Record<string, unknown>>;
}

export interface DashboardStatsResponse {
  data: {
    occupancy: { rate: number; total_rooms: number; occupied_rooms: number; trend: number };
    revenue: { monthly: number; currency: 'PHP'; trend: number };
    renewals: { upcoming_count: number; period: string };
    /** Counted in the tracker's vocabulary (spec `payments-tracker-redesign` D32). */
    payment_alerts: { due_soon: number; due_today: number; in_grace: number; overdue: number };
  };
}

export interface LandlordProperty {
  id: number;
  name: string;
  type: string;
  description: string;
  address: string;
  city: string;
  province: string;
  price: number;
  /** Raw stored listing status — `draft` / `available` / `hidden`
      (`edit-listing-property-info` D15). The web owns the landlord wording. */
  status: string;
  /** The admin axis, returned so a rejected listing reads as Unpublished (D12). */
  listing_moderation_status: string;
  role?: 'owner' | 'shared';
  total_rooms: number;
  occupied_rooms: number;
  monthly_revenue: number;
  created_at: string;
  amenities: string[];
  photos: string[];
  pending_applications: number;
}

export interface LandlordPropertiesResponse {
  data: { properties: LandlordProperty[]; total_count: number };
}

export interface LandlordInvitation {
  id: number;
  property_id: number;
  property_name: string;
  owner_name: string;
  owner_email: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  revoked_at: string | null;
}

export interface LandlordInvitationsResponse {
  data: { invitations: LandlordInvitation[] };
}

export interface AcceptInvitationResponse {
  message: string;
  data: {
    access: { property_id: number; property_name: string; role: string };
  };
}

/**
 * One authorized landlord on the property detail payload. Only the **primary
 * owner** receives this list; a shared-access landlord's payload omits it
 * entirely (`landlord-property-detail-page` D19).
 */
export interface AuthorizedLandlord {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  granted_at: string;
}

/**
 * `GET /api/landlord/properties?id=N` — the property detail payload.
 *
 * `listing_moderation_status` is what the detail page's publish pill reads
 * (`landlord-property-detail-page` R16); `status` remains the listing's own
 * active/hidden state, which is a different axis.
 */
export interface LandlordPropertyDetail {
  id: number;
  name: string;
  type: string;
  gender_preference: string;
  description: string;
  address: string;
  latitude: number | '';
  longitude: number | '';
  city: string;
  province: string;
  price: number;
  deposit: number;
  capacity: string;
  min_stay: string;
  availability: string;
  status: string;
  listing_moderation_status: string;
  role: string;
  total_rooms: number;
  rooms: number;
  occupied_rooms: number;
  created_at: string;
  amenities: string[];
  photos: string[];
  rules: string;
  monthlyPayment: number;
  monthlyDeposit: number;
  advancePayment: string;
  authorized_landlords?: AuthorizedLandlord[];
}

export interface LandlordPropertyDetailResponse {
  data: LandlordPropertyDetail;
}

export interface LandlordRoom {
  id: number;
  property_id: number;
  room_number: string;
  room_type: string | null;
  description: string | null;
  price: number;
  deposit: number;
  status: string;
  capacity: number;
  occupied: number;
  free_slots: number;
  size: number | null;
  cover_photo: string | null;
  photos: Array<{ id: number; photo_url: string; is_cover: boolean; display_order: number }>;
  created_at: string | null;
}

export interface LandlordRoomListResponse {
  data: {
    property: {
      id: number;
      name: string;
      status: string;
      total_rooms: number;
      occupied_rooms: number;
    };
    rooms: LandlordRoom[];
  };
}

export interface RoomMutationResponse {
  success: boolean;
  message: string;
  data: LandlordRoom;
}

export interface UploadPhotosResponse {
  message?: string;
  success?: boolean;
  data: { urls?: string[]; photos?: Array<Record<string, unknown>>; errors?: string[] };
}

export interface LandlordBoarder {
  id: number;
  application_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  room_id: number | null;
  room_title: string | null;
  rent: number;
  deposit: number;
  move_in_date: string | null;
  application_message: string | null;
  status: string;
  leave_request_status: string;
  intended_leave_date: string | null;
  payment_status: string;
  payment_due_day: number;
}

export interface BoardersResponse {
  success: true;
  data: { boarders: LandlordBoarder[]; total_count: number };
}

export interface BoarderMutationResponse {
  success: boolean;
  data: { message: string; boarder_id?: number };
}

export interface LandlordApplicationsResponse {
  data: ApplicationSummary[];
}

export interface LandlordAnnouncement {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  publish_date: string;
  view_count: number;
  target_property: string;
}

export interface LandlordAnnouncementsResponse {
  success: true;
  data: { announcements: LandlordAnnouncement[]; total_count: number };
}

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  metadata: unknown;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  unread_count: number;
}

export interface UnreadCountResponse {
  data: { unread_count: number };
}

export interface AdminSummary {
  counts: {
    users_total: number;
    users_boarder: number;
    users_landlord: number;
    users_admin: number;
    landlords_pending_verification: number;
    properties_total: number;
    properties_pending_moderation: number;
    applications_total: number;
  };
  revenue: {
    platform_fee_percent: number;
    currency: 'PHP';
    note: string;
  };
}

export interface AdminSummaryResponse {
  data: AdminSummary;
}

export interface AdminUserRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_verified: number;
  account_status: string;
  created_at: string;
}

export interface AdminUsersResponse {
  data: AdminUserRow[];
  meta: { total: number; limit: number; offset: number };
}

export interface AdminAuditLogEntry {
  id: number;
  actor_id: number;
  actor_name: string | null;
  actor_email: string | null;
  entity: string;
  action: string;
  ids: number[];
  created_at: string;
}

export interface AdminAuditLogResponse {
  data: AdminAuditLogEntry[];
  meta: { total: number; limit: number; offset: number };
}

export interface AdminPropertyRow {
  id: number;
  title: string;
  price: number;
  listing_moderation_status: string;
  landlord_first: string;
  landlord_last: string;
  landlord_email: string;
  /** Card facts added in `landlord-properties-card-layout` D21 (additive). */
  created_at: string;
  address: string | null;
  city: string | null;
  province: string | null;
  rooms_count: number;
  occupied_rooms: number;
  monthly_revenue: number;
  cover_photo: string | null;
}

export interface AdminPropertiesResponse {
  data: AdminPropertyRow[];
}

/** Read-only per-room view of a property (spec `create-listing-room-details` R10). */
export interface AdminPropertyRoom {
  id: number;
  room_number: string;
  room_type: string | null;
  price: number;
  capacity: number;
  occupied: number;
  free_slots: number;
  status: string;
  photo_count: number;
}

export interface AdminPropertyRoomsResponse {
  data: AdminPropertyRoom[];
}

export interface AdminApplicationRow {
  id: number;
  status: string;
  created_at: string;
  boarder_first: string;
  boarder_last: string;
  boarder_email: string;
  landlord_id: number;
  landlord_first: string;
  landlord_last: string;
  room_title: string | null;
}

export interface AdminApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  processed_rate_percent: number;
  by_status: Record<string, number>;
}

export interface AdminApplicationsResponse {
  data: {
    stats: AdminApplicationStats;
    applications: AdminApplicationRow[];
  };
}

export type AdminSettings = Record<string, string>;

export interface AdminSettingsResponse {
  data: AdminSettings;
}

export interface AdminLandlordRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_verified: number;
  created_at: string;
  boarding_house_name: string | null;
}

export interface PropertyAccessOwner {
  id: number;
  name: string;
  email: string;
}

export interface AuthorizedLandlord {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  granted_by: number;
  granted_at: string;
}

export interface PendingAccessInvitation {
  id: number;
  invitee_id: number;
  invitee_name: string;
  invitee_email: string;
  invited_by: number;
  created_at: string;
}

export interface AdminPropertyAccessRow {
  id: number;
  title: string;
  owner: PropertyAccessOwner;
  authorized_landlords: AuthorizedLandlord[];
  pending_invitations: PendingAccessInvitation[];
}

export interface AdminPropertyAccessResponse {
  data: { properties: AdminPropertyAccessRow[] };
}

export interface LandlordCreatedData {
  rooms: number;
  tenants: number;
  payments: number;
  announcements: number;
}

export interface LandlordCreatedDataResponse {
  data: {
    landlord_id: number;
    landlord_name: string;
    property_id: number;
    property_name: string;
    created: LandlordCreatedData;
  };
}

export interface PropertyAccessHistoryEvent {
  type: string;
  invitation_id: number | null;
  access_id: number | null;
  property_id: number;
  property_name: string;
  landlord_id: number;
  landlord_name: string;
  actor_id: number | null;
  actor_name: string | null;
  at: string;
}

export interface PropertyAccessHistoryResponse {
  data: { events: PropertyAccessHistoryEvent[] };
}

export interface AdminLandlordsResponse {
  data: AdminLandlordRow[];
}

export interface AdminLandlordDocumentRow {
  document_type: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  file_url: string;
  uploaded_at: string;
}

export interface AdminLandlordLocationRow {
  address_line_1: string;
  city: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Admin detail view of one landlord: the header the review modal shows, plus the
 * verification bundle with the server-computed approve gate.
 */
export interface AdminLandlordDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_verified: number;
  created_at: string;
  boarding_house_name: string | null;
  property_locations: AdminLandlordLocationRow[];
  verification_status: string;
  verification_note: string | null;
  documents_complete: boolean;
  missing_documents: string[];
  documents: AdminLandlordDocumentRow[];
}

export interface AdminLandlordDetailResponse {
  data: AdminLandlordDetail;
}

/** One verification slot as the landlord's own page renders it, missing files included. */
export interface LandlordVerificationDocumentSlot {
  document_type: string;
  label: string;
  hint: string;
  accepts_pdf: boolean;
  submitted: boolean;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  file_url: string | null;
  uploaded_at: string | null;
}

export interface LandlordVerificationData {
  verification_status: string;
  note: string | null;
  reviewed_at: string | null;
  documents_complete: boolean;
  missing_documents: string[];
  documents: LandlordVerificationDocumentSlot[];
}

export interface LandlordVerificationResponse {
  data: LandlordVerificationData;
}

export interface LandlordVerificationDocumentUploadResponse {
  message: string;
  data: LandlordVerificationData & { document_type?: string; file_url?: string };
}

export interface MessageAttachment {
  url: string;
  key?: string | null;
}

/** One inbox row / thread header (spec `messages-feature-review` R2/R15). */
export interface MessageThread {
  id: number;
  property_id: number | null;
  property_title: string | null;
  counterpart_id: number;
  counterpart_first_name: string;
  counterpart_last_name: string;
  counterpart_avatar_url: string | null;
  last_message_at: string;
  created_at: string;
  last_body: string | null;
  last_sender_id: number | null;
  /** Attachments on the newest visible message — an image-only row still previews. */
  last_attachment_count: number;
  unread_count: number;
  blocked_by_me: number;
  blocked_me: number;
}

export interface MessageThreadsResponse {
  data: MessageThread[];
  unread_count: number;
}

export interface ThreadMessage {
  id: number;
  sender_id: number;
  body: string;
  property_id: number | null;
  read_at: string | null;
  created_at: string;
  attachments: MessageAttachment[];
}

export interface MessageThreadResponse {
  data: {
    thread: MessageThread;
    side: 'landlord' | 'boarder';
    messages: ThreadMessage[];
    has_more: boolean;
    next_before: number | null;
    /** `'you'` when the caller blocked the counterpart, `'them'` for the reverse. */
    blocked_by: 'you' | 'them' | null;
    /** `property_id` → listing title, for the origin header and message chips (R15). */
    properties: Record<string, string>;
  };
}

export interface MessageThreadOpenResponse {
  data: { thread: MessageThread };
}

export interface SendMessageResponse {
  data: { message: ThreadMessage };
}

export interface MessageUnreadCountResponse {
  data: { unread_count: number };
}

export interface MessageAttachmentsResponse {
  data: MessageAttachment[];
}

/* ------------------------------------------------------------------ payments */

export type PaymentChargeType = 'rent' | 'deposit' | 'advance' | 'utility' | 'late_fee' | 'other';

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

/* ------------------------------------------------------------------ calendar */

/**
 * The landlord calendar's event union (spec `landlord-calendar` §3/§5.2).
 *
 * Every event is an **all-day date** derived server-side from rows the ledger,
 * the applications page and the announcements page already own — the client
 * renders tones and labels, and never re-derives a status.
 */
export type CalendarEventType =
  | 'charge_due'
  | 'payment_received'
  | 'application_received'
  | 'application_accepted'
  | 'application_confirmed'
  | 'tenancy_move_in'
  | 'tenancy_move_out'
  | 'leave_requested'
  | 'announcement_publish';

export type CalendarFamily = 'money' | 'tenancy' | 'applications' | 'content';

export interface CalendarParty {
  id: number;
  name: string;
}

export interface CalendarEvent {
  /** `<source>:<row id>:<type>` — stable across refetches, so it keys the chips. */
  id: string;
  type: CalendarEventType;
  family: CalendarFamily;
  /** `YYYY-MM-DD`, interpreted in Asia/Manila. */
  date: string;
  /** The person (or announcement title) the event is about, unlabelled. */
  subject: string;
  /** `StatusBadge` tone key, derived by the API. */
  status: string;
  /** True when the date is a proxy rather than a dedicated timestamp (spec L2). */
  approximate: boolean;
  amount: number | null;
  late_fee: number | null;
  charge_type: string | null;
  description: string | null;
  period_start: string | null;
  period_end: string | null;
  reference_number: string | null;
  boarder: CalendarParty | null;
  room: CalendarParty | null;
  property: CalendarParty | null;
  link: { to: string; label: string };
}

export interface CalendarCounts {
  money: number;
  tenancy: number;
  applications: number;
  content: number;
}

export interface CalendarSummary {
  due_amount: number;
  collected_amount: number;
  overdue_count: number;
  overdue_amount: number;
}

export interface CalendarPayload {
  window: { from: string; to: string };
  /** Manila "today" from the server, so the client never guesses (D20). */
  today: string;
  property_id: number | null;
  counts: CalendarCounts;
  total: number;
  truncated: boolean;
  summary: CalendarSummary;
  events: CalendarEvent[];
}

export interface CalendarResponse {
  success: true;
  data: CalendarPayload;
}
