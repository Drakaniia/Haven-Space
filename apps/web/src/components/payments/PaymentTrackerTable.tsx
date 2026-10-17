import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '../ui/Button';
import { Field, TextInput } from '../ui/Field';
import { Spinner } from '../ui/Spinner';
import { StatusBadge } from '../ui/StatusBadge';
import { getPaymentHistory } from '../../lib/api/payments';
import {
  chargeTypeLabel,
  formatPaymentDate,
  formatPeso,
  paymentMethodLabel,
  paymentStatusMeta,
  roomOrBedLabel,
  trackerStatusMeta,
} from '../../lib/payments';
import type { TrackerRow } from '../../lib/types';

/**
 * The monthly tracker table (spec `payments-tracker-redesign` §7.1, D6/D7/D16/D18).
 *
 * One row per boarder, rent-driven, with the row's own actions. Expanding a row
 * reveals that tenancy's whole charge history — deposit, advance, utilities and
 * late fees included — plus the manual next-due editor and any claim that needs a
 * decision (D15).
 */
export function PaymentTrackerTable({
  token,
  rows,
  busy,
  onRecord,
  onRemind,
  onNextDue,
  onVerify,
  onReject,
  onError,
}: {
  token: string;
  rows: TrackerRow[];
  busy: boolean;
  onRecord: (row: TrackerRow) => void;
  onRemind: (row: TrackerRow) => void;
  onNextDue: (row: TrackerRow, date: string) => void;
  onVerify: (submissionId: number) => void;
  onReject: (submissionId: number) => void;
  onError: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <caption className="sr-only">Monthly boarder payment tracker</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-gray-ink">
            <th className="px-4 py-3">Boarder</th>
            <th className="px-4 py-3">Room or bed</th>
            <th className="px-4 py-3">Move-in</th>
            <th className="px-4 py-3">Monthly rent</th>
            <th className="px-4 py-3">Current due date</th>
            <th className="px-4 py-3">Days</th>
            <th className="px-4 py-3">Last payment</th>
            <th className="px-4 py-3">Method</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const meta = trackerStatusMeta(row);
            const open = expanded === row.application_id;

            return (
              <Fragment key={row.application_id}>
                <tr className="border-b border-border/60 align-top">
                  <td className="px-4 py-3 font-medium text-ink">{row.boarder_name}</td>
                  <td className="px-4 py-3 text-gray-ink">
                    {roomOrBedLabel(row.room_number, row.room_occupied, row.room_capacity)}
                  </td>
                  <td className="px-4 py-3 text-gray-ink">{formatPaymentDate(row.move_in_date)}</td>
                  <td className="px-4 py-3 text-ink">{formatPeso(row.monthly_rent)}</td>
                  <td className="px-4 py-3 text-ink">
                    {row.next_due_date ? formatPaymentDate(row.next_due_date) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-ink">
                    {row.days_overdue !== null
                      ? `${row.days_overdue}d overdue`
                      : row.days_remaining !== null
                      ? `${row.days_remaining}d left`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-ink">
                    {row.last_payment ? formatPaymentDate(row.last_payment.date) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-ink">
                    {row.last_payment
                      ? paymentMethodLabel(row.last_payment.method, row.last_payment.method_label)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <StatusBadge status={meta.status} label={meta.label} icon={meta.icon} />
                      {row.has_pending_claim ? (
                        <StatusBadge
                          status="awaiting_verification"
                          label="Awaiting verification"
                          icon="clock"
                        />
                      ) : null}
                      {row.other_open_charges > 0 ? (
                        <StatusBadge
                          status="upcoming"
                          label={`+${row.other_open_charges} other`}
                          icon="plus"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRecord(row)}
                        aria-label={`Record payment for ${row.boarder_name}`}
                      >
                        Record payment
                      </Button>
                      {row.can_remind ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => onRemind(row)}
                          aria-label={`Send reminder to ${row.boarder_name}`}
                        >
                          Send reminder
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-expanded={open}
                        aria-controls={`history-${row.application_id}`}
                        onClick={() => setExpanded(open ? null : row.application_id)}
                      >
                        {open ? 'Hide history' : 'History'}
                      </Button>
                    </div>
                  </td>
                </tr>
                {open ? (
                  <tr id={`history-${row.application_id}`} className="border-b border-border/60">
                    <td colSpan={10} className="bg-subtle/40 px-4 py-4">
                      <RowHistory
                        token={token}
                        row={row}
                        onNextDue={onNextDue}
                        onVerify={onVerify}
                        onReject={onReject}
                        onError={onError}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowHistory({
  token,
  row,
  onNextDue,
  onVerify,
  onReject,
  onError,
}: {
  token: string;
  row: TrackerRow;
  onNextDue: (row: TrackerRow, date: string) => void;
  onVerify: (submissionId: number) => void;
  onReject: (submissionId: number) => void;
  onError: (message: string) => void;
}) {
  const history = useQuery({
    queryKey: ['payment-history', row.application_id],
    queryFn: () => getPaymentHistory(token, row.application_id),
  });
  const [nextDue, setNextDue] = useState(row.next_due_date ?? '');

  if (history.isLoading) {
    return <Spinner />;
  }

  if (history.error) {
    onError(history.error.message);

    return <p className="text-sm text-error-ink">Could not load this history.</p>;
  }

  const charges = history.data?.data.charges ?? [];
  const pending = charges.flatMap(charge =>
    charge.submissions
      .filter(submission => submission.status === 'pending')
      .map(submission => ({ charge, submission }))
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Next due date" htmlFor={`next-due-${row.application_id}`}>
          <TextInput
            id={`next-due-${row.application_id}`}
            type="date"
            value={nextDue}
            onChange={event => setNextDue(event.target.value)}
          />
        </Field>
        <Button
          size="sm"
          variant="outline"
          disabled={!nextDue}
          onClick={() => onNextDue(row, nextDue)}
        >
          Save next due date
        </Button>
      </div>

      {pending.length > 0 ? (
        <div className="rounded-xl border border-info-border bg-info-tint p-3">
          <h3 className="text-sm font-semibold text-info-ink">Awaiting your verification</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {pending.map(({ charge, submission }) => (
              <li key={submission.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-ink">
                  {formatPeso(submission.amount)} · {paymentMethodLabel(submission.payment_method)}{' '}
                  · Ref {submission.reference_number}
                </span>
                {submission.proof_url ? (
                  <a
                    href={submission.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    View receipt
                  </a>
                ) : null}
                <Button size="sm" onClick={() => onVerify(submission.id)}>
                  Verify
                </Button>
                <Button size="sm" variant="dangerGhost" onClick={() => onReject(submission.id)}>
                  Reject
                </Button>
                <span className="text-xs text-gray-ink">
                  {charge.description || chargeTypeLabel(charge.charge_type)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-ink">
              <th className="py-2">Charge</th>
              <th className="py-2">Due</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Late fee</th>
              <th className="py-2">Status</th>
              <th className="py-2">Paid</th>
              <th className="py-2">Method</th>
              <th className="py-2">Reference</th>
              <th className="py-2">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {charges.map(charge => {
              const meta = paymentStatusMeta(charge);
              const receipt = charge.submissions.find(submission => submission.proof_url);

              return (
                <tr key={charge.id} className="border-t border-border/50">
                  <td className="py-2 text-ink">
                    {charge.description || chargeTypeLabel(charge.charge_type)}
                  </td>
                  <td className="py-2 text-gray-ink">{formatPaymentDate(charge.due_date)}</td>
                  <td className="py-2 text-ink">{formatPeso(charge.amount)}</td>
                  <td className="py-2 text-gray-ink">
                    {charge.late_fee > 0 ? formatPeso(charge.late_fee) : '—'}
                  </td>
                  <td className="py-2">
                    <StatusBadge status={meta.status} label={meta.label} />
                  </td>
                  <td className="py-2 text-gray-ink">
                    {charge.paid_date ? formatPaymentDate(charge.paid_date) : '—'}
                  </td>
                  <td className="py-2 text-gray-ink">
                    {paymentMethodLabel(charge.payment_method, charge.payment_method_label)}
                  </td>
                  <td className="py-2 text-gray-ink">{charge.reference_number ?? '—'}</td>
                  <td className="py-2">
                    {receipt?.proof_url ? (
                      <a
                        href={receipt.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        Receipt
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
