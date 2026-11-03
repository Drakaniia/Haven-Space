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
