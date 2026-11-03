import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { getAuditLog } from '../../../lib/api/admin';
import type { AdminAuditLogEntry } from '../../../lib/types';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection } from '../AdminSection';
import { FilterChips, NoMatches, SearchField, TableToolbar, countBy, matchesQuery } from '../AdminToolbar';
import { AuditLogSkeleton, ToolbarSkeleton } from '../AdminSkeletons';
import { AUDIT_ENTITY_LABELS, auditActor, describeAuditEntry } from '../audit-format';
import { dayKey, dayLabel, formatTime } from '../sections';

const ENTITY_ORDER = ['users', 'properties', 'applications', 'landlord_verification', 'message_report'];
const MAX_TARGETS = 6;

/** "#4, #9, #12 +3 more" — the full list stays available as a tooltip. */
function targetList(ids: number[]): string {
  const shown = ids.slice(0, MAX_TARGETS).map(id => `#${id}`).join(', ');
  return ids.length > MAX_TARGETS ? `${shown} +${ids.length - MAX_TARGETS} more` : shown;
}

/**
 * Every administrative action, newest first. Read-only.
 *
 * A log is read top-down by time, so it renders as one — entries grouped under
 * a day heading ("Today", "Yesterday", then dates), each a sentence ("Suspended
 * 2 accounts") with who did it, when, and which records it touched. A table
 * made every entry the same visual weight and buried the verb in a pill.
 */
export function AuditSection({ token }: { token: string }) {
  const [query, setQuery] = useState('');
  const [entity, setEntity] = useState('all');

  const auditLog = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => getAuditLog(token),
    enabled: Boolean(token),
  });

  const entries = auditLog.data?.data ?? [];
  const total = auditLog.data?.meta.total ?? entries.length;

  const entityCounts = useMemo(() => countBy(entries, entry => entry.entity), [entries]);
  const entityOptions = useMemo(() => {
    const keys = Object.keys(entityCounts).sort((a, b) => {
      const ai = ENTITY_ORDER.indexOf(a);
      const bi = ENTITY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
    });
    return [
      { value: 'all', label: 'Everything' },
      ...keys.map(key => ({
        value: key,
        label: AUDIT_ENTITY_LABELS[key] ?? key.replaceAll('_', ' '),
        count: entityCounts[key],
      })),
    ];
  }, [entityCounts]);

  const visible = useMemo(
    () =>
      entries.filter(
        entry =>
          (entity === 'all' || entry.entity === entity) &&
          matchesQuery(query, entry.actor_name, entry.actor_email, describeAuditEntry(entry).summary)
      ),
    [entries, entity, query]
  );

  // Consecutive grouping keeps the API's newest-first order intact.
  const days = useMemo(() => {
    const groups: { key: string; label: string; entries: AdminAuditLogEntry[] }[] = [];
    for (const entry of visible) {
      const key = dayKey(entry.created_at);
      const last = groups.at(-1);
      if (last && last.key === key) last.entries.push(entry);
      else groups.push({ key, label: dayLabel(entry.created_at), entries: [entry] });
    }
    return groups;
  }, [visible]);

  const filtered = query.trim() !== '' || entity !== 'all';
  const countLine =
    visible.length === entries.length
      ? entries.length === total
        ? `${total} recorded ${total === 1 ? 'action' : 'actions'}, newest first`
        : `The ${entries.length} most recent of ${total} recorded actions, newest first`
      : `${visible.length} of the ${entries.length} most recent actions`;

  return (
    <AdminSection
      section="audit"
      isLoading={auditLog.isLoading}
      error={auditLog.error}
      onRetry={() => void auditLog.refetch()}
      empty={!auditLog.data?.data.length}
      emptyTitle="No admin activity recorded yet"
      emptyDescription="Account changes, listing moderation, application decisions and landlord verifications are recorded here as they happen."
      emptyIcon="history"
      skeleton={
        <>
          <ToolbarSkeleton chips={4} />
          <AuditLogSkeleton />
        </>
      }
      toolbar={
        <TableToolbar count={countLine}>
          <SearchField
            label="Search the audit log"
            placeholder="Search admin or action"
            value={query}
            onChange={setQuery}
          />
          <FilterChips<string>
            label="Filter by record type"
            value={entity}
            onChange={setEntity}
            options={entityOptions}
          />
        </TableToolbar>
      }
    >
      {visible.length === 0 && filtered ? (
        <NoMatches
          noun="actions"
          onClear={() => {
            setQuery('');
            setEntity('all');
          }}
        />
      ) : (
        <div className="space-y-8">
          {days.map(day => (
            <section key={day.key} aria-labelledby={`audit-day-${day.key}`}>
              <h2
                id={`audit-day-${day.key}`}
                className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-ink"
              >
                {day.label}
                <span className="tabular text-xs font-normal text-muted">
                  {day.entries.length} {day.entries.length === 1 ? 'action' : 'actions'}
                </span>
              </h2>
              <ol className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card">
                {day.entries.map(entry => (
                  <AuditEntry key={entry.id} entry={entry} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </AdminSection>
  );
}

function AuditEntry({ entry }: { entry: AdminAuditLogEntry }) {
  const description = describeAuditEntry(entry);
  const actor = auditActor(entry);
  return (
    <li className="grid grid-cols-[3.75rem_1fr] gap-x-4 gap-y-1 px-4 py-3.5 sm:grid-cols-[4.5rem_1fr_auto] sm:px-5">
      <time
        dateTime={entry.created_at}
        className="tabular pt-0.5 text-xs font-medium text-gray-ink"
      >
        {formatTime(entry.created_at)}
      </time>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{description.summary}</p>
        <p className="mt-0.5 text-xs text-gray-ink">
          <span className="text-ink">{actor}</span>
          {entry.actor_name && entry.actor_email ? (
            <span className="text-muted"> · {entry.actor_email}</span>
          ) : null}
          {entry.ids.length ? (
            <span title={entry.ids.map(id => `#${id}`).join(', ')}>
              {' '}
              · {targetList(entry.ids)}
            </span>
          ) : null}
          {description.detail ? <span> · {description.detail}</span> : null}
        </p>
      </div>
      <div className="col-start-2 sm:col-start-3 sm:row-start-1 sm:justify-self-end">
        <StatusBadge status={description.status} label={description.label} />
      </div>
    </li>
  );
}
