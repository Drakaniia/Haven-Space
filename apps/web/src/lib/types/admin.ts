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
