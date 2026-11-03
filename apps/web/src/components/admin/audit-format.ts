import type { AdminAuditLogEntry } from '../../lib/types';

/**
 * Turns a raw audit row (`entity`, `action`, `ids`) into a sentence.
 *
 * The API records what the route did, in the route's own vocabulary
 * (`users` + `suspended`, `properties` + `flag`, `landlord_verification` +
 * `request_documents`, `message_report` + `reported:<reason>`). The log is read
 * by people, so each pair is phrased as "Suspended 2 accounts" with a status
 * pill that speaks the shared `StatusBadge` colour language. Unknown pairs fall
 * back to a humanised version of the raw values rather than disappearing.
 */

export interface AuditDescription {
  /** The sentence, e.g. "Suspended 2 accounts". */
  summary: string;
  /** `StatusBadge` key for the outcome pill. */
  status: string;
  /** Pill text. */
  label: string;
  /** Extra detail (e.g. a report reason). */
  detail?: string;
}

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  users: 'Accounts',
  properties: 'Listings',
  applications: 'Applications',
  landlord_verification: 'Verification',
  message_report: 'Reports',
};

function humanize(value: string): string {
  const text = value.replaceAll('_', ' ').replaceAll(':', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function describeAuditEntry(entry: AdminAuditLogEntry): AuditDescription {
  const count = entry.ids.length;
  const { entity, action } = entry;

  if (entity === 'users') {
    const noun = plural(count, 'account');
    if (action === 'active') return { summary: `Reactivated ${noun}`, status: 'active', label: 'Active' };
    if (action === 'suspended')
      return { summary: `Suspended ${noun}`, status: 'suspended', label: 'Suspended' };
    if (action === 'banned') return { summary: `Banned ${noun}`, status: 'banned', label: 'Banned' };
  }

  if (entity === 'properties') {
    const noun = plural(count, 'listing');
    if (action === 'publish')
      return { summary: `Published ${noun}`, status: 'published', label: 'Published' };
    if (action === 'reject')
      return { summary: `Rejected ${noun}`, status: 'rejected', label: 'Rejected' };
    if (action === 'flag') return { summary: `Flagged ${noun}`, status: 'flagged', label: 'Flagged' };
  }

  if (entity === 'applications') {
    const noun = plural(count, 'application');
    if (action === 'approve' || action === 'approved')
      return { summary: `Approved ${noun}`, status: 'approved', label: 'Approved' };
    if (action === 'reject' || action === 'rejected')
      return { summary: `Rejected ${noun}`, status: 'rejected', label: 'Rejected' };
    if (action === 'pending')
      return { summary: `Moved ${noun} back to pending`, status: 'pending', label: 'Pending' };
  }

  if (entity === 'landlord_verification') {
    if (action === 'approve')
      return { summary: 'Approved a landlord verification', status: 'verified', label: 'Approved' };
    if (action === 'reject')
      return { summary: 'Rejected a landlord verification', status: 'rejected', label: 'Rejected' };
    if (action === 'request_documents')
      return {
        summary: 'Asked a landlord for more documents',
        status: 'pending',
        label: 'Documents requested',
      };
  }

  if (entity === 'message_report' && action.startsWith('reported')) {
    const reason = action.split(':')[1];
    return {
      summary: 'Reported a message thread',
      status: 'flagged',
      label: 'Reported',
      detail: reason ? `Reason: ${humanize(reason).toLowerCase()}` : undefined,
    };
  }

  const entityLabel = AUDIT_ENTITY_LABELS[entity] ?? humanize(entity);
  return {
    summary: `${humanize(action)} · ${entityLabel.toLowerCase()}${count ? ` (${count})` : ''}`,
    status: action,
    label: humanize(action),
  };
}

/** Who did it: name, then email, then the raw id. */
export function auditActor(entry: AdminAuditLogEntry): string {
  return entry.actor_name || entry.actor_email || `User #${entry.actor_id}`;
}
