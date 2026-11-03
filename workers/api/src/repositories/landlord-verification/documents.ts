import { setVerificationStatus } from './status';
import {
  pdfCapableViewDocumentTypes,
  verificationDocumentHints,
  verificationDocumentLabels,
  verificationDocumentTypes,
  type LandlordVerificationState,
  type VerificationDocumentRecord,
  type VerificationDocumentSlot,
  type VerificationDocumentType,
  type VerificationStatus,
} from './types';

interface VerificationDocumentRow {
  document_type: string;
  file_url: string;
  file_key: string | null;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
}

function toRecord(row: VerificationDocumentRow): VerificationDocumentRecord {
  return {
    document_type: row.document_type as VerificationDocumentType,
    file_url: row.file_url,
    file_key: row.file_key,
    file_name: row.file_name,
    file_size: row.file_size === null ? null : Number(row.file_size),
    file_type: row.file_type,
    uploaded_at: row.uploaded_at,
  };
}

function normalizeStatus(value: string | null | undefined): VerificationStatus {
  return value === 'submitted' || value === 'approved' || value === 'rejected' ? value : 'pending';
}

/** All four slots in a fixed order, with missing ones rendered as placeholders. */
export function buildVerificationSlots(
  documents: VerificationDocumentRecord[]
): VerificationDocumentSlot[] {
  const byType = new Map(documents.map(document => [document.document_type, document]));

  return verificationDocumentTypes.map(type => {
    const document = byType.get(type);

    return {
      document_type: type,
      label: verificationDocumentLabels[type],
      hint: verificationDocumentHints[type],
      accepts_pdf: pdfCapableViewDocumentTypes.includes(type),
      submitted: Boolean(document),
      file_name: document?.file_name ?? null,
      file_size: document?.file_size ?? null,
      file_type: document?.file_type ?? null,
      file_url: document?.file_url ?? null,
      uploaded_at: document?.uploaded_at ?? null,
    };
  });
}

export function missingVerificationDocumentTypes(
  documents: VerificationDocumentRecord[]
): VerificationDocumentType[] {
  const present = new Set(documents.map(document => document.document_type));

  return verificationDocumentTypes.filter(type => !present.has(type));
}

export function isVerificationComplete(documents: VerificationDocumentRecord[]): boolean {
  return missingVerificationDocumentTypes(documents).length === 0;
}

export async function listVerificationDocuments(
  db: D1Database,
  userId: number
): Promise<VerificationDocumentRecord[]> {
  const rows = await db
    .prepare(
      `
        SELECT document_type, file_url, file_key, file_name, file_size, file_type, uploaded_at
        FROM landlord_verification_documents
        WHERE user_id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(userId)
    .all<VerificationDocumentRow>();

  return (rows.results ?? []).map(toRecord);
}

export async function findVerificationDocument(
  db: D1Database,
  userId: number,
  documentType: VerificationDocumentType
): Promise<VerificationDocumentRecord | null> {
  const row = await db
    .prepare(
      `
        SELECT document_type, file_url, file_key, file_name, file_size, file_type, uploaded_at
        FROM landlord_verification_documents
        WHERE user_id = ?
          AND document_type = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(userId, documentType)
    .first<VerificationDocumentRow>();

  return row ? toRecord(row) : null;
}

export async function getVerificationProfile(
  db: D1Database,
  userId: number
): Promise<{
  verification_status: VerificationStatus;
  note: string | null;
  reviewed_at: string | null;
}> {
  const row = await db
    .prepare(
      `
        SELECT verification_status, verification_note, verification_reviewed_at
        FROM landlord_profiles
        WHERE user_id = ?
        LIMIT 1
      `
    )
    .bind(userId)
    .first<{
      verification_status: string | null;
      verification_note: string | null;
      verification_reviewed_at: string | null;
    }>();

  return {
    verification_status: normalizeStatus(row?.verification_status),
    note: row?.verification_note ?? null,
    reviewed_at: row?.verification_reviewed_at ?? null,
  };
}

/** The full landlord-facing view: bundle status plus every slot in fixed order. */
export async function getLandlordVerificationState(
  db: D1Database,
  userId: number
): Promise<LandlordVerificationState> {
  const documents = await listVerificationDocuments(db, userId);
  const profile = await getVerificationProfile(db, userId);

  return {
    verification_status: profile.verification_status,
    note: profile.note,
    reviewed_at: profile.reviewed_at,
    documents_complete: isVerificationComplete(documents),
    missing_documents: missingVerificationDocumentTypes(documents),
    slots: buildVerificationSlots(documents),
  };
}

/**
 * Records a freshly uploaded file for one slot: soft-deletes the previous live row
 * and resets the bundle to `pending`, because a changed submission must be reviewed
 * again. Callers pass the previous row (when there was one) so they can delete the
 * orphaned UploadThing file.
 */
export async function upsertVerificationDocument(
  db: D1Database,
  input: {
    userId: number;
    documentType: VerificationDocumentType;
    fileUrl: string;
    fileKey: string | null;
    fileName: string;
    fileSize: number | null;
    fileType: string | null;
  }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE landlord_verification_documents
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND document_type = ?
          AND deleted_at IS NULL
      `
    )
    .bind(input.userId, input.documentType)
    .run();

  await db
    .prepare(
      `
        INSERT INTO landlord_verification_documents (
          user_id, document_type, file_url, file_key, file_name, file_size, file_type
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.userId,
      input.documentType,
      input.fileUrl,
      input.fileKey,
      input.fileName,
      input.fileSize,
      input.fileType
    )
    .run();

  await setVerificationStatus(db, input.userId, { status: 'pending' });
}

export async function removeVerificationDocument(
  db: D1Database,
  userId: number,
  documentType: VerificationDocumentType
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE landlord_verification_documents
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND document_type = ?
          AND deleted_at IS NULL
      `
    )
    .bind(userId, documentType)
    .run();

  await setVerificationStatus(db, userId, { status: 'pending' });
}
