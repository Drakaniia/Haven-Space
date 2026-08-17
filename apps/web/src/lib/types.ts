export interface RoomSummary {
  id: number;
  room_number: string;
  room_name: string;
  type: string;
  capacity: number;
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

export interface DeleteSavedListingResponse {
  success: true;
  message: string;
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
    payment_alerts: { due_soon: number; overdue: number };
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
  status: string;
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

export interface LandlordPropertyDetailResponse {
  data: Record<string, unknown>;
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

export interface AdminPropertyRow {
  id: number;
  title: string;
  price: number;
  listing_moderation_status: string;
  landlord_first: string;
  landlord_last: string;
  landlord_email: string;
}

export interface AdminPropertiesResponse {
  data: AdminPropertyRow[];
}

export interface AdminApplicationRow {
  id: number;
  status: string;
  created_at: string;
  boarder_first: string;
  boarder_last: string;
  boarder_email: string;
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
