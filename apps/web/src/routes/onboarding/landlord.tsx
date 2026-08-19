import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
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

function LandlordOnboardingPage() {
  const { token, user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [property, setProperty] = useState(initialProperty);
  const [verification, setVerification] = useState(initialVerification);

  const role: 'landlord' = 'landlord';

  async function save(payload: { step: string; data: Record<string, unknown> }) {
    if (!token) return;
    setSaving(true);
    try {
      await updateOnboardingData(token, role, payload.step, payload.data);
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (step === 1) {
      await save({ step: 'profile', data: profile as unknown as Record<string, unknown> });
      setStep(2);
    } else if (step === 2) {
      await save({
        step: 'property',
        data: {
          description: property.description,
          totalRooms: Number(property.totalRooms) || undefined,
          availableRooms: Number(property.availableRooms) || undefined,
        },
      });
      setStep(3);
    }
  }

  async function handleFinish() {
    await save({
      step: 'verification',
      data: { stripeConnectId: verification.stripeConnectId || undefined },
    });
    window.location.href = '/landlord';
  }

  async function handleSkip() {
    window.location.href = '/landlord';
  }

  const totalSteps = 3;

  return (
    <RoleShell title="Onboarding" nav={LANDLORD_NAV} onboardingIncomplete>
      <WizardLayout currentStep={step - 1} totalSteps={totalSteps} title="Get set up to host">
        {step === 1 ? (
          <StepProfile data={profile} onChange={setProfile} saving={saving} onNext={handleNext} />
        ) : step === 2 ? (
          <StepProperty
            data={property}
            onChange={setProperty}
            saving={saving}
            onNext={handleNext}
          />
        ) : (
          <StepVerification
            data={verification}
            onChange={setVerification}
            saving={saving}
            onNext={handleFinish}
            onSkip={handleSkip}
          />
        )}
      </WizardLayout>
    </RoleShell>
  );
}
