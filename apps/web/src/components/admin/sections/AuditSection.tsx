import { useQuery } from '@tanstack/react-query';
import { getAuditLog } from '../../../lib/api/admin';
import type { AdminAuditLogEntry } from '../../../lib/types';
import { DataTable, type Column } from '../../ui/DataTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection } from '../AdminSection';
import { TableSkeleton } from '../AdminSkeletons';
import { formatDate } from '../sections';

/** Every administrative action, newest first. Read-only. */
export function AuditSection({ token }: { token: string }) {
  const auditLog = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => getAuditLog(token),
    enabled: Boolean(token),
  });

  const columns: Column<AdminAuditLogEntry>[] = [
    { header: 'When', cell: row => formatDate(row.created_at) },
    { header: 'Admin', cell: row => row.actor_name || row.actor_email || `#${row.actor_id}` },
    { header: 'Entity', cell: row => row.entity },
    { header: 'Action', cell: row => <StatusBadge status={row.action} /> },
    { header: 'Targets', cell: row => (row.ids.length ? row.ids.join(', ') : '—') },
  ];

  return (
    <AdminSection
      section="audit"
      isLoading={auditLog.isLoading}
      error={auditLog.error}
      empty={!auditLog.data?.data.length}
      emptyTitle="No admin activity recorded yet"
      emptyIcon="document"
      skeleton={<TableSkeleton rows={6} columns={5} />}
      toolbar={
        auditLog.data?.data.length ? (
          <p className="mb-3 text-xs text-gray-ink">
            {auditLog.data.data.length} of {auditLog.data.meta.total} recorded actions — newest
            first
          </p>
        ) : null
      }
    >
      <DataTable rows={auditLog.data?.data ?? []} columns={columns} keyFor={row => row.id} />
    </AdminSection>
  );
}
