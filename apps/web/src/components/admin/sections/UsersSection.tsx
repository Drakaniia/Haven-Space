import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { bulkPatchUserStatus, getUsers, patchUserStatus } from '../../../lib/api/admin';
import type { AdminUserRow } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataTable, type Column } from '../../ui/DataTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection } from '../AdminSection';
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
import { TableSkeleton, ToolbarSkeleton } from '../AdminSkeletons';
import { formatDate, type PushToast } from '../sections';

/** Role → icon for the role pill (R20). */
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

type RoleFilter = 'all' | 'boarder' | 'landlord' | 'admin';
type StatusFilter = 'all' | 'active' | 'suspended' | 'banned';

const STATUS_VERBS: Record<string, string> = {
  active: 'Reactivate',
  suspended: 'Suspend',
  banned: 'Ban',
};

/**
 * Accounts: the platform's user table.
 *
 * Owns its own query, mutations and selection state, so leaving the section
 * clears the bulk selection by unmounting — the reset the old `handleTabChange`
 * performed by hand (R10).
 *
 * The inline status `<select>` became contextual row actions: an account shows
 * only the transitions it can make (an active account offers Suspend / Ban, a
 * suspended one Reactivate / Ban), each a real button named for its target.
 */
export function UsersSection({ token, push }: { token: string; push: PushToast }) {
  const queryClient = useQueryClient();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('suspended');
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

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

  const roleCounts = useMemo(() => countBy(rows, row => row.role), [rows]);
  const statusCounts = useMemo(() => countBy(rows, row => row.account_status), [rows]);
  const visible = useMemo(
    () =>
      rows.filter(
        row =>
          (role === 'all' || row.role === role) &&
          (status === 'all' || row.account_status === status) &&
          matchesQuery(query, `${row.first_name} ${row.last_name}`, row.email)
      ),
    [rows, role, status, query]
  );
  const visibleIds = new Set(visible.map(row => row.id));
  const hiddenSelected = Array.from(selected).filter(id => !visibleIds.has(id)).length;
  const filtered = query.trim() !== '' || role !== 'all' || status !== 'all';

  function clearFilters() {
    setQuery('');
    setRole('all');
    setStatus('all');
  }

  /**
   * Switching an account *to* `active` is reversible and applies at once;
   * banning or suspending is a negative outcome and confirms first (D12/D21).
   */
  function requestStatus(row: AdminUserRow, next: string) {
    if (next === 'active') {
      patchUser.mutate({ userId: row.id, status: next });
      return;
    }

    setConfirm({
      title: `${next === 'banned' ? 'Ban' : 'Suspend'} ${row.first_name} ${row.last_name}?`,
      message: `This will set account_status to "${next}" for ${row.first_name} ${row.last_name}. This is a soft update and can be reversed.`,
      confirmLabel: next.charAt(0).toUpperCase() + next.slice(1),
      run: () => patchUser.mutate({ userId: row.id, status: next }),
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
    {
      header: 'Account',
      cell: row => (
        <div className="min-w-[12rem]">
          <p className="font-medium text-ink">{`${row.first_name} ${row.last_name}`}</p>
          <p className="text-xs text-gray-ink">{row.email}</p>
        </div>
      ),
    },
    { header: 'Role', cell: row => <RoleBadge role={row.role} /> },
    { header: 'Status', cell: row => <StatusBadge status={row.account_status} /> },
    {
      header: 'Joined',
      cell: row => <span className="whitespace-nowrap text-gray-ink">{formatDate(row.created_at)}</span>,
    },
    {
      header: 'Actions',
      cell: row => {
        const name = `${row.first_name} ${row.last_name}`;
        const busy = patchUser.isPending && patchUser.variables?.userId === row.id;
        return (
          <div className="flex items-center gap-1">
            {(['active', 'suspended', 'banned'] as const)
              .filter(next => next !== row.account_status)
              .map(next => (
                <Button
                  key={next}
                  size="sm"
                  variant={next === 'active' ? 'ghost' : next === 'banned' ? 'dangerGhost' : 'warningGhost'}
                  disabled={busy || selectMode}
                  aria-label={`${STATUS_VERBS[next]} ${name}`}
                  onClick={() => requestStatus(row, next)}
                >
                  {STATUS_VERBS[next]}
                </Button>
              ))}
          </div>
        );
      },
    },
  ];

  return (
    <AdminSection
      section="users"
      isLoading={users.isLoading}
      error={users.error}
      onRetry={() => void users.refetch()}
      empty={!users.data?.data.length}
      emptyTitle="No users yet"
      emptyDescription="Accounts appear here as soon as boarders or landlords sign up."
      emptyIcon="users"
      skeleton={
        <>
          <ToolbarSkeleton chips={4} />
          <TableSkeleton rows={8} columns={5} />
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
        <TableToolbar count={resultCount(visible.length, rows.length, 'user', 'users')}>
          <SearchField
            label="Search users"
            placeholder="Search name or email"
            value={query}
            onChange={setQuery}
          />
          <FilterChips<RoleFilter>
            label="Filter by role"
            value={role}
            onChange={setRole}
            options={[
              { value: 'all', label: 'All roles' },
              { value: 'boarder', label: 'Boarders', count: roleCounts.boarder ?? 0 },
              { value: 'landlord', label: 'Landlords', count: roleCounts.landlord ?? 0 },
              { value: 'admin', label: 'Admins', count: roleCounts.admin ?? 0 },
            ]}
          />
          <FilterChips<StatusFilter>
            label="Filter by account status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'Any status' },
              { value: 'active', label: 'Active', count: statusCounts.active ?? 0 },
              { value: 'suspended', label: 'Suspended', count: statusCounts.suspended ?? 0 },
              { value: 'banned', label: 'Banned', count: statusCounts.banned ?? 0 },
            ]}
          />
        </TableToolbar>
      }
    >
      {visible.length === 0 && filtered ? (
        <NoMatches noun="users" onClear={clearFilters} />
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
          busy={bulkUsers.isPending}
          overCap={overCap}
          onApply={requestBulk}
          onCancel={() => {
            setSelectMode(false);
            setSelected(new Set());
          }}
          actionLabel="Set status to"
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
