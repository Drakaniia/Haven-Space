import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { deleteUploadThingFileByUrl, uploadFilesToUploadThing } from '../../lib/uploadthing';
import {
  findVerificationDocument,
  getLandlordVerificationState,
  isVerificationDocumentType,
  maxVerificationDocumentBytes,
  pdfCapableViewDocumentTypes,
  removeVerificationDocument,
  setVerificationStatus,
  upsertVerificationDocument,
  verificationDocumentLabels,
} from '../../repositories/landlord-verification';
import { requireLandlord } from './shared';

const verificationRoutes = new Hono<{ Bindings: Env }>();

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedDocumentTypes = new Set([...allowedImageTypes, 'application/pdf']);

/**
 * Reads the bundle status plus all four slots, with placeholders for anything the
 * landlord has not uploaded yet. The page renders slots straight from this payload so
 * the slot list and its copy live in one place.
 */
async function handleGetVerification(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const state = await getLandlordVerificationState(db, user.user_id);

  return jsonResponse({
    data: {
      verification_status: state.verification_status,
      note: state.note,
      reviewed_at: state.reviewed_at,
      documents_complete: state.documents_complete,
      missing_documents: state.missing_documents,
      documents: state.slots,
    },
  });
}

/**
 * Uploads one slot to UploadThing and records it. Unlike listing writes this is open to
 * unverified landlords — uploading documents is how a landlord gets verified.
 */
async function handleUploadVerificationDocument(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const form = await c.req.formData();
  const documentType = String(form.get('document_type') ?? '').trim();

  if (!isVerificationDocumentType(documentType)) {
    return errorResponse(400, 'Invalid document type');
  }

  const entry = form.get('file') as unknown;

  if (
    !entry ||
    typeof entry === 'string' ||
    typeof (entry as { size?: unknown }).size !== 'number' ||
    typeof (entry as { type?: unknown }).type !== 'string'
  ) {
    return errorResponse(400, 'No valid file uploaded');
  }

  const file = entry as File;

  if (file.size > maxVerificationDocumentBytes) {
    return errorResponse(400, 'File size must be less than 5MB');
  }

  const acceptsPdf = pdfCapableViewDocumentTypes.includes(documentType);

  if (!(acceptsPdf ? allowedDocumentTypes : allowedImageTypes).has(file.type)) {
    return errorResponse(
      400,
      acceptsPdf
        ? 'Invalid file type. Only JPEG, PNG, WebP and PDF are allowed'
        : 'Invalid file type. Only JPEG, PNG and WebP are allowed'
    );
  }

  const existing = await findVerificationDocument(db, user.user_id, documentType);
  const [uploaded] = await uploadFilesToUploadThing(c.env, [file], {
    userId: user.user_id,
    purpose: 'verification_document',
    documentType,
  });

  if (!uploaded?.data || uploaded.error) {
    return errorResponse(502, uploaded?.error?.message || 'Failed to upload document');
  }

  const fileUrl = uploaded.data.ufsUrl || uploaded.data.url || uploaded.data.appUrl;

  if (!fileUrl) {
    return errorResponse(502, 'UploadThing did not return a file URL');
  }

  await upsertVerificationDocument(db, {
    userId: user.user_id,
    documentType,
    fileUrl,
    fileKey: uploaded.data.key ?? null,
    fileName: uploaded.data.name || file.name,
    fileSize: uploaded.data.size ?? file.size,
    fileType: file.type || null,
  });

  // The replaced file is no longer referenced by any row, so drop it best-effort.
  if (existing && existing.file_url !== fileUrl) {
    try {
      await deleteUploadThingFileByUrl(c.env, existing.file_url);
    } catch (error) {
      console.warn('Failed to delete previous verification document', error);
    }
  }

  const state = await getLandlordVerificationState(db, user.user_id);

  return jsonResponse({
    message: 'Document uploaded successfully',
    data: {
      document_type: documentType,
      file_url: fileUrl,
      verification_status: state.verification_status,
      documents_complete: state.documents_complete,
      missing_documents: state.missing_documents,
      documents: state.slots,
    },
  });
}

async function handleDeleteVerificationDocument(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const documentType = c.req.param('documentType') ?? '';

  if (!isVerificationDocumentType(documentType)) {
    return errorResponse(400, 'Invalid document type');
  }

  const existing = await findVerificationDocument(db, user.user_id, documentType);

  if (!existing) {
    return errorResponse(404, 'Document not found');
  }

  await removeVerificationDocument(db, user.user_id, documentType);

  try {
    await deleteUploadThingFileByUrl(c.env, existing.file_url);
  } catch (error) {
    console.warn('Failed to delete verification document', error);
  }

  const state = await getLandlordVerificationState(db, user.user_id);

  return jsonResponse({
    message: 'Document removed',
    data: {
      verification_status: state.verification_status,
      documents_complete: state.documents_complete,
      missing_documents: state.missing_documents,
      documents: state.slots,
    },
  });
}

/** Flips the bundle to `submitted` once every slot holds a file. */
async function handleSubmitVerification(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const state = await getLandlordVerificationState(db, user.user_id);

  if (state.missing_documents.length > 0) {
    return errorResponse(
      400,
      `Missing documents: ${state.missing_documents
        .map(type => verificationDocumentLabels[type])
        .join(', ')}`
    );
  }

  await setVerificationStatus(db, user.user_id, { status: 'submitted' });

  return jsonResponse({ message: 'Documents submitted for review' });
}

verificationRoutes.get('/verification', handleGetVerification);
verificationRoutes.post('/verification/documents', handleUploadVerificationDocument);
verificationRoutes.delete(
  '/verification/documents/:documentType',
  handleDeleteVerificationDocument
);
verificationRoutes.post('/verification/submit', handleSubmitVerification);

export default verificationRoutes;
