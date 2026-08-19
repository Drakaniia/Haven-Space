import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Protected } from '../../components/auth/Protected';
import { WizardLayout } from '../../components/onboarding/WizardLayout';
import { RoleShell } from '../../components/layout/RoleShell';
import {
  StepProfile,
  type BoarderProfileStepData,
} from '../../components/onboarding/boarder/StepProfile';
import {
  StepPreferences,
  type BoarderPreferencesStepData,
} from '../../components/onboarding/boarder/StepPreferences';
import { BOARDER_NAV } from '../../lib/nav';
import { updateOnboardingData } from '../../lib/api/account';
import { useAuth } from '../../lib/auth-context';

export const Route = createFileRoute('/onboarding/boarder')({
  component: () => (
    <Protected role="boarder">
      <BoarderOnboardingPage />
    </Protected>
  ),
});

const initialProfile: BoarderProfileStepData = {
  bio: '',
  occupation: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

const initialPreferences: BoarderPreferencesStepData = {
  budget: '',
  locations: '',
  moveInDate: '',
};

function BoarderOnboardingPage() {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [preferences, setPreferences] = useState(initialPreferences);

  const role: 'boarder' = 'boarder';

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
    }
  }

  async function handleFinish() {
    await save({
      step: 'preferences',
      data: {
        budget: Number(preferences.budget) || undefined,
        moveInDate: preferences.moveInDate || undefined,
        searchPreferences: {
          budget: Number(preferences.budget) || undefined,
          locations: preferences.locations
            ? preferences.locations.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        },
      },
    });
    window.location.href = '/boarder';
  }

  async function handleSkip() {
    await save({ step: 'preferences', data: {} });
    window.location.href = '/boarder';
  }

  const totalSteps = 2;

  return (
    <RoleShell title="Onboarding" nav={BOARDER_NAV} onboardingIncomplete>
      <WizardLayout currentStep={step - 1} totalSteps={totalSteps} title="Complete your profile">
        {step === 1 ? (
          <StepProfile data={profile} onChange={setProfile} saving={saving} onNext={handleNext} />
        ) : (
          <StepPreferences
            data={preferences}
            onChange={setPreferences}
            saving={saving}
            onNext={handleFinish}
            onSkip={handleSkip}
          />
        )}
      </WizardLayout>
    </RoleShell>
  );
}
