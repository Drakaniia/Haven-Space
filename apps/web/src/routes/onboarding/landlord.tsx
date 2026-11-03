import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthAlert } from '../../components/auth/AuthAlert';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { WizardLayout } from '../../components/onboarding/WizardLayout';
import {
  StepProfile,
  type LandlordProfileStepData,
} from '../../components/onboarding/landlord/StepProfile';
import {
  StepProperty,
  type LandlordPropertyStepData,
} from '../../components/onboarding/landlord/StepProperty';
import {
  StepVerification,
  type LandlordVerificationStepData,
} from '../../components/onboarding/landlord/StepVerification';
import { LANDLORD_NAV } from '../../lib/nav';
import { updateOnboardingData } from '../../lib/api/account';
import { useAuth } from '../../lib/auth-context';

export const Route = createFileRoute('/onboarding/landlord')({
  component: () => (
    <Protected role="landlord">
      <LandlordOnboardingPage />
    </Protected>
  ),
});

const initialProfile: LandlordProfileStepData = {
  businessName: '',
  contactNumber: '',
  city: '',
  province: '',
  bio: '',
};

const initialProperty: LandlordPropertyStepData = {
  description: '',
  totalRooms: '',
  availableRooms: '',
};

const initialVerification: LandlordVerificationStepData = {
  stripeConnectId: '',
};

const STEP_LABELS = ['Business', 'Property', 'Payouts'];

const STEP_COPY = [
  {
    title: 'Tell boarders who you are',
    description: 'Start with the basics: your business name, contact number and location.',
  },
  {
    title: 'Describe your boarding house',
    description: 'Give boarders a feel for the place. You can edit this any time.',
  },
  {
    title: 'Get ready to receive rent',
    description: 'Connect a payout account now, or skip and do it later.',
  },
];

function LandlordOnboardingPage() {
  const { token, user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [property, setProperty] = useState(initialProperty);
  const [verification, setVerification] = useState(initialVerification);

  const role: 'landlord' = 'landlord';

  /** Saves one step. Resolves false (and shows a banner) if the save failed, so the wizard stays put. */
  async function save(payload: { step: string; data: Record<string, unknown> }) {
    if (!token) return true;
    setSaving(true);
    setSaveError(null);
    try {
      await updateOnboardingData(token, role, payload.step, payload.data);
      return true;
    } catch (err) {
      setSaveError(
        err instanceof Error && err.message
          ? err.message
          : 'We couldn’t save this step. Check your connection and try again.'
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    setSaveError(null);
    setStep(s => Math.max(1, s - 1));
  }

  async function handleNext() {
    if (step === 1) {
      if (!(await save({ step: 'profile', data: profile as unknown as Record<string, unknown> })))
        return;
      setStep(2);
    } else if (step === 2) {
      const ok = await save({
        step: 'property',
        data: {
          description: property.description,
          totalRooms: Number(property.totalRooms) || undefined,
          availableRooms: Number(property.availableRooms) || undefined,
        },
      });
      if (!ok) return;
      setStep(3);
    }
  }

  async function handleFinish() {
    const ok = await save({
      step: 'verification',
      data: { stripeConnectId: verification.stripeConnectId || undefined },
    });
    if (!ok) return;
    window.location.href = '/landlord';
  }

  async function handleSkip() {
    window.location.href = '/landlord';
  }

  const totalSteps = 3;

  return (
    <RoleShell nav={LANDLORD_NAV} onboardingIncomplete>
      <WizardLayout
        currentStep={step - 1}
        totalSteps={totalSteps}
        steps={STEP_LABELS}
        title={STEP_COPY[step - 1].title}
        description={STEP_COPY[step - 1].description}
        alert={saveError ? <AuthAlert className="" title={saveError} /> : null}
      >
        {step === 1 ? (
          <StepProfile data={profile} onChange={setProfile} saving={saving} onNext={handleNext} />
        ) : step === 2 ? (
          <StepProperty
            data={property}
            onChange={setProperty}
            saving={saving}
            onNext={handleNext}
            onBack={goBack}
          />
        ) : (
          <StepVerification
            data={verification}
            onChange={setVerification}
            saving={saving}
            onNext={handleFinish}
            onSkip={handleSkip}
            onBack={goBack}
          />
        )}
      </WizardLayout>
    </RoleShell>
  );
}
