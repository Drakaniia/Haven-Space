export interface LandlordRoomPropertyRow {
  id: number;
  title: string;
  status: string;
}

export interface LandlordRoomRow {
  id: number;
  property_id: number;
  landlord_id: number | null;
  title: string | null;
  room_number: string | null;
  room_type: string | null;
  description: string | null;
  price: number;
  deposit: number | null;
  status: string | null;
  capacity: number | null;
  /** Occupants currently in the room; free slots = MAX(capacity - occupied, 0). */
  occupied: number | null;
  size: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LandlordRoomPhotoRow {
  id: number;
  room_id: number;
  photo_url: string;
  is_cover: number;
  display_order: number;
}

export interface LandlordRoomPhotoStatsRow {
  photo_count: number;
  max_order: number | null;
}

export interface LandlordRoomIdentityRow {
  id: number;
  property_id: number;
  room_number: string | null;
}

export interface CreateLandlordManagedRoomInput {
  propertyId: number;
  landlordId: number;
  roomNumber: string;
  roomType: string | null;
  price: number;
  deposit: number;
  status: string;
  capacity: number;
  description: string;
  size: number;
  occupied?: number;
}

export interface UpdateLandlordManagedRoomInput {
  room_number?: string;
  room_type?: string | null;
  price?: number;
  deposit?: number;
  status?: string;
  capacity?: number;
  occupied?: number;
  description?: string;
  size?: number;
}
