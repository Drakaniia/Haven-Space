import { useEffect, useState } from 'react';

import { formatPaymentDate, formatPeso, manilaToday } from '../../lib/payments';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/ErrorState';
import { Modal } from '../ui/Modal';

export interface ApproveLeaveDetails {
  applicationId: number;
  boarderName: string;
  propertyName: string;
  roomName: string;
  leaveDate: string;
  requestedOn: string | null;
  reason: string | null;
  /** Owed through the leave date — approving with a balance needs an explicit tick. */
  outstandingAmount: number;
}

/**
 * Shared confirmation for approving a leave request (spec `approve-leave-request`
 * §5.2). Used by the Boarders table and the calendar day panel, so the copy and
 * the consequences stay identical wherever the landlord approves from.
 */
export function ApproveLeaveDialog({
  details,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  details: ApproveLeaveDetails | null;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const leaveDate = details ? formatPaymentDate(details.leaveDate) : '';
  const room = details?.roomName || 'the room';
  const property = details?.propertyName || 'the property';
  const immediate = Boolean(details && details.leaveDate && details.leaveDate <= manilaToday());
  // An unsettled balance does not block the leave, but the landlord must say
  // they saw it; the charges stay in the tenant's payment records.
  const outstanding = details?.outstandingAmount ?? 0;
  const [acknowledged, setAcknowledged] = useState(false);
  const blocked = outstanding > 0 && !acknowledged;

  useEffect(() => setAcknowledged(false), [details?.applicationId]);

  return (
    <Modal
      open={details !== null}
      title="Approve leave request?"
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      {details ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-ink">
            Approving frees {room} at {property} now. Charges due up to the leave date stay due;
            rent billed for after it is cancelled.{' '}
            {immediate
              ? 'The leave date has already arrived, so the tenancy ends immediately.'
              : `${details.boarderName} stays listed as “Leaving approved” until ${leaveDate}.`}
          </p>

          {outstanding > 0 ? (
            <div
              id="approve-leave-balance"
              role="status"
              className="flex flex-col gap-2 rounded-xl border border-warning-border bg-warning-tint px-3 py-2 text-sm text-warning-ink"
            >
              <p>
                This tenant still owes {formatPeso(outstanding)} through their leave date. You can
                approve anyway; the unpaid charges stay in Payments until they are settled.
              </p>
              <label className="flex items-start gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={event => setAcknowledged(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                Approve with the balance still owed
              </label>
            </div>
          ) : null}

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Detail label="Tenant" value={details.boarderName} />
            <Detail label="Property" value={details.propertyName} />
            <Detail label="Room" value={details.roomName} />
            <Detail label="Leave date" value={leaveDate} />
            <Detail label="Requested on" value={formatPaymentDate(details.requestedOn)} />
            <Detail label="Reason" value={details.reason ?? '—'} />
          </dl>

          {error ? <ErrorState message={error} /> : null}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={onConfirm}
                disabled={busy || blocked}
                aria-describedby={blocked ? 'approve-leave-balance' : undefined}
              >
                {busy ? 'Approving…' : 'Approve leave'}
              </Button>
              {blocked ? (
                <span className="text-xs text-warning-ink">Tick to approve with the balance</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-gray-ink">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}
