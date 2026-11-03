import type {
  CreateGoogleUserInput,
  CreateLandlordProfileInput,
  CreateUserInput,
  GoogleIdentityInput,
} from './types';

function insertedId(result: D1Result, label: string): number {
  const id = Number(result.meta.last_row_id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`${label} insert did not return an ID`);
  }

  return id;
}

export async function createUserAccount(db: D1Database, input: CreateUserInput): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO users (
          first_name,
          last_name,
          email,
          password_hash,
          role,
          is_verified,
          email_verified,
          account_status,
          boarder_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.firstName,
      input.lastName,
      input.email,
      input.passwordHash,
      input.role,
      input.isVerified,
      input.emailVerified,
      input.accountStatus,
      input.boarderStatus
    )
    .run();

  return insertedId(result, 'User');
}

export async function createGoogleUserAccount(
  db: D1Database,
  input: CreateGoogleUserInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO users (
          first_name,
          last_name,
          email,
          password_hash,
          google_id,
          google_picture,
          role,
          is_verified,
          email_verified,
          account_status,
          boarder_status,
          avatar_url,
          phone_number
        )
        VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.firstName,
      input.lastName,
      input.email,
      input.googleId,
      input.googlePicture,
      input.role,
      input.isVerified,
      input.emailVerified,
      input.accountStatus,
      input.boarderStatus,
      input.googlePicture,
      input.phoneNumber
    )
    .run();

  return insertedId(result, 'Google user');
}

export async function updateGoogleIdentity(
  db: D1Database,
  userId: number,
  input: GoogleIdentityInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE users
        SET
          google_id = ?,
          google_picture = ?,
          avatar_url = COALESCE(avatar_url, ?),
          email_verified = 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(input.googleId, input.googlePicture, input.googlePicture, userId)
    .run();

  return Number(result.meta.changes ?? 0);
}

export async function createLandlordProfile(
  db: D1Database,
  input: CreateLandlordProfileInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO landlord_profiles (
          user_id,
          boarding_house_name,
          boarding_house_description,
          city,
          province,
          property_type,
          total_rooms,
          available_rooms
        )
        VALUES (?, ?, ?, ?, ?, 'Single unit', 1, 1)
      `
    )
    .bind(
      input.userId,
      input.boardingHouseName,
      input.boardingHouseDescription,
      input.city,
      input.province
    )
    .run();

  return insertedId(result, 'Landlord profile');
}
