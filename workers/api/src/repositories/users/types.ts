export interface AuthUserRow {
  google_id: string | null;
  password_hash: string | null;
}

export interface AuthenticatedUserRow {
  id: number;
  role: 'boarder' | 'landlord' | 'admin';
  is_verified: number;
  email_verified: number;
  account_status: string;
}

export interface UserAccountRow extends AuthenticatedUserRow {
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  google_id: string | null;
  boarder_status: string | null;
  phone_number: string | null;
  avatar_url: string | null;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: 'boarder' | 'landlord';
  accountStatus: string;
  isVerified: number;
  emailVerified: number;
  boarderStatus: string | null;
}

export interface CreateGoogleUserInput {
  firstName: string;
  lastName: string;
  email: string;
  googleId: string;
  googlePicture: string | null;
  role: 'boarder' | 'landlord';
  accountStatus: string;
  isVerified: number;
  emailVerified: number;
  boarderStatus: string | null;
  phoneNumber: string | null;
}

export interface GoogleIdentityInput {
  googleId: string;
  googlePicture: string | null;
}

export interface CreateLandlordProfileInput {
  userId: number;
  boardingHouseName: string;
  boardingHouseDescription: string;
  city: string;
  province: string;
}
