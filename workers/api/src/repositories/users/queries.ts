import type { AuthUserRow, AuthenticatedUserRow, UserAccountRow } from './types';

export async function findAuthUserByEmail(
  db: D1Database,
  email: string
): Promise<AuthUserRow | null> {
  return await db
    .prepare(
      `
        SELECT google_id, password_hash
        FROM users
        WHERE lower(email) = lower(?)
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(email)
    .first<AuthUserRow>();
}

export async function findUserAccountByEmail(
  db: D1Database,
  email: string
): Promise<UserAccountRow | null> {
  return await db
    .prepare(
      `
        SELECT
          id,
          first_name,
          last_name,
          email,
          password_hash,
          google_id,
          role,
          is_verified,
          email_verified,
          account_status,
          boarder_status,
          phone_number,
          avatar_url
        FROM users
        WHERE lower(email) = lower(?)
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(email)
    .first<UserAccountRow>();
}

export async function findUserAccountByGoogleId(
  db: D1Database,
  googleId: string
): Promise<UserAccountRow | null> {
  return await db
    .prepare(
      `
        SELECT
          id,
          first_name,
          last_name,
          email,
          password_hash,
          google_id,
          role,
          is_verified,
          email_verified,
          account_status,
          boarder_status,
          phone_number,
          avatar_url
        FROM users
        WHERE google_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(googleId)
    .first<UserAccountRow>();
}

export async function findAuthenticatedUserById(
  db: D1Database,
  userId: number
): Promise<AuthenticatedUserRow | null> {
  return await db
    .prepare(
      `
        SELECT id, role, is_verified, email_verified, account_status
        FROM users
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(userId)
    .first<AuthenticatedUserRow>();
}

export async function findUserAccountById(
  db: D1Database,
  userId: number
): Promise<UserAccountRow | null> {
  return await db
    .prepare(
      `
        SELECT
          id,
          first_name,
          last_name,
          email,
          password_hash,
          google_id,
          role,
          is_verified,
          email_verified,
          account_status,
          boarder_status,
          phone_number,
          avatar_url
        FROM users
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(userId)
    .first<UserAccountRow>();
}

export async function determineBoarderStatus(db: D1Database, boarderId: number): Promise<string> {
  const confirmed = await db
    .prepare(
      `
        SELECT COUNT(*) as count
        FROM applications
        WHERE boarder_id = ?
          AND status = 'confirmed'
          AND deleted_at IS NULL
      `
    )
    .bind(boarderId)
    .first<{ count: number }>();

  if (Number(confirmed?.count ?? 0) > 0) {
    return 'confirmed';
  }

  const accepted = await db
    .prepare(
      `
        SELECT COUNT(*) as count
        FROM applications
        WHERE boarder_id = ?
          AND status = 'accepted'
          AND deleted_at IS NULL
      `
    )
    .bind(boarderId)
    .first<{ count: number }>();

  if (Number(accepted?.count ?? 0) > 0) {
    return 'accepted';
  }

  const pending = await db
    .prepare(
      `
        SELECT COUNT(*) as count
        FROM applications
        WHERE boarder_id = ?
          AND status = 'pending'
          AND deleted_at IS NULL
      `
    )
    .bind(boarderId)
    .first<{ count: number }>();

  if (Number(pending?.count ?? 0) > 0) {
    return 'applied_pending';
  }

  const any = await db
    .prepare(
      `
        SELECT COUNT(*) as count
        FROM applications
        WHERE boarder_id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(boarderId)
    .first<{ count: number }>();

  return Number(any?.count ?? 0) > 0 ? 'rejected' : 'new';
}
