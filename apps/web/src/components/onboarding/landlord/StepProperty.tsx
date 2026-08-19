import { Field, TextArea, TextInput } from '../../ui/Field';
import { Button } from '../../ui/Button';

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
}: {
  data: LandlordPropertyStepData;
  onChange: (data: LandlordPropertyStepData) => void;
  saving?: boolean;
  onNext: () => void;
}) {
  const set = (patch: Partial<LandlordPropertyStepData>) =>
    onChange({ ...data, ...patch });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={e => {
        e.preventDefault();
        onNext();
      }}
    >
      <Field label="Property description" htmlFor="description">
        <TextArea
          id="description"
          rows={3}
          placeholder="Describe your first boarding house listing"
          value={data.description}
          onChange={e => set({ description: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Total rooms" htmlFor="totalRooms">
          <TextInput
            id="totalRooms"
            type="number"
            min={0}
            placeholder="e.g. 8"
            value={data.totalRooms}
            onChange={e => set({ totalRooms: e.target.value })}
          />
        </Field>
        <Field label="Available rooms" htmlFor="availableRooms">
          <TextInput
            id="availableRooms"
            type="number"
            min={0}
            placeholder="e.g. 3"
            value={data.availableRooms}
            onChange={e => set({ availableRooms: e.target.value })}
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
