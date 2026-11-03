import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { getLandlords, updateLandlordVerification } from '../../../lib/api/admin';
import type { AdminLandlordRow } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataTable, type Column } from '../../ui/DataTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection } from '../AdminSection';
import { FilterChips, NoMatches, SearchField, TableToolbar, matchesQuery, resultCount } from '../AdminToolbar';
import { TableSkeleton, ToolbarSkeleton } from '../AdminSkeletons';
import { LandlordDocumentsModal } from '../LandlordDocumentsModal';
import { formatDate, type PushToast } from '../sections';

type PendingConfirm = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  run: () => void;
};

type VerificationFilter = 'all' | 'pending' | 'verified';

/**
 * Landlord verification.
 *
 * The decision is made in the documents modal, so every row leads with
 * "Review documents" — the place where Approve is gated on a complete bundle.
 * The quick `Approve` (one click, the reversible positive outcome) and
 * `Reject` (confirms first, D12/R26) stay on unverified rows for admins who
 * already reviewed offline. Unverified landlords sort first, so the queue the
 * Overview links to is what the section opens on.
 */
export function LandlordsSection({ token, push }: { token: string; push: PushToast }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [documentLandlordId, setDocumentLandlordId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [verification, setVerification] = useState<VerificationFilter>('all');

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

  const rows = landlords.data?.data ?? [];
  const pendingCount = rows.filter(row => !row.is_verified).length;
  const visible = useMemo(
    () =>
      rows
        .filter(
          row =>
            (verification === 'all' ||
              (verification === 'pending' ? !row.is_verified : Boolean(row.is_verified))) &&
            matchesQuery(
              query,
              `${row.first_name} ${row.last_name}`,
              row.email,
              row.boarding_house_name
            )
        )
        // Stable: unverified first, original (API) order within each group.
        .map((row, index) => ({ row, index }))
        .sort((a, b) => Number(a.row.is_verified) - Number(b.row.is_verified) || a.index - b.index)
        .map(({ row }) => row),
    [rows, verification, query]
  );
  const filtered = query.trim() !== '' || verification !== 'all';

  const columns: Column<AdminLandlordRow>[] = [
    {
      header: 'Landlord',
      cell: row => (
        <div className="min-w-[12rem]">
          <p className="font-medium text-ink">{`${row.first_name} ${row.last_name}`}</p>
          <p className="text-xs text-gray-ink">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Boarding house',
      cell: row =>
        row.boarding_house_name ? (
          row.boarding_house_name
        ) : (
          <span className="text-muted">Not provided</span>
        ),
    },
    {
      header: 'Verification',
      cell: row => (
        <StatusBadge
          status={row.is_verified ? 'verified' : 'pending'}
          label={row.is_verified ? 'Verified' : 'Awaiting review'}
        />
      ),
    },
    {
      header: 'Joined',
      cell: row => <span className="whitespace-nowrap text-gray-ink">{formatDate(row.created_at)}</span>,
    },
    {
      header: 'Actions',
      cell: row => {
        const name = `${row.first_name} ${row.last_name}`;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant={row.is_verified ? 'ghost' : 'outline'}
              size="sm"
              aria-label={`Review documents for ${name}`}
              onClick={() => setDocumentLandlordId(row.id)}
            >
              {row.is_verified ? 'Documents' : 'Review documents'}
            </Button>
            {row.is_verified ? null : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Approve ${name}`}
                  disabled={patchLandlord.isPending}
                  onClick={() => requestAction(row, 'approve')}
                >
                  Approve
                </Button>
                <Button
                  variant="dangerGhost"
                  size="sm"
                  aria-label={`Reject ${name}`}
                  disabled={patchLandlord.isPending}
                  onClick={() => requestAction(row, 'reject')}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AdminSection
      section="landlords"
      isLoading={landlords.isLoading}
      error={landlords.error}
      onRetry={() => void landlords.refetch()}
      empty={!landlords.data?.data.length}
      emptyTitle="No landlords yet"
      emptyDescription="Landlord accounts appear here after sign-up, with their verification documents once uploaded."
      emptyIcon="shieldCheck"
      skeleton={
        <>
          <ToolbarSkeleton chips={3} />
          <TableSkeleton rows={6} columns={5} />
        </>
      }
      toolbar={
        <TableToolbar count={resultCount(visible.length, rows.length, 'landlord', 'landlords')}>
          <SearchField
            label="Search landlords"
            placeholder="Search name, email or boarding house"
            value={query}
            onChange={setQuery}
          />
          <FilterChips<VerificationFilter>
            label="Filter by verification"
            value={verification}
            onChange={setVerification}
            options={[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Awaiting review', count: pendingCount },
              { value: 'verified', label: 'Verified', count: rows.length - pendingCount },
            ]}
          />
        </TableToolbar>
      }
    >
      {visible.length === 0 && filtered ? (
        <NoMatches
          noun="landlords"
          onClear={() => {
            setQuery('');
            setVerification('all');
          }}
        />
      ) : (
        <DataTable rows={visible} columns={columns} keyFor={row => row.id} />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? null}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        busy={patchLandlord.isPending}
        onConfirm={() => confirm?.run()}
        onCancel={() => setConfirm(null)}
      />

      <LandlordDocumentsModal
        landlordId={documentLandlordId}
        token={token}
        onClose={() => setDocumentLandlordId(null)}
        onDecided={() => setDocumentLandlordId(null)}
        onNotify={(message, tone) => push({ tone, message })}
      />
    </AdminSection>
  );
}
