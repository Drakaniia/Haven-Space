import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { MessageButton } from '../../components/messages/MessageButton';
import { Button, buttonClasses } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ToastStack, useToasts } from '../../components/ui/Toast';
import { ApiRequestError } from '../../lib/api/http';
import { getApplications, patchApplicationStatus } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';
import { formatPaymentDate, formatPeso } from '../../lib/payments';
import type { ApplicationSummary } from '../../lib/types';

export const Route = createFileRoute('/landlord/applications')({
  component: () => (
    <Protected role="landlord">
      <ApplicationsPage />
    </Protected>
  ),
});

type Tab = 'pending' | 'accepted' | 'rejected' | 'all';

const TABS: Array<{ value: Tab; label: string; matches: (status: string) => boolean }> = [
  { value: 'pending', label: 'Pending', matches: status => status === 'pending' },
  {
    value: 'accepted',
    label: 'Accepted',
    matches: status => status === 'accepted' || status === 'confirmed',
  },
  {
    value: 'rejected',
    label: 'Declined',
    matches: status => status === 'rejected' || status === 'cancelled',
  },
  { value: 'all', label: 'All', matches: () => true },
];

const EMPTY_COPY: Record<Tab, { title: string; description: string }> = {
  pending: {
    title: 'Nothing waiting for a decision',
    description:
      'New applications land here first. Make sure your rooms are published so boarders can find and apply for them.',
  },
  accepted: {
    title: 'No accepted applications',
    description: 'Applications you accept move here until the boarder confirms the tenancy.',
  },
  rejected: {
    title: 'No declined applications',
    description: 'Applications you reject or that boarders withdraw are kept here for reference.',
  },
  all: { title: 'No applications yet', description: 'Boarder applications appear here.' },
};

function ApplicationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [pendingReject, setPendingReject] = useState<ApplicationSummary | null>(null);
  const { toasts, push, dismiss } = useToasts();

  const applications = useQuery({
    queryKey: ['landlord-applications'],
    queryFn: () => getApplications(token!),
    enabled: Boolean(token),
  });

  const patchStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      patchApplicationStatus(token!, id, status),
    onSuccess: (_data, { status }) => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-applications'] });
      setPendingReject(null);
      push({
        tone: 'success',
        message: status === 'accepted' ? 'Application accepted.' : 'Application rejected.',
      });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update application.'),
  });

  const rows = applications.data?.data ?? [];
  const counts = Object.fromEntries(
    TABS.map(option => [option.value, rows.filter(row => option.matches(row.status)).length])
  ) as Record<Tab, number>;
  // Open on the decisions that are due; fall back to everything when none are.
  const activeTab: Tab = tab ?? (counts.pending > 0 || rows.length === 0 ? 'pending' : 'all');
  const matcher = TABS.find(option => option.value === activeTab)!.matches;
  const visible = rows.filter(row => matcher(row.status));

  // The shell stays mounted through every state: loading/error/empty used to
  // return before `RoleShell`, so the sidebar and topbar vanished and popped
  // back in (R24).
  return (
    <RoleShell nav={LANDLORD_NAV}>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        title="Applications"
        subtitle="Boarders asking for a room. Read their message, then accept or decline."
      />

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      {applications.isLoading ? (
        <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card">
          {[0, 1, 2].map(index => (
            <div key={index} className="flex items-center gap-4 py-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="ml-auto h-8 w-32 rounded-lg" />
            </div>
          ))}
        </div>
      ) : applications.error ? (
        <ErrorState
          message={applications.error.message}
          action={
            <Button variant="outline" size="sm" onClick={() => void applications.refetch()}>
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <div
            role="group"
            aria-label="Filter by application status"
            className="mb-4 flex w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-subtle p-1 sm:w-fit"
          >
            {TABS.map(option => {
              const selected = activeTab === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTab(option.value)}
                  className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 sm:flex-none ${
                    selected ? 'bg-surface text-ink shadow-card' : 'text-gray-ink hover:text-ink'
                  }`}
                >
                  {option.label}
                  <span
                    className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs tabular ${
                      selected ? 'bg-mint text-primary-dark' : 'bg-surface/70 text-gray-ink'
                    }`}
                  >
                    {counts[option.value]}
                  </span>
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon="application"
              title={EMPTY_COPY[activeTab].title}
              description={EMPTY_COPY[activeTab].description}
              action={
                activeTab === 'pending' ? (
                  <Link to="/landlord/properties" className={buttonClasses({ variant: 'outline' })}>
                    Check your listings
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <DataTable<ApplicationSummary>
              rows={visible}
              keyFor={row => row.id}
              expandable={row =>
                row.message ? (
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold text-gray-ink">
                      Message from {row.first_name}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
                      {row.message}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-ink">{row.first_name} did not add a message.</p>
                )
              }
              columns={[
                {
                  header: 'Applicant',
                  cell: row => (
                    <div className="min-w-[11rem]">
                      <p className="font-semibold text-ink">
                        {row.first_name} {row.last_name}
                      </p>
                      <p className="text-xs text-gray-ink">
                        Applied {formatPaymentDate(row.created_at.slice(0, 10))}
                      </p>
                    </div>
                  ),
                },
                {
                  header: 'Room',
                  cell: row => (
                    <div className="min-w-[10rem]">
                      <p className="text-ink">{row.room_title ?? 'Room'}</p>
                      <p className="text-xs text-gray-ink">{row.property_title}</p>
                    </div>
                  ),
                },
                {
                  header: 'Rent',
                  cell: row => (
                    <span className="whitespace-nowrap font-semibold text-ink">
                      {formatPeso(row.room_price)}
                    </span>
                  ),
                },
                {
                  header: 'Status',
                  cell: row => <StatusBadge status={String(row.status)} />,
                },
                {
                  header: 'Actions',
                  // Every application can be discussed, whatever its status — the
                  // thread is independent of the application's outcome (D17/D19),
                  // and the landlord's counterpart is the boarder's user id (R17).
                  cell: row => (
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {row.status === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => patchStatus.mutate({ id: row.id, status: 'accepted' })}
                            disabled={patchStatus.isPending}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="dangerGhost"
                            onClick={() => setPendingReject(row)}
                            disabled={patchStatus.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                      <MessageButton
                        role="landlord"
                        counterpartId={row.boarder_id}
                        propertyId={row.property_id}
                      />
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingReject !== null}
        title="Reject this application?"
        message={
          <>
            <strong>
              {pendingReject ? `${pendingReject.first_name} ${pendingReject.last_name}` : ''}
            </strong>{' '}
            applied for {pendingReject?.room_title ?? 'a room'} at{' '}
            {pendingReject?.property_title ?? 'your property'}. A rejected application can&apos;t
            be accepted later from this page.
          </>
        }
        confirmLabel="Reject application"
        busy={patchStatus.isPending}
        onConfirm={() => {
          if (pendingReject) patchStatus.mutate({ id: pendingReject.id, status: 'rejected' });
        }}
        onCancel={() => setPendingReject(null)}
      />
    </RoleShell>
  );
}
