import type { ReactNode } from 'react';

export interface DetailItem {
  label: string;
  value: ReactNode;
  /** Optional muted line under the value (e.g. "per month"). */
  hint?: ReactNode;
}

/**
 * A quiet definition list for facts about a tenancy, an application or a charge.
 * Labels sit above values in a responsive grid; hairlines separate rows on
 * small screens so a long list still scans.
 */
export function DetailList({
  items,
  columns = 2,
  className = '',
}: {
  items: DetailItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const grid =
    columns === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : columns === 3
      ? 'sm:grid-cols-3'
      : 'sm:grid-cols-2';

  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-4 ${grid} ${className}`}>
      {items.map(item => (
        <div key={item.label} className="min-w-0 border-t border-border/80 pt-3">
          <dt className="text-[0.8125rem] text-gray-ink">{item.label}</dt>
          <dd className="tabular mt-1 break-words font-semibold text-ink">{item.value}</dd>
          {item.hint ? <dd className="mt-0.5 text-xs text-muted">{item.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/** Section title used inside boarder pages: Fraunces, with an optional trailing action. */
export function SectionTitle({
  title,
  id,
  action,
  description,
}: {
  title: string;
  id?: string;
  action?: ReactNode;
  description?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2
          id={id}
          className="font-display text-[1.375rem] font-medium leading-tight tracking-[-0.015em] text-ink"
        >
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-gray-ink">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
