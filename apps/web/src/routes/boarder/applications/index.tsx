import { Link, createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Icon } from '../../../components/ui/Icon';
import { Spinner } from '../../../components/ui/Spinner';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ToastStack, useToasts } from '../../../components/ui/Toast';
import { ApiRequestError } from '../../../lib/api/http';
import { deleteApplication, getApplications } from '../../../lib/api/boarder';
import { useAuth } from '../../../lib/auth-context';
import { BOARDER_STATUS_KEY } from '../../../lib/useBoarderNav';
import type { ApplicationSummary } from '../../../lib/types';

export const Route = createFileRoute('/boarder/applications/')({
  component: ApplicationsPage,
});

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function ApplicationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toasts, push, dismiss } = useToasts();
  const applications = useQuery({
    queryKey: ['applications'],
    queryFn: () => getApplications(token!),
    enabled: Boolean(token),
  });

  const withdraw = useMutation({
    mutationFn: (id: number) => deleteApplication(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      // Withdrawing can change boarder_status — keep the nav/gates fresh (R13).
      void queryClient.invalidateQueries({ queryKey: [BOARDER_STATUS_KEY] });
      push({ tone: 'success', message: 'Application withdrawn.' });
    },
    onError: (err: Error) =>
      push({
        tone: 'error',
        message: err instanceof ApiRequestError ? err.message : 'Failed to withdraw application.',
      }),
  });

  return (
    <div>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <div className="mb-6 flex items-center gap-3">
        <Icon name="application" size={28} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">My applications</h1>
        </div>
      </div>
      {applications.isLoading ? (
        <Spinner />
      ) : applications.error ? (
        <ErrorState message={applications.error.message} />
      ) : !applications.data || applications.data.data.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Browse rooms and apply to start your journey."
        />
      ) : (
        <DataTable<ApplicationSummary>
          rows={applications.data.data}
          keyFor={row => row.id}
          columns={[
            {
              header: 'Property',
              cell: row => (
                <Link
                  to="/boarder/applications/$id"
                  params={{ id: String(row.id) }}
                  className="font-medium text-primary hover:underline"
                >
                  {row.property_title ?? `Application #${row.id}`}
                </Link>
              ),
            },
            {
              header: 'Room',
              cell: row => row.room_title ?? '—',
            },
            {
              header: 'Status',
              cell: row => <StatusBadge status={String(row.status)} />,
            },
            {
              header: 'Submitted',
              cell: row => formatDate(row.created_at),
            },
            {
              header: 'Actions',
              cell: row =>
                row.status === 'accepted' || row.status === 'pending' ? (
                  <button
                    type="button"
                    className="text-sm text-error-ink hover:underline disabled:opacity-50"
                    disabled={withdraw.isPending}
                    onClick={() => withdraw.mutate(row.id)}
                  >
                    Withdraw
                  </button>
                ) : null,
            },
          ]}
        />
      )}
    </div>
  );
}
