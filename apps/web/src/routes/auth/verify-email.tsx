import { Link, createFileRoute, useSearch } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { AuthAlert } from '../../components/auth/AuthAlert';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { Button, buttonClasses } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { ApiRequestError } from '../../lib/api/http';
import { resendResetCode } from '../../lib/api/auth';

interface VerifyEmailSearch {
  email?: string;
}

export const Route = createFileRoute('/auth/verify-email')({
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const search = useSearch({ from: '/auth/verify-email' });
  const [email, setEmail] = useState(search.email ?? '');
  // With a known address, show it as text first; the field appears only if the user wants to
  // change it (or there was no address to begin with).
  const [editing, setEditing] = useState(!search.email);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleResend(e?: FormEvent) {
    e?.preventDefault();
    if (!email.trim()) {
      setError('Enter your email address to resend the code.');
      return;
    }
    setError(null);
    setMessage(null);
    setSending(true);
    try {
      const result = await resendResetCode(email.trim());
      setMessage(result.message);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to resend the code.');
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthSplitLayout
      title="Check your email"
      subtitle="We’ve sent you a verification code. Enter it on the signup or login page to verify your account."
      footer={
        <p>
          Wrong account?{' '}
          <Link
            to="/auth/choose"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Create a new one
          </Link>
        </p>
      }
    >
      {message ? <AuthAlert tone="success" title={message} /> : null}
      {error ? <AuthAlert title={error} /> : null}

      <form className="flex flex-col gap-5" onSubmit={handleResend}>
        {editing ? (
          <Field label="Email address" htmlFor="email">
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
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-card">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
              <Icon name="notification" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted">Code sent to</p>
              <p className="truncate font-semibold text-ink">{email}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Change
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link to="/auth/login" className={buttonClasses({ size: 'lg', className: 'w-full' })}>
            Continue to login
          </Link>
          <Button type="submit" variant="outline" size="lg" className="w-full" disabled={sending}>
            {sending ? 'Sending a new code…' : 'Resend code'}
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
