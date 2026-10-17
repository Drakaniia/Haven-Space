import { StatusBadge } from '../ui/StatusBadge';
import { TRACKER_STATUS_LEGEND, trackerStatusMeta } from '../../lib/payments';

/**
 * The tracker's visible key (spec `payments-tracker-redesign` D25).
 *
 * The brief is explicit that colour alone must never carry the state, so the
 * legend spells out each tone's label and meaning next to a real badge — icon and
 * text included.
 */
export function StatusLegend() {
  return (
    <section aria-label="Payment status key" className="rounded-xl bg-subtle/60 px-4 py-3">
      <h2 className="text-sm font-semibold text-ink">Status key</h2>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {TRACKER_STATUS_LEGEND.map(entry => (
          <li key={entry.status} className="flex items-center gap-2 text-xs text-gray-ink">
            <StatusBadge {...trackerStatusMeta({ status: entry.status, status_label: entry.label })} />
            <span>{entry.meaning}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
