import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button, buttonClasses } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { getBoarderPayments } from '../../../lib/api/payments';
import { useAuth } from '../../../lib/auth-context';
import {
  PAYMENTS_ERROR_HINT,
  chargeTypeLabel,
  formatPaymentDate,
  formatPeso,
  groupChargesByMonth,
  isChargeOpen,
  latestSubmission,
  paymentMethodLabel,
  paymentStatusMeta,
} from '../../../lib/payments';
import type { PaymentCharge } from '../../../lib/types';

// The shell (Protected + RoleShell + RequireTenancy) lives in
// `boarder/payments.tsx`; a leaf that renders its own double-nests the chrome
// (spec `payments-page-regressions`).
export const Route = createFileRoute('/boarder/payments/')({
  component: BoarderPaymentsPage,
});

function SummaryTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <p className="text-sm text-gray-ink">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{value}</p>
      {sub ? <p className="mt-1 text-xs text-gray-ink">{sub}</p> : null}
    </Card>
  );
}

function ChargeCard({ charge }: { charge: PaymentCharge }) {
  const meta = paymentStatusMeta(charge);
  const submission = latestSubmission(charge);
  const open = isChargeOpen(charge);
  const pendingReview = submission?.status === 'pending' && open;
  const rejected = submission?.status === 'rejected';

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0">
      <div className="min-w-[12rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">
            {charge.description || chargeTypeLabel(charge.charge_type)}
          </p>
          <StatusBadge status={meta.status} label={meta.label} />
        </div>
        <p className="mt-1 text-sm text-gray-ink">
          Due {formatPaymentDate(charge.due_date)}
          {charge.room_title ? ` · ${charge.room_title}` : ''}
          {charge.property_title ? ` · ${charge.property_title}` : ''}
        </p>
        {charge.stored_status === 'paid' ? (
          <p className="mt-1 text-xs text-success-ink">
            Paid {formatPaymentDate(charge.paid_date)} via{' '}
            {paymentMethodLabel(charge.payment_method)}
            {charge.reference_number ? ` · Ref ${charge.reference_number}` : ''}
          </p>
        ) : null}
        {pendingReview ? (
          <p className="mt-1 text-xs text-info-ink">
            Submitted {formatPaymentDate(submission?.created_at)} · waiting for your landlord to
            verify.
          </p>
        ) : null}
        {rejected ? (
          <p className="mt-1 text-xs text-error-ink">
            Rejected: {submission?.rejection_reason || 'no reason given'}. You can submit again.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col items-end gap-2">
        <p className="font-semibold text-ink">{formatPeso(charge.total_due)}</p>
        {charge.late_fee > 0 ? (
          <p className="text-xs text-warning-ink">
            Includes {formatPeso(charge.late_fee)} late fee
          </p>
        ) : null}
        {open && !pendingReview ? (
          <Link
            to="/boarder/payments/pay"
            search={{ chargeId: charge.id }}
            className={buttonClasses({ size: 'sm' })}
          >
            Submit payment
          </Link>
        ) : null}
        {open && pendingReview ? (
          <Link
            to="/boarder/payments/pay"
            search={{ chargeId: charge.id }}
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            View submission
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function BoarderPaymentsPage() {
  const { token } = useAuth();

  const ledger = useQuery({
    queryKey: ['boarder-payments'],
    queryFn: () => getBoarderPayments(token!),
    enabled: Boolean(token),
    refetchOnWindowFocus: true,
  });

  const charges = ledger.data?.data.charges ?? [];
  const summary = ledger.data?.data.summary;
  const groups = groupChargesByMonth(charges);

  return (
    <>
      <PageHeader title="Payments" icon="payment" />

      {ledger.isLoading ? (
        <Spinner />
      ) : ledger.error ? (
        <ErrorState
          message={ledger.error.message}
          hint={PAYMENTS_ERROR_HINT}
          action={
            <Button variant="outline" onClick={() => void ledger.refetch()}>
              Try again
            </Button>
          }
        />
      ) : charges.length === 0 ? (
        <EmptyState
          icon="payment"
          title="No charges yet"
          description="Your rent, deposit and advance charges appear here once your booking is confirmed."
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryTile
              label="Balance due"
              value={formatPeso(summary?.total_due ?? 0)}
              sub={`${summary?.pending_count ?? 0} unpaid charge${
                (summary?.pending_count ?? 0) === 1 ? '' : 's'
              }`}
            />
            <SummaryTile
              label="Next due"
              value={
                summary?.next_due_date ? formatPaymentDate(summary.next_due_date) : 'Nothing due'
              }
              sub={
                summary?.next_due_amount !== null && summary?.next_due_amount !== undefined
                  ? formatPeso(summary.next_due_amount)
                  : undefined
              }
            />
            <SummaryTile
              label="Overdue"
              value={String(summary?.overdue_count ?? 0)}
              sub={
                (summary?.awaiting_verification_count ?? 0) > 0
                  ? `${summary?.awaiting_verification_count} awaiting verification`
                  : formatPeso(summary?.overdue_total ?? 0)
              }
            />
          </div>

          {groups.map(group => (
            <Card key={group.month} padding="p-0">
              <div className="border-b border-border px-5 py-3">
                <h2 className="font-semibold text-ink">{group.label}</h2>
              </div>
              {group.charges.map(charge => (
                <ChargeCard key={charge.id} charge={charge} />
              ))}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
