import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Timeline } from '../../../components/boarder/Timeline';
import { Button, buttonClasses } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Field, TextArea, TextInput } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
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
import type { PaymentCharge } from '../../../lib/types';

export const Route = createFileRoute('/boarder/payments/pay')({
  validateSearch: (search: Record<string, unknown>): { chargeId?: number } => {
    const parsed = Number.parseInt(String(search.chargeId ?? ''), 10);

    return Number.isFinite(parsed) && parsed > 0 ? { chargeId: parsed } : {};
  },
  // The shell lives in `boarder/payments.tsx` (spec `payments-page-regressions`).
  component: SubmitPaymentPage,
});

/** A boarder claim has no place to name a custom method, so "Other" is the landlord's only (D12). */
const BOARDER_METHODS = PAYMENT_METHODS.filter(option => option.value !== 'other');

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
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
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
    <section aria-labelledby="choose-charge" className="max-w-3xl">
      <h2
        id="choose-charge"
        className="mb-4 font-display text-[1.375rem] font-medium tracking-[-0.015em] text-ink"
      >
        Which charge are you paying?
      </h2>
      <Card padding="p-0">
        <ul className="divide-y divide-border/80">
          {openCharges.map(charge => {
            const meta = paymentStatusMeta(charge);
            return (
              <li
                key={charge.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">
                      {charge.description || chargeTypeLabel(charge.charge_type)}
                    </p>
                    <StatusBadge status={meta.status} label={meta.label} />
                  </div>
                  <p className="tabular mt-0.5 text-sm text-gray-ink">
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
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}

function ChargeSummary({ detail }: { detail: PaymentCharge }) {
  const meta = paymentStatusMeta(detail);

  return (
    <Card padding="p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kicker">You&apos;re paying</p>
          <h2 className="mt-0.5 font-display text-xl font-medium tracking-[-0.01em] text-ink">
            {detail.description || chargeTypeLabel(detail.charge_type)}
          </h2>
          <p className="mt-1 text-sm text-gray-ink">
            {detail.property_title ?? ''}
            {detail.room_title ? ` · ${detail.room_title}` : ''}
          </p>
        </div>
        <StatusBadge status={meta.status} label={meta.label} />
      </div>

      <p className="tabular mt-5 font-display text-[2.5rem] font-medium leading-none tracking-[-0.03em] text-ink">
        {formatPeso(detail.total_due)}
      </p>

      <dl className="tabular mt-5 flex flex-col divide-y divide-border/80 text-sm">
        <div className="flex justify-between py-2.5">
          <dt className="text-gray-ink">Amount</dt>
          <dd className="font-semibold text-ink">{formatPeso(detail.amount)}</dd>
        </div>
        {detail.late_fee > 0 ? (
          <div className="flex justify-between py-2.5">
            <dt className="text-gray-ink">Late fee</dt>
            <dd className="font-semibold text-warning-ink">{formatPeso(detail.late_fee)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between py-2.5">
          <dt className="text-gray-ink">Total</dt>
          <dd className="font-semibold text-ink">{formatPeso(detail.total_due)}</dd>
        </div>
        <div className="flex justify-between py-2.5">
          <dt className="text-gray-ink">Due</dt>
          <dd className="text-ink">{formatPaymentDate(detail.due_date)}</dd>
        </div>
      </dl>

      {detail.submissions.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-ink">Submission history</h3>
          <ul className="mt-3 flex flex-col gap-3 text-sm">
            {detail.submissions.map(submission => (
              <li key={submission.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-gray-ink">
                  <p className="text-ink">
                    {formatPaymentDate(submission.created_at)} ·{' '}
                    {paymentMethodLabel(submission.payment_method)}
                  </p>
                  <p className="truncate text-xs">
                    Ref {submission.reference_number}
                    {submission.rejection_reason ? ` · ${submission.rejection_reason}` : ''}
                  </p>
                </div>
                <StatusBadge
                  status={
                    submission.status === 'verified'
                      ? 'verified'
                      : submission.status === 'rejected'
                      ? 'rejected'
                      : 'awaiting_verification'
                  }
                  label={
                    submission.status === 'pending'
                      ? 'Awaiting'
                      : submission.status === 'verified'
                      ? 'Verified'
                      : submission.status
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

/** One numbered block of the pay form. */
function FormStep({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-border/80 pt-6 first:border-t-0 first:pt-0">
    <fieldset>
      <legend className="w-full">
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint text-xs font-bold text-primary-dark"
          >
            {number}
          </span>
          <span className="font-display text-lg font-medium tracking-[-0.01em] text-ink">
            <span className="sr-only">Step {number}: </span>
            {title}
          </span>
        </span>
      </legend>
      {description ? <p className="mt-1.5 pl-10 text-sm text-gray-ink">{description}</p> : null}
      <div className="mt-4 flex flex-col gap-4 sm:pl-10">{children}</div>
    </fieldset>
    </div>
  );
}

function ReceiptPicker({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputId = useId();

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (file) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-border-strong bg-surface p-3">
        {preview ? (
          <img
            src={preview}
            alt="Selected receipt"
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
          <p className="text-xs text-gray-ink">{Math.max(1, Math.round(file.size / 1024))} KB</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-cream/60 px-4 py-6 text-center transition-colors hover:border-primary/60 hover:bg-mint/40 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint text-primary">
          <Icon name="photo" size={20} />
        </span>
        <span className="text-sm font-semibold text-ink">Add a photo of your receipt</span>
        <span className="text-xs text-gray-ink">
          A screenshot of the GCash or bank confirmation works. Optional, but it speeds things up.
        </span>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          aria-label="Receipt (optional)"
          onChange={event => onChange(event.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>
    </div>
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
        subtitle="Tell your landlord how you paid. They'll verify it and mark the charge as paid."
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
        <div aria-busy="true" className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
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
        <EmptyState
          icon="payment"
          title="Charge not found"
          description="It may have been removed or settled. Your ledger has the latest."
          action={
            <Link to="/boarder/payments" className={buttonClasses({ variant: 'outline' })}>
              Back to payments
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="lg:sticky lg:top-24">
            <ChargeSummary detail={detail} />
          </div>

          {!isChargeOpen(detail) ? (
            <Card padding="p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-tint text-success-ink">
                  <Icon name="check" size={20} />
                </span>
                <div>
                  <p className="font-display text-xl font-medium text-ink">Nothing left to pay</p>
                  <p className="mt-1 text-sm text-gray-ink">
                    This charge is {paymentStatusMeta(detail).label.toLowerCase()}.
                  </p>
                </div>
              </div>
            </Card>
          ) : latestSubmission(detail)?.status === 'pending' ? (
            <Card padding="p-6">
              <p className="kicker">Payment sent</p>
              <p className="mt-0.5 font-display text-[1.5rem] font-medium tracking-[-0.015em] text-ink">
                Awaiting verification
              </p>
              <p className="mt-1 text-sm text-gray-ink">
                You submitted {formatPeso(detail.total_due)} on{' '}
                {formatPaymentDate(latestSubmission(detail)?.created_at)}. Your landlord will
                confirm it shortly.
              </p>
              <div className="mt-6">
                <Timeline
                  label="Payment progress"
                  steps={[
                    {
                      key: 'sent',
                      title: 'Proof sent',
                      description: `${paymentMethodLabel(
                        latestSubmission(detail)?.payment_method
                      )} · Ref ${latestSubmission(detail)?.reference_number ?? '—'}`,
                      state: 'done',
                    },
                    {
                      key: 'verify',
                      title: 'Landlord verifies',
                      description: 'They check the amount and reference against their records.',
                      state: 'current',
                    },
                    {
                      key: 'paid',
                      title: 'Marked as paid',
                      description: 'The charge moves to Paid in your ledger.',
                      state: 'upcoming',
                    },
                  ]}
                />
              </div>
            </Card>
          ) : (
            <Card padding="p-6">
              {latestSubmission(detail)?.status === 'rejected' ? (
                <div className="mb-6 rounded-xl border border-error-border bg-error-tint px-4 py-3 text-sm text-error-ink">
                  <p className="font-semibold">Your last submission was rejected.</p>
                  <p className="mt-0.5">
                    {latestSubmission(detail)?.rejection_reason || 'No reason was given.'} Check
                    the details and send it again.
                  </p>
                </div>
              ) : null}
              {error ? (
                <div className="mb-6">
                  <ErrorState message={error} />
                </div>
              ) : null}
              <form
                className="flex flex-col gap-6"
                onSubmit={event => {
                  event.preventDefault();
                  setError(null);
                  submit.mutate();
                }}
              >
                <FormStep number={1} title="How did you pay?">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {BOARDER_METHODS.map(option => {
                      const checked = method === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors focus-within:ring-4 focus-within:ring-primary/15 ${
                            checked
                              ? 'border-primary bg-mint text-primary-dark'
                              : 'border-border-strong bg-surface text-ink hover:border-primary/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment_method"
                            value={option.value}
                            checked={checked}
                            onChange={() => setMethod(option.value)}
                            className="h-4 w-4 accent-primary"
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </FormStep>

                <FormStep
                  number={2}
                  title="Payment details"
                  description="The reference lets your landlord match your payment quickly."
                >
                  <Field label="Reference number" htmlFor="reference_number" error={null}>
                    <TextInput
                      id="reference_number"
                      required
                      value={reference}
                      onChange={event => setReference(event.target.value)}
                      placeholder={method === 'cash' ? 'CASH' : 'GCash / bank reference'}
                    />
                  </Field>
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-ink">Receipt (optional)</p>
                    <ReceiptPicker file={receipt} onChange={setReceipt} />
                  </div>
                  <Field label="Notes (optional)" htmlFor="notes">
                    <TextArea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={event => setNotes(event.target.value)}
                      placeholder="Anything your landlord should know."
                    />
                  </Field>
                </FormStep>

                <FormStep number={3} title="Review and send">
                  <dl className="tabular flex flex-col divide-y divide-border/80 rounded-xl bg-cream px-4 text-sm">
                    <div className="flex justify-between gap-3 py-2.5">
                      <dt className="text-gray-ink">Amount</dt>
                      <dd className="font-semibold text-ink">{formatPeso(detail.total_due)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 py-2.5">
                      <dt className="text-gray-ink">Method</dt>
                      <dd className="text-ink">{paymentMethodLabel(method)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 py-2.5">
                      <dt className="text-gray-ink">Reference</dt>
                      <dd className="truncate text-ink">{reference.trim() || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3 py-2.5">
                      <dt className="text-gray-ink">Receipt</dt>
                      <dd className="text-ink">{receipt ? 'Attached' : 'None'}</dd>
                    </div>
                  </dl>
                  <Button type="submit" size="lg" disabled={submit.isPending}>
                    {submit.isPending ? 'Submitting…' : `Submit ${formatPeso(detail.total_due)}`}
                  </Button>
                  <p className="text-xs text-gray-ink">
                    Submitting doesn&apos;t move money. It tells your landlord you&apos;ve paid so
                    they can verify it.
                  </p>
                </FormStep>
              </form>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
