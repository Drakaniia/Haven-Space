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
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 items-start gap-3.5">
        {icon ? (
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint text-primary">
            <Icon name={icon} size={22} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="font-display text-[1.875rem] font-medium leading-[1.1] tracking-[-0.02em] text-ink sm:text-[2.125rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-gray-ink">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
