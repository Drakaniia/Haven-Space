import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

/**
 * The one bottom-anchored bulk bar, shared by the Users, Properties and
 * Applications sections.
 *
 * Before this it was three near-identical ~40-line copies, each hard-coding
 * `bg-white/90` — so none of them followed the theme, and the "max 100" warning
 * was appended *below* the sticky element where it could sit off-screen
 * (`admin-apple-ui-restructure` R30–R33).
 *
 * The surface is `.chrome-float`, the floating counterpart to the topbar and
 * sidebar materials: it degrades to opaque under `prefers-reduced-transparency`,
 * which a raw `backdrop-blur` utility would not.
 * It is a floating layer, so it sits above section content and below
 * `Modal`/`ConfirmDialog`, and never over another translucent surface (R17/R32).
 *
 * It reads as a sentence — "3 selected · Set to [suspended] · Apply" — so the
 * admin sees what will happen before pressing Apply, and says when part of the
 * selection is hidden by the current filters (so a bulk action never silently
 * touches rows that are off screen).
 */
export function BulkActionBar({
  count,
  busy = false,
  overCap = false,
  hiddenCount = 0,
  actionLabel = 'Set to',
  onApply,
  onCancel,
  actionControl,
}: {
  count: number;
  busy?: boolean;
  overCap?: boolean;
  /** Selected rows the current search/filter is hiding. */
  hiddenCount?: number;
  /** Visible label in front of the action picker. */
  actionLabel?: string;
  onApply: () => void;
  onCancel: () => void;
  /** The action picker (a status/action `<select>`) shown beside Apply. */
  actionControl: ReactNode;
}) {
  return (
    <div className="sticky bottom-4 z-30 mt-6" role="region" aria-label="Bulk actions">
      <div className="chrome-float mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-border px-4 py-3 shadow-pop">
        <p className="text-sm text-ink" aria-live="polite">
          <span className="tabular font-semibold">{count}</span> selected
          {hiddenCount > 0 ? (
            <span className="text-gray-ink"> · {hiddenCount} hidden by filters</span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-ink" aria-hidden="true">
            {actionLabel}
          </span>
          {actionControl}
          <Button variant="primary" size="sm" disabled={busy || overCap} onClick={onApply}>
            {busy ? 'Applying…' : 'Apply'}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
      {/* Inside the sticky block (not below it) so it can never scroll out of view (R33). */}
      {overCap ? (
        <p role="alert" className="mt-2 text-center text-xs font-medium text-error-ink">
          Max 100 per bulk operation
        </p>
      ) : null}
    </div>
  );
}

/** The control the bulk bar's action pickers use, in one place. */
export const BULK_SELECT_CLASSES =
  'h-8 rounded-lg border border-border-strong bg-surface px-2.5 text-sm text-ink transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15';

/** Compact sibling of the above, for controls that live inside a table row. */
export const ROW_SELECT_CLASSES =
  'h-7 rounded-lg border border-border bg-surface px-2 text-xs text-ink transition-colors hover:border-border-strong focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15';
