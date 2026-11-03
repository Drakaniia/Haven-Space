import { useId, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/Field';
import { Icon } from '../ui/Icon';

/**
 * The compact row above every admin table: search, filters and a live count.
 *
 * Filtering is client-side over the rows the section already loaded — the admin
 * endpoints return the full (capped) list, so there is no extra request and the
 * count is always the truth about what is on screen.
 */
export function TableToolbar({
  children,
  count,
  trailing,
}: {
  /** Search field and filter groups, left to right. */
  children: ReactNode;
  /** e.g. "12 of 40 users". Announced politely as filters change. */
  count: ReactNode;
  /** Section-specific control on the right (e.g. "Select all"). */
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">{children}</div>
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <p className="tabular text-xs text-gray-ink" aria-live="polite">
          {count}
        </p>
        {trailing}
      </div>
    </div>
  );
}

/** Search box for a toolbar. `type="search"` so Escape clears it natively. */
export function SearchField({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <div className="relative w-full lg:w-72">
      <Icon
        name="search"
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <TextInput
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="pl-10"
      />
    </div>
  );
}

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  /** Rows in this bucket, from loaded data. Omit to hide the number. */
  count?: number;
}

/**
 * Segmented filter. A group of toggle buttons (`aria-pressed`), so each option is
 * a normal tab stop with a native Enter/Space activation; the group is named for
 * screen readers. Scrolls sideways on a narrow screen rather than wrapping into
 * a ragged block.
 */
export function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}) {
  const labelId = useId();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex max-w-full gap-0.5 overflow-x-auto rounded-xl border border-border/80 bg-subtle p-0.5"
      >
        {options.map(option => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out ${
                active
                  ? 'bg-surface text-ink shadow-card'
                  : 'text-gray-ink hover:bg-surface/60 hover:text-ink'
              }`}
            >
              {option.label}
              {option.count !== undefined ? (
                <span className={`tabular text-xs ${active ? 'text-primary' : 'text-muted'}`}>
                  {option.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Shown in place of the table when filters exclude every row. */
export function NoMatches({ noun, onClear }: { noun: string; onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-surface/70 px-6 py-10 text-center">
      <p className="font-display text-lg font-medium text-ink">No {noun} match these filters</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-ink">
        Try a different search term, or clear the filters to see everything.
      </p>
      <div className="mt-4 flex justify-center">
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    </div>
  );
}

/** Case-insensitive "does any field contain the query" for toolbar search. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some(field => field?.toLowerCase().includes(needle));
}

/** Rows per value of `key`, for the counts on filter chips. */
export function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

/** "12 users" or "3 of 40 users" when a filter is narrowing the list. */
export function resultCount(shown: number, total: number, singular: string, plural: string) {
  const noun = total === 1 ? singular : plural;
  return shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`;
}
