import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthDivider, AuthSplitLayout, GoogleButton } from '../../components/auth/AuthSplitLayout';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, PasswordInput, TextInput } from '../../components/ui/Field';
import { ApiRequestError } from '../../lib/api/http';
import { checkEmail } from '../../lib/api/auth';
import { setPendingToast } from '../../lib/toast';
import { useAuth } from '../../lib/auth-context';
import {
  authErrorSearch,
  googleAuthorizeUrl,
  handleOAuthHash,
  redirectPathForUser,
} from '../../lib/oauth';

export const Route = createFileRoute('/auth/login')({
  validateSearch: authErrorSearch,
  component: LoginPage,
});

function LoginPage() {
  const { error: searchError, redirect } = useSearch({ from: '/auth/login' });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleAccount, setGoogleAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Handle the Google OAuth `#auth=` callback hash if present.
  useEffect(() => {
    const user = handleOAuthHash();
    if (user) void navigate({ to: redirect ?? redirectPathForUser(user) });
  }, [navigate, redirect]);

  async function handleEmailBlur() {
    if (!email.trim() || !email.includes('@')) return;
    try {
      const result = await checkEmail(email.trim());
      setGoogleAccount(result.exists && result.is_google_account);
    } catch {
      // Silently ignore — don't disrupt the user
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      setPendingToast('success', `Welcome back, ${user.first_name}!`);
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
      title="Welcome Back!"
      subtitle="We're excited to see you again. Please enter your details to continue."
      footer={
        <p className="text-center">
          Don&apos;t have an account?{' '}
          <Link to="/auth/choose" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      }
    >
      {searchError ? <ErrorState message={searchError} /> : null}
      {error ? <ErrorState message={error} /> : null}

      <GoogleButton
        onClick={() => {
          window.location.href = googleAuthorizeUrl('login', 'boarder', redirect);
        }}
      />
      <AuthDivider />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="Email" htmlFor="email">
          <TextInput
            id="email"
            type="email"
            name="email"
            placeholder="Enter your email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
          />
        </Field>

        {googleAccount ? (
          <div className="rounded-md bg-mint p-3 text-sm">
            This account was created with Google. Please sign in with the Google button above.
          </div>
        ) : (
          <Field label="Password" htmlFor="password">
            <PasswordInput
              id="password"
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </Field>
        )}

        <div className="text-right">
          <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
