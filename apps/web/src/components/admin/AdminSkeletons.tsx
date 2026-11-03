import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

/**
 * Loading placeholders for the admin console.
 *
 * Each one mirrors the geometry of the real component it stands in for — the
 * toolbar row, the `StatStrip`, the `DataTable` header/row rhythm (`px-4 py-3`
 * header on `bg-subtle/70`, `px-4 py-3.5` rows), the audit log's day groups and
 * the grouped settings form — so a section doesn't change shape when its data
 * arrives (`admin-apple-ui-restructure` R22).
 */

/** Search field + one filter group + the count line. */
export function ToolbarSkeleton({ chips = 4 }: { chips?: number }) {
  return (
    <div className="mb-4 flex flex-col gap-3" aria-hidden="true">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Skeleton className="h-[46px] w-full rounded-xl lg:w-72" />
        <div className="flex gap-0.5 rounded-xl border border-border/80 bg-subtle p-0.5">
          {Array.from({ length: chips }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-[10px] bg-border/60" />
          ))}
        </div>
      </div>
      <div className="flex min-h-8 items-center">
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function StatStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 shadow-card sm:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 bg-surface px-4 py-3.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-[26px] w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card"
    >
      {showHeader ? (
        <div className="flex gap-6 border-b border-border bg-subtle/70 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-16 bg-border/70" />
          ))}
        </div>
      ) : null}
      <div className="divide-y divide-border/70">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-6 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, colIndex) => {
              const width = colIndex === 0 ? 'w-40' : colIndex % 3 === 1 ? 'w-28' : 'w-16';
              return <Skeleton key={colIndex} className={`h-4 ${width}`} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Overview: the action queue list, then the two supporting cards. */
export function OverviewSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-10">
      <div>
        <Skeleton className="mb-3 h-4 w-32" />
        <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-7 w-10" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="space-y-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
        <Card className="space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}

/** Audit log: day heading + entries, matching `AuditSection`'s list. */
export function AuditLogSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-8">
      {[4, 3].map((count, group) => (
        <div key={group}>
          <Skeleton className="mb-3 h-4 w-28" />
          <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-3.5">
                <Skeleton className="mt-0.5 h-3.5 w-12" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Settings: grouped cards, label column + control column. */
export function SettingsSkeleton() {
  return (
    <div aria-hidden="true" className="max-w-3xl space-y-6">
      {[1, 2, 1].map((fields, group) => (
        <Card key={group} padding="p-0">
          <div className="border-b border-border/70 px-5 py-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-3 w-64" />
          </div>
          <div className="space-y-5 px-5 py-5">
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-[46px] w-full rounded-xl" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
