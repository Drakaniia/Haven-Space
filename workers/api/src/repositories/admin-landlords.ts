import {
  getVerificationProfile,
  isVerificationComplete,
  listVerificationDocuments,
  missingVerificationDocumentTypes,
  type VerificationDocumentRecord,
  type VerificationStatus,
} from './landlord-verification';

export interface AdminLandlordRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_verified: number;
  created_at: string;
  boarding_house_name: string | null;
}

export interface LandlordLocationRow {
  address_line_1: string;
  city: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
}

export interface AdminLandlordDocumentRow {
  document_type: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  file_url: string;
  uploaded_at: string;
}

export interface AdminLandlordDetailRow extends AdminLandlordRow {
  property_locations: LandlordLocationRow[];
  verification_status: VerificationStatus;
  verification_note: string | null;
  documents_complete: boolean;
  missing_documents: string[];
  documents: AdminLandlordDocumentRow[];
}

function toAdminDocument(document: VerificationDocumentRecord): AdminLandlordDocumentRow {
  return {
    document_type: document.document_type,
    file_name: document.file_name,
    file_size: document.file_size,
    file_type: document.file_type,
    file_url: document.file_url,
    uploaded_at: document.uploaded_at,
  };
}

function clampLimit(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50;
  }

  return Math.min(parsed, 100);
}

function offsetValue(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function listAdminLandlords(
  db: D1Database,
  status: string,
  limitParam: string | undefined,
  offsetParam: string | undefined
): Promise<AdminLandlordRow[]> {
  const limit = clampLimit(limitParam);
  const offset = offsetValue(offsetParam);
  const conditions = ["u.role = 'landlord'", 'u.deleted_at IS NULL'];

  if (status === 'pending') {
    conditions.push('u.is_verified = 0');
  } else if (status === 'verified') {
    conditions.push('u.is_verified = 1');
  }

  const result = await db
    .prepare(
      `
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.is_verified,
          u.created_at,
          lp.boarding_house_name
        FROM users u
        LEFT JOIN landlord_profiles lp ON u.id = lp.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `
    )
    .bind(limit, offset)
    .all<AdminLandlordRow>();

  return result.results ?? [];
}

export async function getAdminLandlordDetail(
  db: D1Database,
  landlordId: number
): Promise<AdminLandlordDetailRow | null> {
  const landlord = await db
    .prepare(
      `
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.is_verified,
          u.created_at,
          lp.boarding_house_name
        FROM users u
        LEFT JOIN landlord_profiles lp ON u.id = lp.user_id
        WHERE u.id = ?
          AND u.role = 'landlord'
          AND u.deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(landlordId)
    .first<AdminLandlordRow>();

  if (!landlord) {
    return null;
  }

  const locations = await db
    .prepare(
      `
        SELECT
          a.address_line_1,
          a.city,
          a.province,
          a.latitude,
          a.longitude
        FROM addresses a
        INNER JOIN properties p ON p.address_id = a.id
        WHERE p.landlord_id = ?
          AND p.deleted_at IS NULL
      `
    )
    .bind(landlordId)
    .all<LandlordLocationRow>();

  // One extra round trip for the verification bundle: the admin review modal is a
  // single fetch, and the approve gate is computed server-side so the client cannot
  // disagree with what the decision endpoint enforces.
  const documents = await listVerificationDocuments(db, landlordId);
  const profile = await getVerificationProfile(db, landlordId);

  return {
    ...landlord,
    property_locations: locations.results ?? [],
    verification_status: profile.verification_status,
    verification_note: profile.note,
    documents_complete: isVerificationComplete(documents),
    missing_documents: missingVerificationDocumentTypes(documents),
    documents: documents.map(toAdminDocument),
  };
}

export async function updateLandlordVerification(
  db: D1Database,
  landlordId: number,
  action: 'approve' | 'reject'
): Promise<number> {
  const result = await db
    .prepare(
      action === 'approve'
        ? `
            UPDATE users
            SET is_verified = 1,
                email_verified = 1,
                account_status = 'active',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND role = 'landlord'
              AND deleted_at IS NULL
          `
        : `
            UPDATE users
            SET is_verified = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND role = 'landlord'
              AND deleted_at IS NULL
          `
    )
    .bind(landlordId)
    .run();

  return Number(result.meta.changes ?? 0);
}
