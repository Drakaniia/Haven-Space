import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthAlert } from '../../../components/auth/AuthAlert';
import {
  AuthDivider,
  AuthSplitLayout,
  GoogleButton,
} from '../../../components/auth/AuthSplitLayout';
import { FormSection } from '../../../components/auth/FormSection';
import { Button } from '../../../components/ui/Button';
import {
  Field,
  PasswordInput,
  SelectInput,
  TextArea,
  TextInput,
} from '../../../components/ui/Field';
import { ApiRequestError } from '../../../lib/api/http';
import { useAuth } from '../../../lib/auth-context';
import {
  authErrorSearch,
  googleAuthorizeUrl,
  handleOAuthHash,
  isForeignRolePath,
  resolvePostAuthPath,
} from '../../../lib/oauth';
import { isPhilippinePhone } from '../../../lib/validation';

export const Route = createFileRoute('/auth/signup/landlord')({
  validateSearch: authErrorSearch,
  component: LandlordSignupPage,
});

const ID_TYPES = [
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID (PhilID)' },
  { value: 'sss_id', label: 'SSS ID' },
  { value: 'tin_id', label: 'TIN ID' },
  { value: 'postal_id', label: 'Postal ID' },
  { value: 'voters_id', label: "Voter's ID" },
];

const PHONE_ERROR =
  'Enter a valid Philippine mobile number (e.g. 0917 123 4567 or +63 917 123 4567)';

type FieldErrors = Partial<Record<'password' | 'confirm' | 'phoneNumber', string>>;

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
    businessName: '',
    businessDescription: '',
    city: '',
    province: '',
    phoneNumber: '',
    idType: '',
    idNumber: '',
  });
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
    if (!isPhilippinePhone(form.phoneNumber)) {
      reject({ phoneNumber: PHONE_ERROR });
      return;
    }

    setSubmitting(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'landlord',
        businessName: form.businessName.trim(),
        businessDescription: form.businessDescription.trim() || undefined,
        city: form.city.trim(),
        province: form.province.trim(),
        phoneNumber: form.phoneNumber.trim(),
        idType: form.idType,
        idNumber: form.idNumber.trim(),
      });
      // Landlords continue to verification, unless a return path sent them here.
      void navigate({
        to:
          redirect && !isForeignRolePath('landlord', redirect)
            ? redirect
            : '/landlord/verification',
      });
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'An error occurred. Please try again.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  // Validate the phone on blur (not on every keystroke) so the user isn't scolded mid-typing.
  function handlePhoneBlur() {
    if (form.phoneNumber.trim() && !isPhilippinePhone(form.phoneNumber)) {
      setFieldErrors(f => ({ ...f, phoneNumber: PHONE_ERROR }));
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
      subtitle="Tell us about you and your boarding house, then verify your account."
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

      <form className="flex flex-col gap-9" onSubmit={handleSubmit}>
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

        <FormSection
          title="Your boarding house"
          description="Boarders see this on your listings. You can refine it later."
        >
          <Field label="Business / property name" htmlFor="businessName">
            <TextInput
              id="businessName"
              name="businessName"
              placeholder="e.g. Haven Dormitory"
              autoComplete="organization"
              required
              value={form.businessName}
              onChange={e => set('businessName', e.target.value)}
            />
          </Field>

          <div>
            <Field label="Brief description (optional)" htmlFor="businessDescription">
              <TextArea
                id="businessDescription"
                name="businessDescription"
                placeholder="What makes your place a good home?"
                rows={3}
                maxLength={500}
                aria-describedby="businessDescription-count"
                value={form.businessDescription}
                onChange={e => set('businessDescription', e.target.value)}
              />
            </Field>
            <p
              id="businessDescription-count"
              className="tabular mt-1.5 text-right text-xs text-muted"
            >
              {form.businessDescription.length}/500
            </p>
          </div>

          <Field label="Contact number" htmlFor="phoneNumber" error={fieldErrors.phoneNumber}>
            <TextInput
              id="phoneNumber"
              type="tel"
              name="phoneNumber"
              placeholder="0917 123 4567"
              autoComplete="tel"
              inputMode="tel"
              required
              aria-invalid={fieldErrors.phoneNumber ? true : undefined}
              value={form.phoneNumber}
              onChange={e => set('phoneNumber', e.target.value)}
              onBlur={handlePhoneBlur}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 min-[400px]:gap-3">
            <Field label="City" htmlFor="city">
              <TextInput
                id="city"
                name="city"
                placeholder="e.g. Quezon City"
                autoComplete="address-level2"
                required
                value={form.city}
                onChange={e => set('city', e.target.value)}
              />
            </Field>
            <Field label="Province" htmlFor="province">
              <TextInput
                id="province"
                name="province"
                placeholder="e.g. Metro Manila"
                autoComplete="address-level1"
                required
                value={form.province}
                onChange={e => set('province', e.target.value)}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Verification"
          description="Used only to verify your account. Never shown to boarders."
        >
          <Field label="Valid ID type" htmlFor="idType">
            <SelectInput
              id="idType"
              name="idType"
              required
              value={form.idType}
              onChange={e => set('idType', e.target.value)}
            >
              <option value="">Select ID type</option>
              {ID_TYPES.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="ID number" htmlFor="idNumber">
            <TextInput
              id="idNumber"
              name="idNumber"
              placeholder="As printed on your ID"
              autoComplete="off"
              required
              value={form.idNumber}
              onChange={e => set('idNumber', e.target.value)}
            />
          </Field>
        </FormSection>

        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || googleLoading}
          >
            {submitting ? 'Creating your account…' : 'Create landlord account'}
          </Button>
          {!redirect ? (
            <p className="text-center text-sm text-muted">
              Next, you’ll upload your verification documents.
            </p>
          ) : null}
        </div>
      </form>
    </AuthSplitLayout>
  );
}
