import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import {
  AuthDivider,
  AuthSplitLayout,
  GoogleButton,
} from '../../../components/auth/AuthSplitLayout';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Field, PasswordInput, SelectInput, TextArea, TextInput } from '../../../components/ui/Field';
import { ApiRequestError } from '../../../lib/api/http';
import { useAuth } from '../../../lib/auth-context';
import {
  authErrorSearch,
  googleAuthorizeUrl,
  handleOAuthHash,
  redirectPathForUser,
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = handleOAuthHash();
    if (user) void navigate({ to: redirect ?? redirectPathForUser(user) });
  }, [navigate, redirect]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!isPhilippinePhone(form.phoneNumber)) {
      setError('Enter a valid Philippine mobile number (e.g. 0917 123 4567 or +63 917 123 4567)');
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
      void navigate({ to: redirect ?? '/landlord/verification' });
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'An error occurred. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout
      title="Create your landlord account"
      subtitle="This information helps us verify your account and connect you with potential boarders."
      image="/assets/images/public/signup_lower_left.png"
      footer={
        <p className="text-center">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      {searchError ? <ErrorState message={searchError} /> : null}
      {error ? <ErrorState message={error} /> : null}

      <GoogleButton
        onClick={() => {
          window.location.href = googleAuthorizeUrl('signup', 'landlord', redirect);
        }}
      />
      <AuthDivider />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
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
            autoComplete="email"
            required
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" htmlFor="password">
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              placeholder="8 or more characters"
              required
              minLength={8}
              value={form.password}
              onChange={e => set('password', e.target.value)}
            />
          </Field>
          <Field label="Confirm password" htmlFor="confirm">
            <PasswordInput
              id="confirm"
              name="confirm"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
            />
          </Field>
        </div>

        <div className="my-2 border-t border-gray-100" />

        <Field label="Business / Property name" htmlFor="businessName">
          <TextInput
            id="businessName"
            name="businessName"
            placeholder="e.g., Haven Dormitory, ABC Boarding House"
            required
            value={form.businessName}
            onChange={e => set('businessName', e.target.value)}
          />
        </Field>

        <Field label="Brief description" htmlFor="businessDescription">
          <TextArea
            id="businessDescription"
            name="businessDescription"
            placeholder="Tell boarders about your property… (optional)"
            rows={3}
            maxLength={500}
            value={form.businessDescription}
            onChange={e => set('businessDescription', e.target.value)}
          />
        </Field>

        <Field label="Contact number" htmlFor="phoneNumber">
          <TextInput
            id="phoneNumber"
            type="tel"
            name="phoneNumber"
            placeholder="+63 9XX XXX XXXX"
            required
            value={form.phoneNumber}
            onChange={e => set('phoneNumber', e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="City" htmlFor="city">
            <TextInput
              id="city"
              name="city"
              placeholder="e.g., Quezon City"
              required
              value={form.city}
              onChange={e => set('city', e.target.value)}
            />
          </Field>
          <Field label="Province" htmlFor="province">
            <TextInput
              id="province"
              name="province"
              placeholder="e.g., Metro Manila"
              required
              value={form.province}
              onChange={e => set('province', e.target.value)}
            />
          </Field>
        </div>

        <div className="my-2 border-t border-gray-100" />
        <p className="text-sm font-medium">Verification information</p>
        <p className="text-xs text-gray-ink">
          Required for account verification and will not be shown to boarders.
        </p>

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
            placeholder="Enter your ID number"
            required
            value={form.idNumber}
            onChange={e => set('idNumber', e.target.value)}
          />
        </Field>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create Landlord Account'}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
