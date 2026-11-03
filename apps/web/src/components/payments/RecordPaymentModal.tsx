import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '../ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import {
  getPaymentHistory,
  recordLandlordPayment,
  uploadLandlordProof,
} from '../../lib/api/payments';
import {
  PAYMENT_METHODS,
  formatPaymentDate,
  formatPeso,
  isChargeOpen,
  methodNeedsReceipt,
  methodNeedsReference,
} from '../../lib/payments';
import type { PaymentCharge } from '../../lib/types';

/**
 * Recording a payment (spec `payments-tracker-redesign` §7.1, D11/D12/D13/D27/R5).
 *
 * The modal lists the tenancy's open charges with every one pre-selected — a
 * charge always settles in full (D27), and deselecting simply means it stays open.
 * Cash needs no receipt; every other method must attach one (D13).
 */
export function RecordPaymentModal({
  token,
  open,
  boarders,
  initialApplicationId,
  onClose,
  onRecorded,
  onError,
}: {
  token: string;
  open: boolean;
  boarders: Array<{ application_id: number; boarder_name: string }>;
  initialApplicationId?: number | null;
  onClose: () => void;
  onRecorded: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [applicationId, setApplicationId] = useState<number | null>(initialApplicationId ?? null);
  const [selected, setSelected] = useState<number[]>([]);
  const [paidDate, setPaidDate] = useState('');
  const [method, setMethod] = useState<string>('cash');
  const [methodLabel, setMethodLabel] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [nextDue, setNextDue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setApplicationId(initialApplicationId ?? boarders[0]?.application_id ?? null);
    setSelected([]);
    setPaidDate(new Date().toISOString().slice(0, 10));
    setMethod('cash');
    setMethodLabel('');
    setReference('');
    setNotes('');
    setNextDue('');
    setFile(null);
  }, [open, initialApplicationId, boarders]);

  const history = useQuery({
    queryKey: ['payment-history', applicationId],
    queryFn: () => getPaymentHistory(token, applicationId!),
    enabled: open && Boolean(applicationId),
  });

  const charges: PaymentCharge[] = (history.data?.data.charges ?? []).filter(isChargeOpen);

  useEffect(() => {
    setSelected(charges.map(charge => charge.id));
    setNextDue(history.data?.data.tenancy.next_due_date ?? '');
  }, [history.data]);

  const total = charges
    .filter(charge => selected.includes(charge.id))
    .reduce((sum, charge) => sum + charge.total_due, 0);
  const needsReceipt = methodNeedsReceipt(method);
  const needsReference = methodNeedsReference(method);
  const canSubmit =
    Boolean(applicationId) &&
    selected.length > 0 &&
    total > 0 &&
    (!needsReceipt || file !== null) &&
    (!needsReference || reference.trim().length > 0) &&
    (method !== 'other' || methodLabel.trim().length > 0);

  // The one thing still standing between the landlord and the button, said
  // plainly instead of leaving a disabled control to be puzzled over.
  const missing = !applicationId
    ? 'Choose a boarder.'
    : history.isLoading
      ? null
      : charges.length === 0
        ? null
        : selected.length === 0
          ? 'Tick at least one charge that was paid.'
          : method === 'other' && methodLabel.trim().length === 0
            ? 'Name the payment method.'
            : needsReference && reference.trim().length === 0
              ? 'Add the reference or transaction ID.'
              : needsReceipt && file === null
                ? 'Attach a receipt — only cash can be recorded without one.'
                : null;
  const boarderName =
    boarders.find(row => row.application_id === applicationId)?.boarder_name ?? 'this boarder';
  const methodName =
    method === 'other'
      ? methodLabel.trim() || 'another method'
      : (PAYMENT_METHODS.find(option => option.value === method)?.label ?? method);

  const submit = async () => {
    if (!applicationId || selected.length === 0) {
      return;
    }

    setBusy(true);

    try {
      let proofUrl: string | undefined;

      if (file) {
        const uploaded = await uploadLandlordProof(token, selected[0], file);
        const proof = uploaded.data?.proof_url;

        if (!proof) {
          throw new Error('Could not upload the receipt');
        }

        proofUrl = proof;
      }

      await recordLandlordPayment(token, selected[0], {
        payment_method: method,
        payment_method_label: method === 'other' ? methodLabel.trim() : undefined,
        reference_number: reference.trim() || undefined,
        proof_url: proofUrl,
        paid_date: paidDate || undefined,
        notes: notes.trim() || undefined,
        charge_ids: selected,
        next_due_date: nextDue || undefined,
        amount: total,
      });

      onRecorded(`Logged ${formatPeso(total)} — next due ${nextDue || 'recalculated'}`);
      onClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not record the payment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Record a payment" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Boarder" htmlFor="record-boarder">
          <SelectInput
            id="record-boarder"
            value={String(applicationId ?? '')}
            onChange={event => setApplicationId(Number(event.target.value))}
          >
            {boarders.map(row => (
              <option key={row.application_id} value={row.application_id}>
                {row.boarder_name}
              </option>
            ))}
          </SelectInput>
        </Field>

        {history.isLoading ? <Spinner /> : null}

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Charges to settle in full</legend>
          {history.isLoading ? null : charges.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-4 text-sm text-gray-ink">
              This boarder has no open charges. Nothing needs recording right now.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {charges.map(charge => (
                <li key={charge.id}>
                  <label
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3.5 py-3 text-sm transition-colors duration-100 ${
                      selected.includes(charge.id) ? 'bg-mint/50' : 'bg-surface hover:bg-cream'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 rounded border-border-strong accent-[var(--color-primary-strong)]"
                        checked={selected.includes(charge.id)}
                        onChange={event =>
                          setSelected(current =>
                            event.target.checked
                              ? [...current, charge.id]
                              : current.filter(id => id !== charge.id)
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">
                          {charge.description || charge.charge_type}
                        </span>
                        <span className="block text-xs text-gray-ink">
                          Due {formatPaymentDate(charge.due_date)}
                        </span>
                      </span>
                    </span>
                    <span className="font-semibold tabular text-ink">
                      {formatPeso(charge.total_due)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Payment date" htmlFor="record-date">
            <TextInput
              id="record-date"
              type="date"
              value={paidDate}
              onChange={event => setPaidDate(event.target.value)}
            />
          </Field>

          <Field label="Full payment amount" htmlFor="record-amount">
            <TextInput id="record-amount" value={formatPeso(total)} readOnly disabled />
          </Field>

          <Field label="Payment method" htmlFor="record-method">
            <SelectInput
              id="record-method"
              value={method}
              onChange={event => setMethod(event.target.value)}
            >
              {PAYMENT_METHODS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>

          {method === 'other' ? (
            <Field label="Method name" htmlFor="record-method-label">
              <TextInput
                id="record-method-label"
                placeholder="e.g. Palawan Express"
                value={methodLabel}
                onChange={event => setMethodLabel(event.target.value)}
              />
            </Field>
          ) : null}

          <Field
            label={needsReference ? 'Reference / transaction ID' : 'Reference (optional)'}
            htmlFor="record-reference"
          >
            <TextInput
              id="record-reference"
              value={reference}
              onChange={event => setReference(event.target.value)}
            />
          </Field>

          <Field label="Next due date" htmlFor="record-next-due">
            <TextInput
              id="record-next-due"
              type="date"
              value={nextDue}
              onChange={event => setNextDue(event.target.value)}
            />
          </Field>
        </div>

        <Field
          label={needsReceipt ? 'Receipt or proof of payment (required)' : 'Receipt (optional)'}
          htmlFor="record-proof"
        >
          <input
            id="record-proof"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="block w-full rounded-xl border border-dashed border-border-strong bg-surface px-3 py-2.5 text-sm text-gray-ink file:mr-3 file:rounded-lg file:border-0 file:bg-mint file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-dark"
            onChange={event => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>

        <Field label="Notes" htmlFor="record-notes">
          <TextArea
            id="record-notes"
            rows={2}
            value={notes}
            onChange={event => setNotes(event.target.value)}
          />
        </Field>

        {canSubmit ? (
          <div className="rounded-xl border border-success-border bg-success-tint px-4 py-3 text-sm text-success-ink">
            <p className="font-semibold">
              {`You are recording ${formatPeso(total)} from ${boarderName}.`}
            </p>
            <p className="mt-1">
              {`${selected.length} ${selected.length === 1 ? 'charge' : 'charges'} will be marked paid, by ${methodName}${
                paidDate ? ` on ${formatPaymentDate(paidDate)}` : ''
              }.${nextDue ? ` The next due date becomes ${formatPaymentDate(nextDue)}.` : ''}`}
            </p>
          </div>
        ) : missing ? (
          <p className="text-sm text-gray-ink">{missing}</p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || busy} onClick={() => void submit()}>
            {busy ? 'Recording…' : total > 0 ? `Record ${formatPeso(total)}` : 'Record payment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
