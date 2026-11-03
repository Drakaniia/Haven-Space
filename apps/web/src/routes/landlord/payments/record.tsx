import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import { RecordPaymentModal } from '../../../components/payments/RecordPaymentModal';
import { Button, buttonClasses } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Icon } from '../../../components/ui/Icon';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ToastStack, useToasts } from '../../../components/ui/Toast';
import { getPaymentTracker } from '../../../lib/api/payments';
import { useAuth } from '../../../lib/auth-context';

// The shell (Protected + RoleShell) lives in `landlord/payments.tsx`.
export const Route = createFileRoute('/landlord/payments/record')({
  component: LandlordRecordPaymentPage,
});

const STEPS = [
  {
    title: 'Pick the boarder',
    body: 'Every open charge for their tenancy is listed and ticked for you.',
  },
  {
    title: 'Untick what was not paid',
    body: 'Each ticked charge settles in full. Anything left unticked stays open.',
  },
  {
    title: 'Add the proof',
    body: 'Cash needs nothing more. GCash, bank transfers and other methods need a receipt.',
  },
];

/**
 * The deep-link entry point for recording a payment (spec `payments-tracker-redesign`
 * §7.2). The tracker's row action opens the same `RecordPaymentModal`; this page
 * exists so existing links to `/landlord/payments/record` keep working, and it
 * confirms what was saved once the modal closes.
 */
function LandlordRecordPaymentPage() {
  const { token } = useAuth();
  const { toasts, push, dismiss } = useToasts();
  const [open, setOpen] = useState(true);
  const [lastRecorded, setLastRecorded] = useState<string | null>(null);

  const tracker = useQuery({
    queryKey: ['payment-tracker', 'record-entry'],
    queryFn: () => getPaymentTracker(token!, {}),
    enabled: Boolean(token),
  });

  const rows = tracker.data?.data.rows ?? [];
  const noTenants = !tracker.isLoading && !tracker.error && rows.length === 0;

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        title="Record a payment"
        subtitle="Log rent you received outside the app — cash at the door, a bank deposit, an e-wallet transfer."
        actions={
          <Link to="/landlord/payments" className={buttonClasses({ variant: 'outline' })}>
            Back to payments
          </Link>
        }
      />

      {lastRecorded ? (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success-border bg-success-tint px-5 py-4 text-success-ink"
        >
          <p className="flex items-center gap-2.5 font-semibold">
            <Icon name="check" size={18} className="shrink-0" />
            {lastRecorded}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              Record another
            </Button>
            <Link
              to="/landlord/payments"
              className={buttonClasses({ variant: 'ghost', size: 'sm' })}
            >
              See the ledger
            </Link>
          </div>
        </div>
      ) : null}

      {tracker.isLoading ? (
        <Card>
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-3 h-4 w-full max-w-lg" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </Card>
      ) : noTenants ? (
        <EmptyState
          icon="users"
          title="No tenants to record a payment for"
          description="Payments are recorded against a confirmed tenancy. Approve an application or invite a boarder first."
          action={
            <Link to="/landlord/applications" className={buttonClasses({ variant: 'outline' })}>
              Review applications
            </Link>
          }
        />
      ) : (
        <Card padding="p-0" className="overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="px-5 py-5 sm:px-6">
              <h2 className="font-display text-xl font-medium tracking-[-0.015em] text-ink">
                Payments are recorded in full
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-gray-ink">
                The tenancy&apos;s next due date moves to one month after the payment date — you
                can adjust it before saving.
              </p>
            </div>
            <div className="px-5 pb-5 sm:px-6 md:pb-0">
              <Button onClick={() => setOpen(true)} disabled={rows.length === 0}>
                Record a payment
              </Button>
            </div>
          </div>
          <ol className="grid border-t border-border sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className={`px-5 py-4 sm:px-6 ${
                  index > 0 ? 'border-t border-border sm:border-l sm:border-t-0' : ''
                }`}
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-mint text-xs tabular text-primary-dark">
                    {index + 1}
                  </span>
                  {step.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-ink">{step.body}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <RecordPaymentModal
        token={token!}
        open={open && rows.length > 0}
        boarders={rows.map(row => ({
          application_id: row.application_id,
          boarder_name: row.boarder_name,
        }))}
        onClose={() => setOpen(false)}
        onRecorded={message => {
          push({ tone: 'success', message });
          setLastRecorded(message);
          void tracker.refetch();
        }}
        onError={message => push({ tone: 'error', message })}
      />
    </>
  );
}
