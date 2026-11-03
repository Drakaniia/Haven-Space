import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../lib/auth-context';
import { setPendingToast } from '../../lib/toast';
import {
  authErrorSearch,
  clearGooglePendingHash,
  handleGooglePendingHash,
  resolvePostAuthPath,
  type GooglePendingSession,
} from '../../lib/oauth';

export const Route = createFileRoute('/auth/choose-role')({
  validateSearch: authErrorSearch,
  component: ChooseRolePage,
});

type Step = 'role' | 'landlord-details';

function ChooseRolePage() {
  const { error: searchError, redirect: searchRedirect } = useSearch({
    from: '/auth/choose-role',
  });
  const { completeGoogle } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);
  const [pending, setPending] = useState<{ token: string; session: GooglePendingSession } | null>(
    null
  );
  const [step, setStep] = useState<Step>('role');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState({
    businessName: '',
    businessDescription: '',
    city: '',
    province: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const pending = handleGooglePendingHash();
    if (pending) {
      setPending(pending);
      clearGooglePendingHash();
    }
  }, []);

  const session = pending?.session;

  async function finish(input: {
    role?: 'boarder' | 'landlord';
    businessName?: string;
    businessDescription?: string;
    city?: string;
    province?: string;
    phoneNumber?: string;
  }) {
    if (!pending) return;
    setBusy(true);
    setError(null);
    const timeout = window.setTimeout(() => {
      setError('Google sign-in is taking too long. Please check your connection and try again.');
      setBusy(false);
    }, 15000);
    try {
      const user = await completeGoogle({ pendingToken: pending.token, ...input });
      window.clearTimeout(timeout);
      setPendingToast('success', `Welcome back, ${user.first_name}!`);
      void navigate({ to: resolvePostAuthPath(user, session?.redirect ?? searchRedirect) });
    } catch (err) {
      window.clearTimeout(timeout);
      const message =
        err instanceof Error && err.message ? err.message : 'An error occurred. Please try again.';
      if (message.includes('Invalid or expired Google session')) {
        setError('This Google session expired. Please go back to login and try again.');
      } else if (message.includes('already exists') || message.includes('already linked')) {
        setError(message + ' Try logging in with your password, then link Google from settings.');
      } else {
        setError(message);
      }
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  async function handleLandlordSubmit(e: FormEvent) {
    e.preventDefault();
    await finish({
      role: 'landlord',
      businessName: details.businessName.trim(),
      businessDescription: details.businessDescription.trim() || undefined,
      city: details.city.trim() || undefined,
      province: details.province.trim() || undefined,
      phoneNumber: details.phoneNumber.trim() || undefined,
    });
  }

  const banner = searchError ?? error;

  return (
    <AuthSplitLayout
      title={
        session?.link
          ? 'Link your Google account'
          : step === 'landlord-details'
          ? 'Finish your landlord account'
          : 'Choose how to continue'
      }
      subtitle={
        session?.link
          ? `An account already exists for ${session.email}.`
          : step === 'landlord-details'
          ? 'These details are optional — you can complete them later from your dashboard.'
          : 'Welcome to Haven Space — almost there!'
      }
      footer={
        <p className="text-center">
          Prefer a different option?{' '}
          <Link to="/auth/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </p>
      }
    >
      {banner ? (
        <div className="mb-4">
          <ErrorState message={banner} />
        </div>
      ) : null}

      {!session ? (
        <div className="flex flex-col gap-4">
          <ErrorState message="This Google sign-in session has expired or is invalid. Please try signing in again." />
          <Link to="/auth/login" className="text-center text-primary hover:underline">
            Go to login
          </Link>
        </div>
      ) : session.link ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-md bg-mint p-4 text-sm">
            An account already exists for <span className="font-semibold">{session.email}</span>.
            Link Google sign-in so you can log in with Google next time? Your role and account
            details will stay the same.
          </div>
          <Button type="button" disabled={busy} onClick={() => void finish({})}>
            {busy ? 'Linking…' : 'Link Google account'}
          </Button>
          <Link to="/auth/login" className="text-center text-sm text-primary hover:underline">
            Cancel — use email and password instead
          </Link>
        </div>
      ) : step === 'landlord-details' ? (
        <form className="flex flex-col gap-4" onSubmit={handleLandlordSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" htmlFor="landlordFirstName">
              <TextInput
                id="landlordFirstName"
                name="firstName"
                autoComplete="given-name"
                defaultValue={session.firstName}
              />
            </Field>
            <Field label="Last name" htmlFor="landlordLastName">
              <TextInput
                id="landlordLastName"
                name="lastName"
                autoComplete="family-name"
                defaultValue={session.lastName}
              />
            </Field>
          </div>

          <Field label="Email" htmlFor="landlordEmail">
            <TextInput
              id="landlordEmail"
              type="email"
              name="email"
              autoComplete="email"
              readOnly
              disabled
              value={session.email}
            />
          </Field>

          <Field label="Business / Property name" htmlFor="businessName">
            <TextInput
              id="businessName"
              name="businessName"
              placeholder="e.g., Haven Dormitory, ABC Boarding House"
              value={details.businessName}
              onChange={e => setDetails(d => ({ ...d, businessName: e.target.value }))}
            />
          </Field>

          <Field label="Brief description" htmlFor="businessDescription">
            <TextArea
              id="businessDescription"
              name="businessDescription"
              placeholder="Tell boarders about your property… (optional)"
              rows={3}
              maxLength={500}
              value={details.businessDescription}
              onChange={e => setDetails(d => ({ ...d, businessDescription: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="City" htmlFor="city">
              <TextInput
                id="city"
                name="city"
                placeholder="e.g., Quezon City"
                value={details.city}
                onChange={e => setDetails(d => ({ ...d, city: e.target.value }))}
              />
            </Field>
            <Field label="Province" htmlFor="province">
              <TextInput
                id="province"
                name="province"
                placeholder="e.g., Metro Manila"
                value={details.province}
                onChange={e => setDetails(d => ({ ...d, province: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Contact number" htmlFor="phoneNumber">
            <TextInput
              id="phoneNumber"
              type="tel"
              name="phoneNumber"
              placeholder="+63 9XX XXX XXXX"
              value={details.phoneNumber}
              onChange={e => setDetails(d => ({ ...d, phoneNumber: e.target.value }))}
            />
          </Field>

          <p className="text-xs text-gray-ink">
            Your account will be created right away — verification can be completed later from your
            dashboard.
          </p>

          <div className="flex flex-col gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating account…' : 'Create landlord account'}
            </Button>
            <button
              type="button"
              className="text-sm text-gray-ink hover:text-primary"
              onClick={() => setStep('role')}
            >
              ← Back
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void finish({ role: 'boarder' })}
            className="flex items-center gap-4 rounded-xl border-2 border-primary bg-surface px-4 py-4 text-left hover:bg-mint"
          >
            <Icon name="search" size={28} className="shrink-0" />
            <span>
              <span className="block font-semibold text-ink">Boarder</span>
              <span className="block text-sm text-gray-ink">I&apos;m looking for a room</span>
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setStep('landlord-details')}
            className="flex items-center gap-4 rounded-xl border-2 border-border bg-surface px-4 py-4 text-left hover:border-primary hover:bg-mint"
          >
            <Icon name="buildingOffice" size={28} className="shrink-0" />
            <span>
              <span className="block font-semibold text-ink">Landlord</span>
              <span className="block text-sm text-gray-ink">I rent out rooms</span>
            </span>
          </button>
          {busy ? (
            <p className="text-center text-sm text-gray-ink">Creating your account…</p>
          ) : null}
        </div>
      )}
    </AuthSplitLayout>
  );
}
