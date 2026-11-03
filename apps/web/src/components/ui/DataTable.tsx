import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

function AppleCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  return (
    <label className="inline-flex cursor-pointer items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        aria-label={ariaLabel}
        onChange={e => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={[
          'flex h-5 w-5 items-center justify-center rounded-full border-[1.6px] transition-all duration-150 ease-out',
          'motion-reduce:transition-none',
          checked
            ? 'border-[#007AFF] bg-[#007AFF] text-white shadow-sm scale-100'
            : 'border-border-strong bg-surface active:scale-[0.96]',
        ].join(' ')}
      >
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 transition-all duration-150 ${
            checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          } motion-reduce:transition-none`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 6.2L4.9 8.6L9.5 3.4" />
        </svg>
      </span>
    </label>
  );
}

export function DataTable<T>({
  rows,
  columns,
  keyFor,
  expandable,
  selectable,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  rows: T[];
  columns: Column<T>[];
  keyFor: (row: T) => string | number;
  expandable?: (row: T) => ReactNode;
  selectable?: boolean;
  selectedIds?: Set<string | number>;
  onToggle?: (id: string | number) => void;
  onToggleAll?: (checked: boolean) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);

  function toggle(key: string) {
    setExpanded(list => (list.includes(key) ? list.filter(k => k !== key) : [...list, key]));
  }

  const allIds = rows.map(r => keyFor(r));
  const allSelected = selectable && rows.length > 0 && allIds.every(id => selectedIds?.has(id));
  const someSelected = selectable && !allSelected && allIds.some(id => selectedIds?.has(id));

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-mint/50">
            {selectable ? (
              <th className="w-12 px-4 py-3">
                <AppleCheckbox
                  checked={Boolean(allSelected)}
                  indeterminate={Boolean(someSelected)}
                  ariaLabel="Select all rows"
                  onChange={checked => onToggleAll?.(checked)}
                />
              </th>
            ) : null}
            {expandable ? (
              <th className="w-12 px-3 py-3" aria-hidden="true">
                <span className="sr-only">Expand</span>
              </th>
            ) : null}
            {columns.map(column => (
              <th key={column.header} className="px-4 py-3 font-semibold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const key = String(keyFor(row));
            const rawId = keyFor(row);
            const isOpen = expanded.includes(key);
            const isSelected = selectable ? Boolean(selectedIds?.has(rawId)) : false;
            return (
              <Fragment key={key}>
                <tr
                  className={`border-b border-border transition-colors ${
                    isSelected ? 'bg-info-tint/60' : 'hover:bg-subtle/60'
                  }`}
                >
                  {selectable ? (
                    <td className="px-4 py-3.5">
                      <AppleCheckbox
                        checked={isSelected}
                        ariaLabel={`Select row ${key}`}
                        onChange={() => onToggle?.(rawId)}
                      />
                    </td>
                  ) : null}
                  {expandable ? (
                    <td className="px-3 py-3.5">
                      {/* Real control with a hit area and press feedback, not a bare text glyph (R12/R21). */}
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `Collapse rows for ${key}` : `Expand rows for ${key}`}
                        onClick={() => toggle(key)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-gray-ink transition-all duration-100 ease-out hover:bg-subtle active:scale-[0.94] motion-reduce:transition-none"
                      >
                        <Icon
                          name="chevronDown"
                          size={14}
                          className={`transition-transform duration-150 ease-settle ${
                            isOpen ? 'rotate-0' : '-rotate-90'
                          } motion-reduce:transition-none`}
                        />
                      </button>
                    </td>
                  ) : null}
                  {columns.map(column => (
                    <td key={column.header} className="px-4 py-3.5">
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
                {expandable && isOpen ? (
                  <tr className="border-b border-border bg-subtle/50">
                    <td />
                    {selectable ? <td /> : null}
                    <td colSpan={columns.length} className="px-4 py-4">
                      {expandable(row)}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
