import { Field, TextArea, TextInput } from '../../ui/Field';
import { Button } from '../../ui/Button';

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Field label="Bio" htmlFor="bio">
        <TextArea
          id="bio"
          rows={3}
          placeholder="Tell future landlords a little about yourself"
          value={data.bio}
          onChange={e => set({ bio: e.target.value })}
        />
      </Field>
      <Field label="Occupation" htmlFor="occupation">
        <TextInput
          id="occupation"
          placeholder="e.g. Software Engineer, Student"
          value={data.occupation}
          onChange={e => set({ occupation: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Emergency contact name" htmlFor="emergencyContactName">
          <TextInput
            id="emergencyContactName"
            placeholder="Full name"
            value={data.emergencyContactName}
            onChange={e => set({ emergencyContactName: e.target.value })}
          />
        </Field>
        <Field label="Emergency contact phone" htmlFor="emergencyContactPhone">
          <TextInput
            id="emergencyContactPhone"
            placeholder="09XX XXX XXXX"
            value={data.emergencyContactPhone}
            onChange={e => set({ emergencyContactPhone: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
