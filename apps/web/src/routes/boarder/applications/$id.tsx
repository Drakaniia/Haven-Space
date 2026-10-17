import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MessageButton } from '../../../components/messages/MessageButton';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Field, SelectInput } from '../../../components/ui/Field';
import { Spinner } from '../../../components/ui/Spinner';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ApiRequestError } from '../../../lib/api/http';
import { confirmApplication, deleteApplication, getApplication } from '../../../lib/api/boarder';
import { useAuth } from '../../../lib/auth-context';
import { BOARDER_STATUS_KEY } from '../../../lib/useBoarderNav';
import { setPendingToast } from '../../../lib/toast';

export const Route = createFileRoute('/boarder/applications/$id')({
  component: ApplicationDetailPage,
});

function ApplicationDetailPage() {
  const { id } = Route.useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [error, setError] = useState<string | null>(null);

  const application = useQuery({
    queryKey: ['application', Number(id)],
    queryFn: () => getApplication(token!, Number(id)),
    enabled: Boolean(token),
  });

  const confirm = useMutation({
    mutationFn: () => confirmApplication(token!, Number(id), paymentMethod),
    onSuccess: () => {
      // Confirming the booking flips boarder_status to 'confirmed' — refresh it
      // so the sidebar expands to the full nav immediately (spec R15).
      void queryClient.invalidateQueries({ queryKey: [BOARDER_STATUS_KEY] });
      setPendingToast('success', 'Booking confirmed!');
      void navigate({ to: '/boarder/confirm-booking' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to confirm booking.'),
  });

  const remove = useMutation({
    mutationFn: () => deleteApplication(token!, Number(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      void queryClient.invalidateQueries({ queryKey: [BOARDER_STATUS_KEY] });
      setPendingToast('success', 'Application withdrawn.');
      void navigate({ to: '/boarder/applications' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to delete application.'),
  });

  if (application.isLoading) return <Spinner />;
  if (application.error) return <ErrorState message={application.error.message} />;
  if (!application.data?.data) return <ErrorState message="Application not found" />;

  const app = application.data.data;
  const isAccepted = app.status === 'accepted';
  const isWithdrawable = app.status === 'pending' || app.status === 'accepted';

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/boarder/applications"
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        ← Back to applications
      </Link>

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <Card>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{app.property_title ?? `Application #${app.id}`}</h1>
          <StatusBadge status={String(app.status)} />
        </div>
        <p className="mt-1 text-gray-ink">
          Room {app.room_title ?? '—'} · ₱{(app.room_price ?? 0).toLocaleString()} / month
        </p>
        <p className="text-sm text-gray-ink">{app.property_address}</p>
        {app.message ? <p className="mt-3 rounded-md bg-cream p-3 text-sm">{app.message}</p> : null}
        {/* One thread per pair, whatever the application's status: this is the
            boarder's way to talk about it without e-mail (spec D17/R17). */}
        <div className="mt-4">
          <MessageButton
            role="boarder"
            counterpartId={app.landlord_id}
            propertyId={app.property_id}
            label="Message landlord"
          />
        </div>
      </Card>

      {isAccepted ? (
        <Card className="mt-4">
          <h2 className="font-semibold">Confirm your booking</h2>
          <p className="mt-1 text-sm text-gray-ink">
            Choose a payment method to confirm your spot in this room.
          </p>
          <div className="mt-3 flex flex-col gap-3">
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
            <Button onClick={() => confirm.mutate()} disabled={confirm.isPending}>
              {confirm.isPending ? 'Confirming…' : 'Confirm Booking'}
            </Button>
          </div>
        </Card>
      ) : null}

      {isWithdrawable ? (
        <div className="mt-6">
          <Button variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending
              ? 'Withdrawing…'
              : isAccepted
              ? 'Withdraw application'
              : 'Withdraw application'}
          </Button>
        </div>
      ) : app.status === 'confirmed' ? (
        <p className="mt-6 rounded-md bg-mint px-4 py-3 text-sm text-ink">
          Your booking is confirmed. To end this tenancy, use{' '}
          <Link to="/boarder/tenancy" className="font-semibold text-primary hover:underline">
            My Tenancy
          </Link>{' '}
          to request to leave.
        </p>
      ) : null}
    </div>
  );
}
