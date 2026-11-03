export interface TenancyRow {
  application_id: number;
  tenancy_start_date: string;
  property_id: number;
  property_name: string;
  address: string;
  city: string;
  province: string;
  room_id: number;
  room_title: string | null;
  room_number: string | null;
  monthly_rent: number;
  deposit: number;
  house_rules: string | null;
  leave_request_status: string | null;
  leave_request_date: string | null;
  leave_request_reason: string | null;
  intended_leave_date: string | null;
  landlord_id: number;
  landlord_first_name: string;
  landlord_last_name: string;
  landlord_email: string | null;
  landlord_phone: string | null;
  landlord_is_verified: number;
  property_electricity_cost: number | null;
  property_water_cost: number | null;
  property_internet_cost: number | null;
}

export interface TenancyData {
  application_id: number;
  property_id: number;
  property_name: string;
  address: string;
  city: string;
  province: string;
  room_id: number;
  room_title: string | null;
  room_number: string | null;
  tenancy_start_date: string;
  days_since_move_in: number;
  months_since_move_in: number;
  monthly_rent: number;
  deposit: number;
  house_rules: unknown[];
  leave_request_status: string;
  leave_request_date: string | null;
  leave_request_reason: string | null;
  intended_leave_date: string | null;
  property_electricity_cost: number;
  property_water_cost: number;
  property_internet_cost: number;
  /** Open charges on this application; Leave now is blocked while this is above zero. */
  outstanding_balance: number;
  open_charge_count: number;
  landlord: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    is_verified: boolean;
  };
}

export interface OutstandingBalance {
  outstanding_balance: number;
  open_charge_count: number;
}

export interface BoarderNameRow {
  first_name: string;
  last_name: string;
}

export interface ConversationRow {
  id: number;
}

export interface PendingLeaveRequestRow {
  id: number;
  boarder_id: number;
  room_id: number;
  intended_leave_date: string | null;
  property_id: number;
  /** The property's owner — the stable identity of the leave conversation. */
  landlord_id: number;
  property_title: string;
  landlord_first_name: string;
  landlord_last_name: string;
  first_name: string;
  last_name: string;
}

export interface LeaveRequestResult {
  conversationId: number;
  messageId: number;
}
