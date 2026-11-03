import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/onboarding')({
  component: () => (
    <Protected role="landlord">
      <OnboardingPage />
    </Protected>
  ),
});

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

  return (
    <RoleShell nav={LANDLORD_NAV}>
      <PageHeader icon="buildingOffice" title="Onboarding" />
      <Card className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 text-sm">
          {[1, 2, 3].map(n => (
            <span
              key={n}
              className={`rounded-full px-3 py-1 ${
                n === step
                  ? 'bg-primary-strong text-white'
                  : n < step
                  ? 'bg-mint text-primary'
                  : 'bg-subtle text-gray-ink'
              }`}
            >
              Step {n}
            </span>
          ))}
        </div>

        {step === 1 ? (
          <form className="flex flex-col gap-4" onSubmit={handleNext}>
            <h2 className="text-xl font-bold tracking-tight">Business details</h2>
            <Field label="Business / property name" htmlFor="businessName">
              <TextInput
                id="businessName"
                required
                value={form.businessName}
                onChange={e => set('businessName', e.target.value)}
              />
            </Field>
            <Field label="Contact number" htmlFor="contactNumber">
              <TextInput
                id="contactNumber"
                type="tel"
                required
                value={form.contactNumber}
                onChange={e => set('contactNumber', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" htmlFor="city">
                <TextInput
                  id="city"
                  required
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                />
              </Field>
              <Field label="Province" htmlFor="province">
                <TextInput
                  id="province"
                  required
                  value={form.province}
                  onChange={e => set('province', e.target.value)}
                />
              </Field>
            </div>
            <Button type="submit">Continue</Button>
          </form>
        ) : step === 2 ? (
          <form className="flex flex-col gap-4" onSubmit={handleNext}>
            <h2 className="text-xl font-bold tracking-tight">About your property</h2>
            <Field label="Tell boarders about your property" htmlFor="bio">
              <TextArea
                id="bio"
                rows={4}
                required
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
              />
            </Field>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit">Continue</Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight">You're all set!</h2>
            <p className="text-gray-ink">
              Your onboarding details are stored locally in this form. Saving them to your profile
              will be wired once the landlord profile endpoints are finalized.
            </p>
            <div className="rounded-md bg-cream p-3 text-sm">
              <p className="font-medium">{form.businessName}</p>
              <p className="text-gray-ink">{form.contactNumber}</p>
              <p className="text-gray-ink">
                {form.city}, {form.province}
              </p>
            </div>
            <Button onClick={() => setStep(1)}>Start over</Button>
          </div>
        )}
      </Card>
    </RoleShell>
  );
}
