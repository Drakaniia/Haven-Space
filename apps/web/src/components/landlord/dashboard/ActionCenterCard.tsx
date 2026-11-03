import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { buttonClasses } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { Skeleton } from '../../ui/Skeleton';

export interface PaymentAlertCounts {
  dueToday: number;
  inGrace: number;
  overdue: number;
}

/**
 * Live counts behind the Action Center. `null` means that source is still
 * loading or failed: the row stays navigable but shows a dash instead of a
 * number it cannot vouch for (spec `landlord-dashboard-redesign` D7).
 *
 * Every count here comes from the API. The maintenance row was a UI fixture
 * (`lib/fixtures/dashboard.ts`, D17) and is gone until that feature exists —
 * the dashboard does not show invented work to do.
 */
export interface ActionCenterCounts {
  applications: number | null;
  payments: PaymentAlertCounts | null;
  rentDue: number | null;
  renewals: number | null;
}

type Tone = 'warning' | 'primary' | 'error' | 'neutral';

const TONE_TILE: Record<Tone, string> = {
  warning: 'bg-warning-tint text-warning-ink',
  primary: 'bg-mint text-primary-dark',
  error: 'bg-error-tint text-error-ink',
  neutral: 'bg-subtle text-muted',
};

function ActionRow({
  count,
  icon,
  tone,
  title,
  detail,
  action,
}: {
  /** Shown in the tile; a `null` count renders a dash, `undefined` shows the icon. */
  count?: number | null;
  icon?: string;
  tone: Tone;
  title: string;
  detail: ReactNode;
  action: ReactNode;
}) {
  const quiet = count === 0;
  const tile = quiet ? TONE_TILE.neutral : TONE_TILE[tone];

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:flex-nowrap">
      <span
        aria-hidden="true"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-xl font-medium tabular ${tile}`}
      >
        {icon && count === undefined ? <Icon name={icon} size={20} /> : count ?? '—'}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[0.9375rem] font-semibold ${quiet ? 'text-gray-ink' : 'text-ink'}`}>
          {title}
        </p>
        <p className="mt-0.5 text-sm text-gray-ink">{detail}</p>
      </div>
      <div className="w-full shrink-0 pl-15 sm:w-auto sm:pl-0">{action}</div>
    </li>
  );
}

const VERIFICATION_COPY: Record<
  string,
  { title: string; detail: string; action: string; tone: Tone }
> = {
  pending: {
    title: 'Verify your account',
    detail: 'Boarders can’t see your listings until your documents are approved.',
    action: 'Complete verification',
    tone: 'warning',
  },
  rejected: {
    title: 'Verification needs new documents',
    detail: 'A reviewer left a note. Replace the flagged documents and resubmit.',
    action: 'Review the note',
    tone: 'error',
  },
  submitted: {
    title: 'Verification under review',
    detail: 'Documents are usually reviewed within 24–48 hours. Nothing to do yet.',
    action: 'View status',
    tone: 'primary',
  },
};

/**
 * The landlord's decisions for today, ranked by how much they block: an
 * unverified account hides every listing, then people waiting on an answer,
 * then money, then upcoming renewals.
 *
 * Each row names the decision, says why in the tracker's own vocabulary, and
 * carries one explicit action. Rows with nothing to do stay visible but quiet,
 * so the panel's shape is stable and "nothing pending" is a real answer.
 */
export function ActionCenterCard({
  counts,
  verificationStatus,
}: {
  counts: ActionCenterCounts;
  /** The landlord's `verification_status`; approved (or unknown) hides the row. */
  verificationStatus?: string | null;
}) {
  const { applications, payments, rentDue, renewals } = counts;
  const verification = verificationStatus ? VERIFICATION_COPY[verificationStatus] : undefined;
  const paymentTotal = payments ? payments.dueToday + payments.inGrace + payments.overdue : null;

  const open = [applications, paymentTotal, rentDue, renewals].reduce<number>(
    (total, count) => total + (count ?? 0),
    0
  );
  const needsVerification = verification && verificationStatus !== 'submitted';
  const summary =
    open === 0 && !needsVerification
      ? 'All clear'
      : `${open + (needsVerification ? 1 : 0)} open`;

  return (
    <Card padding="p-0" className="flex h-full flex-col overflow-hidden">
      <div className="flex items-end justify-between gap-3 border-b border-border px-5 pb-4 pt-5">
        <div>
          <p className="kicker">Action center</p>
          <h2 className="mt-1 font-display text-[1.375rem] font-medium leading-tight tracking-[-0.015em] text-ink">
            What needs you today
          </h2>
        </div>
        <span className="rounded-md bg-subtle px-2 py-0.5 text-xs font-semibold text-gray-ink">
          {summary}
        </span>
      </div>

      <ul className="divide-y divide-border">
        {verification ? (
          <ActionRow
            icon="shieldCheck"
            tone={verification.tone}
            title={verification.title}
            detail={verification.detail}
            action={
              <Link
                to="/landlord/verification"
                className={buttonClasses({
                  size: 'sm',
                  variant: verificationStatus === 'submitted' ? 'ghost' : 'warning',
                })}
              >
                {verification.action}
              </Link>
            }
          />
        ) : null}

        <ActionRow
          count={applications}
          tone="primary"
          title="Applications waiting for a decision"
          detail={
            applications === null
              ? 'Application counts are unavailable right now.'
              : applications === 0
              ? 'No one is waiting on you.'
              : 'Approve or decline so boarders can plan their move.'
          }
          action={
            <Link
              to="/landlord/applications"
              aria-label={
                applications === null
                  ? 'Review pending applications'
                  : `Review ${applications} pending applications`
              }
              className={buttonClasses({
                size: 'sm',
                variant: applications ? 'outline' : 'ghost',
              })}
            >
              Review
            </Link>
          }
        />

        <ActionRow
          count={paymentTotal}
          tone={payments && payments.overdue > 0 ? 'error' : 'warning'}
          title="Payments to follow up"
          detail={
            payments
              ? `${payments.dueToday} due today · ${payments.inGrace} in grace · ${payments.overdue} overdue`
              : 'Payment status is unavailable right now.'
          }
          action={
            <Link
              to="/landlord/payments"
              className={buttonClasses({ size: 'sm', variant: paymentTotal ? 'outline' : 'ghost' })}
            >
              Open tracker
            </Link>
          }
        />

        <ActionRow
          count={rentDue}
          tone="warning"
          title="Rent due soon"
          detail={
            rentDue ? 'A friendly reminder now saves a chase later.' : 'No rent falls due this week.'
          }
          action={
            <Link
              to="/landlord/payments"
              aria-label={rentDue === null ? 'Send rent reminders' : `Remind ${rentDue} boarders`}
              className={buttonClasses({ size: 'sm', variant: rentDue ? 'outline' : 'ghost' })}
            >
              Remind
            </Link>
          }
        />

        <ActionRow
          count={renewals}
          tone="primary"
          title="Leases up for renewal"
          detail={renewals ? 'Send an offer before the tenancy ends.' : 'No leases end soon.'}
          action={
            <Link
              to="/landlord/renewals"
              aria-label={
                renewals === null ? 'Send renewal offers' : `Send ${renewals} renewal offers`
              }
              className={buttonClasses({ size: 'sm', variant: renewals ? 'outline' : 'ghost' })}
            >
              Send offer
            </Link>
          }
        />
      </ul>

      {payments && payments.overdue === 0 ? (
        <p className="mt-auto flex items-center gap-2 border-t border-border bg-success-tint/50 px-5 py-3 text-sm text-success-ink">
          <Icon name="check" size={16} />
          No overdue payments
        </p>
      ) : null}
    </Card>
  );
}

export function ActionCenterCardSkeleton() {
  return (
    <Card padding="p-0" className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-5 pb-4 pt-5">
        <p className="kicker">Action center</p>
        <h2 className="mt-1 font-display text-[1.375rem] font-medium leading-tight tracking-[-0.015em] text-ink">
          What needs you today
        </h2>
      </div>
      <div className="divide-y divide-border" aria-hidden="true">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-56 max-w-full" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
            <Skeleton className="hidden h-8 w-24 rounded-lg sm:block" />
          </div>
        ))}
      </div>
    </Card>
  );
}
