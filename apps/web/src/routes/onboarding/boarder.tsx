import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthAlert } from '../../components/auth/AuthAlert';
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

const STEP_LABELS = ['Profile', 'Preferences'];

const initialPreferences: BoarderPreferencesStepData = {
  budget: '',
  locations: '',
  moveInDate: '',
};

function BoarderOnboardingPage() {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [preferences, setPreferences] = useState(initialPreferences);

  const role: 'boarder' = 'boarder';

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

  async function handleNext() {
    if (step === 1) {
      if (!(await save({ step: 'profile', data: profile as unknown as Record<string, unknown> })))
        return;
      setStep(2);
    }
  }

  async function handleFinish() {
    const ok = await save({
      step: 'preferences',
      data: {
        budget: Number(preferences.budget) || undefined,
        moveInDate: preferences.moveInDate || undefined,
        searchPreferences: {
          budget: Number(preferences.budget) || undefined,
          locations: preferences.locations
            ? preferences.locations
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
            : [],
        },
      },
    });
    if (!ok) return;
    window.location.href = '/boarder';
  }

  async function handleSkip() {
    if (!(await save({ step: 'preferences', data: {} }))) return;
    window.location.href = '/boarder';
  }

  const totalSteps = 2;

  return (
    <RoleShell nav={BOARDER_NAV} onboardingIncomplete>
      <WizardLayout
        currentStep={step - 1}
        totalSteps={totalSteps}
        steps={STEP_LABELS}
        title={step === 1 ? 'Tell landlords about yourself' : 'What kind of place do you need?'}
        description={
          step === 1
            ? 'Everything here is optional. It helps landlords get to know you.'
            : 'Set your move-in date and we’ll take you to your dashboard.'
        }
        alert={saveError ? <AuthAlert className="" title={saveError} /> : null}
      >
        {step === 1 ? (
          <StepProfile data={profile} onChange={setProfile} saving={saving} onNext={handleNext} />
        ) : (
          <StepPreferences
            data={preferences}
            onChange={setPreferences}
            saving={saving}
            onNext={handleFinish}
            onSkip={handleSkip}
            onBack={() => {
              setSaveError(null);
              setStep(1);
            }}
          />
        )}
      </WizardLayout>
    </RoleShell>
  );
}
