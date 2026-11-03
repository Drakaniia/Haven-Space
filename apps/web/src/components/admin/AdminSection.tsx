import type { ReactNode } from 'react';
import type { AdminSectionKey } from '../../lib/nav';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { PageHeader } from '../ui/PageHeader';
import { SECTION_SUBTITLES, sectionHeading } from './sections';

/**
 * The frame every admin section opens inside.
 *
 * Two jobs, both from the restructure:
 *
 * 1. **The heading** — one `PageHeader` per section, whose title and icon come
 *    from `ADMIN_NAV`, so a section names itself exactly once and always agrees
 *    with its sidebar item (R4/R14).
 * 2. **The states** — loading, error and empty render *inside* this frame, so a
 *    section never loses its heading mid-flight and the shell around it
 *    (sidebar, topbar) is never unmounted (R35/R37).
 *
 * Every non-happy state says what happened and what to do next: the error
 * names the section that failed, carries the server's own message as the hint
 * and offers a retry; the empty state carries a description of *why* a list
 * can be empty on this platform.
 *
 * `actions` is where the section's own affordance lives (e.g. the bulk-select
 * toggle) rather than in a hand-rolled toolbar row (R15); `toolbar` is the
 * search / filter / count row above the table.
 */
export function AdminSection({
  section,
  actions,
  toolbar,
  isLoading = false,
  error = null,
  onRetry,
  empty = false,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  skeleton,
  children,
}: {
  section: AdminSectionKey;
  actions?: ReactNode;
  toolbar?: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  /** Re-runs the section's query; shown as "Try again" on the error state. */
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyIcon?: string;
  emptyAction?: ReactNode;
  skeleton?: ReactNode;
  children: ReactNode;
}) {
  const { title, icon } = sectionHeading(section);

  return (
    <>
      <PageHeader
        icon={icon}
        title={title}
        subtitle={SECTION_SUBTITLES[section]}
        actions={isLoading || error ? null : actions}
      />

      {isLoading ? (
        <div aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading {title.toLowerCase()}…</span>
          {skeleton}
        </div>
      ) : error ? (
        <ErrorState
          message={`Couldn't load ${title.toLowerCase()}.`}
          hint={`${error.message} Check your connection, then try again. If it keeps failing, the API may be unavailable.`}
          action={
            onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            ) : null
          }
        />
      ) : empty ? (
        <EmptyState
          title={emptyTitle ?? 'Nothing here'}
          description={emptyDescription}
          icon={emptyIcon}
          action={emptyAction}
        />
      ) : (
        <>
          {toolbar}
          {children}
        </>
      )}
    </>
  );
}

export interface StatItem {
  label: string;
  value: string;
  /** Secondary line under the number (context, never an invented metric). */
  sub?: string;
  /** `attention` tints the number amber — reserved for "someone has to act". */
  tone?: 'default' | 'attention';
}

/**
 * A single strip of related figures, divided by hairlines.
 *
 * Replaces the row of four separate stat cards: in a dense work tool the
 * figures that describe one dataset read better as one object, and the strip
 * takes a third of the height. Cells are separated with a 1px gap over a
 * border-coloured ground, so the dividers survive any wrap.
 */
export function StatStrip({ items, label }: { items: StatItem[]; label: string }) {
  return (
    <dl
      aria-label={label}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/70 shadow-card sm:grid-cols-4"
    >
      {items.map(item => (
        <div key={item.label} className="bg-surface px-4 py-3.5">
          <dt className="text-xs font-medium text-gray-ink">{item.label}</dt>
          <dd
            className={`tabular mt-1 font-display text-[1.625rem] font-medium leading-none tracking-[-0.02em] ${
              item.tone === 'attention' ? 'text-warning-ink' : 'text-ink'
            }`}
          >
            {item.value}
          </dd>
          {item.sub ? <dd className="mt-1.5 text-xs text-gray-ink">{item.sub}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
