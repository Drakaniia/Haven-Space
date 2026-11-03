import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

/**
 * Loading placeholders for the admin console.
 *
 * Each one mirrors the geometry of the real component it stands in for — the
 * card radius/elevation/padding of `Card`, and the header/row rhythm of
 * `DataTable` (`px-4 py-3` header, `px-4 py-3.5` rows). Before the restructure
 * these still painted the old flat border-only card and a tighter row, so a
 * loading section visibly changed shape when its data arrived
 * (`admin-apple-ui-restructure` R22).
 */

export function StatCardSkeleton() {
  return (
    <Card className="flex items-start gap-3">
      <Skeleton className="h-6 w-6 shrink-0 rounded" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-28" />
      </div>
    </Card>
  );
}

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
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
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {showHeader ? (
        <div className="flex gap-4 border-b border-border bg-mint/50 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>
      ) : null}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, colIndex) => {
              const width = colIndex % 3 === 0 ? 'w-24' : colIndex % 3 === 1 ? 'w-32' : 'w-20';
              return <Skeleton key={colIndex} className={`h-4 ${width}`} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <Card className="max-w-xl space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-9 w-24 rounded-full" />
    </Card>
  );
}
