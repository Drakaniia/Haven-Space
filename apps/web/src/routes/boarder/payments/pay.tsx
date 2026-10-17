import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, buttonClasses } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Field, SelectInput, TextArea, TextInput } from '../../../components/ui/Field';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ApiRequestError } from '../../../lib/api/http';
import {
  getBoarderCharge,
  getBoarderPayments,
  submitBoarderPayment,
  uploadPaymentProof,
} from '../../../lib/api/payments';
import { useAuth } from '../../../lib/auth-context';
import {
  PAYMENT_METHODS,
  PAYMENTS_ERROR_HINT,
  chargeTypeLabel,
  formatPaymentDate,
  formatPeso,
  isChargeOpen,
  latestSubmission,
  paymentMethodLabel,
  paymentStatusMeta,
} from '../../../lib/payments';
import { setPendingToast } from '../../../lib/toast';

export const Route = createFileRoute('/boarder/payments/pay')({
  validateSearch: (search: Record<string, unknown>): { chargeId?: number } => {
    const parsed = Number.parseInt(String(search.chargeId ?? ''), 10);

    return Number.isFinite(parsed) && parsed > 0 ? { chargeId: parsed } : {};
  },
  // The shell lives in `boarder/payments.tsx` (spec `payments-page-regressions`).
  component: SubmitPaymentPage,
});

/** Fallback when the page is opened without a charge: pick an open one. */
function ChooseCharge() {
  const { token } = useAuth();
  const ledger = useQuery({
    queryKey: ['boarder-payments'],
    queryFn: () => getBoarderPayments(token!),
    enabled: Boolean(token),
  });

  const openCharges = (ledger.data?.data.charges ?? []).filter(isChargeOpen);

  if (ledger.isLoading) {
    return <Spinner />;
  }

  if (openCharges.length === 0) {
    return (
      <EmptyState
        icon="payment"
        title="Nothing to pay"
        description="Every charge on your ledger is settled."
        action={
          <Link to="/boarder/payments" className={buttonClasses({ variant: 'outline' })}>
            Back to payments
          </Link>
        }
      />
    );
  }

  return (
    <Card padding="p-0">
      {openCharges.map(charge => (
        <div
          key={charge.id}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 last:border-b-0"
        >
          <div>
            <p className="font-semibold text-ink">
              {charge.description || chargeTypeLabel(charge.charge_type)}
            </p>
            <p className="text-sm text-gray-ink">
              Due {formatPaymentDate(charge.due_date)} · {formatPeso(charge.total_due)}
            </p>
          </div>
          <Link
            to="/boarder/payments/pay"
            search={{ chargeId: charge.id }}
            className={buttonClasses({ size: 'sm' })}
          >
            Submit payment
          </Link>
        </div>
      ))}
    </Card>
  );
}

function SubmitPaymentPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { chargeId } = Route.useSearch();
  const [method, setMethod] = useState('gcash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const charge = useQuery({
    queryKey: ['boarder-charge', chargeId],
    queryFn: () => getBoarderCharge(token!, chargeId!),
    enabled: Boolean(token && chargeId),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!chargeId) {
        throw new Error('No charge selected');
      }

      let proofUrl: string | null = null;

      if (receipt) {
        const uploaded = await uploadPaymentProof(token!, chargeId, receipt);

        if (!uploaded.data?.proof_url) {
          throw new Error('The receipt could not be uploaded');
        }

        proofUrl = uploaded.data.proof_url;
      }

      return await submitBoarderPayment(token!, chargeId, {
        payment_method: method,
        reference_number: reference.trim(),
        proof_url: proofUrl,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['boarder-payments'] });
      await queryClient.invalidateQueries({ queryKey: ['boarder-charge', chargeId] });
      setPendingToast('success', 'Payment submitted. Your landlord will verify it.');
      void navigate({ to: '/boarder/payments' });
    },
    onError: err =>
      setError(
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Could not submit this payment.'
      ),
  });

  const detail = charge.data?.data;

  return (
    <>
      <PageHeader
        title="Submit a payment"
        icon="payment"
        actions={
          <Link to="/boarder/payments" className={buttonClasses({ variant: 'outline' })}>
            Back to payments
          </Link>
        }
      />

      {!chargeId ? (
        <ChooseCharge />
      ) : charge.isLoading ? (
        <Spinner />
      ) : charge.error ? (
        <ErrorState
          message={charge.error.message}
          hint={PAYMENTS_ERROR_HINT}
          action={
            <Button variant="outline" onClick={() => void charge.refetch()}>
              Try again
            </Button>
          }
        />
      ) : !detail ? (
        <EmptyState icon="payment" title="Charge not found" />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ink">
                  {detail.description || chargeTypeLabel(detail.charge_type)}
                </h2>
                <p className="mt-1 text-sm text-gray-ink">
                  {detail.property_title ?? ''}
                  {detail.room_title ? ` · ${detail.room_title}` : ''}
                </p>
              </div>
              <StatusBadge
                status={paymentStatusMeta(detail).status}
                label={paymentStatusMeta(detail).label}
              />
            </div>

            <dl className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-ink">Amount</dt>
                <dd className="font-semibold text-ink">{formatPeso(detail.amount)}</dd>
              </div>
              {detail.late_fee > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-gray-ink">Late fee</dt>
                  <dd className="font-semibold text-warning-ink">{formatPeso(detail.late_fee)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-gray-ink">Total</dt>
                <dd className="font-semibold text-ink">{formatPeso(detail.total_due)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-ink">Due</dt>
                <dd className="text-ink">{formatPaymentDate(detail.due_date)}</dd>
              </div>
            </dl>

            {detail.submissions.length > 0 ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-medium text-ink">Submission history</p>
                <ul className="mt-2 flex flex-col gap-2 text-xs text-gray-ink">
                  {detail.submissions.map(submission => (
                    <li key={submission.id}>
                      {formatPaymentDate(submission.created_at)} ·{' '}
                      {paymentMethodLabel(submission.payment_method)} · Ref{' '}
                      {submission.reference_number} ·{' '}
                      <span className="capitalize">{submission.status}</span>
                      {submission.rejection_reason ? ` (${submission.rejection_reason})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          {!isChargeOpen(detail) ? (
            <Card>
              <p className="font-semibold text-ink">Nothing left to pay</p>
              <p className="mt-1 text-sm text-gray-ink">
                This charge is {paymentStatusMeta(detail).label.toLowerCase()}.
              </p>
            </Card>
          ) : latestSubmission(detail)?.status === 'pending' ? (
            <Card>
              <p className="font-semibold text-ink">Awaiting verification</p>
              <p className="mt-1 text-sm text-gray-ink">
                You submitted {formatPeso(detail.total_due)} on{' '}
                {formatPaymentDate(latestSubmission(detail)?.created_at)}. Your landlord will
                confirm it shortly.
              </p>
            </Card>
          ) : (
            <Card>
              {error ? (
                <div className="mb-4">
                  <ErrorState message={error} />
                </div>
              ) : null}
              <form
                className="flex flex-col gap-4"
                onSubmit={event => {
                  event.preventDefault();
                  setError(null);
                  submit.mutate();
                }}
              >
                <Field label="Payment method" htmlFor="payment_method">
                  <SelectInput
                    id="payment_method"
                    value={method}
                    onChange={event => setMethod(event.target.value)}
                  >
                    {/* A boarder claim has no place to name a custom method, so
                        "Other" is the landlord's recording option only (D12). */}
                    {PAYMENT_METHODS.filter(option => option.value !== 'other').map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field label="Reference number" htmlFor="reference_number" error={null}>
                  <TextInput
                    id="reference_number"
                    required
                    value={reference}
                    onChange={event => setReference(event.target.value)}
                    placeholder="GCash / bank reference, or CASH"
                  />
                </Field>

                <Field label="Receipt (optional)" htmlFor="receipt">
                  <input
                    id="receipt"
                    type="file"
                    accept="image/*"
                    onChange={event => setReceipt(event.target.files?.[0] ?? null)}
                    className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-base text-ink"
                  />
                </Field>

                <Field label="Notes (optional)" htmlFor="notes">
                  <TextArea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={event => setNotes(event.target.value)}
                    placeholder="Anything your landlord should know."
                  />
                </Field>

                <Button type="submit" disabled={submit.isPending}>
                  {submit.isPending ? 'Submitting…' : `Submit ${formatPeso(detail.total_due)}`}
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
