import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { MessageButton } from '../../components/messages/MessageButton';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ToastStack, useToasts } from '../../components/ui/Toast';
import { ApiRequestError } from '../../lib/api/http';
import { getApplications, patchApplicationStatus } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';
import type { ApplicationSummary } from '../../lib/types';

export const Route = createFileRoute('/landlord/applications')({
  component: () => (
    <Protected role="landlord">
      <ApplicationsPage />
    </Protected>
  ),
});

function ApplicationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
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
      push({
        tone: 'success',
        message: status === 'accepted' ? 'Application accepted.' : 'Application rejected.',
      });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update application.'),
  });

  const rows = applications.data?.data ?? [];

  // The shell stays mounted through every state: loading/error/empty used to
  // return before `RoleShell`, so the sidebar and topbar vanished and popped
  // back in (R24).
  return (
    <RoleShell nav={LANDLORD_NAV}>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        icon="application"
        title="Applications"
      />

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      {applications.isLoading ? (
        <Spinner />
      ) : applications.error ? (
        <ErrorState message={applications.error.message} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="application"
          title="No applications"
          description="Boarder applications appear here."
        />
      ) : (
        <DataTable<ApplicationSummary>
          rows={rows}
          keyFor={row => row.id}
          columns={[
            {
              header: 'Property',
              cell: row => row.property_title,
            },
            {
              header: 'Room',
              cell: row => `${row.room_title} · ₱${row.room_price.toLocaleString()}`,
            },
            {
              header: 'Boarder',
              cell: row => `${row.first_name} ${row.last_name}`,
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
                <div className="flex flex-wrap gap-2">
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
                        variant="danger"
                        onClick={() => patchStatus.mutate({ id: row.id, status: 'rejected' })}
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
    </RoleShell>
  );
}
