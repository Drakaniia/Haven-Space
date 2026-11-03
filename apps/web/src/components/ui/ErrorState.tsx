import type { ReactNode } from 'react';

/**
 * Error surface for a failed request.
 *
 * `action` mirrors `EmptyState`'s prop, so a page can offer a retry without
 * hand-rolling a panel, and `hint` carries a second line of guidance — the
 * payments ledger uses it to explain that a bare server error usually means the
 * API is running behind its database migrations (spec `payments-page-regressions`
 * D8/D10).
 */
export function ErrorState({
  message,
  hint,
  action,
}: {
  message: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-error-border bg-error-tint px-5 py-4 text-error-ink">
      <p className="font-semibold">{message}</p>
      {hint ? <p className="mt-1 text-sm leading-relaxed opacity-85">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
