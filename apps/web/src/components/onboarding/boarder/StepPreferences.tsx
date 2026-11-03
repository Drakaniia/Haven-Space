import { useState, type FormEvent } from 'react';
import { FormSection } from '../../auth/FormSection';
import { Field, TextInput } from '../../ui/Field';
import { WizardActions } from '../WizardActions';

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
  onBack,
}: {
  data: BoarderPreferencesStepData;
  onChange: (data: BoarderPreferencesStepData) => void;
  saving?: boolean;
  onNext: () => void;
  onSkip: () => void;
  onBack?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<BoarderPreferencesStepData>) => onChange({ ...data, ...patch });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!data.moveInDate) {
      setError('Please provide a move-in date.');
      document.getElementById('moveInDate')?.focus();
      return;
    }
    setError(null);
    onNext();
  }

  return (
    <form className="flex flex-col gap-9" onSubmit={handleSubmit}>
      <FormSection
        title="What you’re looking for"
        description="A move-in date is all we need. The rest helps narrow your search."
      >
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <Field label="Monthly budget" htmlFor="budget">
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-gray-ink"
              >
                ₱
              </span>
              <TextInput
                id="budget"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="6000"
                className="tabular pl-8"
                value={data.budget}
                onChange={e => set({ budget: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Move-in date" htmlFor="moveInDate" error={error}>
            <TextInput
              id="moveInDate"
              type="date"
              aria-invalid={error ? true : undefined}
              value={data.moveInDate}
              onChange={e => {
                set({ moveInDate: e.target.value });
                if (error && e.target.value) setError(null);
              }}
            />
          </Field>
        </div>
        <div>
          <Field label="Preferred areas" htmlFor="locations">
            <TextInput
              id="locations"
              placeholder="e.g. Sampaloc, Diliman, Katipunan"
              aria-describedby="locations-hint"
              value={data.locations}
              onChange={e => set({ locations: e.target.value })}
            />
          </Field>
          <p id="locations-hint" className="mt-1.5 text-sm text-muted">
            Separate areas with commas.
          </p>
        </div>
      </FormSection>

      <WizardActions
        primaryLabel="Finish"
        saving={saving}
        onBack={onBack}
        onSkip={onSkip}
      />
    </form>
  );
}
