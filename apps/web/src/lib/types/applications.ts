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
