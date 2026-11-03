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
  /**
   * Sign-in method flags from the account API. Optional because a session cached
   * before they existed is still valid; Settings waits for the profile query
   * when they are absent (spec `settings-signin-method`).
   */
  has_password?: boolean;
  google_connected?: boolean;
  password_updated_at?: string | null;
}

export interface NotificationPreferences {
  application_updates: boolean;
  messages: boolean;
  announcements: boolean;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferences;
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
