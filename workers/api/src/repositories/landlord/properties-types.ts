import type { AuthorizedLandlordRow } from '../property-access.js';
export interface LandlordPropertyListRow {
  id: number;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number;
  status: string;
  listing_moderation_status: string;
  role: 'owner' | 'shared';
  created_at: string | null;
  rooms_count: number;
  occupied_rooms: number;
  monthly_revenue: number;
  property_type: string | null;
  pending_applications: number;
}

export interface LandlordPropertyDetailRow {
  id: number;
  title: string;
  description: string | null;
  property_type: string | null;
  gender_preference: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  province: string | null;
  price: number;
  deposit: number | null;
  advance: string | null;
  min_stay: string | null;
  property_rules: string | null;
  status: string;
  listing_moderation_status: string;
  role: 'owner' | 'shared';
  created_at: string | null;
  rooms_count: number;
  occupied_rooms: number;
}

export interface LandlordPropertyIdentityRow {
  id: number;
  title: string;
}

export interface LandlordPropertyUpdateRow {
  id: number;
  address_id: number | null;
  title: string;
  description: string | null;
  price: number;
  deposit: number | null;
  advance: string | null;
  min_stay: string | null;
  property_rules: string | null;
  property_type: string | null;
  gender_preference: string | null;
}

export interface LandlordAddressRow {
  address_line_1: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface LandlordRoomCountRow {
  count: number;
}

export interface LandlordRoomIdRow {
  id: number;
}

export interface PropertyPhotoDisplayOrderRow {
  max_order: number | null;
}

export interface LandlordAmenityRow {
  property_id: number;
  amenity_name: string;
}

export interface LandlordPhotoRow {
  property_id: number;
  photo_url: string;
  is_cover?: number;
}

export interface LandlordPropertyPhotoUrlRow {
  photo_url: string;
}

export interface LandlordPropertiesResult {
  properties: LandlordPropertyListRow[];
  amenities: Map<number, string[]>;
  photos: Map<number, string[]>;
}

export interface LandlordPropertyDetailResult {
  property: LandlordPropertyDetailRow;
  amenities: string[];
  photos: string[];
  authorized_landlords: AuthorizedLandlordRow[];
}

export interface CreateLandlordPropertyInput {
  landlordId: number;
  title: string;
  propertyType: string;
  description: string;
  addressId: number;
  price: number;
  deposit: number;
  advance: string;
  minStay: string;
  houseRules: string;
  genderPreference: string;
  propertyRules: string | null;
}

export interface CreateLandlordPropertyAliasInput {
  landlordId: number;
  title: string;
  description: string;
  addressId: number;
  price: number;
  status: string;
}

export interface CreateLandlordRoomInput {
  propertyId: number;
  landlordId: number;
  title: string;
  price: number;
  description: string;
  roomNumber: string;
  roomType: string;
  capacity: number;
  deposit: number;
}

export interface UpdateLandlordAddressInput {
  addressId: number;
  address: string;
  city: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
}

export interface UpdateLandlordPropertyInput {
  propertyId: number;
  landlordId: number;
  title: string;
  description: string;
  price: number;
  deposit: number;
  advance: string;
  minStay: string;
  propertyRules: string;
  propertyType: string;
  genderPreference: string;
  status: string;
}
