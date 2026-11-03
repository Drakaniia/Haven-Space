import type { FormEvent } from 'react';
import { FormSection } from '../../auth/FormSection';
import { Field, TextInput } from '../../ui/Field';
import { WizardActions } from '../WizardActions';

export interface LandlordVerificationStepData {
  stripeConnectId: string;
}

export function StepVerification({
  data,
  onChange,
  saving,
  onNext,
  onSkip,
  onBack,
}: {
  data: LandlordVerificationStepData;
  onChange: (data: LandlordVerificationStepData) => void;
  saving?: boolean;
  onNext: () => void;
  onSkip: () => void;
  onBack?: () => void;
}) {
  const set = (patch: Partial<LandlordVerificationStepData>) => onChange({ ...data, ...patch });

  return (
    <form
      className="flex flex-col gap-9"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onNext();
      }}
    >
      <FormSection
        title="Verification & payouts"
        description="Link your payout account to receive rent. If Haven Space already has your details, skip this step."
      >
        <div>
          <Field label="Stripe Connect account ID" htmlFor="stripeConnectId">
            <TextInput
              id="stripeConnectId"
              placeholder="acct_…"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="stripeConnectId-hint"
              className="font-mono sm:max-w-sm"
              value={data.stripeConnectId}
              onChange={e => set({ stripeConnectId: e.target.value })}
            />
          </Field>
          <p id="stripeConnectId-hint" className="mt-1.5 text-sm text-muted">
            Starts with <span className="font-mono">acct_</span>. Optional.
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
