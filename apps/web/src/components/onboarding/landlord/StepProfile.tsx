import type { FormEvent } from 'react';
import { FormSection } from '../../auth/FormSection';
import { Field, TextArea, TextInput } from '../../ui/Field';
import { WizardActions } from '../WizardActions';

export interface LandlordProfileStepData {
  businessName: string;
  contactNumber: string;
  city: string;
  province: string;
  bio: string;
}

export function StepProfile({
  data,
  onChange,
  saving,
  onNext,
}: {
  data: LandlordProfileStepData;
  onChange: (data: LandlordProfileStepData) => void;
  saving?: boolean;
  onNext: () => void;
}) {
  const set = (patch: Partial<LandlordProfileStepData>) => onChange({ ...data, ...patch });

  return (
    <form
      className="flex flex-col gap-9"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onNext();
      }}
    >
      <FormSection title="Your business" description="How boarders will know and reach you.">
        <Field label="Business / boarding house name" htmlFor="businessName">
          <TextInput
            id="businessName"
            placeholder="e.g. Sunrise Boarding House"
            autoComplete="organization"
            value={data.businessName}
            onChange={e => set({ businessName: e.target.value })}
          />
        </Field>
        <Field label="Contact number" htmlFor="contactNumber">
          <TextInput
            id="contactNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0917 123 4567"
            className="sm:max-w-xs"
            value={data.contactNumber}
            onChange={e => set({ contactNumber: e.target.value })}
          />
        </Field>
        <Field label="Business bio" htmlFor="bio">
          <TextArea
            id="bio"
            rows={4}
            placeholder="A few lines about your boarding house and how you run it"
            value={data.bio}
            onChange={e => set({ bio: e.target.value })}
          />
        </Field>
      </FormSection>

      <FormSection title="Location">
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <Field label="City" htmlFor="city">
            <TextInput
              id="city"
              placeholder="e.g. Quezon City"
              autoComplete="address-level2"
              value={data.city}
              onChange={e => set({ city: e.target.value })}
            />
          </Field>
          <Field label="Province" htmlFor="province">
            <TextInput
              id="province"
              placeholder="e.g. Metro Manila"
              autoComplete="address-level1"
              value={data.province}
              onChange={e => set({ province: e.target.value })}
            />
          </Field>
        </div>
      </FormSection>

      <WizardActions primaryLabel="Continue" saving={saving} />
    </form>
  );
}
