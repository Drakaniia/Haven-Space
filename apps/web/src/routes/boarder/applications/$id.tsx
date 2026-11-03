import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  applicationTimeline,
  formatApplicationDate,
} from '../../../components/boarder/applicationStatus';
import { DetailList } from '../../../components/boarder/DetailList';
import { Timeline } from '../../../components/boarder/Timeline';
import { MessageButton } from '../../../components/messages/MessageButton';
import { Button, buttonClasses } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Field, SelectInput } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ApiRequestError } from '../../../lib/api/http';
import { confirmApplication, deleteApplication, getApplication } from '../../../lib/api/boarder';
import { useAuth } from '../../../lib/auth-context';
import { formatPeso, paymentMethodLabel } from '../../../lib/payments';
import { BROWSE_LISTINGS_PATH } from '../../../lib/routes';
import { BOARDER_STATUS_KEY } from '../../../lib/use-boarder-nav';
import { setPendingToast } from '../../../lib/toast';
import type { ApplicationSummary } from '../../../lib/types';

export const Route = createFileRoute('/boarder/applications/$id')({
  component: ApplicationDetailPage,
});

function BackLink() {
  return (
    <Link
      to="/boarder/applications"
      className="mb-5 inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-primary hover:text-primary-hover"
    >
      <Icon name="chevronLeft" size={16} />
      All applications
    </Link>
  );
}

function ApplicationDetailPage() {
  const { id } = Route.useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [error, setError] = useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

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
    onError: err => {
      setConfirmWithdraw(false);
      setError(err instanceof ApiRequestError ? err.message : 'Failed to delete application.');
    },
  });

  if (application.isLoading) {
    return (
      <div aria-busy="true">
        <BackLink />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/3" />
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }
  if (application.error) {
    return (
      <div>
        <BackLink />
        <ErrorState message={application.error.message} />
      </div>
    );
  }
  if (!application.data?.data) {
    return (
      <div>
        <BackLink />
        <ErrorState message="Application not found" />
      </div>
    );
  }

  const app = application.data.data;
  const isAccepted = app.status === 'accepted';
  const isWithdrawable = app.status === 'pending' || app.status === 'accepted';

  return (
    <div>
      <BackLink />

      <header className="rise-in mb-8">
        <p className="kicker">Application #{app.id}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-[1.875rem] font-medium leading-[1.1] tracking-[-0.02em] text-ink sm:text-[2.125rem]">
            {app.property_title ?? `Application #${app.id}`}
          </h1>
          <StatusBadge status={String(app.status)} />
        </div>
        {app.property_address ? (
          <p className="mt-2 flex items-start gap-1.5 text-[0.9375rem] text-gray-ink">
            <Icon name="location" size={16} className="mt-1 text-muted" />
            {app.property_address}
          </p>
        ) : null}
      </header>

      {error ? (
        <div className="mb-6">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <NextActionCard
            app={app}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            confirming={confirm.isPending}
            onConfirm={() => {
              setError(null);
              confirm.mutate();
            }}
          />

          <Card padding="p-6">
            <h2 className="font-display text-xl font-medium tracking-[-0.01em] text-ink">
              The room
            </h2>
            <DetailList
              className="mt-4"
              items={[
                { label: 'Room', value: app.room_title ?? '—' },
                {
                  label: 'Monthly rent',
                  value: formatPeso(app.room_price ?? 0),
                },
                { label: 'Applied', value: formatApplicationDate(app.created_at) },
                {
                  label: 'Payment method',
                  value: app.payment_method ? paymentMethodLabel(app.payment_method) : 'Not chosen yet',
                },
              ]}
            />
            {app.message ? (
              <div className="mt-6">
                <p className="text-[0.8125rem] text-gray-ink">Your note to the landlord</p>
                <blockquote className="mt-2 rounded-xl border-l-2 border-primary/50 bg-cream px-4 py-3 text-sm leading-relaxed text-ink">
                  {app.message}
                </blockquote>
              </div>
            ) : null}
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card padding="p-6">
            <h2 className="mb-5 font-display text-xl font-medium tracking-[-0.01em] text-ink">
              Progress
            </h2>
            <Timeline label="Application progress" steps={applicationTimeline(app)} />
          </Card>

          <Card padding="p-6">
            <h2 className="font-semibold text-ink">Questions about this room?</h2>
            <p className="mt-1 text-sm text-gray-ink">
              Talk to the landlord directly. Your conversation stays in your inbox.
            </p>
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
            {isWithdrawable ? (
              <div className="mt-5 border-t border-border/80 pt-4">
                <Button
                  variant="dangerGhost"
                  size="sm"
                  onClick={() => setConfirmWithdraw(true)}
                  disabled={remove.isPending}
                >
                  {remove.isPending ? 'Withdrawing…' : 'Withdraw application'}
                </Button>
              </div>
            ) : null}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmWithdraw}
        title="Withdraw this application?"
        message={`${app.property_title ?? 'The landlord'} will no longer see your application${
          isAccepted ? ', and the room offer will be released' : ''
        }. You can apply again later if the room is still open.`}
        confirmLabel="Withdraw"
        cancelLabel="Keep it"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </div>
  );
}

function NextActionCard({
  app,
  paymentMethod,
  onPaymentMethodChange,
  confirming,
  onConfirm,
}: {
  app: ApplicationSummary;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  confirming: boolean;
  onConfirm: () => void;
}) {
  if (app.status === 'accepted') {
    return (
      <section
        aria-labelledby="next-action"
        className="rounded-2xl border border-primary/40 bg-mint/70 p-6"
      >
        <p className="kicker">Next step</p>
        <h2
          id="next-action"
          className="mt-0.5 font-display text-[1.5rem] font-medium leading-tight tracking-[-0.015em] text-ink"
        >
          Confirm your booking
        </h2>
        <p className="mt-1 max-w-lg text-sm leading-relaxed text-gray-ink">
          The landlord accepted your application. Choose how you&apos;ll pay to confirm your spot
          in this room.
        </p>
        <form
          className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end"
          onSubmit={event => {
            event.preventDefault();
            onConfirm();
          }}
        >
          <div className="sm:w-64">
            <Field label="Payment method" htmlFor="paymentMethod">
              <SelectInput
                id="paymentMethod"
                value={paymentMethod}
                onChange={e => onPaymentMethodChange(e.target.value)}
              >
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
              </SelectInput>
            </Field>
          </div>
          <Button type="submit" size="lg" disabled={confirming}>
            {confirming ? 'Confirming…' : 'Confirm booking'}
          </Button>
        </form>
      </section>
    );
  }

  if (app.status === 'pending') {
    return (
      <Card padding="p-6">
        <p className="kicker">Next step</p>
        <h2 className="mt-0.5 font-display text-[1.5rem] font-medium leading-tight tracking-[-0.015em] text-ink">
          Waiting on the landlord
        </h2>
        <p className="mt-1 max-w-lg text-sm leading-relaxed text-gray-ink">
          Nothing to do right now. You&apos;ll be notified when the landlord accepts or declines.
          If the room has details you&apos;d like to check, send them a message.
        </p>
      </Card>
    );
  }

  if (app.status === 'confirmed') {
    return (
      <Card padding="p-6">
        <p className="kicker">You&apos;re booked</p>
        <h2 className="mt-0.5 font-display text-[1.5rem] font-medium leading-tight tracking-[-0.015em] text-ink">
          Your booking is confirmed
        </h2>
        <p className="mt-1 max-w-lg text-sm leading-relaxed text-gray-ink">
          Your rent, house rules and announcements now live in your dashboard. To end this
          tenancy, use{' '}
          <Link to="/boarder/tenancy" className="font-semibold text-primary hover:underline">
            My Tenancy
          </Link>{' '}
          to request to leave.
        </p>
        <Link to="/boarder" className={buttonClasses({ className: 'mt-5' })}>
          Go to dashboard
        </Link>
      </Card>
    );
  }

  return (
    <Card padding="p-6">
      <p className="kicker">Next step</p>
      <h2 className="mt-0.5 font-display text-[1.5rem] font-medium leading-tight tracking-[-0.015em] text-ink">
        {app.status === 'rejected' ? 'Keep looking' : 'This application is closed'}
      </h2>
      <p className="mt-1 max-w-lg text-sm leading-relaxed text-gray-ink">
        {app.status === 'rejected'
          ? "This one didn't work out. There are other rooms that may suit you better."
          : 'Nothing more to do here. Browse rooms whenever you are ready to apply again.'}
      </p>
      <Link to={BROWSE_LISTINGS_PATH} className={buttonClasses({ className: 'mt-5' })}>
        Browse rooms
      </Link>
    </Card>
  );
}
