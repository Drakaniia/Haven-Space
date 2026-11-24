import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthAlert } from '../../../components/auth/AuthAlert';
import {
  AuthDivider,
  AuthSplitLayout,
  GoogleButton,
} from '../../../components/auth/AuthSplitLayout';
import {
  BoardingHouseFields,
  EMPTY_BOARDING_HOUSE,
  LANDLORD_SIGNUP_NOTE,
  boardingHousePayload,
  boardingHousePhoneError,
  type BoardingHouseDetails,
} from '../../../components/auth/BoardingHouseFields';
import { FormSection } from '../../../components/auth/FormSection';
import { Button } from '../../../components/ui/Button';
import { Field, PasswordInput, TextInput } from '../../../components/ui/Field';
import { ApiRequestError } from '../../../lib/api/http';
import { useAuth } from '../../../lib/auth-context';
import {
  authErrorSearch,
  googleAuthorizeUrl,
  handleOAuthHash,
  resolvePostAuthPath,
} from '../../../lib/oauth';

export const Route = createFileRoute('/auth/signup/landlord')({
  validateSearch: authErrorSearch,
  component: LandlordSignupPage,
});

type FieldErrors = Partial<Record<'password' | 'confirm' | 'phoneNumber', string>>;

/**
 * Landlord sign-up with email and password. It collects exactly what the Google
 * sign-up collects (name, email, optional boarding house details) — no ID step;
 * verification happens later from the dashboard.
 */
function LandlordSignupPage() {
  const { error: searchError, redirect } = useSearch({ from: '/auth/signup/landlord' });
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [house, setHouse] = useState<BoardingHouseDetails>(EMPTY_BOARDING_HOUSE);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const user = handleOAuthHash();
    if (user) void navigate({ to: resolvePostAuthPath(user, redirect) });
  }, [navigate, redirect]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    if (key in fieldErrors) setFieldErrors(f => ({ ...f, [key]: undefined }));
  }

  /** Focus the first rejected field so a long form scrolls straight to the problem. */
  function reject(errors: FieldErrors) {
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) window.requestAnimationFrame(() => document.getElementById(first)?.focus());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (form.password !== form.confirm) {
      reject({ confirm: 'Passwords do not match' });
      return;
    }
    if (form.password.length < 8) {
      reject({ password: 'Password must be at least 8 characters long' });
      return;
    }
    const phoneError = boardingHousePhoneError(house);
    if (phoneError) {
      reject({ phoneNumber: phoneError });
      return;
    }

    setSubmitting(true);
    try {
      const user = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'landlord',
        ...boardingHousePayload(house),
      });
      // Same landing as a Google landlord: the dashboard, where verification waits.
      void navigate({ to: resolvePostAuthPath(user, redirect) });
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'An error occurred. Please try again.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  const liveMismatch =
    form.confirm.length > 0 &&
    form.confirm.length >= form.password.length &&
    form.confirm !== form.password
      ? 'Passwords do not match'
      : null;

  return (
    <AuthSplitLayout
      title="Create your landlord account"
      subtitle={LANDLORD_SIGNUP_NOTE}
      footer={
        <div className="flex flex-col gap-2">
          <p>
            Already have an account?{' '}
            <Link
              to="/auth/login"
              search={{ redirect }}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
          <p>
            Looking for a room instead?{' '}
            <Link
              to="/auth/signup"
              search={{ redirect }}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Create a boarder account
            </Link>
          </p>
        </div>
      }
    >
      {searchError ? <AuthAlert title={searchError} /> : null}
      {error ? <AuthAlert title={error} /> : null}

      <GoogleButton
        label="Sign up with Google"
        loading={googleLoading}
        disabled={submitting}
        onClick={() => {
          setGoogleLoading(true);
          setError(null);
          try {
            window.location.href = googleAuthorizeUrl('signup', 'landlord', redirect);
            window.setTimeout(() => setGoogleLoading(false), 4000);
          } catch {
            setGoogleLoading(false);
          }
        }}
      />
      <AuthDivider />

      <form method="post" className="flex flex-col gap-9" onSubmit={handleSubmit}>
        <FormSection title="Your account">
          <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 min-[400px]:gap-3">
            <Field label="First name" htmlFor="firstName">
              <TextInput
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                required
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
              />
            </Field>
            <Field label="Last name" htmlFor="lastName">
              <TextInput
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                required
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Email" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              required
              value={form.email}
              onChange={e => set('email', e.target.value)}
            />
          </Field>

          <div>
            <Field label="Password" htmlFor="password" error={fieldErrors.password}>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                placeholder="8 or more characters"
                required
                minLength={8}
                aria-describedby="password-hint"
                aria-invalid={fieldErrors.password ? true : undefined}
                value={form.password}
                onChange={e => set('password', e.target.value)}
              />
            </Field>
            {!fieldErrors.password ? (
              <p id="password-hint" className="mt-1.5 text-sm text-muted">
                Use at least 8 characters.
              </p>
            ) : null}
          </div>

          <Field
            label="Confirm password"
            htmlFor="confirm"
            error={fieldErrors.confirm ?? liveMismatch}
          >
            <PasswordInput
              id="confirm"
              name="confirm"
              autoComplete="new-password"
              required
              minLength={8}
              aria-invalid={fieldErrors.confirm || liveMismatch ? true : undefined}
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
            />
          </Field>
        </FormSection>

        <BoardingHouseFields
          value={house}
          onChange={next => {
            setHouse(next);
            if (fieldErrors.phoneNumber) setFieldErrors(f => ({ ...f, phoneNumber: undefined }));
          }}
          phoneError={fieldErrors.phoneNumber}
          // Validate on blur, not every keystroke, so nobody is scolded mid-typing.
          onPhoneBlur={() => {
            const phoneError = boardingHousePhoneError(house);
            if (phoneError) setFieldErrors(f => ({ ...f, phoneNumber: phoneError }));
          }}
        />

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" disabled={submitting || googleLoading}>
            {submitting ? 'Creating your account…' : 'Create landlord account'}
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
