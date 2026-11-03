import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { bulkPatchUserStatus, getUsers, patchUserStatus } from '../../../lib/api/admin';
import type { AdminUserRow } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataTable, type Column } from '../../ui/DataTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection } from '../AdminSection';
import { BULK_SELECT_CLASSES, BulkActionBar, ROW_SELECT_CLASSES } from '../BulkActionBar';
import { TableSkeleton } from '../AdminSkeletons';
import { formatDate, type PushToast } from '../sections';

/** Role → icon for the role pill, replacing the old nested ternary (R20). */
const ROLE_ICONS: Record<string, string> = {
  admin: 'shieldCheck',
  landlord: 'buildingOffice',
  boarder: 'user',
};

function RoleBadge({ role }: { role: string }) {
  return <StatusBadge status={role} label={role} icon={ROLE_ICONS[role] ?? 'user'} />;
}

type PendingConfirm = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  run: () => void;
};

/**
 * Accounts: the platform's user table.
 *
 * Owns its own query, mutations and selection state, so leaving the section
 * clears the bulk selection by unmounting — the reset the old `handleTabChange`
 * performed by hand (R10).
 */
export function UsersSection({ token, push }: { token: string; push: PushToast }) {
  const queryClient = useQueryClient();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('suspended');
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => getUsers(token),
    enabled: Boolean(token),
  });

  const patchUser = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: string }) =>
      patchUserStatus(token, userId, status),
    onSuccess: result => {
      push({ tone: 'success', message: result.message });
      setConfirm(null);
      invalidate();
    },
    onError: (error: Error) => {
      push({ tone: 'error', message: error.message });
      setConfirm(null);
    },
  });

  const bulkUsers = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
      bulkPatchUserStatus(token, ids, status),
    onSuccess: result => {
      const failed = result.data?.failed?.length ?? 0;
      push({ tone: 'success', message: result.message });
      if (failed > 0) push({ tone: 'error', message: `${failed} failed — check selection` });
      // keep failed selected, clear successes
      if (failed === 0) setSelected(new Set());
      else setSelected(new Set(result.data?.failed.map(f => f.id) ?? []));
      if (result.data?.skippedSelf) push({ tone: 'info', message: 'Skipped your own account' });
      setConfirm(null);
      invalidate();
    },
    onError: (error: Error) => {
      push({ tone: 'error', message: error.message });
      setConfirm(null);
    },
  });

  const overCap = selected.size > 100;
  const rows = users.data?.data ?? [];

  /**
   * Switching an account *to* `active` is reversible and applies at once;
   * banning or suspending is a negative outcome and confirms first (D12/D21).
   * The control is a controlled select bound to server state, so it snaps back
   * to the current status rather than showing a value that hasn't committed.
   */
  function requestStatus(row: AdminUserRow, status: string) {
    if (status === 'active') {
      patchUser.mutate({ userId: row.id, status });
      return;
    }

    setConfirm({
      title: `${status === 'banned' ? 'Ban' : 'Suspend'} ${row.first_name} ${row.last_name}?`,
      message: `This will set account_status to "${status}" for ${row.first_name} ${row.last_name}. This is a soft update and can be reversed.`,
      confirmLabel: status.charAt(0).toUpperCase() + status.slice(1),
      run: () => patchUser.mutate({ userId: row.id, status }),
    });
  }

  function requestBulk() {
    const count = selected.size;
    setConfirm({
      title: `${
        bulkStatus === 'active' ? 'Activate' : bulkStatus === 'suspended' ? 'Suspend' : 'Ban'
      } ${count} user${count > 1 ? 's' : ''}?`,
      message: `This will set account_status to "${bulkStatus}" for ${count} selected user${
        count > 1 ? 's' : ''
      }. This is a soft update and can be reversed.`,
      confirmLabel:
        bulkStatus === 'banned' || bulkStatus === 'suspended'
          ? bulkStatus.charAt(0).toUpperCase() + bulkStatus.slice(1)
          : 'Apply',
      run: () => bulkUsers.mutate({ ids: Array.from(selected), status: bulkStatus }),
    });
  }

  const columns: Column<AdminUserRow>[] = [
    { header: 'Name', cell: row => `${row.first_name} ${row.last_name}` },
    { header: 'Email', cell: row => row.email },
    { header: 'Role', cell: row => <RoleBadge role={row.role} /> },
    {
      header: 'Status',
      cell: row => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.account_status} />
          <select
            aria-label="Change account status"
            className={ROW_SELECT_CLASSES}
            value={row.account_status}
            onChange={event => requestStatus(row, event.target.value)}
          >
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="banned">banned</option>
          </select>
        </div>
      ),
    },
    { header: 'Joined', cell: row => formatDate(row.created_at) },
  ];

  return (
    <AdminSection
      section="users"
      isLoading={users.isLoading}
      error={users.error}
      empty={!users.data?.data.length}
      emptyTitle="No users found"
      emptyIcon="users"
      skeleton={<TableSkeleton rows={6} columns={5} />}
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
        rows.length ? <p className="mb-3 text-xs text-gray-ink">{rows.length} users</p> : null
      }
    >
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
          busy={bulkUsers.isPending}
          overCap={overCap}
          onApply={requestBulk}
          onCancel={() => {
            setSelectMode(false);
            setSelected(new Set());
          }}
          actionControl={
            <select
              aria-label="Bulk status"
              value={bulkStatus}
              onChange={event => setBulkStatus(event.target.value)}
              className={BULK_SELECT_CLASSES}
            >
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="banned">banned</option>
            </select>
          }
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? null}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        busy={patchUser.isPending || bulkUsers.isPending}
        onConfirm={() => confirm?.run()}
        onCancel={() => setConfirm(null)}
      />
    </AdminSection>
  );
}
