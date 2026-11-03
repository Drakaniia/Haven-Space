import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '../ui/Button';
import { Field, SelectInput, TextInput } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { createLandlordCharge } from '../../lib/api/payments';
import type { TrackerRow } from '../../lib/types';

/**
 * Utilities and one-off charges (spec `payments-tracker-redesign` D18, kept by
 * `landlord-payments-monitoring` §12).
 *
 * It no longer lives on the page header: the monitoring page has no prominent
 * create action, so this opens from the tenant drawer with that tenant already
 * selected.
 */
export function AddChargeModal({
  open,
  rows,
  token,
  propertyId,
  initialBoarderId = null,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  rows: TrackerRow[];
  token: string;
  propertyId: number | null;
  initialBoarderId?: number | null;
  onClose: () => void;
  onCreated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [boarderId, setBoarderId] = useState(
    initialBoarderId ? String(initialBoarderId) : String(rows[0]?.boarder_id ?? '')
  );
  const [chargeType, setChargeType] = useState('utility');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  const create = useMutation({
    mutationFn: () =>
      createLandlordCharge(token, propertyId!, {
        boarder_id: Number(boarderId || rows[0]?.boarder_id),
        charge_type: chargeType,
        amount: Number(amount),
        due_date: dueDate,
        description: description || (chargeType === 'utility' ? 'Utilities' : 'Additional charge'),
      }),
    onSuccess: () => {
      onCreated('Charge added');
      setAmount('');
      setDescription('');
      onClose();
    },
    onError: error => onError(error.message),
  });

  const canSubmit = Boolean(propertyId) && rows.length > 0 && Number(amount) > 0 && Boolean(dueDate);

  return (
    <Modal open={open} title="Add a charge" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Boarder" htmlFor="charge-boarder">
          <SelectInput
            id="charge-boarder"
            value={boarderId}
            onChange={event => setBoarderId(event.target.value)}
          >
            {rows.map(row => (
              <option key={row.boarder_id} value={row.boarder_id}>
                {row.boarder_name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="charge-type">
            <SelectInput
              id="charge-type"
              value={chargeType}
              onChange={event => setChargeType(event.target.value)}
            >
              <option value="utility">Utilities</option>
              <option value="other">Other charge</option>
            </SelectInput>
          </Field>

          <Field label="Amount (₱)" htmlFor="charge-amount">
            <TextInput
              id="charge-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={event => setAmount(event.target.value)}
            />
          </Field>

          <Field label="Due date" htmlFor="charge-due">
            <TextInput
              id="charge-due"
              type="date"
              value={dueDate}
              onChange={event => setDueDate(event.target.value)}
            />
          </Field>

          <Field label="Description" htmlFor="charge-description">
            <TextInput
              id="charge-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
            />
          </Field>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-ink">
            A charge belongs to a boarder, so this needs at least one confirmed tenant.
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Adding…' : 'Add charge'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
