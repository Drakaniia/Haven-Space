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
  /** Open charges on the tenancy — approval is refused while this is above zero. */
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
  // Blocking before the click, not after the 409: the landlord should never be
  // invited to confirm something the API will refuse (spec §3.5).
  const outstanding = details?.outstandingAmount ?? 0;
  const blocked = outstanding > 0;

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
            Approving frees {room} at {property} now. Any open charges stay due.{' '}
            {immediate
              ? 'The leave date has already arrived, so the tenancy ends immediately.'
              : `${details.boarderName} stays listed as “Leaving approved” until ${leaveDate}.`}
          </p>

          {blocked ? (
            <p
              id="approve-leave-balance"
              role="status"
              className="rounded-xl border border-warning-border bg-warning-tint px-3 py-2 text-sm text-warning-ink"
            >
              This tenant still owes {formatPeso(outstanding)}. Settle or verify payments before
              approving.
            </p>
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
              {blocked ? <span className="text-xs text-warning-ink">Unsettled balance</span> : null}
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
