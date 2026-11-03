import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import { RecordPaymentModal } from '../../../components/payments/RecordPaymentModal';
import { Button, buttonClasses } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { ToastStack, useToasts } from '../../../components/ui/Toast';
import { getPaymentTracker } from '../../../lib/api/payments';
import { useAuth } from '../../../lib/auth-context';

// The shell (Protected + RoleShell) lives in `landlord/payments.tsx`.
export const Route = createFileRoute('/landlord/payments/record')({
  component: LandlordRecordPaymentPage,
});

/**
 * The deep-link entry point for recording a payment (spec `payments-tracker-redesign`
 * §7.2). The tracker's row action opens the same `RecordPaymentModal`; this page
 * exists so existing links to `/landlord/payments/record` keep working.
 */
function LandlordRecordPaymentPage() {
  const { token } = useAuth();
  const { toasts, push, dismiss } = useToasts();
  const [open, setOpen] = useState(true);

  const tracker = useQuery({
    queryKey: ['payment-tracker', 'record-entry'],
    queryFn: () => getPaymentTracker(token!, {}),
    enabled: Boolean(token),
  });

  const rows = tracker.data?.data.rows ?? [];

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        title="Record a payment"
        icon="payment"
        actions={
          <Link to="/landlord/payments" className={buttonClasses({ variant: 'outline' })}>
            Back to payments
          </Link>
        }
      />

      {tracker.isLoading ? <Spinner /> : null}

      <Card>
        <h2 className="font-semibold text-ink">Payments are recorded in full</h2>
        <p className="mt-1 text-sm text-gray-ink">
          Pick a boarder, choose which of their open charges were paid, and attach a receipt unless
          the payment was cash. The tenancy&apos;s next due date moves to one month after the
          payment date — you can adjust it before saving.
        </p>
        <div className="mt-4">
          <Button onClick={() => setOpen(true)}>Record a payment</Button>
        </div>
      </Card>

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
          void tracker.refetch();
        }}
        onError={message => push({ tone: 'error', message })}
      />
    </>
  );
}
