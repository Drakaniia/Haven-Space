import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Protected } from '../../components/auth/Protected';
import { DetailList } from '../../components/boarder/DetailList';
import { RoleShell } from '../../components/layout/RoleShell';
import { Avatar } from '../../components/ui/Avatar';
import { Button, buttonClasses } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getAcceptedApplications, getBoarderAnnouncements, getTenancy } from '../../lib/api/boarder';
import { getThreads } from '../../lib/api/messages';
import { getBoarderPayments } from '../../lib/api/payments';
import { useAuth } from '../../lib/auth-context';
import { counterpartName, messagePreview, relativeTime, unreadTotal } from '../../lib/messages';
import { getBoarderNav } from '../../lib/nav';
import {
  chargeTypeLabel,
  formatPaymentDate,
  formatPeso,
  isChargeOpen,
  latestSubmission,
  paymentStatusMeta,
} from '../../lib/payments';
import { BROWSE_LISTINGS_PATH } from '../../lib/routes';
import type {
  Announcement,
  BoarderPaymentsResponse,
  MessageThread,
  PaymentCharge,
} from '../../lib/types';
import { useBoarderStatus } from '../../lib/use-boarder-nav';

export const Route = createFileRoute('/boarder/')({
  component: () => (
    <Protected role="boarder">
      <BoarderDashboard />
    </Protected>
  ),
});

function joinAddress(data: Record<string, unknown>): string {
  return [data.address, data.city, data.province]
    .map(part => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(', ');
}

/**
 * The charge the boarder should act on next: the earliest open charge that is
 * still waiting on them, falling back to one that is waiting on the landlord.
 */
function nextActionableCharge(charges: PaymentCharge[]): PaymentCharge | null {
  const open = charges
    .filter(isChargeOpen)
    .sort((left, right) => (left.due_date < right.due_date ? -1 : 1));
  const waitingOnBoarder = open.find(charge => latestSubmission(charge)?.status !== 'pending');

  return waitingOnBoarder ?? open[0] ?? null;
}

function BoarderDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const status = useBoarderStatus();
  const nav = getBoarderNav(status);
  const confirmed = status === 'confirmed';

  const tenancy = useQuery({
    queryKey: ['tenancy'],
    queryFn: () => getTenancy(token!),
    enabled: Boolean(token),
  });
  const accepted = useQuery({
    queryKey: ['accepted'],
    queryFn: () => getAcceptedApplications(token!),
    enabled: Boolean(token),
  });
  const ledger = useQuery({
    queryKey: ['boarder-payments'],
    queryFn: () => getBoarderPayments(token!),
    enabled: Boolean(token) && confirmed,
    refetchOnWindowFocus: true,
  });
  const threads = useQuery({
    queryKey: ['message-threads'],
    queryFn: () => getThreads(token!),
    enabled: Boolean(token) && confirmed,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const announcements = useQuery({
    queryKey: ['announcements'],
    queryFn: () => getBoarderAnnouncements(token!),
    enabled: Boolean(token) && confirmed,
  });

  // Spec R9: the dashboard is tenancy-scoped — non-confirmed boarders are
  // redirected to Applications instead of seeing a dashboard for a home they
  // don't have yet.
  useEffect(() => {
    if (status !== 'confirmed') void navigate({ to: '/boarder/applications', replace: true });
  }, [status, navigate]);

  if (status !== 'confirmed') return null;

  const tenancyData = tenancy.data?.data ?? null;
  const acceptedCount = accepted.data?.data.length ?? 0;
  const propertyName = tenancyData ? String(tenancyData.property_name ?? 'your boarding house') : null;

  return (
    <RoleShell nav={nav}>
      <div className="rise-in">
        <PageHeader
          title={`Welcome home${user?.first_name ? `, ${user.first_name}` : ''}`}
          subtitle={
            propertyName
              ? `Here's what needs your attention at ${propertyName} today.`
              : "Here's what needs your attention today."
          }
        />
      </div>

      {acceptedCount > 0 ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-info-border bg-info-tint px-5 py-4 text-info-ink sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-semibold">
              {acceptedCount} accepted application{acceptedCount === 1 ? '' : 's'}.
            </span>{' '}
            A landlord said yes. Confirm the booking to hold the room.
          </p>
          <Link to="/boarder/confirm-booking" className={buttonClasses({ size: 'sm' })}>
            Confirm your booking
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <RentCard ledger={ledger} />
        <TenancyCard isLoading={tenancy.isLoading} data={tenancyData} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <MessagesCard
          isLoading={threads.isLoading}
          isError={threads.isError}
          rows={threads.data?.data ?? []}
        />
        <AnnouncementCard
          isLoading={announcements.isLoading}
          isError={announcements.isError}
          list={announcements.data?.data.announcements ?? []}
        />
      </div>
    </RoleShell>
  );
}

function RentCard({ ledger }: { ledger: UseQueryResult<BoarderPaymentsResponse> }) {
  if (ledger.isLoading) {
    return (
      <Card padding="p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-11 w-48" />
        <Skeleton className="mt-3 h-4 w-56" />
        <Skeleton className="mt-6 h-10 w-32 rounded-xl" />
      </Card>
    );
  }

  if (ledger.isError) {
    return (
      <Card padding="p-6">
        <p className="kicker">Rent</p>
        <p className="mt-3 font-semibold text-ink">We couldn&apos;t load your payments.</p>
        <p className="mt-1 text-sm text-gray-ink">Your balance will show here once it loads.</p>
        <div className="mt-5">
          <Button variant="outline" size="sm" onClick={() => void ledger.refetch()}>
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  const charges = ledger.data?.data.charges ?? [];
  const summary = ledger.data?.data.summary;
  const next = nextActionableCharge(charges);
  const openCount = charges.filter(isChargeOpen).length;

  if (!next) {
    return (
      <Card padding="p-6" className="flex flex-col">
        <p className="kicker">Rent</p>
        <div className="mt-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-tint text-success-ink">
            <Icon name="check" size={20} />
          </span>
          <div>
            <p className="font-display text-2xl font-medium tracking-[-0.015em] text-ink">
              You&apos;re all paid up
            </p>
            <p className="mt-1 text-sm text-gray-ink">
              {charges.length === 0
                ? 'Your rent and other charges will appear here once your landlord adds them.'
                : 'Nothing is waiting on you right now. New charges appear here when they are due.'}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Link to="/boarder/payments" className={buttonClasses({ variant: 'outline' })}>
            View payment history
          </Link>
        </div>
      </Card>
    );
  }

  const meta = paymentStatusMeta(next);
  const pendingReview = latestSubmission(next)?.status === 'pending';
  const label = next.description || chargeTypeLabel(next.charge_type);

  return (
    <Card padding="p-6" className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="kicker">{pendingReview ? 'Waiting on your landlord' : 'Next payment'}</p>
        <StatusBadge status={meta.status} label={meta.label} />
      </div>

      <p className="tabular mt-4 font-display text-[2.75rem] font-medium leading-none tracking-[-0.03em] text-ink sm:text-[3.25rem]">
        {formatPeso(next.total_due)}
      </p>
      <p className="mt-3 text-[0.9375rem] text-gray-ink">
        <span className="font-semibold text-ink">{label}</span> · due{' '}
        {formatPaymentDate(next.due_date)}
      </p>
      {next.late_fee > 0 ? (
        <p className="mt-1 text-sm text-warning-ink">
          Includes a {formatPeso(next.late_fee)} late fee.
        </p>
      ) : null}
      {pendingReview ? (
        <p className="mt-1 text-sm text-gray-ink">
          You sent proof on {formatPaymentDate(latestSubmission(next)?.created_at)}. We&apos;ll let
          you know once it&apos;s verified.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          to="/boarder/payments/pay"
          search={{ chargeId: next.id }}
          className={buttonClasses({ variant: pendingReview ? 'outline' : 'primary', size: 'lg' })}
        >
          {pendingReview ? 'View submission' : 'Pay now'}
        </Link>
        <Link to="/boarder/payments" className={buttonClasses({ variant: 'ghost' })}>
          All payments
        </Link>
      </div>

      {openCount > 1 && summary ? (
        <p className="mt-6 border-t border-border/80 pt-4 text-sm text-gray-ink">
          {openCount} open charges · {formatPeso(summary.total_due)} balance in total
          {summary.overdue_count > 0 ? `, ${summary.overdue_count} overdue` : ''}.
        </p>
      ) : null}
    </Card>
  );
}


function TenancyCard({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: Record<string, unknown> | null;
}) {
  if (isLoading) {
    return (
      <Card padding="p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-7 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
        <Skeleton className="mt-6 h-16 w-full" />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card padding="p-6">
        <p className="kicker">Your room</p>
        <p className="mt-3 font-display text-xl font-medium text-ink">No active tenancy found</p>
        <p className="mt-1 text-sm text-gray-ink">
          Once your landlord starts your tenancy, your room details appear here.
        </p>
        <Link
          to={BROWSE_LISTINGS_PATH}
          className={buttonClasses({ variant: 'outline', className: 'mt-5' })}
        >
          Find a room
        </Link>
      </Card>
    );
  }

  const leaveStatus =
    typeof data.leave_request_status === 'string' ? data.leave_request_status : 'none';
  const address = joinAddress(data);
  const room = String(data.room_number ?? data.room_title ?? '—');

  return (
    <Card padding="p-6" className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="kicker">Your room</p>
        {leaveStatus === 'pending' ? (
          <StatusBadge status="pending" label="Leave requested" />
        ) : leaveStatus === 'approved' ? (
          <StatusBadge status="approved" label="Leave approved" />
        ) : (
          <StatusBadge status="active" label="Active tenancy" />
        )}
      </div>
      <h2 className="mt-3 font-display text-[1.5rem] font-medium leading-tight tracking-[-0.015em] text-ink">
        {String(data.property_name ?? 'Your tenancy')}
      </h2>
      {address ? (
        <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-ink">
          <Icon name="location" size={16} className="mt-0.5 text-muted" />
          {address}
        </p>
      ) : null}

      <DetailList
        className="mt-5"
        items={[
          { label: 'Room', value: room },
          { label: 'Monthly rent', value: formatPeso(Number(data.monthly_rent ?? 0)) },
          {
            label: 'Moved in',
            value: data.tenancy_start_date
              ? formatPaymentDate(String(data.tenancy_start_date))
              : '—',
          },
          {
            label: leaveStatus === 'approved' ? 'Moving out' : 'Deposit',
            value:
              leaveStatus === 'approved'
                ? formatPaymentDate(String(data.intended_leave_date ?? ''))
                : formatPeso(Number(data.deposit ?? 0)),
          },
        ]}
      />

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/boarder/tenancy" className={buttonClasses({ variant: 'outline', size: 'sm' })}>
          Tenancy details
        </Link>
        <Link to="/boarder/house-rules" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          House rules
        </Link>
      </div>
    </Card>
  );
}

function MessagesCard({
  isLoading,
  isError,
  rows,
}: {
  isLoading: boolean;
  isError: boolean;
  rows: MessageThread[];
}) {
  const unread = unreadTotal(rows);
  const latest = [...rows].sort((left, right) =>
    left.last_message_at < right.last_message_at ? 1 : -1
  )[0];

  return (
    <Card padding="p-6" className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-medium tracking-[-0.01em] text-ink">
          <Icon name="chat" size={20} className="text-primary" />
          Messages
        </h2>
        {unread > 0 ? (
          <span className="tabular rounded-full bg-clay px-2.5 py-0.5 text-xs font-bold text-white">
            {unread} unread
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex-1">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ) : isError ? (
          <p className="text-sm text-gray-ink">Messages couldn&apos;t load. Open the inbox to retry.</p>
        ) : !latest ? (
          <p className="text-sm text-gray-ink">
            No conversations yet. Questions about your room or a payment? Your landlord is one
            message away.
          </p>
        ) : (
          <Link
            to="/boarder/messages/$threadId"
            params={{ threadId: String(latest.id) }}
            className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-subtle"
          >
            <Avatar
              user={{
                avatar_url: latest.counterpart_avatar_url,
                first_name: latest.counterpart_first_name,
                last_name: latest.counterpart_last_name,
              }}
              size={40}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span
                  className={`truncate text-sm text-ink ${
                    latest.unread_count > 0 ? 'font-bold' : 'font-semibold'
                  }`}
                >
                  {counterpartName(latest)}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {relativeTime(latest.last_message_at)}
                </span>
              </span>
              <span
                className={`mt-0.5 block truncate text-sm ${
                  latest.unread_count > 0 ? 'text-ink' : 'text-gray-ink'
                }`}
              >
                {messagePreview(latest.last_body, latest.last_attachment_count)}
              </span>
            </span>
          </Link>
        )}
      </div>

      <div className="mt-5">
        <Link to="/boarder/messages" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          Open inbox
        </Link>
      </div>
    </Card>
  );
}

function AnnouncementCard({
  isLoading,
  isError,
  list,
}: {
  isLoading: boolean;
  isError: boolean;
  list: Announcement[];
}) {
  const latest = [...list].sort((left, right) => (left.created_at < right.created_at ? 1 : -1))[0];
  const unread = list.filter(item => !item.is_viewed).length;

  return (
    <Card padding="p-6" className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-medium tracking-[-0.01em] text-ink">
          <Icon name="announcement" size={20} className="text-primary" />
          From the house
        </h2>
        {unread > 0 ? <StatusBadge status="submitted" label={`${unread} new`} /> : null}
      </div>

      <div className="mt-4 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ) : isError ? (
          <p className="text-sm text-gray-ink">
            Announcements couldn&apos;t load. Open the board to retry.
          </p>
        ) : !latest ? (
          <p className="text-sm text-gray-ink">
            No announcements yet. Notices from your landlord, like water interruptions or house
            meetings, will show up here.
          </p>
        ) : (
          <article>
            <p className="text-xs text-muted">
              {latest.category ? `${latest.category} · ` : ''}
              {formatPaymentDate(latest.created_at)}
              {latest.priority === 'high' ? ' · High priority' : ''}
            </p>
            <h3 className="mt-1 font-semibold text-ink">{latest.title}</h3>
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-gray-ink">{latest.body}</p>
          </article>
        )}
      </div>

      <div className="mt-5">
        <Link
          to="/boarder/announcements"
          className={buttonClasses({ variant: 'ghost', size: 'sm' })}
        >
          All announcements
        </Link>
      </div>
    </Card>
  );
}
