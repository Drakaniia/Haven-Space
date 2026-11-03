import type { ReactNode } from 'react';
import type { AdminSectionKey } from '../../lib/nav';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Icon } from '../ui/Icon';
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
 * `actions` is where the section's own affordance lives (e.g. the bulk-select
 * toggle) rather than in a hand-rolled toolbar row (R15); `toolbar` is for the
 * remaining metadata line above the table.
 */
export function AdminSection({
  section,
  actions,
  toolbar,
  isLoading = false,
  error = null,
  empty = false,
  emptyTitle,
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
  empty?: boolean;
  emptyTitle?: string;
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
        actions={actions}
      />

      {isLoading ? (
        <div aria-busy="true" aria-live="polite">
          {skeleton}
        </div>
      ) : error ? (
        <ErrorState message={error.message} />
      ) : empty ? (
        <EmptyState title={emptyTitle ?? 'Nothing here'} icon={emptyIcon} action={emptyAction} />
      ) : (
        <>
          {toolbar}
          {children}
        </>
      )}
    </>
  );
}

/**
 * Metric tile, shared by the Overview and Applications sections.
 *
 * Opaque and elevated like every other card — translucency belongs to chrome
 * and floating layers (R17).
 */
export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}) {
  return (
    <Card className="flex items-start gap-3">
      <Icon name={icon} size={24} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-sm text-gray-ink">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{value}</p>
        {sub ? <p className="mt-1 text-sm text-gray-ink">{sub}</p> : null}
      </div>
    </Card>
  );
}
