import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button, buttonClasses } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Icon } from '../../../components/ui/Icon';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
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
import type { PaymentCharge, PaymentLedgerSummary } from '../../../lib/types';

// The shell (Protected + RoleShell + RequireTenancy) lives in
// `boarder/payments.tsx`; a leaf that renders its own double-nests the chrome
// (spec `payments-page-regressions`).
export const Route = createFileRoute('/boarder/payments/')({
  component: BoarderPaymentsPage,
});

/** The open charge to put in front of the boarder: earliest due that still needs them. */
function nextCharge(charges: PaymentCharge[]): PaymentCharge | null {
  const open = charges
    .filter(isChargeOpen)
    .sort((left, right) => (left.due_date < right.due_date ? -1 : 1));

  return open.find(charge => latestSubmission(charge)?.status !== 'pending') ?? open[0] ?? null;
}

function NextDueCard({
  charge,
  summary,
}: {
  charge: PaymentCharge | null;
  summary: PaymentLedgerSummary | undefined;
}) {
  if (!charge) {
    return (
      <Card padding="p-6" className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-tint text-success-ink">
          <Icon name="check" size={22} />
        </span>
        <div>
          <p className="kicker">Next amount due</p>
          <p className="mt-1 font-display text-[1.625rem] font-medium tracking-[-0.015em] text-ink">
            Nothing due
          </p>
          <p className="mt-1 text-sm text-gray-ink">
            Every charge on your ledger is settled. New rent charges appear here when they are
            issued.
          </p>
        </div>
      </Card>
    );
  }

  const meta = paymentStatusMeta(charge);
  const submission = latestSubmission(charge);
  const pendingReview = submission?.status === 'pending';

  return (
    <Card padding="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="kicker">{pendingReview ? 'Waiting on your landlord' : 'Next amount due'}</p>
        <StatusBadge status={meta.status} label={meta.label} />
      </div>
      <p className="tabular mt-3 font-display text-[2.5rem] font-medium leading-none tracking-[-0.03em] text-ink sm:text-[3rem]">
        {formatPeso(charge.total_due)}
      </p>
      <p className="mt-3 text-[0.9375rem] text-gray-ink">
        <span className="font-semibold text-ink">
          {charge.description || chargeTypeLabel(charge.charge_type)}
        </span>{' '}
        · due {formatPaymentDate(charge.due_date)}
        {charge.room_title ? ` · ${charge.room_title}` : ''}
      </p>
      {charge.late_fee > 0 ? (
        <p className="mt-1 text-sm text-warning-ink">
          Includes {formatPeso(charge.late_fee)} late fee
        </p>
      ) : null}
      {pendingReview ? (
        <p className="mt-1 text-sm text-gray-ink">
          You sent proof on {formatPaymentDate(submission?.created_at)}. Your landlord will verify
          it.
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/boarder/payments/pay"
          search={{ chargeId: charge.id }}
          className={buttonClasses({ variant: pendingReview ? 'outline' : 'primary', size: 'lg' })}
        >
          {pendingReview ? 'View submission' : 'Pay now'}
        </Link>
      </div>
      {summary && summary.pending_count > 1 ? (
        <p className="mt-5 border-t border-border/80 pt-4 text-sm text-gray-ink">
          {summary.pending_count} unpaid charges · {formatPeso(summary.total_due)} balance in total
        </p>
      ) : null}
    </Card>
  );
}

function LedgerFacts({ summary }: { summary: PaymentLedgerSummary | undefined }) {
  const facts = [
    {
      label: 'Balance due',
      value: formatPeso(summary?.total_due ?? 0),
      sub: `${summary?.pending_count ?? 0} unpaid charge${
        (summary?.pending_count ?? 0) === 1 ? '' : 's'
      }`,
    },
    {
      label: 'Overdue',
      value: String(summary?.overdue_count ?? 0),
      sub:
        (summary?.overdue_count ?? 0) > 0
          ? formatPeso(summary?.overdue_total ?? 0)
          : 'Nothing past due',
    },
    {
      label: 'Awaiting verification',
      value: String(summary?.awaiting_verification_count ?? 0),
      sub: 'Proof sent to your landlord',
    },
  ];

  return (
    <Card padding="p-6">
      <h2 className="font-display text-xl font-medium tracking-[-0.01em] text-ink">At a glance</h2>
      <dl className="mt-4 flex flex-col divide-y divide-border/80">
        {facts.map(fact => (
          <div key={fact.label} className="flex items-baseline justify-between gap-4 py-3">
            <dt>
              <span className="block text-sm text-ink">{fact.label}</span>
              <span className="block text-xs text-muted">{fact.sub}</span>
            </dt>
            <dd className="tabular text-lg font-semibold text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ChargeRow({ charge }: { charge: PaymentCharge }) {
  const meta = paymentStatusMeta(charge);
  const submission = latestSubmission(charge);
  const open = isChargeOpen(charge);
  const pendingReview = submission?.status === 'pending' && open;
  const rejected = submission?.status === 'rejected';

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
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
          <p className="mt-1 text-sm text-success-ink">
            Paid {formatPaymentDate(charge.paid_date)} via{' '}
            {paymentMethodLabel(charge.payment_method)}
            {charge.reference_number ? ` · Ref ${charge.reference_number}` : ''}
          </p>
        ) : null}
        {pendingReview ? (
          <p className="mt-1 text-sm text-info-ink">
            Submitted {formatPaymentDate(submission?.created_at)} · waiting for your landlord to
            verify.
          </p>
        ) : null}
        {rejected ? (
          <p className="mt-1 text-sm text-error-ink">
            Rejected: {submission?.rejection_reason || 'no reason given'}. You can submit again.
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:gap-2">
        <div className="sm:text-right">
          <p className="tabular font-semibold text-ink">{formatPeso(charge.total_due)}</p>
          {charge.late_fee > 0 ? (
            <p className="text-xs text-warning-ink">
              Includes {formatPeso(charge.late_fee)} late fee
            </p>
          ) : null}
        </div>
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
    </li>
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
      <PageHeader
        title="Payments"
        subtitle="Your rent and other charges, what's due next, and every payment you've made."
        icon="payment"
      />

      {ledger.isLoading ? (
        <div aria-busy="true" className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Skeleton className="h-52 w-full rounded-2xl" />
            <Skeleton className="h-52 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
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
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <NextDueCard charge={nextCharge(charges)} summary={summary} />
            <LedgerFacts summary={summary} />
          </div>

          <section aria-labelledby="ledger-title" className="mt-4">
            <h2
              id="ledger-title"
              className="mb-4 font-display text-[1.375rem] font-medium tracking-[-0.015em] text-ink"
            >
              Ledger
            </h2>
            <div className="flex flex-col gap-6">
              {groups.map(group => (
                <Card key={group.month} padding="p-0">
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <h3 className="font-semibold text-ink">{group.label}</h3>
                    <span className="text-xs text-muted">
                      {group.charges.length} charge{group.charges.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ul className="divide-y divide-border/80">
                    {group.charges.map(charge => (
                      <ChargeRow key={charge.id} charge={charge} />
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
