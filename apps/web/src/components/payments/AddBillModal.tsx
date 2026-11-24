import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Button } from '../ui/Button';
import { Field, SelectInput, TextInput } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { getRooms } from '../../lib/api/landlord';
import { createPropertyBill } from '../../lib/api/payments';
import { formatPeso, roomLabel } from '../../lib/payments';

/**
 * Additional bills (electricity, water, internet, maintenance, other) for one
 * property: all rooms or chosen rooms, each tenant paying the amount or sharing
 * it. The API works out which current tenants are affected and never charges
 * the same bill twice.
 */
export function AddBillModal({
  open,
  token,
  propertyId,
  propertyName,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  token: string;
  propertyId: number | null;
  propertyName: string;
  onClose: () => void;
  onCreated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [chargeType, setChargeType] = useState<'utility' | 'other'>('utility');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [appliesTo, setAppliesTo] = useState<'all' | 'rooms'>('all');
  const [roomIds, setRoomIds] = useState<number[]>([]);
  const [arrangement, setArrangement] = useState<'each' | 'split'>('each');

  const rooms = useQuery({
    queryKey: ['landlord-rooms', propertyId],
    queryFn: () => getRooms(token, propertyId!),
    enabled: open && Boolean(propertyId),
  });
  const roomList = rooms.data?.data.rooms ?? [];

  const create = useMutation({
    mutationFn: () =>
      createPropertyBill(token, propertyId!, {
        name: name.trim(),
        charge_type: chargeType,
        description: description.trim() || undefined,
        amount: Number(amount),
        due_date: dueDate,
        billing_period: period || undefined,
        applies_to: appliesTo,
        room_ids: appliesTo === 'rooms' ? roomIds : [],
        arrangement,
      }),
    onSuccess: result => {
      onCreated(result.message);
      setName('');
      setDescription('');
      setAmount('');
      setRoomIds([]);
      onClose();
    },
    onError: error => onError(error.message),
  });

  const canSubmit =
    Boolean(propertyId) &&
    name.trim().length > 0 &&
    Number(amount) > 0 &&
    Boolean(dueDate) &&
    (appliesTo === 'all' || roomIds.length > 0);

  return (
    <Modal open={open} title={`Add a bill · ${propertyName}`} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={event => {
          event.preventDefault();
          if (canSubmit) create.mutate();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Bill name" htmlFor="bill-name">
            <TextInput
              id="bill-name"
              required
              list="bill-name-suggestions"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="e.g. Electricity"
            />
            <datalist id="bill-name-suggestions">
              <option value="Electricity" />
              <option value="Water" />
              <option value="Internet" />
              <option value="Maintenance fee" />
            </datalist>
          </Field>

          <Field label="Type" htmlFor="bill-type">
            <SelectInput
              id="bill-type"
              value={chargeType}
              onChange={event => setChargeType(event.target.value as 'utility' | 'other')}
            >
              <option value="utility">Utility</option>
              <option value="other">Other charge</option>
            </SelectInput>
          </Field>
        </div>

        <Field label="Description (optional)" htmlFor="bill-description">
          <TextInput
            id="bill-description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="e.g. Meralco reading Feb 1 – Feb 28"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Amount (₱)" htmlFor="bill-amount">
            <TextInput
              id="bill-amount"
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={event => setAmount(event.target.value)}
            />
          </Field>
          <Field label="Billing period (optional)" htmlFor="bill-period">
            <TextInput
              id="bill-period"
              type="month"
              value={period}
              onChange={event => setPeriod(event.target.value)}
            />
          </Field>
          <Field label="Due date" htmlFor="bill-due">
            <TextInput
              id="bill-due"
              type="date"
              required
              value={dueDate}
              onChange={event => setDueDate(event.target.value)}
            />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-ink">Applies to</legend>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="bill-applies"
              checked={appliesTo === 'all'}
              onChange={() => setAppliesTo('all')}
              className="h-4 w-4 accent-primary"
            />
            All rooms (every current tenant)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="bill-applies"
              checked={appliesTo === 'rooms'}
              onChange={() => setAppliesTo('rooms')}
              className="h-4 w-4 accent-primary"
            />
            Specific rooms
          </label>
          {appliesTo === 'rooms' ? (
            <div className="ml-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {roomList.length === 0 ? (
                <p className="col-span-full text-sm text-gray-ink">
                  {rooms.isLoading ? 'Loading rooms…' : 'This property has no rooms.'}
                </p>
              ) : (
                roomList.map(room => (
                  <label key={room.id} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={roomIds.includes(room.id)}
                      onChange={event =>
                        setRoomIds(current =>
                          event.target.checked
                            ? [...current, room.id]
                            : current.filter(id => id !== room.id)
                        )
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    {roomLabel(room.room_number) || `Room ${room.id}`}
                  </label>
                ))
              )}
            </div>
          ) : null}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-ink">Billing arrangement</legend>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="bill-arrangement"
              checked={arrangement === 'each'}
              onChange={() => setArrangement('each')}
              className="h-4 w-4 accent-primary"
            />
            Each tenant pays {Number(amount) > 0 ? formatPeso(Number(amount)) : 'the amount'}
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="bill-arrangement"
              checked={arrangement === 'split'}
              onChange={() => setArrangement('split')}
              className="h-4 w-4 accent-primary"
            />
            Split the amount evenly between the affected tenants
          </label>
        </fieldset>

        <p className="text-xs text-gray-ink">
          Only tenants living in the selected rooms on the due date are charged. Posting the same
          bill name and due date again never charges anyone twice. Rent is not affected.
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || create.isPending}>
            {create.isPending ? 'Adding…' : 'Add bill'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
