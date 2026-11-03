import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { FormSection } from '../../components/auth/FormSection';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { WizardActions } from '../../components/onboarding/WizardActions';
import { WizardLayout } from '../../components/onboarding/WizardLayout';
import { Button } from '../../components/ui/Button';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/onboarding')({
  component: () => (
    <Protected role="landlord">
      <OnboardingPage />
    </Protected>
  ),
});

const STEP_LABELS = ['Business', 'Property', 'Review'];

const STEP_COPY = [
  { title: 'Business details', description: 'Who boarders will be dealing with, and where.' },
  { title: 'About your property', description: 'A few lines that make someone want to visit.' },
  { title: 'You’re all set', description: 'Here’s what you entered.' },
];

function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: '',
    contactNumber: '',
    city: '',
    province: '',
    bio: '',
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleNext(e: FormEvent) {
    e.preventDefault();
    setStep(s => Math.min(s + 1, 3));
  }

  const copy = STEP_COPY[step - 1];

  return (
    <RoleShell nav={LANDLORD_NAV}>
      <WizardLayout
        currentStep={step - 1}
        totalSteps={3}
        steps={STEP_LABELS}
        title={copy.title}
        description={copy.description}
      >
        {step === 1 ? (
          <form className="flex flex-col gap-9" onSubmit={handleNext}>
            <FormSection title="Your business">
              <Field label="Business / property name" htmlFor="businessName">
                <TextInput
                  id="businessName"
                  autoComplete="organization"
                  required
                  value={form.businessName}
                  onChange={e => set('businessName', e.target.value)}
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
                  required
                  value={form.contactNumber}
                  onChange={e => set('contactNumber', e.target.value)}
                />
              </Field>
            </FormSection>
            <FormSection title="Location">
              <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
                <Field label="City" htmlFor="city">
                  <TextInput
                    id="city"
                    autoComplete="address-level2"
                    required
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                  />
                </Field>
                <Field label="Province" htmlFor="province">
                  <TextInput
                    id="province"
                    autoComplete="address-level1"
                    required
                    value={form.province}
                    onChange={e => set('province', e.target.value)}
                  />
                </Field>
              </div>
            </FormSection>
            <WizardActions primaryLabel="Continue" />
          </form>
        ) : step === 2 ? (
          <form className="flex flex-col gap-9" onSubmit={handleNext}>
            <Field label="Tell boarders about your property" htmlFor="bio">
              <TextArea
                id="bio"
                rows={5}
                placeholder="Location highlights, nearby schools, house rules, what’s included"
                required
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
              />
            </Field>
            <WizardActions primaryLabel="Continue" onBack={() => setStep(1)} />
          </form>
        ) : (
          <div className="flex flex-col gap-6 pb-6 sm:pb-0">
            <dl className="divide-y divide-border rounded-xl border border-border bg-cream/60 text-sm">
              <SummaryRow label="Business" value={form.businessName} />
              <SummaryRow label="Contact number" value={form.contactNumber} />
              <SummaryRow
                label="Location"
                value={[form.city, form.province].filter(Boolean).join(', ')}
              />
              <SummaryRow label="About" value={form.bio} />
            </dl>
            <p className="text-sm leading-relaxed text-gray-ink">
              These details are kept in this form only. Saving them to your profile will be wired
              once the landlord profile endpoints are finalized.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(1)}>Start over</Button>
            </div>
          </div>
        )}
      </WizardLayout>
    </RoleShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="font-medium text-gray-ink">{label}</dt>
      <dd className="min-w-0 whitespace-pre-line break-words text-ink">{value || '—'}</dd>
    </div>
  );
}
