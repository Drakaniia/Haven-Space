import type { ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Empty state. `icon` and `action` are optional so existing call sites are
 * unaffected; `action` exists so a real CTA lives here instead of being smuggled
 * into the `description` string (see `landlord-apple-ui-restructure` R25).
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: ReactNode;
  /** Optional leading icon (e.g. `'list'`), rendered in a soft mint disc. */
  icon?: string;
  /** Optional call to action, centred below the copy. */
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-surface/60 p-10 text-center">
      {icon ? (
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mint">
          <Icon name={icon} size={24} />
        </span>
      ) : null}
      <p className="font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 text-sm text-gray-ink">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
