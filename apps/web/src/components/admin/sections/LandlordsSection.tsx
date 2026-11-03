import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { getLandlords, updateLandlordVerification } from '../../../lib/api/admin';
import type { AdminLandlordRow } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataTable, type Column } from '../../ui/DataTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection } from '../AdminSection';
import { TableSkeleton } from '../AdminSkeletons';
import { formatDate, type PushToast } from '../sections';

type PendingConfirm = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  run: () => void;
};

/**
 * Landlord verification.
 *
 * `Approve` stays one click — it is the reversible, positive outcome — while
 * `Reject` confirms first (D12/R26). Both are real controls with press feedback
 * rather than underlined text.
 */
export function LandlordsSection({ token, push }: { token: string; push: PushToast }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  const landlords = useQuery({
    queryKey: ['admin', 'landlords'],
    queryFn: () => getLandlords(token),
    enabled: Boolean(token),
  });

  const patchLandlord = useMutation({
    mutationFn: ({ landlordId, action }: { landlordId: number; action: 'approve' | 'reject' }) =>
      updateLandlordVerification(token, landlordId, action),
    onSuccess: result => {
      push({ tone: 'success', message: result.message });
      setConfirm(null);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error: Error) => {
      push({ tone: 'error', message: error.message });
      setConfirm(null);
    },
  });

  function requestAction(row: AdminLandlordRow, action: 'approve' | 'reject') {
    if (action === 'approve') {
      patchLandlord.mutate({ landlordId: row.id, action });
      return;
    }

    setConfirm({
      title: `Reject ${row.first_name} ${row.last_name}?`,
      message: `This will reject the verification for ${row.first_name} ${row.last_name}.`,
      confirmLabel: 'Reject',
      run: () => patchLandlord.mutate({ landlordId: row.id, action }),
    });
  }

  const columns: Column<AdminLandlordRow>[] = [
    { header: 'Name', cell: row => `${row.first_name} ${row.last_name}` },
    { header: 'Email', cell: row => row.email },
    { header: 'Boarding house', cell: row => row.boarding_house_name ?? '—' },
    {
      header: 'Verified',
      cell: row => <StatusBadge status={row.is_verified ? 'verified' : 'pending'} />,
    },
    {
      header: 'Actions',
      cell: row =>
        row.is_verified ? null : (
          <div className="flex flex-wrap items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => requestAction(row, 'approve')}>
              Approve
            </Button>
            <Button variant="dangerGhost" size="sm" onClick={() => requestAction(row, 'reject')}>
              Reject
            </Button>
          </div>
        ),
    },
    { header: 'Joined', cell: row => formatDate(row.created_at) },
  ];

  return (
    <AdminSection
      section="landlords"
      isLoading={landlords.isLoading}
      error={landlords.error}
      empty={!landlords.data?.data.length}
      emptyTitle="No landlords found"
      emptyIcon="shieldCheck"
      skeleton={<TableSkeleton rows={5} columns={6} />}
    >
      <DataTable rows={landlords.data?.data ?? []} columns={columns} keyFor={row => row.id} />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? null}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        busy={patchLandlord.isPending}
        onConfirm={() => confirm?.run()}
        onCancel={() => setConfirm(null)}
      />
    </AdminSection>
  );
}
