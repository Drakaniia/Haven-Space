import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import {
  AuthDivider,
  AuthSplitLayout,
  GoogleButton,
} from '../../../components/auth/AuthSplitLayout';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Field, PasswordInput, TextInput } from '../../../components/ui/Field';
import { ApiRequestError } from '../../../lib/api/http';
import { useAuth } from '../../../lib/auth-context';
import {
  authErrorSearch,
  googleAuthorizeUrl,
  handleOAuthHash,
  redirectPathForUser,
} from '../../../lib/oauth';

export const Route = createFileRoute('/auth/signup/')({
  validateSearch: authErrorSearch,
  component: BoarderSignupPage,
});

function BoarderSignupPage() {
  const { error: searchError, redirect } = useSearch({ from: '/auth/signup/' });
  const { register } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = handleOAuthHash();
    if (user) void navigate({ to: redirect ?? redirectPathForUser(user) });
  }, [navigate, redirect]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setSubmitting(true);
    try {
      const user = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        role: 'boarder',
      });
      void navigate({ to: redirect ?? redirectPathForUser(user) });
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
      title="Create your account"
      subtitle="Sign up as a boarder to find your next home."
      image="/assets/images/public/signup_lower_right.png"
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
          window.location.href = googleAuthorizeUrl('signup', 'boarder', redirect);
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
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
            />
          </Field>
          <Field label="Last name" htmlFor="lastName">
            <TextInput
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={e => setLastName(e.target.value)}
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
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="8 or more characters"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </Field>

        <Field label="Confirm password" htmlFor="confirm">
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />
        </Field>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
