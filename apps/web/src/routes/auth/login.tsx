import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthAlert } from '../../components/auth/AuthAlert';
import { AuthDivider, AuthSplitLayout, GoogleButton } from '../../components/auth/AuthSplitLayout';
import { Button } from '../../components/ui/Button';
import { Field, PasswordInput, TextInput } from '../../components/ui/Field';
import { ApiRequestError } from '../../lib/api/http';
import { checkEmail } from '../../lib/api/auth';
import { setPendingToast } from '../../lib/toast';
import { useAuth } from '../../lib/auth-context';
import {
  authErrorSearch,
  googleAuthorizeUrl,
  handleOAuthHash,
  resolvePostAuthPath,
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
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle the Google OAuth `#auth=` callback hash if present.
  useEffect(() => {
    const user = handleOAuthHash();
    if (user) void navigate({ to: resolvePostAuthPath(user, redirect) });
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
      void navigate({ to: resolvePostAuthPath(user, redirect) });
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'An error occurred. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      window.location.href = googleAuthorizeUrl('login', 'boarder', redirect);
      window.setTimeout(() => setGoogleLoading(false), 4000);
    } catch {
      setGoogleLoading(false);
    }
  }

  const busy = submitting || googleLoading;

  return (
    <AuthSplitLayout
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
      footer={
        <p>
          New to Haven Space?{' '}
          <Link
            to="/auth/choose"
            search={{ redirect }}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      {searchError ? <AuthAlert title={searchError} /> : null}
      {error ? <AuthAlert title={error} /> : null}

      <GoogleButton loading={googleLoading} disabled={submitting} onClick={startGoogle} />
      <AuthDivider />

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Field label="Email" htmlFor="email">
          <TextInput
            id="email"
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              if (googleAccount) setGoogleAccount(false);
            }}
            onBlur={handleEmailBlur}
          />
        </Field>

        {googleAccount ? (
          <AuthAlert
            tone="info"
            className=""
            title="This account signs in with Google"
            action={
              <button
                type="button"
                onClick={startGoogle}
                disabled={busy}
                className="font-semibold text-primary underline underline-offset-4 disabled:opacity-60"
              >
                Continue with Google
              </button>
            }
          >
            It was created with Google, so there’s no password to enter here.
          </AuthAlert>
        ) : (
          <div className="relative">
            <Field label="Password" htmlFor="password">
              <PasswordInput
                id="password"
                name="password"
                placeholder="Your password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </Field>
            {/* Sits on the label row, but outside the <label> so it stays its own control. */}
            <Link
              to="/auth/forgot-password"
              className="absolute right-0 top-0 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        )}

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={busy || googleAccount}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
