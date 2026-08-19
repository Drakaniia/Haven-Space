import { Field, TextArea, TextInput } from '../../ui/Field';
import { Button } from '../../ui/Button';

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
      className="flex flex-col gap-4"
      onSubmit={e => {
        e.preventDefault();
        onNext();
      }}
    >
      <Field label="Business / boarding house name" htmlFor="businessName">
        <TextInput
          id="businessName"
          placeholder="e.g. Sunrise Boarding House"
          value={data.businessName}
          onChange={e => set({ businessName: e.target.value })}
        />
      </Field>
      <Field label="Contact number" htmlFor="contactNumber">
        <TextInput
          id="contactNumber"
          placeholder="09XX XXX XXXX"
          value={data.contactNumber}
          onChange={e => set({ contactNumber: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" htmlFor="city">
          <TextInput
            id="city"
            placeholder="e.g. Quezon City"
            value={data.city}
            onChange={e => set({ city: e.target.value })}
          />
        </Field>
        <Field label="Province" htmlFor="province">
          <TextInput
            id="province"
            placeholder="e.g. Metro Manila"
            value={data.province}
            onChange={e => set({ province: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Business bio" htmlFor="bio">
        <TextArea
          id="bio"
          rows={3}
          placeholder="Describe your boarding house"
          value={data.bio}
          onChange={e => set({ bio: e.target.value })}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
