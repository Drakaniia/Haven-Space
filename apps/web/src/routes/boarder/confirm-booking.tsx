import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, SelectInput } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { ApiRequestError } from '../../lib/api/http';
import { confirmApplication, getAcceptedApplications } from '../../lib/api/boarder';
import { useAuth } from '../../lib/auth-context';
import { setPendingToast } from '../../lib/toast';
import { BOARDER_STATUS_KEY, useBoarderNav } from '../../lib/use-boarder-nav';

export const Route = createFileRoute('/boarder/confirm-booking')({
  component: () => (
    <Protected role="boarder">
      <ConfirmBookingPage />
    </Protected>
  ),
});

function ConfirmBookingPage() {
  const { token } = useAuth();
  const nav = useBoarderNav();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [error, setError] = useState<string | null>(null);

  const accepted = useQuery({
    queryKey: ['accepted'],
    queryFn: () => getAcceptedApplications(token!),
    enabled: Boolean(token),
  });

  const confirm = useMutation({
    mutationFn: (applicationId: number) => confirmApplication(token!, applicationId, paymentMethod),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ['accepted'] });
      void queryClient.invalidateQueries({ queryKey: ['tenancy'] });
      // Await the live-status refresh before navigating: /boarder/tenancy is
      // gated, and navigating on a stale 'accepted' value would flash the
      // "Not available yet" screen at a freshly-confirmed boarder (spec R15).
      await queryClient.invalidateQueries({ queryKey: [BOARDER_STATUS_KEY] });
      setPendingToast('success', 'Booking confirmed!');
      void navigate({ to: '/boarder/tenancy' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to confirm booking.'),
  });

  const acceptedList = accepted.data?.data ?? [];

  return (
    <RoleShell nav={nav}>
      <PageHeader title="Confirm your booking" />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      {accepted.isLoading ? (
        <Spinner />
      ) : acceptedList.length === 0 ? (
        <EmptyState
          title="No accepted applications"
          description="Once a landlord accepts your application, you can confirm your booking here."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {acceptedList.map(app => (
            <Card key={String(app.id ?? app.application_id)}>
              <h2 className="font-semibold">
                {String(app.property_name ?? app.title ?? 'Accepted application')}
              </h2>
              <p className="text-sm text-gray-ink">
                {String(app.room_number ?? app.room ?? '')} · ₱
                {Number(app.room_price ?? app.monthly_rent ?? app.price ?? 0).toLocaleString()}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <Field label="Payment method" htmlFor="paymentMethod">
                  <SelectInput
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                  >
                    <option value="gcash">GCash</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                  </SelectInput>
                </Field>
                <Button
                  onClick={() => confirm.mutate(Number(app.id ?? app.application_id))}
                  disabled={confirm.isPending}
                >
                  {confirm.isPending ? 'Confirming…' : 'Confirm Booking'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </RoleShell>
  );
}
