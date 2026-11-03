import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthAlert } from '../../../components/auth/AuthAlert';
import {
  AuthDivider,
  AuthSplitLayout,
  GoogleButton,
} from '../../../components/auth/AuthSplitLayout';
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

export const Route = createFileRoute('/auth/signup/')({
  validateSearch: authErrorSearch,
  component: BoarderSignupPage,
});

type FieldErrors = Partial<Record<'password' | 'confirm', string>>;

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const user = handleOAuthHash();
    if (user) void navigate({ to: resolvePostAuthPath(user, redirect) });
  }, [navigate, redirect]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirm) {
      setFieldErrors({ confirm: 'Passwords do not match' });
      return;
    }
    if (password.length < 8) {
      setFieldErrors({ password: 'Password must be at least 8 characters long' });
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
      void navigate({ to: resolvePostAuthPath(user, redirect) });
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'An error occurred. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Confirm-field feedback as soon as the user has typed enough to compare.
  const liveMismatch =
    confirm.length > 0 && confirm.length >= password.length && confirm !== password
      ? 'Passwords do not match'
      : null;

  return (
    <AuthSplitLayout
      title="Create your boarder account"
      subtitle="Find a room near school or work, apply in minutes and keep your stay in one place."
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
            Renting out rooms instead?{' '}
            <Link
              to="/auth/signup/landlord"
              search={{ redirect }}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Create a landlord account
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
            window.location.href = googleAuthorizeUrl('signup', 'boarder', redirect);
            window.setTimeout(() => setGoogleLoading(false), 4000);
          } catch {
            setGoogleLoading(false);
          }
        }}
      />
      <AuthDivider />

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 min-[400px]:gap-3">
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
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
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
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors(f => ({ ...f, password: undefined }));
              }}
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
            value={confirm}
            onChange={e => {
              setConfirm(e.target.value);
              if (fieldErrors.confirm) setFieldErrors(f => ({ ...f, confirm: undefined }));
            }}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          disabled={submitting || googleLoading}
        >
          {submitting ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
