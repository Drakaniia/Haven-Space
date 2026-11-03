import type { ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Canonical page heading: one place, per page, that names the screen.
 *
 * The shell's topbar carries breadcrumbs instead of a page title, so this is the
 * only element that names a page (see `landlord-apple-ui-restructure` D7/R9).
 * `tracking-tight` follows the apple-design rule that tracking is size-specific —
 * large text wants negative tracking, body text stays near zero.
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  /** Optional leading icon (e.g. `'buildingOffice'`), rendered at 28px. */
  icon?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon ? <Icon name={icon} size={28} className="shrink-0" /> : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-gray-ink">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
