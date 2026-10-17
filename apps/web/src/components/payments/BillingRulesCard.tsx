import { useEffect, useState } from 'react';

import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Field, SelectInput, TextInput } from '../ui/Field';
import { formatPeso, lateFeePreview } from '../../lib/payments';
import type { PropertyBillingSettings } from '../../lib/types';

/**
 * The property's billing rules (spec `payments-tracker-redesign` R6–R9, D9/D31).
 *
 * One grace period governs both the `in_grace` state and the moment a fee lands,
 * and it survives switching late fees off. A fee is either a flat amount or a
 * percentage of the cycle's base (D10) — the example below shows which.
 */
export function BillingRulesCard({
  settings,
  saving,
  exampleBase,
  onSave,
}: {
  settings: PropertyBillingSettings;
  saving: boolean;
  exampleBase: number;
  onSave: (input: Partial<Omit<PropertyBillingSettings, 'property_id'>>) => void;
}) {
  const [grace, setGrace] = useState(String(settings.late_fee_grace_days));
  const [enabled, setEnabled] = useState(settings.late_fee_enabled === 1);
  const [feeType, setFeeType] = useState(settings.late_fee_type === 'percent' ? 'percent' : 'fixed');
  const [amount, setAmount] = useState(String(settings.late_fee_amount));
  const [percent, setPercent] = useState(String(settings.late_fee_percent));

  useEffect(() => {
    setGrace(String(settings.late_fee_grace_days));
    setEnabled(settings.late_fee_enabled === 1);
    setFeeType(settings.late_fee_type === 'percent' ? 'percent' : 'fixed');
    setAmount(String(settings.late_fee_amount));
    setPercent(String(settings.late_fee_percent));
  }, [settings]);

  const example = lateFeePreview(
    {
      late_fee_enabled: enabled ? 1 : 0,
      late_fee_type: feeType,
      late_fee_amount: Number(amount || 0),
      late_fee_percent: Number(percent || 0),
    },
    exampleBase
  );

  const save = () =>
    onSave({
      late_fee_grace_days: Number(grace || 0),
      late_fee_enabled: enabled ? 1 : 0,
      late_fee_type: feeType,
      late_fee_amount: Number(amount || 0),
      late_fee_percent: Number(percent || 0),
    });

  return (
    <Card>
      <h2 className="font-semibold text-ink">Billing rules</h2>
      <p className="mt-1 text-sm text-gray-ink">
        Grace period decides when a rent cycle turns overdue and when a late fee applies. It applies
        whether or not late fees are switched on.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Grace period (days)" htmlFor="grace-days">
          <div className="flex items-center gap-2">
            <TextInput
              id="grace-days"
              type="number"
              min="0"
              step="1"
              value={grace}
              onChange={event => setGrace(event.target.value)}
            />
            <div className="flex gap-1">
              {[1, 2, 3].map(preset => (
                <Button
                  key={preset}
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setGrace(String(preset))}
                >
                  {preset}d
                </Button>
              ))}
            </div>
          </div>
        </Field>

        <Field label="Late fees" htmlFor="late-fee-enabled">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              id="late-fee-enabled"
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={enabled}
              onChange={event => setEnabled(event.target.checked)}
            />
            Charge a late fee after the grace period
          </label>
        </Field>

        <Field label="Fee type" htmlFor="late-fee-type">
          <SelectInput
            id="late-fee-type"
            value={feeType}
            disabled={!enabled}
            onChange={event => setFeeType(event.target.value)}
          >
            <option value="fixed">Fixed amount</option>
            <option value="percent">Percentage</option>
          </SelectInput>
        </Field>

        {feeType === 'percent' ? (
          <Field label="Percentage (%)" htmlFor="late-fee-percent">
            <TextInput
              id="late-fee-percent"
              type="number"
              min="0"
              max="100"
              step="0.5"
              disabled={!enabled}
              value={percent}
              onChange={event => setPercent(event.target.value)}
            />
          </Field>
        ) : (
          <Field label="Amount (₱)" htmlFor="late-fee-amount">
            <TextInput
              id="late-fee-amount"
              type="number"
              min="0"
              step="0.01"
              disabled={!enabled}
              value={amount}
              onChange={event => setAmount(event.target.value)}
            />
          </Field>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-ink">
        {enabled
          ? `A ${formatPeso(exampleBase)} cycle paid after the grace period would add ${formatPeso(example)}.`
          : 'No late fee will be added while this is switched off.'}
      </p>

      <div className="mt-4">
        <Button disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save billing rules'}
        </Button>
      </div>
    </Card>
  );
}
