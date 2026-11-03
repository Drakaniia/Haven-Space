import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { bulkPatchApplicationStatus, getApplications } from '../../../lib/api/admin';
import type { AdminApplicationRow } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataTable, type Column } from '../../ui/DataTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection, StatStrip } from '../AdminSection';
import {
  FilterChips,
  NoMatches,
  SearchField,
  TableToolbar,
  countBy,
  matchesQuery,
  resultCount,
} from '../AdminToolbar';
import { BULK_SELECT_CLASSES, BulkActionBar } from '../BulkActionBar';
import { LandlordDocumentsModal } from '../LandlordDocumentsModal';
import { StatStripSkeleton, TableSkeleton, ToolbarSkeleton } from '../AdminSkeletons';
import { formatDate, type PushToast } from '../sections';

type PendingConfirm = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  run: () => void;
};

/** Known statuses lead the filter in this order; anything else follows. */
const STATUS_ORDER = ['pending', 'approved', 'rejected'];

function statusLabel(status: string): string {
  const text = status.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Boarder applications across every property.
 *
 * Its figures describe *this* section's data, so they sit above the table as
 * one compact strip rather than four cards. It also owns an entry point into
 * the verification-document review modal (the landlord name on each row).
 */
export function ApplicationsSection({ token, push }: { token: string; push: PushToast }) {
  const queryClient = useQueryClient();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('reject');
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  /** Landlord whose verification documents are open in the review modal. */
  const [documentLandlordId, setDocumentLandlordId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

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

  const statusCounts = useMemo(() => countBy(rows, row => row.status), [rows]);
  const statusOptions = useMemo(() => {
    const keys = Object.keys(statusCounts).sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a);
      const bi = STATUS_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
    });
    return [
      { value: 'all', label: 'All' },
      ...keys.map(key => ({ value: key, label: statusLabel(key), count: statusCounts[key] })),
    ];
  }, [statusCounts]);
  const visible = useMemo(
    () =>
      rows.filter(
        row =>
          (status === 'all' || row.status === status) &&
          matchesQuery(
            query,
            `${row.boarder_first} ${row.boarder_last}`,
            row.boarder_email,
            `${row.landlord_first} ${row.landlord_last}`,
            row.room_title
          )
      ),
    [rows, status, query]
  );
  const visibleIds = new Set(visible.map(row => row.id));
  const hiddenSelected = Array.from(selected).filter(id => !visibleIds.has(id)).length;
  const filtered = query.trim() !== '' || status !== 'all';

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
    {
      header: 'Boarder',
      cell: row => (
        <div className="min-w-[11rem]">
          <p className="font-medium text-ink">{`${row.boarder_first} ${row.boarder_last}`}</p>
          <p className="text-xs text-gray-ink">{row.boarder_email}</p>
        </div>
      ),
    },
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
            className="-mx-1 whitespace-nowrap rounded px-1 py-0.5 text-left text-sm font-medium text-primary transition-[color,transform] duration-100 ease-out hover:underline active:scale-[0.98] motion-reduce:transition-none"
            aria-label={`View verification documents for ${row.landlord_first} ${row.landlord_last}`}
            onClick={() => setDocumentLandlordId(row.landlord_id)}
          >
            {`${row.landlord_first} ${row.landlord_last}`}
          </button>
        ),
    },
    {
      header: 'Room',
      cell: row => row.room_title ?? <span className="text-muted">No room</span>,
    },
    { header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    {
      header: 'Applied',
      cell: row => <span className="whitespace-nowrap text-gray-ink">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <AdminSection
      section="applications"
      isLoading={applications.isLoading}
      error={applications.error}
      onRetry={() => void applications.refetch()}
      empty={!applications.data?.data.applications.length}
      emptyTitle="No applications yet"
      emptyDescription="Applications appear here when boarders apply for a room on a published listing."
      emptyIcon="application"
      skeleton={
        <>
          <StatStripSkeleton count={4} />
          <div className="mt-6">
            <ToolbarSkeleton chips={4} />
            <TableSkeleton rows={6} columns={5} />
          </div>
        </>
      }
      actions={
        rows.length ? (
          <Button
            variant={selectMode ? 'secondary' : 'outline'}
            size="sm"
            aria-pressed={selectMode}
            onClick={() => {
              if (selectMode) setSelected(new Set());
              setSelectMode(value => !value);
            }}
          >
            {selectMode ? 'Done selecting' : 'Select'}
          </Button>
        ) : null
      }
      toolbar={
        <>
          {stats ? (
            <div className="mb-6">
              <StatStrip
                label="Application figures"
                items={[
                  { label: 'Total', value: String(stats.total) },
                  {
                    label: 'Pending',
                    value: String(stats.pending),
                    sub: stats.pending > 0 ? 'Waiting on a landlord' : 'None waiting',
                    tone: stats.pending > 0 ? 'attention' : 'default',
                  },
                  { label: 'Approved', value: String(stats.approved) },
                  {
                    label: 'Answered',
                    value: `${stats.processed_rate_percent}%`,
                    sub: `${stats.rejected} rejected`,
                  },
                ]}
              />
            </div>
          ) : null}
          <TableToolbar
            count={resultCount(visible.length, rows.length, 'application', 'applications')}
          >
            <SearchField
              label="Search applications"
              placeholder="Search boarder, landlord or room"
              value={query}
              onChange={setQuery}
            />
            <FilterChips<string>
              label="Filter by status"
              value={status}
              onChange={setStatus}
              options={statusOptions}
            />
          </TableToolbar>
        </>
      }
    >
      {visible.length === 0 && filtered ? (
        <NoMatches
          noun="applications"
          onClear={() => {
            setQuery('');
            setStatus('all');
          }}
        />
      ) : (
        <DataTable
          rows={visible}
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
              if (visible.length > 100)
                push({ tone: 'info', message: 'Selected first 100 — max 100 per bulk operation' });
              setSelected(new Set(visible.slice(0, 100).map(r => r.id)));
            } else setSelected(new Set());
          }}
        />
      )}

      {selectMode && selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          hiddenCount={hiddenSelected}
          busy={bulkApplications.isPending}
          overCap={overCap}
          onApply={requestBulk}
          onCancel={() => {
            setSelectMode(false);
            setSelected(new Set());
          }}
          actionLabel="Action"
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
