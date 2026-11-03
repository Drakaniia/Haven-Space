/**
 * Landlord verification documents.
 *
 * Landlords upload four fixed slots; each slot keeps at most one live row so the
 * admin always reviews the latest submission. `landlord_profiles.verification_status`
 * (pending | submitted | approved | rejected) is the bundle-level state the admin's
 * approve gate and the landlord's own page both read.
 */

export const verificationDocumentTypes = [
  'government_id',
  'proof_of_ownership',
  'business_permit',
  'selfie_with_id',
] as const;

export type VerificationDocumentType = (typeof verificationDocumentTypes)[number];

export const verificationDocumentLabels: Record<VerificationDocumentType, string> = {
  government_id: 'Valid government ID',
  proof_of_ownership: 'Proof of property ownership',
  business_permit: 'Business permit',
  selfie_with_id: 'Selfie holding the ID',
};

export const verificationDocumentHints: Record<VerificationDocumentType, string> = {
  government_id: 'JPG or PNG, max 5 MB',
  proof_of_ownership: 'JPG, PNG or PDF, max 5 MB',
  business_permit: 'JPG, PNG or PDF, max 5 MB',
  selfie_with_id: 'JPG or PNG, max 5 MB',
};

/** Slots that accept PDFs in addition to images. The ID and selfie must stay images. */
export const pdfCapableViewDocumentTypes: VerificationDocumentType[] = [
  'proof_of_ownership',
  'business_permit',
];

export const maxVerificationDocumentBytes = 5 * 1024 * 1024;

export type VerificationStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface VerificationDocumentRecord {
  document_type: VerificationDocumentType;
  file_url: string;
  file_key: string | null;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
}

/** A slot as the client sees it: always present, with `submitted` describing whether a file exists. */
export interface VerificationDocumentSlot {
  document_type: VerificationDocumentType;
  label: string;
  hint: string;
  accepts_pdf: boolean;
  submitted: boolean;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  file_url: string | null;
  uploaded_at: string | null;
}

export interface LandlordVerificationState {
  verification_status: VerificationStatus;
  note: string | null;
  reviewed_at: string | null;
  documents_complete: boolean;
  missing_documents: VerificationDocumentType[];
  slots: VerificationDocumentSlot[];
}

export function isVerificationDocumentType(value: string): value is VerificationDocumentType {
  return (verificationDocumentTypes as readonly string[]).includes(value);
}
