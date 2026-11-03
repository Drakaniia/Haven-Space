import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Protected } from '../../components/auth/Protected';
import { DetailList, type DetailItem } from '../../components/boarder/DetailList';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button, buttonClasses } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RequireTenancy } from '../../components/boarder/FeatureGate';
import { ToastStack, useToasts } from '../../components/ui/Toast';
import { ApiRequestError } from '../../lib/api/http';
import { getTenancy, leaveNow, leaveRequest } from '../../lib/api/boarder';
import { useAuth } from '../../lib/auth-context';
import { formatPaymentDate, formatPeso, manilaToday } from '../../lib/payments';
import { BOARDER_STATUS_KEY, useBoarderNav } from '../../lib/use-boarder-nav';

export const Route = createFileRoute('/boarder/tenancy')({
  component: () => (
    <Protected role="boarder">
      <TenancyPage />
    </Protected>
  ),
});

function joinAddress(data: Record<string, unknown>): string {
  return [data.address, data.city, data.province]
    .map(part => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(', ');
}

function dateOrDash(value: unknown): string {
  return typeof value === 'string' && value ? formatPaymentDate(value) : '—';
}

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
            icon="home"
            title="No active tenancy"
            description={`You've moved out. Your tenancy at ${leftProperty} has ended.`}
          />
        </div>
      ) : (
        <RequireTenancy>
          {tenancy.isLoading ? (
            <div aria-busy="true">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-9 w-2/3" />
              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <Skeleton className="h-60 w-full rounded-2xl" />
                <Skeleton className="h-60 w-full rounded-2xl" />
              </div>
            </div>
          ) : tenancy.error ? (
            <ErrorState
              message={tenancy.error.message}
              action={
                <Button variant="outline" size="sm" onClick={() => void tenancy.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : !data ? (
            <EmptyState
              icon="document"
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
            <TenancyLayout
              data={data}
              badge={<StatusBadge status="active" label="Active tenancy" />}
              extraDetails={[]}
            >
              <p className="kicker">Your stay</p>
              <h2 className="mt-0.5 font-display text-xl font-medium tracking-[-0.01em] text-ink">
                Planning to move out?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-ink">
                Send your landlord a leave request with your intended date. Your room stays yours
                until they approve it.
              </p>
              {outstanding > 0 ? (
                <p className="mt-3 rounded-xl border border-warning-border bg-warning-tint px-3 py-2 text-sm text-warning-ink">
                  Unsettled balance: {formatPeso(outstanding)}. It must be paid before a leave can
                  be approved.
                </p>
              ) : null}
              <div className="mt-5">
                {/* `outline` variant, not a hand-rolled className: Tailwind resolves conflicting
                    classes by stylesheet order, so the default `primary` variant's `text-white` beat
                    this override's `text-primary` — white text on the white panel, legible only on
                    hover. Colour belongs to the variant. */}
                <Button variant="outline" onClick={() => setLeaveOpen(true)}>
                  Request to leave
                </Button>
              </div>
            </TenancyLayout>
          )}

          <Modal open={leaveOpen} title="Request to leave" onClose={() => setLeaveOpen(false)}>
            <form className="flex flex-col gap-4" onSubmit={handleLeaveSubmit}>
              <p className="text-sm text-gray-ink">
                Your landlord reviews this request. You&apos;ll be notified when they respond.
              </p>
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
                  min={today}
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
              {error ? <ErrorState message={error} /> : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setLeaveOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={leave.isPending}>
                  {leave.isPending ? 'Submitting…' : 'Submit request'}
                </Button>
              </div>
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
                <DetailList
                  items={[
                    {
                      label: 'Approved leave date',
                      value: formatPaymentDate(String(data.intended_leave_date ?? '')),
                    },
                    { label: 'Move-out date', value: formatPaymentDate(today) },
                    { label: 'Room', value: String(data.room_number ?? data.room_title ?? '—') },
                  ]}
                />
                <p className="text-sm font-medium text-error-ink">This cannot be undone.</p>
                {leaveNowError ? <ErrorState message={leaveNowError} /> : null}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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

/**
 * The tenancy page frame shared by every state: the property as the page title,
 * the lease summary on the left, and the state-specific "your stay" panel on
 * the right (stacked below on small screens).
 */
function TenancyLayout({
  data,
  badge,
  extraDetails,
  children,
}: {
  data: Record<string, unknown>;
  badge: ReactNode;
  extraDetails: DetailItem[];
  children: ReactNode;
}) {
  const address = joinAddress(data);

  return (
    <div>
      <header className="rise-in mb-8">
        <p className="kicker">My tenancy</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-[1.875rem] font-medium leading-[1.1] tracking-[-0.02em] text-ink sm:text-[2.125rem]">
            {String(data.property_name ?? 'Your tenancy')}
          </h1>
          {badge}
        </div>
        {address ? (
          <p className="mt-2 flex items-start gap-1.5 text-[0.9375rem] text-gray-ink">
            <Icon name="location" size={16} className="mt-1 text-muted" />
            {address}
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card padding="p-6">
          <h2 className="font-display text-xl font-medium tracking-[-0.01em] text-ink">
            Lease summary
          </h2>
          <TenancyDetails data={data} extra={extraDetails} />
          <div className="mt-6 flex flex-wrap gap-2 border-t border-border/80 pt-5">
            <Link to="/boarder/payments" className={buttonClasses({ variant: 'outline', size: 'sm' })}>
              Payments
            </Link>
            <Link
              to="/boarder/house-rules"
              className={buttonClasses({ variant: 'ghost', size: 'sm' })}
            >
              House rules
            </Link>
            <Link to="/boarder/messages" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
              Messages
            </Link>
          </div>
        </Card>

        <Card padding="p-6">{children}</Card>
      </div>
    </div>
  );
}

function TenancyDetails({
  data,
  extra = [],
}: {
  data: Record<string, unknown>;
  extra?: DetailItem[];
}) {
  return (
    <DetailList
      className="mt-4"
      items={[
        { label: 'Room', value: String(data.room_number ?? data.room_title ?? '—') },
        {
          label: 'Monthly rent',
          value: `₱${Number(data.monthly_rent ?? 0).toLocaleString()}`,
        },
        { label: 'Move-in date', value: dateOrDash(data.tenancy_start_date) },
        { label: 'Deposit', value: `₱${Number(data.deposit ?? 0).toLocaleString()}` },
        ...extra,
      ]}
    />
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
    <TenancyLayout
      data={data}
      badge={<StatusBadge status="approved" label="Leave approved" />}
      extraDetails={[{ label: 'Moving out', value: leaveDate }]}
    >
      <p className="kicker">Your stay</p>
      <h2 className="mt-0.5 font-display text-xl font-medium tracking-[-0.01em] text-ink">
        Leave approved
      </h2>
      <p className="mt-1 text-sm text-gray-ink">You&apos;re moving out on {leaveDate}.</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-ink">
        Your tenancy at {propertyName} ends on {leaveDate}.
        {canLeaveNow
          ? ' If you need to move out sooner, you can leave now. Your landlord will be notified and your tenancy ends today.'
          : ''}
      </p>
      {canLeaveNow ? (
        <div className="mt-5 border-t border-border/80 pt-5">
          {hasBalance ? (
            <p className="mb-4 rounded-xl border border-warning-border bg-warning-tint px-3 py-2 text-sm text-warning-ink">
              You have an outstanding balance of ₱{balance.toLocaleString('en-PH')}. Settle your
              fees before you can leave now. Payments awaiting your landlord&apos;s verification
              also count.{' '}
              <Link to="/boarder/payments" className="font-semibold underline">
                Go to Payments
              </Link>
            </p>
          ) : null}
          <Button variant="danger" disabled={hasBalance} onClick={onLeaveNow}>
            Leave now
          </Button>
        </div>
      ) : null}
    </TenancyLayout>
  );
}

function PendingLeaveState({ data }: { data: Record<string, unknown> }) {
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

  const requestDetails: DetailItem[] = [
    ...(reason ? [{ label: 'Reason', value: reason }] : []),
    ...(intendedDate
      ? [{ label: 'Intended leave date', value: formatPaymentDate(intendedDate) }]
      : []),
    ...(submittedDate ? [{ label: 'Requested on', value: formatPaymentDate(submittedDate) }] : []),
  ];

  return (
    <TenancyLayout
      data={data}
      badge={<StatusBadge status="pending" label="Leave requested" />}
      extraDetails={[]}
    >
      <p className="kicker">Your stay</p>
      <h2 className="mt-0.5 font-display text-xl font-medium tracking-[-0.01em] text-ink">
        Leave request pending
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-ink">
        Your landlord will review your request. Your room stays reserved for you until it&apos;s
        approved, and you can&apos;t submit another request until it&apos;s resolved.
      </p>
      {requestDetails.length > 0 ? (
        <DetailList className="mt-5" columns={2} items={requestDetails} />
      ) : null}
    </TenancyLayout>
  );
}
