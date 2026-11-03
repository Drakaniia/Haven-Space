import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AuthAlert, AuthStatus } from '../../components/auth/AuthAlert';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { FormSection } from '../../components/auth/FormSection';
import { RoleChoice, type RoleValue } from '../../components/auth/RoleChoice';
import { Button, buttonClasses } from '../../components/ui/Button';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { Spinner } from '../../components/ui/Spinner';
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
  // False until the pending-session hash has been read, so the "expired" state can't flash
  // for a frame before a perfectly valid session is picked up.
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<RoleValue | null>(null);
  const [roleMissing, setRoleMissing] = useState(false);
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
    setReady(true);
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

  function handleRoleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role) {
      setRoleMissing(true);
      return;
    }
    if (role === 'boarder') void finish({ role: 'boarder' });
    else setStep('landlord-details');
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
  const expired = ready && !session;

  return (
    <AuthSplitLayout
      title={
        expired
          ? 'This sign-in link has expired'
          : session?.link
          ? 'Link your Google account'
          : step === 'landlord-details'
          ? 'Finish your landlord account'
          : 'Choose how to continue'
      }
      subtitle={
        !ready ? undefined : expired ? (
          'Start again from the login page to continue with Google.'
        ) : session?.link ? (
          <>
            An account already exists for{' '}
            <span className="font-semibold text-ink">{session.email}</span>.
          </>
        ) : step === 'landlord-details' ? (
          'These details are optional. You can complete them later from your dashboard.'
        ) : (
          <>
            Signed in with Google as{' '}
            <span className="font-semibold text-ink">{session?.email}</span>. One last step.
          </>
        )
      }
      footer={
        <p>
          Prefer a different option?{' '}
          <Link
            to="/auth/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Back to login
          </Link>
        </p>
      }
    >
      {banner ? <AuthAlert title={banner} /> : null}

      {!ready ? (
        <div className="flex items-center gap-3 text-sm text-gray-ink" role="status">
          <Spinner />
          Checking your Google sign-in…
        </div>
      ) : !session ? (
        <AuthStatus
          tone="error"
          icon="clock"
          actions={
            <Link to="/auth/login" className={buttonClasses({ size: 'lg', className: 'w-full' })}>
              Go to login
            </Link>
          }
        >
          This Google sign-in session has expired or is invalid. Please try signing in again.
        </AuthStatus>
      ) : session.link ? (
        <div className="flex flex-col gap-6">
          <AuthAlert tone="info" className="" title="Use Google to log in next time">
            Linking adds Google as a sign-in method for{' '}
            <span className="font-semibold">{session.email}</span>. Your role and account details
            stay the same.
          </AuthAlert>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={busy}
              onClick={() => void finish({})}
            >
              {busy ? 'Linking…' : 'Link Google account'}
            </Button>
            <Link
              to="/auth/login"
              className={buttonClasses({ variant: 'ghost', size: 'lg', className: 'w-full' })}
            >
              Cancel and use my password
            </Link>
          </div>
        </div>
      ) : step === 'landlord-details' ? (
        <form className="flex flex-col gap-9" onSubmit={handleLandlordSubmit}>
          <FormSection title="Your account">
            <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 min-[400px]:gap-3">
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
          </FormSection>

          <FormSection
            title="Your boarding house"
            description="Optional for now. Boarders see this on your listings."
          >
            <Field label="Business / property name" htmlFor="businessName">
              <TextInput
                id="businessName"
                name="businessName"
                placeholder="e.g. Haven Dormitory"
                autoComplete="organization"
                value={details.businessName}
                onChange={e => setDetails(d => ({ ...d, businessName: e.target.value }))}
              />
            </Field>

            <Field label="Brief description" htmlFor="businessDescription">
              <TextArea
                id="businessDescription"
                name="businessDescription"
                placeholder="What makes your place a good home?"
                rows={3}
                maxLength={500}
                value={details.businessDescription}
                onChange={e => setDetails(d => ({ ...d, businessDescription: e.target.value }))}
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 min-[400px]:gap-3">
              <Field label="City" htmlFor="city">
                <TextInput
                  id="city"
                  name="city"
                  placeholder="e.g. Quezon City"
                  autoComplete="address-level2"
                  value={details.city}
                  onChange={e => setDetails(d => ({ ...d, city: e.target.value }))}
                />
              </Field>
              <Field label="Province" htmlFor="province">
                <TextInput
                  id="province"
                  name="province"
                  placeholder="e.g. Metro Manila"
                  autoComplete="address-level1"
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
                placeholder="0917 123 4567"
                autoComplete="tel"
                inputMode="tel"
                value={details.phoneNumber}
                onChange={e => setDetails(d => ({ ...d, phoneNumber: e.target.value }))}
              />
            </Field>
          </FormSection>

          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-ink">
              Your account is created right away. Verification can be completed later from your
              dashboard.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="sm:w-auto"
                disabled={busy}
                onClick={() => setStep('role')}
              >
                Back
              </Button>
              <Button type="submit" size="lg" className="sm:flex-1" disabled={busy}>
                {busy ? 'Creating account…' : 'Create landlord account'}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <form className="flex flex-col gap-6" onSubmit={handleRoleSubmit}>
          <RoleChoice
            value={role}
            disabled={busy}
            describedBy={roleMissing ? 'role-missing' : undefined}
            onChange={value => {
              setRole(value);
              setRoleMissing(false);
            }}
          />
          {roleMissing ? (
            <p id="role-missing" role="alert" className="-mt-3 text-sm text-error-ink">
              Choose Boarder or Landlord to continue.
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy
              ? 'Creating your account…'
              : role === 'boarder'
              ? 'Create boarder account'
              : 'Continue'}
          </Button>
        </form>
      )}
    </AuthSplitLayout>
  );
}
