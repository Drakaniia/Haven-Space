import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  getVerification,
  removeVerificationDocument,
  submitVerification,
  uploadVerificationDocument,
} from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';
import type { LandlordVerificationDocumentSlot } from '../../lib/types';

export const Route = createFileRoute('/landlord/verification')({
  component: () => (
    <Protected role="landlord">
      <VerificationPage />
    </Protected>
  ),
});

const STATUS_COPY: Record<string, string> = {
  pending: 'Upload all four documents to start the review.',
  submitted: 'Submitted — your documents are reviewed within 24–48 hours.',
  approved: 'Approved. Your account is verified.',
  rejected: 'Rejected — please review the note below and upload new documents.',
};

function formatBytes(size: number | null): string {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

/**
 * One verification slot. Picking a file uploads it immediately, so a partially
 * completed bundle survives a refresh; the bundle is only sent for review when the
 * landlord presses Submit.
 */
function DocumentSlot({
  slot,
  locked,
  busy,
  onUpload,
  onRemove,
}: {
  slot: LandlordVerificationDocumentSlot;
  locked: boolean;
  busy: boolean;
  onUpload: (documentType: string, file: File) => void;
  onRemove: (documentType: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{slot.label}</p>
        {slot.submitted ? (
          <StatusBadge status="submitted" label="Uploaded" />
        ) : (
          <StatusBadge status="pending" label="Not submitted" />
        )}
      </div>

      {slot.submitted ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3.5 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium" title={slot.file_name ?? ''}>
              {slot.file_name}
            </p>
            <p className="text-gray-ink">
              {[formatBytes(slot.file_size), formatUploadedAt(slot.uploaded_at)]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {slot.file_url ? (
              <a
                href={slot.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Open
              </a>
            ) : null}
            {locked ? null : (
              <>
                <button
                  type="button"
                  className="text-primary hover:underline disabled:opacity-60"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="text-error-ink hover:underline disabled:opacity-60"
                  disabled={busy}
                  onClick={() => onRemove(slot.document_type)}
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <label
          className={`block rounded-xl border border-dashed border-border-strong p-4 text-center text-sm ${
            locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-subtle'
          }`}
        >
          {busy ? 'Uploading…' : `Choose a file (${slot.hint})`}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            disabled={locked || busy}
            accept={slot.accepts_pdf ? 'image/*,.pdf' : 'image/*'}
            onChange={event => {
              const file = event.target.files?.[0];
              // Allow re-picking the same file after an error.
              event.target.value = '';
              if (file) onUpload(slot.document_type, file);
            }}
          />
        </label>
      )}
    </div>
  );
}

function VerificationPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verification = useQuery({
    queryKey: ['landlord', 'verification'],
    queryFn: () => getVerification(token!),
    enabled: Boolean(token),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['landlord', 'verification'] });
  };

  const upload = useMutation({
    mutationFn: ({ documentType, file }: { documentType: string; file: File }) =>
      uploadVerificationDocument(token!, documentType, file),
    onSuccess: result => {
      setError(null);
      setMessage(result.message);
      invalidate();
    },
    onError: (uploadError: Error) => {
      setMessage(null);
      setError(uploadError.message);
    },
  });

  const remove = useMutation({
    mutationFn: (documentType: string) => removeVerificationDocument(token!, documentType),
    onSuccess: result => {
      setError(null);
      setMessage(result.message);
      invalidate();
    },
    onError: (removeError: Error) => {
      setMessage(null);
      setError(removeError.message);
    },
  });

  const submit = useMutation({
    mutationFn: () => submitVerification(token!),
    onSuccess: result => {
      setError(null);
      setMessage(result.message);
      invalidate();
    },
    onError: (submitError: Error) => {
      setMessage(null);
      setError(submitError.message);
    },
  });

  const data = verification.data?.data;
  const status = data?.verification_status ?? 'pending';
  // Approved bundles are read-only: changing them would need a fresh review, so the
  // landlord is asked to contact support instead of silently re-entering the queue.
  const locked = status === 'approved';
  const busy = upload.isPending || remove.isPending || submit.isPending;
  const canSubmit = Boolean(data?.documents_complete) && status !== 'submitted' && !locked;

  return (
    <RoleShell nav={LANDLORD_NAV}>
      <Card className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Account verification</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-ink">
          <span>Verification status:</span>
          <StatusBadge status={status} />
        </div>

        <p className="mt-4 text-sm text-gray-ink">
          To complete verification, upload a valid government-issued ID, proof of property
          ownership, a business permit, and a selfie holding your ID. Your account is reviewed
          within 24–48 hours.
        </p>

        {verification.isLoading ? (
          <div className="mt-4 space-y-4" aria-busy="true" aria-live="polite">
            {[0, 1, 2, 3].map(index => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : verification.error ? (
          <div className="mt-4">
            <ErrorState message={(verification.error as Error).message} />
          </div>
        ) : data ? (
          <div className="mt-4 flex flex-col gap-4">
            <p className="rounded-xl bg-mint p-4 text-sm">
              {STATUS_COPY[status] ?? STATUS_COPY.pending}
              {locked ? ' Contact support if you need to change a document.' : ''}
            </p>

            {status === 'rejected' && data.note ? (
              <p className="rounded-xl bg-error-tint p-4 text-sm text-error-ink">
                Reviewer note: {data.note}
              </p>
            ) : null}

            {data.documents.map(slot => (
              <DocumentSlot
                key={slot.document_type}
                slot={slot}
                locked={locked}
                busy={busy}
                onUpload={(documentType, file) => upload.mutate({ documentType, file })}
                onRemove={documentType => remove.mutate(documentType)}
              />
            ))}

            <Button
              disabled={!canSubmit || busy}
              onClick={() => submit.mutate()}
              title={
                data.documents_complete
                  ? undefined
                  : `Still missing: ${data.missing_documents
                      .map(
                        type =>
                          data.documents.find(document => document.document_type === type)?.label ??
                          type
                      )
                      .join(', ')}`
              }
            >
              {submit.isPending
                ? 'Submitting…'
                : status === 'submitted'
                ? 'Submitted for review'
                : 'Submit documents'}
            </Button>

            {message ? <p className="rounded-xl bg-mint p-4 text-sm">{message}</p> : null}
            {error ? (
              <p className="rounded-xl bg-error-tint p-4 text-sm text-error-ink">{error}</p>
            ) : null}

            <Link to="/landlord" className="text-sm text-primary hover:underline">
              ← Back to dashboard
            </Link>
          </div>
        ) : null}
      </Card>
    </RoleShell>
  );
}
