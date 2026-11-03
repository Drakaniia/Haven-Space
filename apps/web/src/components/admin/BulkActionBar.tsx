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
 */
export function BulkActionBar({
  count,
  busy = false,
  overCap = false,
  onApply,
  onCancel,
  actionControl,
}: {
  count: number;
  busy?: boolean;
  overCap?: boolean;
  onApply: () => void;
  onCancel: () => void;
  /** The action picker (a status/action `<select>`) shown beside Apply. */
  actionControl: ReactNode;
}) {
  return (
    <div className="sticky bottom-4 z-30 mt-4">
      <div className="chrome-float mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 shadow-pop">
        <span className="text-sm font-medium text-ink">{count} selected</span>
        <div className="flex items-center gap-2">
          {actionControl}
          <Button variant="primary" size="sm" disabled={busy || overCap} onClick={onApply}>
            Apply
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
      {/* Inside the sticky block (not below it) so it can never scroll out of view (R33). */}
      {overCap ? (
        <p className="mt-2 text-center text-xs text-error-ink">Max 100 per bulk operation</p>
      ) : null}
    </div>
  );
}

/** The rounded control the bulk bar's action pickers use, in one place. */
export const BULK_SELECT_CLASSES =
  'rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-ink';

/**
 * Compact sibling of the above, for controls that live inside a table row.
 * Same control language, smaller footprint — the row status picker used to be an
 * unstyled native select (`admin-apple-ui-restructure` R28).
 */
export const ROW_SELECT_CLASSES =
  'rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-ink transition-colors hover:border-border-strong';
