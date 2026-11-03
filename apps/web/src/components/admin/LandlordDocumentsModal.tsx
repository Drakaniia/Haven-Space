import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { getLandlordDetail, updateLandlordVerification } from '../../lib/api/admin';
import type { AdminLandlordDocumentRow } from '../../lib/types';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/ErrorState';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { TableSkeleton } from './AdminSkeletons';

/**
 * Labels for slots the landlord has not filled yet — the API only returns uploaded
 * files, so the modal owns the copy for the placeholders.
 */
const DOCUMENT_SLOTS: { type: string; label: string }[] = [
  { type: 'government_id', label: 'Valid government ID' },
  { type: 'proof_of_ownership', label: 'Proof of property ownership' },
  { type: 'business_permit', label: 'Business permit' },
  { type: 'selfie_with_id', label: 'Selfie holding the ID' },
];

function formatBytes(size: number | null): string {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function isImage(document: AdminLandlordDocumentRow): boolean {
  if (document.file_type) return document.file_type.startsWith('image/');
  return !document.file_name.toLowerCase().endsWith('.pdf');
}

function DocumentSlot({
  label,
  document,
  onPreview,
}: {
  label: string;
  document: AdminLandlordDocumentRow | undefined;
  onPreview: (document: AdminLandlordDocumentRow) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">{label}</p>
        <StatusBadge
          status={document ? 'submitted' : 'pending'}
          label={document ? 'Uploaded' : 'Not submitted'}
        />
      </div>

      {document ? (
        <div className="flex items-start gap-3">
          {isImage(document) ? (
            <button
              type="button"
              onClick={() => onPreview(document)}
              className="shrink-0 overflow-hidden rounded-lg border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              aria-label={`Preview ${label}`}
            >
              <img
                src={document.file_url}
                alt={label}
                className="h-24 w-32 object-cover"
                loading="lazy"
              />
            </button>
          ) : (
            <span className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong text-gray-ink">
              <Icon name="document" size={28} />
            </span>
          )}

          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-ink" title={document.file_name}>
              {document.file_name}
            </p>
            <p className="text-gray-ink">
              {[formatBytes(document.file_size), formatDate(document.uploaded_at)]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <a
              href={document.file_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-primary hover:underline"
            >
              Open file
            </a>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border-strong p-4 text-center text-sm text-gray-ink">
          No file uploaded yet
        </p>
      )}
    </div>
  );
}

/**
 * Admin review of one landlord's verification documents.
 *
 * The bundle is fetched as a single landlord-detail call; `documents_complete` comes
 * from the server so the disabled Approve button and the endpoint's 409 gate can never
 * disagree. Rejecting and requesting documents both accept an optional reason.
 */
export function LandlordDocumentsModal({
  landlordId,
  token,
  onClose,
  onDecided,
  onNotify,
}: {
  landlordId: number | null;
  token: string;
  onClose: () => void;
  onDecided?: () => void;
  onNotify?: (message: string, tone: 'success' | 'error' | 'info') => void;
}) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<AdminLandlordDocumentRow | null>(null);
  const [action, setAction] = useState<'reject' | 'request_documents' | null>(null);
  const [reason, setReason] = useState('');

  const detail = useQuery({
    queryKey: ['admin', 'landlord-detail', landlordId],
    queryFn: () => getLandlordDetail(token, landlordId as number),
    enabled: Boolean(landlordId && token),
  });

  const decide = useMutation({
    mutationFn: (input: { action: 'approve' | 'reject' | 'request_documents'; reason?: string }) =>
      updateLandlordVerification(token, landlordId as number, input.action, input.reason),
    onSuccess: result => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      onNotify?.(result.message, 'success');
      setAction(null);
      setReason('');
      onDecided?.();
    },
    onError: (error: Error) => onNotify?.(error.message, 'error'),
  });

  const landlord = detail.data?.data;
  const documents = landlord?.documents ?? [];
  const missingLabels = (landlord?.missing_documents ?? [])
    .map(type => DOCUMENT_SLOTS.find(slot => slot.type === type)?.label ?? type)
    .join(', ');

  return (
    <>
      <Modal
        open={Boolean(landlordId)}
        size="xl"
        title={
          landlord
            ? `Verification documents — ${landlord.first_name} ${landlord.last_name}`
            : 'Verification documents'
        }
        onClose={onClose}
      >
        {detail.isLoading ? (
          <div aria-busy="true" aria-live="polite">
            <TableSkeleton rows={3} columns={2} />
          </div>
        ) : detail.error ? (
          <ErrorState message={(detail.error as Error).message} />
        ) : landlord ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-mint/40 p-3">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-ink">{landlord.email}</p>
                <p className="text-gray-ink">
                  {landlord.boarding_house_name || 'No boarding house name'}
                </p>
                <p className="text-gray-ink">Joined {formatDate(landlord.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={landlord.is_verified ? 'verified' : 'pending'} />
                <StatusBadge status={landlord.verification_status} />
                <span className="text-xs text-gray-ink">
                  {documents.length} of {DOCUMENT_SLOTS.length} documents
                </span>
              </div>
            </div>

            {landlord.verification_note ? (
              <p className="rounded-xl bg-warning-tint p-3 text-sm text-warning-ink">
                Admin note: {landlord.verification_note}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {DOCUMENT_SLOTS.map(slot => (
                <DocumentSlot
                  key={slot.type}
                  label={slot.label}
                  document={documents.find(document => document.document_type === slot.type)}
                  onPreview={setPreview}
                />
              ))}
            </div>

            {action ? (
              <div className="space-y-2 rounded-xl border border-border p-3">
                <label className="block text-sm font-medium" htmlFor="verification-reason">
                  {action === 'reject'
                    ? 'Reason for rejection (optional)'
                    : 'What is missing? (optional)'}
                </label>
                <textarea
                  id="verification-reason"
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
                  placeholder={
                    action === 'reject'
                      ? 'The business permit photo is blurry.'
                      : 'Please upload a clearer ID photo.'
                  }
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAction(null);
                      setReason('');
                    }}
                    disabled={decide.isPending}
                  >
                    Cancel
                  </Button>
                  {/* The real `danger` variant instead of an `!important` override (R25). */}
                  <Button
                    variant={action === 'reject' ? 'danger' : 'primary'}
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ action, reason })}
                  >
                    {decide.isPending
                      ? 'Sending…'
                      : action === 'reject'
                      ? 'Reject verification'
                      : 'Request documents'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-gray-ink">
                  {landlord.documents_complete
                    ? 'All four documents are on file.'
                    : `Missing: ${missingLabels}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAction('request_documents')}
                    disabled={decide.isPending}
                  >
                    Request documents
                  </Button>
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    onClick={() => setAction('reject')}
                    disabled={decide.isPending}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!landlord.documents_complete || decide.isPending}
                    title={landlord.documents_complete ? undefined : `Missing: ${missingLabels}`}
                    onClick={() => decide.mutate({ action: 'approve' })}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/*
        Enlarged preview. It is a separate scrim above the review modal, but both use the
        shared `Modal`, whose Escape handler listens on `window` — so Escape closes both
        layers together rather than unwinding one at a time.
      */}
      <Modal
        open={Boolean(preview)}
        size="xl"
        title={preview?.file_name ?? 'Document'}
        onClose={() => setPreview(null)}
      >
        {preview ? (
          isImage(preview) ? (
            <img src={preview.file_url} alt={preview.file_name} className="mx-auto max-h-[70vh]" />
          ) : (
            <a
              href={preview.file_url}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Open {preview.file_name} in a new tab
            </a>
          )
        ) : null}
      </Modal>
    </>
  );
}
