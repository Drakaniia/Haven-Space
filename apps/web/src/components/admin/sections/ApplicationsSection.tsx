import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { bulkPatchApplicationStatus, getApplications } from '../../../lib/api/admin';
import type { AdminApplicationRow } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataTable, type Column } from '../../ui/DataTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection, StatCard } from '../AdminSection';
import { BULK_SELECT_CLASSES, BulkActionBar } from '../BulkActionBar';
import { LandlordDocumentsModal } from '../LandlordDocumentsModal';
import { StatsGridSkeleton, TableSkeleton } from '../AdminSkeletons';
import { formatDate, type PushToast } from '../sections';

type PendingConfirm = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  run: () => void;
};

/**
 * Boarder applications across every property.
 *
 * Keeps its own four-stat block (these describe *this* section's data, unlike
 * the platform counters that moved to Overview), and owns the entry point into
 * the verification-document review modal.
 */
export function ApplicationsSection({ token, push }: { token: string; push: PushToast }) {
  const queryClient = useQueryClient();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('reject');
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  /** Landlord whose verification documents are open in the review modal. */
  const [documentLandlordId, setDocumentLandlordId] = useState<number | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const applications = useQuery({
    queryKey: ['admin', 'applications'],
    queryFn: () => getApplications(token),
    enabled: Boolean(token),
  });

  const bulkApplications = useMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: 'approve' | 'reject' }) =>
      bulkPatchApplicationStatus(token, ids, action),
    onSuccess: result => {
      const failed = result.data?.failed?.length ?? 0;
      push({ tone: 'success', message: result.message });
      if (failed > 0) push({ tone: 'error', message: `${failed} failed` });
      if (failed === 0) setSelected(new Set());
      else setSelected(new Set(result.data?.failed.map(f => f.id) ?? []));
      setConfirm(null);
      invalidate();
    },
    onError: (error: Error) => {
      push({ tone: 'error', message: error.message });
      setConfirm(null);
    },
  });

  const overCap = selected.size > 100;
  const rows = applications.data?.data.applications ?? [];
  const stats = applications.data?.data.stats;

  function requestBulk() {
    const count = selected.size;
    setConfirm({
      title: `${bulkAction === 'approve' ? 'Approve' : 'Reject'} ${count} application${
        count > 1 ? 's' : ''
      }?`,
      message: `This will set status to "${
        bulkAction === 'approve' ? 'approved' : 'rejected'
      }" for ${count} selected applications.`,
      confirmLabel: bulkAction === 'approve' ? 'Approve' : 'Reject',
      run: () => bulkApplications.mutate({ ids: Array.from(selected), action: bulkAction }),
    });
  }

  const columns: Column<AdminApplicationRow>[] = [
    { header: 'Boarder', cell: row => `${row.boarder_first} ${row.boarder_last}` },
    { header: 'Boarder email', cell: row => row.boarder_email },
    {
      header: 'Landlord',
      // The landlord name is a record link that opens the verification-documents
      // modal — it is not a row action, so it keeps link styling. While selection
      // mode is on the row belongs to the bulk flow, so the name stays plain text.
      cell: row =>
        selectMode ? (
          `${row.landlord_first} ${row.landlord_last}`
        ) : (
          <button
            type="button"
            className="-mx-1 rounded px-1 py-0.5 text-left text-sm font-medium text-primary transition-all duration-100 ease-out hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] motion-reduce:transition-none"
            aria-label={`View verification documents for ${row.landlord_first} ${row.landlord_last}`}
            onClick={() => setDocumentLandlordId(row.landlord_id)}
          >
            {`${row.landlord_first} ${row.landlord_last}`}
          </button>
        ),
    },
    { header: 'Room', cell: row => row.room_title ?? '—' },
    { header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { header: 'Applied', cell: row => formatDate(row.created_at) },
  ];

  return (
    <AdminSection
      section="applications"
      isLoading={applications.isLoading}
      error={applications.error}
      empty={!applications.data?.data.applications.length}
      emptyTitle="No applications"
      emptyIcon="application"
      skeleton={
        <>
          <StatsGridSkeleton count={4} />
          <div className="mt-4">
            <TableSkeleton rows={5} columns={6} />
          </div>
        </>
      }
      actions={
        rows.length ? (
          <Button
            variant={selectMode ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              if (selectMode) setSelected(new Set());
              setSelectMode(value => !value);
            }}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </Button>
        ) : null
      }
      toolbar={
        rows.length ? (
          <p className="mb-3 text-xs text-gray-ink">{rows.length} applications</p>
        ) : null
      }
    >
      {stats ? (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total" value={String(stats.total)} icon="application" />
          <StatCard label="Pending" value={String(stats.pending)} icon="clock" />
          <StatCard label="Approved" value={String(stats.approved)} icon="check" />
          <StatCard
            label="Processed rate"
            value={`${stats.processed_rate_percent}%`}
            sub={`${stats.rejected} rejected`}
            icon="analytics"
          />
        </div>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        keyFor={row => row.id}
        selectable={selectMode}
        selectedIds={selected as Set<string | number>}
        onToggle={id => {
          const next = new Set(selected);
          if (next.has(id as number)) next.delete(id as number);
          else {
            if (next.size >= 100) {
              push({ tone: 'error', message: 'Max 100 per bulk operation' });
              return;
            }
            next.add(id as number);
          }
          setSelected(next);
        }}
        onToggleAll={checked => {
          if (checked) {
            if (rows.length > 100)
              push({ tone: 'info', message: 'Selected first 100 — max 100 per bulk operation' });
            setSelected(new Set(rows.slice(0, 100).map(r => r.id)));
          } else setSelected(new Set());
        }}
      />

      {selectMode && selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          busy={bulkApplications.isPending}
          overCap={overCap}
          onApply={requestBulk}
          onCancel={() => {
            setSelectMode(false);
            setSelected(new Set());
          }}
          actionControl={
            <select
              aria-label="Bulk application action"
              value={bulkAction}
              onChange={event => setBulkAction(event.target.value as 'approve' | 'reject')}
              className={BULK_SELECT_CLASSES}
            >
              <option value="approve">approve</option>
              <option value="reject">reject</option>
            </select>
          }
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? null}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        busy={bulkApplications.isPending}
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
