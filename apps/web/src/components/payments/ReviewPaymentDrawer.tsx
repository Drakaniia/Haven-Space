import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { ErrorState } from '../ui/ErrorState';
import { Field, TextArea } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import {
  getLandlordCharge,
  rejectLandlordSubmission,
  verifyLandlordSubmission,
} from '../../lib/api/payments';
import { useAuth } from '../../lib/auth-context';
import {
  REQUEST_NEW_PROOF_MESSAGE,
  formatDateTime,
  formatPeso,
  latestSubmission,
  monthLabel,
  paymentMethodLabel,
  roomLabel,
} from '../../lib/payments';
import type { TrackerRow } from '../../lib/types';

/**
 * The review drawer (spec `landlord-payments-monitoring` §8).
 *
 * One charge, one decision: approve (only when the proof covers the full amount),
 * reject with a reason, or ask for a clearer proof. Approving keeps the drawer
 * open and turns it into the approved state, so the landlord sees what was saved
 * instead of watching it disappear (D22).
 */
export function ReviewPaymentDrawer({
  token,
  chargeId,
  row,
  onClose,
  onChanged,
  onNotify,
  onCompose,
  suspended = false,
}: {
  token: string;
  chargeId: number;
  /** The table row behind the drawer — names the tenant, the room and the amount. */
  row: TrackerRow;
  onClose: () => void;
  /** Invalidate the tracker + this tenancy's history after a decision. */
  onChanged: () => void;
  onNotify: (input: { tone: 'success' | 'error'; message: string }) => void;
  onCompose: (input: { title: string; body: string }) => void;
  /** A dialog owned by the page (the message composer) is open above this drawer. */
  suspended?: boolean;
}) {
  const { user } = useAuth();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  /** A rejection that just happened here, so the drawer can show why. */
  const [justRejected, setJustRejected] = useState<string | null>(null);

  const charge = useQuery({
    queryKey: ['landlord-charge', chargeId],
    queryFn: () => getLandlordCharge(token, chargeId),
    enabled: Boolean(token && chargeId),
  });

  const approve = useMutation({
    mutationFn: (submissionId: number) => verifyLandlordSubmission(token, submissionId),
    onSuccess: () => {
      onChanged();
      onNotify({ tone: 'success', message: 'Payment approved' });
    },
    onError: error => onNotify({ tone: 'error', message: error.message }),
  });

  const reject = useMutation({
    mutationFn: (submissionId: number) =>
      rejectLandlordSubmission(token, submissionId, reason.trim()),
    onSuccess: () => {
      setJustRejected(reason.trim());
      setRejecting(false);
      setReason('');
      onChanged();
      onNotify({ tone: 'success', message: 'Payment rejected' });
    },
    onError: error => onNotify({ tone: 'error', message: error.message }),
  });

  const detail = charge.data?.data;
  const submission = detail ? latestSubmission(detail) : null;
  const pending = submission?.status === 'pending' ? submission : null;
  const settled = submission?.status === 'verified' ? submission : null;
  const rejected = justRejected ? null : submission?.status === 'rejected' ? submission : null;
  const monthName = detail ? monthLabel(detail.due_date.slice(0, 7)).split(' ')[0] : '';
  const underpaid = pending && detail ? pending.amount < detail.total_due : false;
  const overpaid = pending && detail ? pending.amount > detail.total_due : false;

  return (
    <>
      <Drawer
        open
        title={detail?.boarder_name ?? row.boarder_name}
        eyebrow="Payment submission"
        subtitle={`${roomLabel(detail?.room_title ?? row.room_number)} · ${
          monthName || 'Rent'
        } rent`}
        onClose={onClose}
        width="md"
        suspended={suspended || rejecting}
        footer={
          pending ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  disabled={underpaid || approve.isPending || reject.isPending}
                  onClick={() => approve.mutate(pending.id)}
                >
                  {approve.isPending ? 'Approving…' : 'Approve payment'}
                </Button>
                <Button
                  variant="outline"
                  disabled={approve.isPending || reject.isPending}
                  onClick={() => {
                    setReason('');
                    setRejecting(true);
                  }}
                >
                  Reject
                </Button>
              </div>
              <button
                type="button"
                className="self-start rounded-sm text-sm font-medium text-primary underline-offset-2 hover:underline"
                onClick={() =>
                  onCompose({
                    title: `Message ${row.boarder_name.split(' ')[0]}`,
                    body: REQUEST_NEW_PROOF_MESSAGE,
                  })
                }
              >
                Request new proof
              </button>
            </div>
          ) : settled || rejected || justRejected ? (
            <Button onClick={onClose}>Close</Button>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )
        }
      >
        {charge.isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : charge.error ? (
          <ErrorState
            message={charge.error.message}
            action={
              <Button variant="outline" size="sm" onClick={() => void charge.refetch()}>
                Try again
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <StatusBadge
                status={pending ? 'awaiting_verification' : settled ? 'paid' : 'rejected'}
                label={pending ? 'Needs review' : settled ? 'Paid' : 'Payment issue'}
              />
            </div>

            {pending || settled ? (
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-ink">Amount</dt>
                  <dd className="mt-1 text-xl font-semibold text-ink">
                    {formatPeso((pending ?? settled)!.amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-ink">Method</dt>
                  <dd className="mt-1 text-sm text-ink">
                    {paymentMethodLabel(
                      (pending ?? settled)!.payment_method,
                      detail?.payment_method_label
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-ink">Reference</dt>
                  <dd className="mt-1 text-sm text-ink">
                    {(pending ?? settled)!.reference_number || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-ink">Submitted</dt>
                  <dd className="mt-1 text-sm text-ink">
                    {formatDateTime((pending ?? settled)!.created_at)}
                  </dd>
                </div>
              </dl>
            ) : null}

            {overpaid && detail ? (
              <p className="text-sm text-warning-ink">
                Overpaid by {formatPeso((pending?.amount ?? 0) - detail.total_due)}.
              </p>
            ) : null}

            <div>
              <h3 className="text-sm font-semibold text-ink">Payment proof</h3>
              {pending?.proof_url || settled?.proof_url ? (
                <a
                  href={(pending ?? settled)?.proof_url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center justify-center rounded-xl border border-border bg-subtle/40 p-3"
                >
                  <img
                    src={(pending ?? settled)?.proof_url ?? ''}
                    alt={`Payment proof from ${detail?.boarder_name ?? row.boarder_name}`}
                    className="max-h-64 w-auto object-contain"
                  />
                </a>
              ) : (
                <p className="mt-2 rounded-xl border border-dashed border-border-strong bg-surface/60 px-4 py-6 text-center text-sm text-gray-ink">
                  No proof image attached.
                </p>
              )}
            </div>

            {pending ? (
              <>
                <p className="text-sm text-gray-ink">
                  Check the amount and reference before approving.
                </p>
                {underpaid && detail ? (
                  <p className="rounded-xl border border-error-border bg-error-tint px-4 py-3 text-sm text-error-ink">
                    The tenant submitted {formatPeso(pending.amount)} of the{' '}
                    {formatPeso(detail.total_due)} due. Full payment is required before approving.
                  </p>
                ) : null}
              </>
            ) : null}

            {settled ? (
              <div className="rounded-xl bg-success-tint px-4 py-3 text-sm text-success-ink">
                <p className="font-semibold">
                  Paid · approved {formatDateTime(settled.verified_at)}
                </p>
                <p className="mt-1">
                  {settled.verified_by !== null && settled.verified_by === user?.id
                    ? 'Approved by you'
                    : 'Approved'}{' '}
                  · {formatPeso(settled.amount)} ·{' '}
                  {paymentMethodLabel(settled.payment_method, detail?.payment_method_label)}
                </p>
              </div>
            ) : null}

            {justRejected || rejected ? (
              <div className="flex flex-col gap-3 rounded-xl border border-error-border bg-error-tint px-4 py-3 text-sm text-error-ink">
                <p className="font-semibold">Payment rejected</p>
                {justRejected || rejected?.rejection_reason ? (
                  <p>{justRejected ?? rejected?.rejection_reason}</p>
                ) : null}
                <p className="text-error-ink/80">
                  The status stays Payment issue until the tenant sends a new proof.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onCompose({
                        title: 'Message about the payment',
                        body:
                          `Your ${formatPeso(
                            row.monthly_rent
                          )} rent payment for ${monthName} was ` +
                          `rejected: ${justRejected ?? rejected?.rejection_reason ?? ''}. Please ` +
                          'send a new proof with the correct amount and reference number.',
                      })
                    }
                  >
                    Message tenant
                  </Button>
                </div>
              </div>
            ) : null}

            {!pending && !settled && !rejected && !justRejected ? (
              <p className="text-sm text-gray-ink">
                Nothing to review on this charge — the tenant has not submitted a payment proof.
              </p>
            ) : null}
          </div>
        )}
      </Drawer>

      <Modal open={rejecting} title="Reject this payment?" onClose={() => setRejecting(false)}>
        <p className="text-sm text-gray-ink">
          The tenant will be told why, and the charge returns to the open ledger so they can submit
          again. The status becomes Payment issue.
        </p>
        <div className="mt-4">
          <Field label="Reason" htmlFor="rejection_reason">
            <TextArea
              id="rejection_reason"
              rows={3}
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="e.g. No transfer matching this reference number"
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRejecting(false)}>
            Keep reviewing
          </Button>
          <Button
            variant="danger"
            disabled={reject.isPending || reason.trim().length === 0 || !pending}
            onClick={() => pending && reject.mutate(pending.id)}
          >
            {reject.isPending ? 'Rejecting…' : 'Reject payment'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
