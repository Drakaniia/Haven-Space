import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { PropertyAccessTab } from '../../components/admin/PropertyAccessTab';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ToastStack, useToasts } from '../../components/ui/Toast';
import {
  SettingsSkeleton,
  StatsGridSkeleton,
  TableSkeleton,
} from '../../components/admin/AdminSkeletons';
import {
  bulkPatchApplicationStatus,
  bulkPatchPropertyStatus,
  bulkPatchUserStatus,
  getApplications,
  getLandlords,
  getProperties,
  getSettings,
  getSummary,
  getUsers,
  patchPropertyStatus,
  patchSettings,
  patchUserStatus,
  updateLandlordVerification,
} from '../../lib/api/admin';
import { useAuth } from '../../lib/auth-context';
import type {
  AdminApplicationRow,
  AdminLandlordRow,
  AdminPropertyRow,
  AdminUserRow,
} from '../../lib/types';

export const Route = createFileRoute('/admin/')({
  component: () => (
    <Protected role="admin">
      <AdminOverview />
    </Protected>
  ),
});

type TabKey = 'users' | 'properties' | 'applications' | 'landlords' | 'settings' | 'propertyAccess';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'users', label: 'Users', icon: 'users' },
  { key: 'properties', label: 'Properties', icon: 'list' },
  { key: 'applications', label: 'Applications', icon: 'application' },
  { key: 'landlords', label: 'Landlords', icon: 'shieldCheck' },
  { key: 'propertyAccess', label: 'Property Access', icon: 'users' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}) {
  return (
    <Card className="flex items-start gap-3">
      <Icon name={icon} size={24} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-sm text-gray-ink">{label}</p>
        <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
        {sub ? <p className="mt-1 text-sm text-gray-ink">{sub}</p> : null}
      </div>
    </Card>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === 'admin'
      ? 'bg-purple-100 text-purple-700'
      : role === 'landlord'
      ? 'bg-mint text-primary-dark'
      : 'bg-blue-100 text-blue-700';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      <Icon
        name={role === 'landlord' ? 'buildingOffice' : role === 'admin' ? 'shieldCheck' : 'user'}
        size={12}
        className="shrink-0"
      />
      {role}
    </span>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function AdminOverview() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('users');
  const { toasts, push, dismiss } = useToasts();

  // Selection mode + selected sets — per bulk-enabled tabs only (users/properties/applications)
  const [usersSelectMode, setUsersSelectMode] = useState(false);
  const [propsSelectMode, setPropsSelectMode] = useState(false);
  const [appsSelectMode, setAppsSelectMode] = useState(false);
  const [usersSelected, setUsersSelected] = useState<Set<number>>(new Set());
  const [propsSelected, setPropsSelected] = useState<Set<number>>(new Set());
  const [appsSelected, setAppsSelected] = useState<Set<number>>(new Set());
  const [userBulkStatus, setUserBulkStatus] = useState('suspended');
  const [propBulkAction, setPropBulkAction] = useState('reject');
  const [appBulkAction, setAppBulkAction] = useState<'approve' | 'reject'>('reject');
  const [confirm, setConfirm] = useState<null | { title: string; message: string; confirmLabel: string; onConfirm: () => void }>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const handleTabChange = (next: TabKey) => {
    // Reset selection when leaving a bulk tab (scoped reset per-tab)
    if (tab === 'users') {
      setUsersSelectMode(false);
      setUsersSelected(new Set());
    }
    if (tab === 'properties') {
      setPropsSelectMode(false);
      setPropsSelected(new Set());
    }
    if (tab === 'applications') {
      setAppsSelectMode(false);
      setAppsSelected(new Set());
    }
    setTab(next);
  };

  const summary = useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: () => getSummary(token!),
    enabled: Boolean(token),
  });

  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => getUsers(token!),
    enabled: Boolean(token) && tab === 'users',
  });

  const properties = useQuery({
    queryKey: ['admin', 'properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token) && tab === 'properties',
  });

  const applications = useQuery({
    queryKey: ['admin', 'applications'],
    queryFn: () => getApplications(token!),
    enabled: Boolean(token) && tab === 'applications',
  });

  const landlords = useQuery({
    queryKey: ['admin', 'landlords'],
    queryFn: () => getLandlords(token!),
    enabled: Boolean(token) && tab === 'landlords',
  });

  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => getSettings(token!),
    enabled: Boolean(token) && tab === 'settings',
  });

  const patchUser = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: string }) =>
      patchUserStatus(token!, userId, status),
    onSuccess: result => {
      push({ tone: 'success', message: result.message });
      invalidate();
    },
    onError: (error: Error) => push({ tone: 'error', message: error.message }),
  });

  const patchProperty = useMutation({
    mutationFn: ({ propertyId, action }: { propertyId: number; action: string }) =>
      patchPropertyStatus(token!, propertyId, action),
    onSuccess: result => {
      push({ tone: 'success', message: result.message });
      invalidate();
    },
    onError: (error: Error) => push({ tone: 'error', message: error.message }),
  });

  const patchLandlord = useMutation({
    mutationFn: ({ landlordId, action }: { landlordId: number; action: 'approve' | 'reject' }) =>
      updateLandlordVerification(token!, landlordId, action),
    onSuccess: result => {
      push({ tone: 'success', message: result.message });
      invalidate();
    },
    onError: (error: Error) => push({ tone: 'error', message: error.message }),
  });

  const saveSettings = useMutation({
    mutationFn: (values: Record<string, string>) => patchSettings(token!, values),
    onSuccess: result => {
      push({ tone: 'success', message: result.message });
      invalidate();
    },
    onError: (error: Error) => push({ tone: 'error', message: error.message }),
  });

  const bulkUsers = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
      bulkPatchUserStatus(token!, ids, status),
    onSuccess: result => {
      const updated = result.data?.updated?.length ?? 0;
      const failed = result.data?.failed?.length ?? 0;
      if (failed === 0) {
        push({ tone: 'success', message: result.message });
      } else {
        push({ tone: 'success', message: result.message });
        if (failed > 0) push({ tone: 'error', message: `${failed} failed — check selection` });
      }
      // keep failed selected, clear successes
      if (failed === 0) setUsersSelected(new Set());
      else {
        const failedIds = new Set(result.data?.failed.map(f => f.id) ?? []);
        setUsersSelected(failedIds);
      }
      if (result.data?.skippedSelf) push({ tone: 'info', message: 'Skipped your own account' });
      invalidate();
    },
    onError: (error: Error) => push({ tone: 'error', message: error.message }),
  });

  const bulkProperties = useMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: string }) =>
      bulkPatchPropertyStatus(token!, ids, action),
    onSuccess: result => {
      const failed = result.data?.failed?.length ?? 0;
      push({ tone: failed === 0 ? 'success' : 'success', message: result.message });
      if (failed > 0) push({ tone: 'error', message: `${failed} failed` });
      if (failed === 0) setPropsSelected(new Set());
      else setPropsSelected(new Set(result.data?.failed.map(f => f.id) ?? []));
      invalidate();
    },
    onError: (error: Error) => push({ tone: 'error', message: error.message }),
  });

  const bulkApplications = useMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: 'approve' | 'reject' }) =>
      bulkPatchApplicationStatus(token!, ids, action),
    onSuccess: result => {
      const failed = result.data?.failed?.length ?? 0;
      push({ tone: 'success', message: result.message });
      if (failed > 0) push({ tone: 'error', message: `${failed} failed` });
      if (failed === 0) setAppsSelected(new Set());
      else setAppsSelected(new Set(result.data?.failed.map(f => f.id) ?? []));
      invalidate();
    },
    onError: (error: Error) => push({ tone: 'error', message: error.message }),
  });

  const userColumns: Column<AdminUserRow>[] = [
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
            className="rounded border border-gray-300 px-1.5 py-0.5 text-xs"
            value={row.account_status}
            onChange={event => patchUser.mutate({ userId: row.id, status: event.target.value })}
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

  const propertyColumns: Column<AdminPropertyRow>[] = [
    { header: 'Title', cell: row => row.title },
    { header: 'Price', cell: row => `₱${Number(row.price).toLocaleString()}` },
    { header: 'Status', cell: row => <StatusBadge status={row.listing_moderation_status} /> },
    { header: 'Landlord', cell: row => `${row.landlord_first} ${row.landlord_last}` },
    {
      header: 'Actions',
      cell: row => (
        <div className="flex gap-2">
          <button
            type="button"
            className="text-sm text-green-600 hover:underline"
            onClick={() => patchProperty.mutate({ propertyId: row.id, action: 'publish' })}
          >
            Publish
          </button>
          <button
            type="button"
            className="text-sm text-red-600 hover:underline"
            onClick={() => patchProperty.mutate({ propertyId: row.id, action: 'reject' })}
          >
            Reject
          </button>
          <button
            type="button"
            className="text-sm text-yellow-600 hover:underline"
            onClick={() => patchProperty.mutate({ propertyId: row.id, action: 'flag' })}
          >
            Flag
          </button>
        </div>
      ),
    },
  ];

  const applicationColumns: Column<AdminApplicationRow>[] = [
    { header: 'Boarder', cell: row => `${row.boarder_first} ${row.boarder_last}` },
    { header: 'Boarder email', cell: row => row.boarder_email },
    { header: 'Landlord', cell: row => `${row.landlord_first} ${row.landlord_last}` },
    { header: 'Room', cell: row => row.room_title ?? '—' },
    { header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { header: 'Applied', cell: row => formatDate(row.created_at) },
  ];

  const landlordColumns: Column<AdminLandlordRow>[] = [
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
          <div className="flex gap-2">
            <button
              type="button"
              className="text-sm text-green-600 hover:underline"
              onClick={() => patchLandlord.mutate({ landlordId: row.id, action: 'approve' })}
            >
              Approve
            </button>
            <button
              type="button"
              className="text-sm text-red-600 hover:underline"
              onClick={() => patchLandlord.mutate({ landlordId: row.id, action: 'reject' })}
            >
              Reject
            </button>
          </div>
        ),
    },
    { header: 'Joined', cell: row => formatDate(row.created_at) },
  ];

  const counts = summary.data?.data.counts;

  const isBulkBusy = bulkUsers.isPending || bulkProperties.isPending || bulkApplications.isPending;

  // Derived: cap handling
  const usersOverCap = usersSelected.size > 100;
  const propsOverCap = propsSelected.size > 100;
  const appsOverCap = appsSelected.size > 100;

  return (
    <RoleShell title="Admin overview">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ink">Command Center</h2>
        <p className="mt-1 text-sm text-gray-ink">Platform overview — accounts, listings, and applications.</p>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />

      {summary.isLoading ? (
        <div aria-busy="true" aria-live="polite">
          <StatsGridSkeleton count={4} />
        </div>
      ) : summary.error ? (
        <ErrorState message={summary.error.message} />
      ) : counts ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Users" value={String(counts.users_total)} sub={`${counts.users_boarder} boarders · ${counts.users_landlord} landlords`} icon="users" />
          <StatCard label="Properties" value={String(counts.properties_total)} sub={`${counts.properties_pending_moderation} pending review`} icon="list" />
          <StatCard label="Applications" value={String(counts.applications_total)} icon="application" />
          <StatCard label="Landlord verification" value={String(counts.landlords_pending_verification)} sub="awaiting approval" icon="shieldCheck" />
        </div>
      ) : null}

      <div className="mt-6">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200">
          {TABS.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleTabChange(item.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${tab === item.key ? 'border-primary text-primary' : 'border-transparent text-gray-ink hover:text-gray-700'}`}
            >
              <Icon name={item.icon} size={16} className="shrink-0" />
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <AdminTab
            isLoading={users.isLoading}
            error={users.error}
            empty={!users.data?.data.length}
            emptyTitle="No users found"
            skeleton={<TableSkeleton rows={6} columns={5} />}
            toolbar={
              users.data?.data.length ? (
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-gray-ink">{users.data.data.length} users</p>
                  <Button
                    variant={usersSelectMode ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (usersSelectMode) {
                        setUsersSelectMode(false);
                        setUsersSelected(new Set());
                      } else setUsersSelectMode(true);
                    }}
                  >
                    {usersSelectMode ? 'Cancel' : 'Select'}
                  </Button>
                </div>
              ) : null
            }
          >
            {users.data ? (
              <DataTable
                rows={users.data.data}
                columns={userColumns}
                keyFor={row => row.id}
                selectable={usersSelectMode}
                selectedIds={usersSelected as Set<string | number>}
                onToggle={id => {
                  const next = new Set(usersSelected);
                  if (next.has(id as number)) next.delete(id as number);
                  else {
                    if (next.size >= 100) {
                      push({ tone: 'error', message: 'Max 100 per bulk operation' });
                      return;
                    }
                    next.add(id as number);
                  }
                  setUsersSelected(next);
                }}
                onToggleAll={checked => {
                  if (checked) {
                    const ids = users.data.data.slice(0, 100).map(r => r.id);
                    if (users.data.data.length > 100) push({ tone: 'info', message: 'Selected first 100 — max 100 per bulk operation' });
                    setUsersSelected(new Set(ids));
                  } else setUsersSelected(new Set());
                }}
              />
            ) : null}
          </AdminTab>
        )}
        {tab === 'properties' && (
          <AdminTab
            isLoading={properties.isLoading}
            error={properties.error}
            empty={!properties.data?.data.length}
            emptyTitle="No properties found"
            skeleton={<TableSkeleton rows={5} columns={5} />}
            toolbar={
              properties.data?.data.length ? (
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-gray-ink">{properties.data.data.length} properties</p>
                  <Button
                    variant={propsSelectMode ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (propsSelectMode) {
                        setPropsSelectMode(false);
                        setPropsSelected(new Set());
                      } else setPropsSelectMode(true);
                    }}
                  >
                    {propsSelectMode ? 'Cancel' : 'Select'}
                  </Button>
                </div>
              ) : null
            }
          >
            {properties.data ? (
              <DataTable
                rows={properties.data.data}
                columns={propertyColumns}
                keyFor={row => row.id}
                selectable={propsSelectMode}
                selectedIds={propsSelected as Set<string | number>}
                onToggle={id => {
                  const next = new Set(propsSelected);
                  if (next.has(id as number)) next.delete(id as number);
                  else {
                    if (next.size >= 100) {
                      push({ tone: 'error', message: 'Max 100 per bulk operation' });
                      return;
                    }
                    next.add(id as number);
                  }
                  setPropsSelected(next);
                }}
                onToggleAll={checked => {
                  if (checked) {
                    const ids = properties.data.data.slice(0, 100).map(r => r.id);
                    if (properties.data.data.length > 100) push({ tone: 'info', message: 'Selected first 100 — max 100 per bulk operation' });
                    setPropsSelected(new Set(ids));
                  } else setPropsSelected(new Set());
                }}
              />
            ) : null}
          </AdminTab>
        )}
        {tab === 'applications' && (
          <AdminTab
            isLoading={applications.isLoading}
            error={applications.error}
            empty={!applications.data?.data.applications.length}
            emptyTitle="No applications"
            skeleton={
              <>
                <StatsGridSkeleton count={4} />
                <div className="mt-4">
                  <TableSkeleton rows={5} columns={6} />
                </div>
              </>
            }
            toolbar={
              applications.data?.data.applications.length ? (
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-gray-ink">{applications.data.data.applications.length} applications</p>
                  <Button
                    variant={appsSelectMode ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (appsSelectMode) {
                        setAppsSelectMode(false);
                        setAppsSelected(new Set());
                      } else setAppsSelectMode(true);
                    }}
                  >
                    {appsSelectMode ? 'Cancel' : 'Select'}
                  </Button>
                </div>
              ) : null
            }
          >
            {applications.data ? (
              <>
                <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <StatCard label="Total" value={String(applications.data.data.stats.total)} icon="application" />
                  <StatCard label="Pending" value={String(applications.data.data.stats.pending)} icon="clock" />
                  <StatCard label="Approved" value={String(applications.data.data.stats.approved)} icon="check" />
                  <StatCard label="Processed rate" value={`${applications.data.data.stats.processed_rate_percent}%`} sub={`${applications.data.data.stats.rejected} rejected`} icon="analytics" />
                </div>
                <DataTable
                  rows={applications.data.data.applications}
                  columns={applicationColumns}
                  keyFor={row => row.id}
                  selectable={appsSelectMode}
                  selectedIds={appsSelected as Set<string | number>}
                  onToggle={id => {
                    const next = new Set(appsSelected);
                    if (next.has(id as number)) next.delete(id as number);
                    else {
                      if (next.size >= 100) {
                        push({ tone: 'error', message: 'Max 100 per bulk operation' });
                        return;
                      }
                      next.add(id as number);
                    }
                    setAppsSelected(next);
                  }}
                  onToggleAll={checked => {
                    if (checked) {
                      const ids = applications.data.data.applications.slice(0, 100).map(r => r.id);
                      if (applications.data.data.applications.length > 100) push({ tone: 'info', message: 'Selected first 100 — max 100 per bulk operation' });
                      setAppsSelected(new Set(ids));
                    } else setAppsSelected(new Set());
                  }}
                />
              </>
            ) : null}
          </AdminTab>
        )}

        {tab === 'landlords' && (
          <AdminTab
            isLoading={landlords.isLoading}
            error={landlords.error}
            empty={!landlords.data?.data.length}
            emptyTitle="No landlords found"
            skeleton={<TableSkeleton rows={5} columns={6} />}
          >
            {landlords.data ? <DataTable rows={landlords.data.data} columns={landlordColumns} keyFor={row => row.id} /> : null}
          </AdminTab>
        )}

        {tab === 'propertyAccess' && <PropertyAccessTab token={token!} />}

        {tab === 'settings' && (
          <AdminTab isLoading={settings.isLoading} error={settings.error} empty={false} skeleton={<SettingsSkeleton />}>
            {settings.data ? <SettingsForm settings={settings.data.data} busy={saveSettings.isPending} onSave={values => saveSettings.mutate(values)} /> : null}
          </AdminTab>
        )}
      </div>

      {/* Sticky bulk bar — Apple Mail style */}
      {tab === 'users' && usersSelectMode && usersSelected.size > 0 && (
        <div className="sticky bottom-4 z-30 mt-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <span className="text-sm font-medium text-ink">{usersSelected.size} selected</span>
            <div className="flex items-center gap-2">
              <select
                aria-label="Bulk status"
                value={userBulkStatus}
                onChange={e => setUserBulkStatus(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm"
              >
                <option value="active">active</option>
                <option value="suspended">suspended</option>
                <option value="banned">banned</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                disabled={isBulkBusy || usersOverCap}
                onClick={() =>
                  setConfirm({
                    title: `${userBulkStatus === 'active' ? 'Activate' : userBulkStatus === 'suspended' ? 'Suspend' : 'Ban'} ${usersSelected.size} user${usersSelected.size > 1 ? 's' : ''}?`,
                    message: `This will set account_status to "${userBulkStatus}" for ${usersSelected.size} selected user${usersSelected.size > 1 ? 's' : ''}. This is a soft update and can be reversed.`,
                    confirmLabel: userBulkStatus === 'banned' || userBulkStatus === 'suspended' ? userBulkStatus.charAt(0).toUpperCase() + userBulkStatus.slice(1) : 'Apply',
                    onConfirm: () => {
                      bulkUsers.mutate({ ids: Array.from(usersSelected), status: userBulkStatus });
                      setConfirm(null);
                    },
                  })
                }
              >
                Apply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUsersSelectMode(false);
                  setUsersSelected(new Set());
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
          {usersOverCap && <p className="mt-2 text-center text-xs text-red-600">Max 100 per bulk operation</p>}
        </div>
      )}
      {tab === 'properties' && propsSelectMode && propsSelected.size > 0 && (
        <div className="sticky bottom-4 z-30 mt-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <span className="text-sm font-medium text-ink">{propsSelected.size} selected</span>
            <div className="flex items-center gap-2">
              <select
                aria-label="Bulk property action"
                value={propBulkAction}
                onChange={e => setPropBulkAction(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm"
              >
                <option value="publish">publish</option>
                <option value="reject">reject</option>
                <option value="flag">flag</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                disabled={isBulkBusy || propsOverCap}
                onClick={() =>
                  setConfirm({
                    title: `${propBulkAction.charAt(0).toUpperCase() + propBulkAction.slice(1)} ${propsSelected.size} propert${propsSelected.size > 1 ? 'ies' : 'y'}?`,
                    message: `This will set moderation status to "${propBulkAction}" for ${propsSelected.size} selected properties.`,
                    confirmLabel: propBulkAction.charAt(0).toUpperCase() + propBulkAction.slice(1),
                    onConfirm: () => {
                      bulkProperties.mutate({ ids: Array.from(propsSelected), action: propBulkAction });
                      setConfirm(null);
                    },
                  })
                }
              >
                Apply
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setPropsSelectMode(false); setPropsSelected(new Set()); }}>
                Cancel
              </Button>
            </div>
          </div>
          {propsOverCap && <p className="mt-2 text-center text-xs text-red-600">Max 100 per bulk operation</p>}
        </div>
      )}
      {tab === 'applications' && appsSelectMode && appsSelected.size > 0 && (
        <div className="sticky bottom-4 z-30 mt-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <span className="text-sm font-medium text-ink">{appsSelected.size} selected</span>
            <div className="flex items-center gap-2">
              <select
                aria-label="Bulk application action"
                value={appBulkAction}
                onChange={e => setAppBulkAction(e.target.value as 'approve' | 'reject')}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm"
              >
                <option value="approve">approve</option>
                <option value="reject">reject</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                disabled={isBulkBusy || appsOverCap}
                onClick={() =>
                  setConfirm({
                    title: `${appBulkAction === 'approve' ? 'Approve' : 'Reject'} ${appsSelected.size} application${appsSelected.size > 1 ? 's' : ''}?`,
                    message: `This will set status to "${appBulkAction === 'approve' ? 'approved' : 'rejected'}" for ${appsSelected.size} selected applications.`,
                    confirmLabel: appBulkAction === 'approve' ? 'Approve' : 'Reject',
                    onConfirm: () => {
                      bulkApplications.mutate({ ids: Array.from(appsSelected), action: appBulkAction });
                      setConfirm(null);
                    },
                  })
                }
              >
                Apply
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setAppsSelectMode(false); setAppsSelected(new Set()); }}>
                Cancel
              </Button>
            </div>
          </div>
          {appsOverCap && <p className="mt-2 text-center text-xs text-red-600">Max 100 per bulk operation</p>}
        </div>
      )}

      {/* Apple design confirmation modal — glassmorphism via existing Modal */}
      <Modal open={Boolean(confirm)} title={confirm?.title ?? ''} onClose={() => setConfirm(null)}>
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-gray-600">{confirm.message}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)} disabled={isBulkBusy}>
                Cancel
              </Button>
              <Button variant="primary" onClick={confirm.onConfirm} disabled={isBulkBusy} className={confirm.confirmLabel.toLowerCase() === 'ban' || confirm.confirmLabel.toLowerCase() === 'reject' ? '!bg-red-600 hover:!bg-red-700' : ''}>
                {confirm.confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </RoleShell>
  );
}

function AdminTab({
  isLoading,
  error,
  empty,
  emptyTitle,
  skeleton,
  children,
  toolbar,
}: {
  isLoading: boolean;
  error: Error | null;
  empty: boolean;
  emptyTitle?: string;
  skeleton?: ReactNode;
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  if (isLoading)
    return (
      <div aria-busy="true" aria-live="polite">
        {skeleton ?? <TableSkeleton rows={5} columns={4} />}
      </div>
    );
  if (error) return <ErrorState message={error.message} />;
  if (empty) return <EmptyState title={emptyTitle ?? 'Nothing here'} />;
  return (
    <>
      {toolbar}
      {children}
    </>
  );
}

function SettingsForm({
  settings,
  busy,
  onSave,
}: {
  settings: Record<string, string>;
  busy: boolean;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(settings);
  const [saved, setSaved] = useState(false);

  const set = (key: string, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    setSaved(false);
  };

  return (
    <Card className="max-w-xl">
      <div className="mb-4 flex items-center gap-3">
        <Icon name="settings" size={24} className="shrink-0" />
        <div>
          <h2 className="font-semibold text-ink">System settings</h2>
          <p className="text-sm text-gray-ink">Platform-wide configuration values.</p>
        </div>
      </div>
      <form
        className="space-y-4"
        onSubmit={event => {
          event.preventDefault();
          onSave(values);
          setSaved(true);
        }}
      >
        {Object.entries(values).map(([key, value]) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium" htmlFor={`setting-${key}`}>
              {key.replaceAll('_', ' ')}
            </label>
            <input
              id={`setting-${key}`}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={value}
              onChange={event => set(key, event.target.value)}
            />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </Button>
          {saved ? <span className="text-sm text-green-600">Saved.</span> : null}
        </div>
      </form>
    </Card>
  );
}
