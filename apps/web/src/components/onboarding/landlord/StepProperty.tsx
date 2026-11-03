import type { FormEvent } from 'react';
import { FormSection } from '../../auth/FormSection';
import { Field, TextArea, TextInput } from '../../ui/Field';
import { WizardActions } from '../WizardActions';

export interface LandlordPropertyStepData {
  description: string;
  totalRooms: string;
  availableRooms: string;
}

export function StepProperty({
  data,
  onChange,
  saving,
  onNext,
  onBack,
}: {
  data: LandlordPropertyStepData;
  onChange: (data: LandlordPropertyStepData) => void;
  saving?: boolean;
  onNext: () => void;
  onBack?: () => void;
}) {
  const set = (patch: Partial<LandlordPropertyStepData>) => onChange({ ...data, ...patch });

  return (
    <form
      className="flex flex-col gap-9"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onNext();
      }}
    >
      <FormSection
        title="Your first property"
        description="A rough picture is enough for now. You’ll add photos and room details when you create the listing."
      >
        <Field label="Property description" htmlFor="description">
          <TextArea
            id="description"
            rows={4}
            placeholder="Location highlights, nearby schools, house rules, what’s included"
            value={data.description}
            onChange={e => set({ description: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <Field label="Total rooms" htmlFor="totalRooms">
            <TextInput
              id="totalRooms"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 8"
              className="tabular"
              value={data.totalRooms}
              onChange={e => set({ totalRooms: e.target.value })}
            />
          </Field>
          <Field label="Available now" htmlFor="availableRooms">
            <TextInput
              id="availableRooms"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 3"
              className="tabular"
              value={data.availableRooms}
              onChange={e => set({ availableRooms: e.target.value })}
            />
          </Field>
        </div>
      </FormSection>

      <WizardActions primaryLabel="Continue" saving={saving} onBack={onBack} />
    </form>
  );
}
