import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-start gap-3">
      <Skeleton className="h-6 w-6 rounded shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
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
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {showHeader ? (
        <div className="bg-mint/50 flex gap-4 px-4 py-2">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>
      ) : null}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 px-4 py-3">
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
