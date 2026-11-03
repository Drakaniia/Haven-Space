import type { AuthorizedLandlord } from './admin';
import type { ApplicationSummary } from './applications';

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
  leave_request_date: string | null;
  intended_leave_date: string | null;
  leave_request_reason: string | null;
  payment_status: string;
  payment_due_day: number;
  /** Open charges; a non-zero amount blocks approving this tenant's leave. */
  outstanding_amount: number;
  approved_at: string | null;
  approved_by_name: string | null;
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
