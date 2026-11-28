import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '../ui/Button';
import { Field, SelectInput, TextInput } from '../ui/Field';
import { Modal } from '../ui/Modal';
import {
  assignLandlordAmenity,
  createLandlordAmenities,
  logLandlordAmenityUsage,
  rejectAmenityRequest,
  rejectAmenityUsage,
  updateAmenitySubscription,
  updateLandlordAmenity,
  type CreatePaidAmenityPayload,
} from '../../lib/api/payments';
import { formatPeso, manilaToday } from '../../lib/payments';
import type {
  AmenityBillingModel,
  AmenityBoarderOption,
  PaidAmenity,
  TenancyAmenity,
} from '../../lib/types';
import { AMENITY_ICON_OPTIONS, AMENITY_PRESETS, defaultDueDatePlus3 } from './amenity-presets';

export function CatalogItemModal({
  open,
  editing,
  propertyId,
  token,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  editing: PaidAmenity | null;
  propertyId: number | null;
  token: string;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('sparkles');
  const [model, setModel] = useState<AmenityBillingModel>('monthly');
  const [price, setPrice] = useState('');
  const [unitLabel, setUnitLabel] = useState('unit');
  const [isMetered, setIsMetered] = useState(false);
  const [isIncluded, setIsIncluded] = useState(false);
  const [maxSlots, setMaxSlots] = useState('');
  const [allowRequest, setAllowRequest] = useState(true);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? '');
      setIcon(editing.icon);
      setModel(editing.billing_model);
      setPrice(String(editing.price));
      setUnitLabel(editing.unit_label);
      setIsMetered(editing.is_metered);
      setIsIncluded(editing.is_included);
      setMaxSlots(editing.max_slots !== null ? String(editing.max_slots) : '');
      setAllowRequest(editing.allow_boarder_request);
    } else {
      setName('');
      setDescription('');
      setIcon('sparkles');
      setModel('monthly');
      setPrice('');
      setUnitLabel('unit');
      setIsMetered(false);
      setIsIncluded(false);
      setMaxSlots('');
      setAllowRequest(true);
    }
  }, [open, editing]);

  const applyPreset = (preset: CreatePaidAmenityPayload) => {
    setName(preset.name);
    setDescription(preset.description ?? '');
    setIcon(preset.icon ?? 'sparkles');
    setModel(preset.billing_model);
    setPrice(String(preset.price));
    setUnitLabel(preset.unit_label ?? 'unit');
    setIsMetered(Boolean(preset.is_metered));
    setIsIncluded(Boolean(preset.is_included));
    setMaxSlots(preset.max_slots ? String(preset.max_slots) : '');
    setAllowRequest(true);
  };

  const save = useMutation({
    mutationFn: async (): Promise<unknown> => {
      const payload: CreatePaidAmenityPayload = {
        name: name.trim(),
        description: description.trim() || null,
        icon,
        billing_model: model,
        price: isIncluded ? 0 : Number(price || 0),
        unit_label: unitLabel.trim() || 'unit',
        is_metered: model === 'per_use' && isMetered,
        is_included: isIncluded,
        max_slots: maxSlots.trim() ? Number(maxSlots) : null,
        allow_boarder_request: allowRequest,
      };

      return editing
        ? await updateLandlordAmenity(token, editing.id, payload)
        : await createLandlordAmenities(token, propertyId!, [payload]);
    },
    onSuccess: () => {
      onSaved(editing ? 'Amenity updated' : 'Amenity added to catalog');
      onClose();
    },
    onError: err => onError(err.message),
  });

  const canSave =
    Boolean(propertyId) &&
    name.trim().length > 0 &&
    (isIncluded || (price.trim() !== '' && Number(price) >= 0));

  return (
    <Modal open={open} title={editing ? 'Edit amenity' : 'Add paid amenity'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {!editing ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-ink">
              Quick boarding-house presets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {AMENITY_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-full border border-border-strong bg-subtle px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-primary hover:bg-mint"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Amenity name" htmlFor="amenity-name">
              <TextInput
                id="amenity-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Mini-fridge or Parking slot"
              />
            </Field>
          </div>
          <Field label="Icon" htmlFor="amenity-icon">
            <SelectInput id="amenity-icon" value={icon} onChange={e => setIcon(e.target.value)}>
              {AMENITY_ICON_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <Field label="Description (optional)" htmlFor="amenity-desc">
          <TextInput
            id="amenity-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Terms, wattage limit, or slot details"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Billing model" htmlFor="amenity-model">
            <SelectInput
              id="amenity-model"
              value={model}
              onChange={e => setModel(e.target.value as AmenityBillingModel)}
            >
              <option value="monthly">Monthly recurring</option>
              <option value="per_use">Per-use / Metered</option>
              <option value="one_time">One-time fee</option>
            </SelectInput>
          </Field>

          <Field label="Rate (₱)" htmlFor="amenity-price">
            <TextInput
              id="amenity-price"
              type="number"
              min="0"
              step="0.01"
              disabled={isIncluded}
              value={isIncluded ? '0' : price}
              onChange={e => setPrice(e.target.value)}
            />
          </Field>

          <Field label="Unit label" htmlFor="amenity-unit">
            <TextInput
              id="amenity-unit"
              value={unitLabel}
              onChange={e => setUnitLabel(e.target.value)}
              placeholder="unit, slot, kWh, load"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Max slots (blank = unlimited)" htmlFor="amenity-slots">
            <TextInput
              id="amenity-slots"
              type="number"
              min="1"
              step="1"
              value={maxSlots}
              onChange={e => setMaxSlots(e.target.value)}
              placeholder="Unlimited"
            />
          </Field>

          <div className="flex flex-col justify-end gap-2 pb-1 text-sm text-ink">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isIncluded}
                onChange={e => setIsIncluded(e.target.checked)}
              />
              Included free (₱0 tracked perk)
            </label>
            {model === 'per_use' ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isMetered}
                  onChange={e => setIsMetered(e.target.checked)}
                />
                Track sub-meter readings (prev → current)
              </label>
            ) : null}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowRequest}
                onChange={e => setAllowRequest(e.target.checked)}
              />
              Allow boarders to request this
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSave || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving...' : editing ? 'Save changes' : 'Add amenity'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AssignAmenityModal({
  amenity,
  propertyId,
  boarders,
  token,
  onClose,
  onDone,
  onError,
}: {
  amenity: PaidAmenity | null;
  propertyId: number | null;
  boarders: AmenityBoarderOption[];
  token: string;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [applicationId, setApplicationId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [dueDate, setDueDate] = useState(() => defaultDueDatePlus3(manilaToday()));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!amenity) return;
    setApplicationId(boarders[0] ? String(boarders[0].application_id) : '');
    setQuantity('1');
    setDueDate(defaultDueDatePlus3(manilaToday()));
    setNotes('');
  }, [amenity, boarders]);

  const assign = useMutation({
    mutationFn: () =>
      assignLandlordAmenity(token, propertyId!, amenity!.id, {
        application_id: Number(applicationId),
        quantity: Number(quantity || 1),
        due_date: dueDate || null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      onDone('Amenity assigned');
      onClose();
    },
    onError: err => onError(err.message),
  });

  const total = amenity ? amenity.price * Math.max(Number(quantity || 1), 1) : 0;

  return (
    <Modal open={Boolean(amenity)} title={`Assign ${amenity?.name ?? ''}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Boarder" htmlFor="assign-boarder">
          <SelectInput
            id="assign-boarder"
            value={applicationId}
            onChange={e => setApplicationId(e.target.value)}
          >
            {boarders.map(b => (
              <option key={b.application_id} value={b.application_id}>
                {b.boarder_name} ({b.room_title})
              </option>
            ))}
          </SelectInput>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Quantity" htmlFor="assign-qty">
            <TextInput
              id="assign-qty"
              type="number"
              min="1"
              max="20"
              step="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="Initial charge due date" htmlFor="assign-due">
            <TextInput
              id="assign-due"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Note (optional)" htmlFor="assign-note">
          <TextInput
            id="assign-note"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g., Slot #2 near gate"
          />
        </Field>

        <p className="text-sm text-gray-ink">
          Initial charge: <span className="font-semibold text-ink">{formatPeso(total)}</span>
          {amenity?.billing_model === 'monthly'
            ? ' · Renews monthly aligned to rent due date'
            : ''}
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!applicationId || boarders.length === 0 || assign.isPending}
            onClick={() => assign.mutate()}
          >
            {assign.isPending ? 'Assigning...' : 'Assign & Bill'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function LogUsageModal({
  amenity,
  propertyId,
  boarders,
  token,
  onClose,
  onDone,
  onError,
}: {
  amenity: PaidAmenity | null;
  propertyId: number | null;
  boarders: AmenityBoarderOption[];
  token: string;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [selectedApps, setSelectedApps] = useState<number[]>([]);
  const [quantity, setQuantity] = useState('1');
  const [prevReading, setPrevReading] = useState('');
  const [currReading, setCurrReading] = useState('');
  const [dueDate, setDueDate] = useState(() => defaultDueDatePlus3(manilaToday()));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!amenity) return;
    setSelectedApps(boarders[0] ? [boarders[0].application_id] : []);
    setQuantity('1');
    setPrevReading('');
    setCurrReading('');
    setDueDate(defaultDueDatePlus3(manilaToday()));
    setNotes('');
  }, [amenity, boarders]);

  const useReadings = Boolean(amenity?.is_metered && prevReading !== '' && currReading !== '');
  const computedQty = useReadings
    ? Math.max(Number(currReading) - Number(prevReading), 0)
    : Math.max(Number(quantity || 0), 0);
  const totalPerBoarder = amenity ? computedQty * amenity.price : 0;

  const log = useMutation({
    mutationFn: () =>
      logLandlordAmenityUsage(token, propertyId!, amenity!.id, {
        application_ids: selectedApps,
        quantity: useReadings ? undefined : Number(quantity),
        previous_reading: useReadings ? Number(prevReading) : null,
        current_reading: useReadings ? Number(currReading) : null,
        due_date: dueDate || null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      onDone('Usage logged and billed');
      onClose();
    },
    onError: err => onError(err.message),
  });

  const toggleBoarder = (id: number) =>
    setSelectedApps(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const canSubmit =
    selectedApps.length > 0 &&
    computedQty > 0 &&
    (!useReadings || Number(currReading) > Number(prevReading));

  return (
    <Modal open={Boolean(amenity)} title={`Log ${amenity?.name ?? 'usage'}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">Select boarder(s)</p>
          <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border-strong p-3">
            {boarders.map(b => (
              <label key={b.application_id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={selectedApps.includes(b.application_id)}
                  onChange={() => toggleBoarder(b.application_id)}
                />
                {b.boarder_name} <span className="text-gray-ink">({b.room_title})</span>
              </label>
            ))}
            {boarders.length === 0 ? (
              <p className="text-sm text-gray-ink">No active confirmed boarders.</p>
            ) : null}
          </div>
        </div>

        {amenity?.is_metered ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`Previous reading (${amenity.unit_label})`} htmlFor="prev-reading">
              <TextInput
                id="prev-reading"
                type="number"
                min="0"
                step="0.01"
                value={prevReading}
                onChange={e => setPrevReading(e.target.value)}
              />
            </Field>
            <Field label={`Current reading (${amenity.unit_label})`} htmlFor="curr-reading">
              <TextInput
                id="curr-reading"
                type="number"
                min="0"
                step="0.01"
                value={currReading}
                onChange={e => setCurrReading(e.target.value)}
              />
            </Field>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!useReadings ? (
            <Field label={`Quantity (${amenity?.unit_label ?? 'unit'})`} htmlFor="usage-qty">
              <TextInput
                id="usage-qty"
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </Field>
          ) : (
            <div className="flex items-end pb-2 text-sm text-ink">
              Computed usage:{' '}
              <span className="ml-1 font-semibold">
                {computedQty} {amenity?.unit_label}
              </span>
            </div>
          )}

          <Field label="Due date" htmlFor="usage-due">
            <TextInput
              id="usage-due"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Note (optional)" htmlFor="usage-note">
          <TextInput
            id="usage-note"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional reading or load note"
          />
        </Field>

        <p className="text-sm text-gray-ink">
          Charge per selected boarder:{' '}
          <span className="font-semibold text-ink">{formatPeso(totalPerBoarder)}</span>
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || log.isPending} onClick={() => log.mutate()}>
            {log.isPending ? 'Posting...' : 'Post charge'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function EditSubscriptionModal({
  subscription,
  token,
  onClose,
  onDone,
  onError,
}: {
  subscription: TenancyAmenity | null;
  token: string;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    if (!subscription) return;
    setPrice(String(subscription.unit_price_snapshot));
    setQuantity(String(subscription.quantity));
  }, [subscription]);

  const update = useMutation({
    mutationFn: () =>
      updateAmenitySubscription(token, subscription!.id, {
        unit_price_snapshot: Number(price),
        quantity: Number(quantity),
      }),
    onSuccess: () => {
      onDone('Subscription updated for future cycles');
      onClose();
    },
    onError: err => onError(err.message),
  });

  return (
    <Modal
      open={Boolean(subscription)}
      title={`Update ${subscription?.amenity_name ?? ''} for ${subscription?.boarder_name ?? ''}`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Rate per unit (₱)" htmlFor="sub-price">
            <TextInput
              id="sub-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Quantity" htmlFor="sub-qty">
            <TextInput
              id="sub-qty"
              type="number"
              min="1"
              max="20"
              step="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={update.isPending} onClick={() => update.mutate()}>
            {update.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function RejectRequestModal({
  target,
  token,
  onClose,
  onDone,
  onError,
}: {
  target: { kind: 'subscription' | 'usage'; id: number; label: string } | null;
  token: string;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (target) setReason('');
  }, [target]);

  const reject = useMutation({
    mutationFn: async (): Promise<unknown> =>
      target!.kind === 'subscription'
        ? await rejectAmenityRequest(token, target!.id, reason.trim() || null)
        : await rejectAmenityUsage(token, target!.id, reason.trim() || null),
    onSuccess: () => {
      onDone('Request declined');
      onClose();
    },
    onError: err => onError(err.message),
  });

  return (
    <Modal open={Boolean(target)} title={`Decline ${target?.label ?? 'request'}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Reason (optional)" htmlFor="reject-reason">
          <TextInput
            id="reject-reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Let the boarder know why"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={reject.isPending} onClick={() => reject.mutate()}>
            {reject.isPending ? 'Declining...' : 'Decline request'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
