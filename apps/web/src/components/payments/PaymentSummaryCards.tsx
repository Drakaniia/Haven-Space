import { Card } from '../ui/Card';
import { formatPeso } from '../../lib/payments';
import type { TrackerRow, TrackerSummary } from '../../lib/types';

/**
 * The five summary cards (spec `payments-tracker-redesign` D22): money first, a
 * boarder count as the sub-line, and each card a filter onto the table.
 */
const CARDS: Array<{
  key: keyof TrackerSummary;
  label: string;
  status: string | null;
  tone: string;
}> = [
  { key: 'expected', label: 'Total expected', status: null, tone: 'text-ink' },
  { key: 'paid', label: 'Paid', status: 'paid', tone: 'text-success-ink' },
  { key: 'due_today', label: 'Due today', status: 'due_today', tone: 'text-error-ink' },
  { key: 'in_grace', label: 'In grace period', status: 'in_grace', tone: 'text-warning-ink' },
  { key: 'overdue', label: 'Overdue', status: 'overdue', tone: 'text-critical-ink' },
];

export function PaymentSummaryCards({
  summary,
  rows,
  activeStatus,
  onSelect,
}: {
  summary: TrackerSummary;
  rows: TrackerRow[];
  activeStatus: string | null;
  onSelect: (status: string | null) => void;
}) {
  const countFor = (status: string | null): number =>
    status ? rows.filter(row => row.status === status).length : rows.length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {CARDS.map(card => {
        const active = card.status !== null && activeStatus === card.status;

        return (
          <Card key={card.key} className="p-0">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? null : card.status)}
              className={`w-full rounded-xl px-4 py-3 text-left transition-[background-color] hover:bg-subtle/60 ${
                active ? 'bg-subtle' : ''
              }`}
            >
              <span className="text-sm text-gray-ink">{card.label}</span>
              <span className={`mt-1 block text-2xl font-bold tracking-tight ${card.tone}`}>
                {formatPeso(summary[card.key])}
              </span>
              <span className="mt-1 block text-xs text-gray-ink">
                {countFor(card.status)} {countFor(card.status) === 1 ? 'boarder' : 'boarders'}
              </span>
            </button>
          </Card>
        );
      })}
    </div>
  );
}
