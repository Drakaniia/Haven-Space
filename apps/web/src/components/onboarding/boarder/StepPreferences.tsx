import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Field, TextInput } from '../../ui/Field';

export interface BoarderPreferencesStepData {
  budget: string;
  locations: string;
  moveInDate: string;
}

export function StepPreferences({
  data,
  onChange,
  saving,
  onNext,
  onSkip,
}: {
  data: BoarderPreferencesStepData;
  onChange: (data: BoarderPreferencesStepData) => void;
  saving?: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<BoarderPreferencesStepData>) => onChange({ ...data, ...patch });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.moveInDate) {
      setError('Please provide a move-in date.');
      return;
    }
    setError(null);
    onNext();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monthly budget (₱)" htmlFor="budget">
          <TextInput
            id="budget"
            type="number"
            min={0}
            placeholder="e.g. 6000"
            value={data.budget}
            onChange={e => set({ budget: e.target.value })}
          />
        </Field>
        <Field label="Move-in date" htmlFor="moveInDate">
          <TextInput
            id="moveInDate"
            type="date"
            value={data.moveInDate}
            onChange={e => set({ moveInDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Preferred locations / neighborhoods" htmlFor="locations">
        <TextInput
          id="locations"
          placeholder="e.g. Manila, Quezon City"
          value={data.locations}
          onChange={e => set({ locations: e.target.value })}
        />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onSkip} disabled={saving}>
          Skip for now
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Finish'}
        </Button>
      </div>
    </form>
  );
}
