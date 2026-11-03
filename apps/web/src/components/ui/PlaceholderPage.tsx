import type { ReactNode } from 'react';
import { Card } from './Card';
import { PageHeader } from './PageHeader';

/**
 * Shared presentation for a screen whose feature isn't built yet.
 *
 * Before this, the landlord surface had four different hand-rolled shapes for
 * five placeholders — `mx-auto max-w-2xl` cards, bare `EmptyState`s, and three
 * different heading levels (`landlord-apple-ui-restructure` R26/R27). The copy
 * on each page is unchanged; only the frame is shared.
 *
 * `notice` is the short "what this is" line and `message` is the honest
 * explanation of what unblocks it.
 */
export function PlaceholderPage({
  icon,
  title,
  subtitle,
  notice,
  message,
  action,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  /** Short "what this is" line. Omit when the page title already says it. */
  notice?: string;
  message: ReactNode;
  action?: ReactNode;
}) {
  return (
    <>
      <PageHeader icon={icon} title={title} subtitle={subtitle} />
      <Card className="mx-auto max-w-2xl">
        {notice ? <h2 className="font-semibold tracking-tight text-ink">{notice}</h2> : null}
        <div className={`${notice ? 'mt-2' : ''} space-y-3 text-sm leading-relaxed text-gray-ink`}>
          {message}
        </div>
        {action ? <div className="mt-5 flex flex-wrap gap-2">{action}</div> : null}
      </Card>
    </>
  );
}
