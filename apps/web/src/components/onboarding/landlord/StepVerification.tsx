import { useState } from 'react';
import { Button } from '../../ui/Button';

export interface LandlordVerificationStepData {
  stripeConnectId: string;
}

export function StepVerification({
  data,
  onChange,
  saving,
  onNext,
  onSkip,
}: {
  data: LandlordVerificationStepData;
  onChange: (data: LandlordVerificationStepData) => void;
  saving?: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<LandlordVerificationStepData>) =>
    onChange({ ...data, ...patch });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={e => {
        e.preventDefault();
        onNext();
      }}
    >
      <div className="rounded-md bg-cream p-3 text-sm">
        <p className="font-medium">Verification &amp; payouts</p>
        <p className="text-gray-ink">
          Link your identity verification and bank/payout account to receive rent. If your
          platform already has your details, you can skip this step.
        </p>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Stripe Connect account ID</span>
        <input
          className="w-full rounded-xl border border-gray-300 bg-white/50 px-4 py-2.5 focus:border-primary focus:outline-none"
          placeholder="acct_..."
          value={data.stripeConnectId}
          onChange={e => set({ stripeConnectId: e.target.value })}
        />
      </label>
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
