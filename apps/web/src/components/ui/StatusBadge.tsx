import { Icon } from './Icon';

/**
 * Tone map for status pills. Each entry is a `tint` surface plus an `ink` text
 * colour — both semantic tokens rather than raw palette colours.
 */
const TONES: Record<string, string> = {
  // positive
  active: 'bg-success-tint text-success-ink',
  verified: 'bg-success-tint text-success-ink',
  published: 'bg-success-tint text-success-ink',
  // listing status — the landlord's own Draft / Published / Unpublished
  // (`edit-listing-property-info` D15). `draft` and `unpublished` are deliberately
  // the same neutral surface: neither is live, and the label carries the
  // difference.
  unpublished: 'bg-subtle text-gray-ink',
  draft: 'bg-subtle text-gray-ink',
  approved: 'bg-success-tint text-success-ink',
  accepted: 'bg-success-tint text-success-ink',
  confirmed: 'bg-success-tint text-success-ink',
  owned: 'bg-mint text-primary-dark',
  // waiting
  pending: 'bg-warning-tint text-warning-ink',
  // at capacity — the landlord list's `full` status had no tone and fell through
  // to the neutral fallback (`landlord-properties-card-layout` R7).
  full: 'bg-warning-tint text-warning-ink',
  pending_review: 'bg-warning-tint text-warning-ink',
  submitted: 'bg-info-tint text-info-ink',
  shared: 'bg-info-tint text-info-ink',
  // negative
  rejected: 'bg-error-tint text-error-ink',
  banned: 'bg-error-tint text-error-ink',
  flagged: 'bg-error-tint text-error-ink',
  high: 'bg-error-tint text-error-ink',
  suspended: 'bg-warning-tint text-warning-ink',
  // room statuses — the landlord rooms grid shows Available / Occupied /
  // Maintenance pills and had no tone for the first two
  // (`landlord-rooms-grid` D20).
  available: 'bg-success-tint text-success-ink',
  occupied: 'bg-warning-tint text-warning-ink',
  maintenance: 'bg-subtle text-gray-ink',
  // payments — the ledger's four boarder-visible states
  // (`payments-feature` §7)
  paid: 'bg-success-tint text-success-ink',
  due_soon: 'bg-warning-tint text-warning-ink',
  awaiting_verification: 'bg-info-tint text-info-ink',
  overdue: 'bg-error-tint text-error-ink',
  // payments tracker — the five brief colours plus the two quiet states
  // (`payments-tracker-redesign` §3.4). `overdue_severe` is the darker red for
  // "past the grace period", kept distinct from `due_today`'s red.
  due_today: 'bg-error-tint text-error-ink',
  in_grace: 'bg-warning-tint text-warning-ink',
  overdue_severe: 'bg-critical-tint text-critical-ink',
  upcoming: 'bg-subtle text-gray-ink',
  no_charge: 'bg-subtle text-gray-ink',
  superseded: 'bg-subtle text-gray-ink',
  // need-attention — the dashboard's occupancy tag (low < 50%)
  low: 'bg-warning-tint text-warning-ink',
  // neutral
  ended: 'bg-subtle text-gray-ink',
  cancelled: 'bg-subtle text-gray-ink',
  left_early: 'bg-subtle text-gray-ink',
  // account roles — the same pill language for the admin users table, so it no
  // longer hand-rolls its own colours next to this component
  // (`admin-apple-ui-restructure` R20).
  admin: 'bg-accent-tint text-accent-ink',
  landlord: 'bg-mint text-primary-dark',
  boarder: 'bg-info-tint text-info-ink',
};

const FALLBACK = 'bg-subtle text-gray-ink';

/**
 * The tone classes for a status key, for surfaces that are not a pill.
 *
 * The calendar's day chips are buttons (they open a popover), so they cannot be
 * a `StatusBadge` — but they must speak the same colour vocabulary, and this is
 * the one place that vocabulary lives (`landlord-calendar` §7.3).
 */
export function statusTone(status: string): string {
  return TONES[status] ?? FALLBACK;
}

export function StatusBadge({
  status,
  label,
  icon,
}: {
  status: string;
  label?: string;
  /** Optional leading icon, tinted with the pill's own text colour. */
  icon?: string;
}) {
  const style = statusTone(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {icon ? <Icon name={icon} size={12} className="shrink-0" /> : null}
      {label ?? status.replaceAll('_', ' ')}
    </span>
  );
}
