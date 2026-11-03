import type { FormEvent } from 'react';
import { FormSection } from '../../auth/FormSection';
import { Field, TextArea, TextInput } from '../../ui/Field';
import { WizardActions } from '../WizardActions';

export interface BoarderProfileStepData {
  bio: string;
  occupation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export function StepProfile({
  data,
  onChange,
  saving,
  onNext,
}: {
  data: BoarderProfileStepData;
  onChange: (data: BoarderProfileStepData) => void;
  saving?: boolean;
  onNext: () => void;
}) {
  const set = (patch: Partial<BoarderProfileStepData>) => onChange({ ...data, ...patch });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form className="flex flex-col gap-9" onSubmit={handleSubmit}>
      <FormSection
        title="About you"
        description="A little context helps landlords get to know you."
      >
        <Field label="Occupation" htmlFor="occupation">
          <TextInput
            id="occupation"
            placeholder="e.g. Nursing student, Software engineer"
            autoComplete="organization-title"
            className="sm:max-w-md"
            value={data.occupation}
            onChange={e => set({ occupation: e.target.value })}
          />
        </Field>
        <Field label="Short bio" htmlFor="bio">
          <TextArea
            id="bio"
            rows={4}
            placeholder="Where you study or work, your schedule, what you’re like to live with"
            value={data.bio}
            onChange={e => set({ bio: e.target.value })}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Emergency contact"
        description="Someone who can be reached if something happens while you’re boarding."
      >
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <Field label="Full name" htmlFor="emergencyContactName">
            <TextInput
              id="emergencyContactName"
              placeholder="e.g. Maria Santos"
              value={data.emergencyContactName}
              onChange={e => set({ emergencyContactName: e.target.value })}
            />
          </Field>
          <Field label="Mobile number" htmlFor="emergencyContactPhone">
            <TextInput
              id="emergencyContactPhone"
              type="tel"
              inputMode="tel"
              placeholder="0917 123 4567"
              value={data.emergencyContactPhone}
              onChange={e => set({ emergencyContactPhone: e.target.value })}
            />
          </Field>
        </div>
      </FormSection>

      <WizardActions primaryLabel="Continue" saving={saving} />
    </form>
  );
}
