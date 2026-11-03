import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RequireTenancy } from '../../components/boarder/FeatureGate';
import { ToastStack, useToasts } from '../../components/ui/Toast';
import { ApiRequestError } from '../../lib/api/http';
import { getTenancy, leaveNow, leaveRequest } from '../../lib/api/boarder';
import { useAuth } from '../../lib/auth-context';
import { formatPaymentDate, manilaToday } from '../../lib/payments';
import { BOARDER_STATUS_KEY, useBoarderNav } from '../../lib/use-boarder-nav';

export const Route = createFileRoute('/boarder/tenancy')({
  component: () => (
    <Protected role="boarder">
      <TenancyPage />
    </Protected>
  ),
});

function TenancyPage() {
  const { token } = useAuth();
  const nav = useBoarderNav();
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [leaveNowOpen, setLeaveNowOpen] = useState(false);
  const [leaveNowError, setLeaveNowError] = useState<string | null>(null);
  const [leftProperty, setLeftProperty] = useState<string | null>(null);

  const tenancy = useQuery({
    queryKey: ['tenancy'],
    queryFn: () => getTenancy(token!),
    enabled: Boolean(token),
  });

  const data = tenancy.data?.data;
  const leaveStatus =
    typeof data?.leave_request_status === 'string' ? data.leave_request_status : 'none';
  // Approval is refused while anything is unsettled, so the form says so now
  // rather than letting the landlord reject it later (spec
  // `approve-leave-request` §4.7).
  const outstanding = Number(data?.outstanding_balance ?? 0);

  const leave = useMutation({
    mutationFn: () =>
      leaveRequest(token!, {
        reason: reason.trim(),
        leave_date: leaveDate,
        message: message.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tenancy'] });
      setLeaveOpen(false);
      setReason('');
      setLeaveDate('');
      setMessage('');
      push({ tone: 'success', message: 'Leave request submitted.' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to submit leave request.'),
  });

  const leaveNowMutation = useMutation({
    mutationFn: () => leaveNow(token!, Number(data?.application_id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tenancy'] });
      void queryClient.invalidateQueries({ queryKey: [BOARDER_STATUS_KEY] });
      setLeaveNowOpen(false);
      setLeaveNowError(null);
      setLeftProperty(String(data?.property_name ?? 'your property'));
      push({ tone: 'success', message: "You've moved out. Your tenancy has ended." });
    },
    onError: err =>
      setLeaveNowError(err instanceof ApiRequestError ? err.message : 'Failed to leave now.'),
  });

  function handleLeaveSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    leave.mutate();
  }

  function closeLeaveNow() {
    if (!leaveNowMutation.isPending) {
      setLeaveNowOpen(false);
      setLeaveNowError(null);
    }
  }

  const today = manilaToday();

  return (
    <RoleShell nav={nav}>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      {leftProperty !== null ? (
        <div className="max-w-2xl">
          <EmptyState
            title="No active tenancy"
            description={`You've moved out. Your tenancy at ${leftProperty} has ended.`}
          />
        </div>
      ) : (
        <RequireTenancy>
          {tenancy.isLoading ? (
            <Spinner />
          ) : !data ? (
            <EmptyState
              title="No active tenancy"
              description="Once your booking is confirmed, your tenancy details appear here."
            />
          ) : leaveStatus === 'pending' ? (
            <PendingLeaveState data={data} />
          ) : leaveStatus === 'approved' ? (
            <ApprovedLeaveState
              data={data}
              onLeaveNow={() => {
                setLeaveNowError(null);
                setLeaveNowOpen(true);
              }}
            />
          ) : (
            <div className="max-w-2xl">
              {error ? (
                <div className="mb-4">
                  <ErrorState message={error} />
                </div>
              ) : null}
              <Card>
                <div className="flex items-center gap-3">
                  <Icon name="document" size={28} className="shrink-0" />
                  <h1 className="text-xl font-bold">
                    {String(data.property_name ?? 'Your tenancy')}
                  </h1>
                </div>
                <p className="mt-1 text-gray-ink">
                  {String(data.address ?? '')}
                  {data.city ? `, ${String(data.city)}` : ''}
                  {data.province ? `, ${String(data.province)}` : ''}
                </p>
                <TenancyDetails data={data} />
                <div className="mt-4">
                  {/* `outline` variant, not a hand-rolled className: Tailwind resolves conflicting
                      classes by stylesheet order, so the default `primary` variant's `text-white` beat
                      this override's `text-primary` — white text on the white panel, legible only on
                      hover. Colour belongs to the variant. */}
                  <Button variant="outline" onClick={() => setLeaveOpen(true)}>
                    Request to leave
                  </Button>
                </div>
              </Card>
            </div>
          )}

          <Modal open={leaveOpen} title="Request to leave" onClose={() => setLeaveOpen(false)}>
            <form className="flex flex-col gap-4" onSubmit={handleLeaveSubmit}>
              <Field label="Reason" htmlFor="reason">
                <TextInput
                  id="reason"
                  placeholder="e.g., Moving to a new city"
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </Field>
              <Field label="Leave date" htmlFor="leaveDate">
                <TextInput
                  id="leaveDate"
                  type="date"
                  required
                  value={leaveDate}
                  onChange={e => setLeaveDate(e.target.value)}
                />
              </Field>
              <Field label="Message" htmlFor="leaveMessage">
                <TextArea
                  id="leaveMessage"
                  rows={3}
                  placeholder="Anything the landlord should know…"
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </Field>
              {outstanding > 0 ? (
                <p className="rounded-xl border border-warning-border bg-warning-tint px-3 py-2 text-sm text-warning-ink">
                  You have an unsettled balance of ₱{outstanding.toLocaleString()}. Your landlord
                  can&apos;t approve this request until it&apos;s settled.
                </p>
              ) : null}
              <Button type="submit" disabled={leave.isPending}>
                {leave.isPending ? 'Submitting…' : 'Submit request'}
              </Button>
            </form>
          </Modal>

          <Modal open={leaveNowOpen} title="Leave now?" onClose={closeLeaveNow}>
            {data ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-ink">
                  This ends your tenancy at {String(data.property_name ?? 'your property')} today,{' '}
                  {formatPaymentDate(today)}. The room was already released when your leave was
                  approved. Your landlord will be notified.
                </p>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-gray-ink">Approved leave date</dt>
                    <dd className="font-medium">
                      {formatPaymentDate(String(data.intended_leave_date ?? ''))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-ink">Move-out date</dt>
                    <dd className="font-medium">{formatPaymentDate(today)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-ink">Room</dt>
                    <dd className="font-medium">
                      {String(data.room_number ?? data.room_title ?? '—')}
                    </dd>
                  </div>
                </dl>
                <p className="text-sm font-medium text-error-ink">This cannot be undone.</p>
                {leaveNowError ? <ErrorState message={leaveNowError} /> : null}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={closeLeaveNow}
                    disabled={leaveNowMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => leaveNowMutation.mutate()}
                    disabled={leaveNowMutation.isPending}
                  >
                    {leaveNowMutation.isPending ? 'Leaving…' : 'Leave now'}
                  </Button>
                </div>
              </div>
            ) : null}
          </Modal>
        </RequireTenancy>
      )}
    </RoleShell>
  );
}

function TenancyDetails({ data }: { data: Record<string, unknown> }) {
  return (
    <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <dt className="text-sm text-gray-ink">Room</dt>
        <dd className="font-medium">{String(data.room_number ?? data.room_title ?? '—')}</dd>
      </div>
      <div>
        <dt className="text-sm text-gray-ink">Monthly rent</dt>
        <dd className="font-medium">₱{Number(data.monthly_rent ?? 0).toLocaleString()}</dd>
      </div>
      <div>
        <dt className="text-sm text-gray-ink">Move-in date</dt>
        <dd className="font-medium">{String(data.tenancy_start_date ?? '—')}</dd>
      </div>
      <div>
        <dt className="text-sm text-gray-ink">Deposit</dt>
        <dd className="font-medium">₱{Number(data.deposit ?? 0).toLocaleString()}</dd>
      </div>
    </dl>
  );
}

/** Approved departure: read-only until the date, with an optional early exit (spec `leave-now` §5.1). */
function ApprovedLeaveState({
  data,
  onLeaveNow,
}: {
  data: Record<string, unknown>;
  onLeaveNow: () => void;
}) {
  const propertyName = String(data.property_name ?? 'Your tenancy');
  const leaveDate =
    typeof data.intended_leave_date === 'string' && data.intended_leave_date
      ? formatPaymentDate(data.intended_leave_date)
      : '—';
  const canLeaveNow =
    typeof data.intended_leave_date === 'string' && data.intended_leave_date > manilaToday();
  const balance = Number(data.outstanding_balance ?? 0);
  const hasBalance = Number.isFinite(balance) && balance > 0;

  return (
    <div className="max-w-2xl">
      <Card>
        <div className="flex items-center gap-3">
          <Icon name="document" size={28} className="shrink-0" />
          <h1 className="text-xl font-bold">{propertyName}</h1>
          <StatusBadge status="approved" label="Leave approved" />
        </div>
        <div className="mt-4 rounded-lg bg-mint/60 p-4">
          <p className="font-semibold text-primary">Leave approved</p>
          <p className="mt-1 text-sm text-gray-ink">You&apos;re moving out on {leaveDate}.</p>
          <p className="mt-2 text-sm text-gray-ink">
            Your tenancy at {propertyName} ends on {leaveDate}.
            {canLeaveNow
              ? ' If you need to move out sooner, you can leave now. Your landlord will be notified and your tenancy ends today.'
              : ''}
          </p>
        </div>
        <TenancyDetails data={data} />
        {canLeaveNow ? (
          <div className="mt-4">
            {hasBalance ? (
              <p className="mb-3 text-sm text-gray-ink">
                You have an outstanding balance of ₱{balance.toLocaleString('en-PH')}. Settle your
                fees before you can leave now. Payments awaiting your landlord&apos;s verification
                also count.{' '}
                <Link to="/boarder/payments" className="font-semibold text-primary underline">
                  Go to Payments
                </Link>
              </p>
            ) : null}
            <Button variant="danger" disabled={hasBalance} onClick={onLeaveNow}>
              Leave now
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function PendingLeaveState({ data }: { data: Record<string, unknown> }) {
  const propertyName = String(data.property_name ?? 'Your tenancy');
  const address = [
    String(data.address ?? ''),
    data.city ? String(data.city) : '',
    data.province ? String(data.province) : '',
  ]
    .filter(Boolean)
    .join(', ');
  const reason =
    typeof data.leave_request_reason === 'string' && data.leave_request_reason
      ? data.leave_request_reason
      : null;
  const intendedDate =
    typeof data.intended_leave_date === 'string' && data.intended_leave_date
      ? data.intended_leave_date
      : null;
  const submittedDate =
    typeof data.leave_request_date === 'string' && data.leave_request_date
      ? data.leave_request_date
      : null;

  return (
    <div className="max-w-2xl">
      <Card>
        <div className="flex items-center gap-3">
          <Icon name="document" size={28} className="shrink-0" />
          <h1 className="text-xl font-bold">{propertyName}</h1>
          <StatusBadge status="pending" />
        </div>
        {address ? <p className="mt-1 text-gray-ink">{address}</p> : null}
        <div className="mt-4 rounded-lg bg-mint/60 p-4">
          <p className="font-semibold text-primary">Leave request pending</p>
          <p className="mt-1 text-sm text-gray-ink">
            Your landlord will review your request. Your room stays reserved for you until it&apos;s
            approved, and you can&apos;t submit another request until it&apos;s resolved.
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {reason ? (
            <div>
              <dt className="text-sm text-gray-ink">Reason</dt>
              <dd className="font-medium">{reason}</dd>
            </div>
          ) : null}
          {intendedDate ? (
            <div>
              <dt className="text-sm text-gray-ink">Intended leave date</dt>
              <dd className="font-medium">{intendedDate}</dd>
            </div>
          ) : null}
          {submittedDate ? (
            <div>
              <dt className="text-sm text-gray-ink">Requested on</dt>
              <dd className="font-medium">{submittedDate}</dd>
            </div>
          ) : null}
        </dl>
      </Card>
    </div>
  );
}
