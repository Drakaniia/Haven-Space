import type { VerificationStatus } from './types';

/**
 * Writes the bundle status onto `landlord_profiles`, creating the profile row when a
 * landlord never completed onboarding. `approved`/`rejected` stamp the reviewer;
 * `pending`/`submitted` clear it.
 */
export async function setVerificationStatus(
  db: D1Database,
  userId: number,
  input: { status: VerificationStatus; note?: string | null; reviewedBy?: number | null }
): Promise<void> {
  const reviewed = input.status === 'approved' || input.status === 'rejected';

  if (reviewed) {
    await db
      .prepare(
        `
          INSERT INTO landlord_profiles (
            user_id, verification_status, verification_note,
            verification_reviewed_at, verification_reviewed_by
          )
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            verification_status = excluded.verification_status,
            verification_note = excluded.verification_note,
            verification_reviewed_at = CURRENT_TIMESTAMP,
            verification_reviewed_by = excluded.verification_reviewed_by,
            updated_at = CURRENT_TIMESTAMP
        `
      )
      .bind(userId, input.status, input.note ?? null, input.reviewedBy ?? null)
      .run();

    return;
  }

  await db
    .prepare(
      `
        INSERT INTO landlord_profiles (
          user_id, verification_status, verification_note,
          verification_reviewed_at, verification_reviewed_by
        )
        VALUES (?, ?, ?, NULL, NULL)
        ON CONFLICT(user_id) DO UPDATE SET
          verification_status = excluded.verification_status,
          verification_note = excluded.verification_note,
          verification_reviewed_at = NULL,
          verification_reviewed_by = NULL,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .bind(userId, input.status, input.note ?? null)
    .run();
}

/**
 * Stores an admin note without touching the bundle status — used by "request
 * documents", which nudges the landlord without discarding a prior rejection.
 */
export async function setVerificationNote(
  db: D1Database,
  userId: number,
  note: string | null
): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO landlord_profiles (user_id, verification_status, verification_note)
        VALUES (?, 'pending', ?)
        ON CONFLICT(user_id) DO UPDATE SET
          verification_note = excluded.verification_note,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .bind(userId, note)
    .run();
}
