import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { AuthAlert } from '../../components/auth/AuthAlert';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import { ApiRequestError } from '../../lib/api/http';
import { forgotPassword, resendResetCode, verifyResetCode } from '../../lib/api/auth';

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const result = await forgotPassword(email.trim());
      setInfo(result.message);
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to send reset code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyResetCode(email.trim(), code.trim());
      if (!result.valid || !result.request_id) {
        setError('The code could not be verified. Please try again.');
        return;
      }
      void navigate({
        to: '/auth/reset-password',
        search: { email: email.trim(), request_id: String(result.request_id) },
      });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to verify code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const result = await resendResetCode(email.trim());
      setInfo(result.message);
      setCode('');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to resend the code.');
    } finally {
      setResending(false);
    }
  }

  function changeEmail() {
    setStep('email');
    setCode('');
    setError(null);
    setInfo(null);
  }

  const linkButton =
    'font-semibold text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <AuthSplitLayout
      title={step === 'email' ? 'Reset your password' : 'Check your email'}
      subtitle={
        step === 'email' ? (
          'Enter the email you signed up with and we’ll send you a 6-digit reset code.'
        ) : (
          <>
            Enter the 6-digit code we sent to{' '}
            <span className="font-semibold text-ink">{email.trim()}</span>.
          </>
        )
      }
      footer={
        <p>
          Remembered it?{' '}
          <Link
            to="/auth/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Back to login
          </Link>
        </p>
      }
    >
      {error ? <AuthAlert title={error} /> : null}
      {info ? <AuthAlert tone="success" title={info} /> : null}

      {step === 'email' ? (
        <form className="flex flex-col gap-5" onSubmit={handleEmailSubmit}>
          <Field label="Email" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Sending code…' : 'Send reset code'}
          </Button>
        </form>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={handleCodeSubmit}>
          <Field label="6-digit code" htmlFor="code">
            <TextInput
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              required
              autoFocus
              className="tabular text-center font-semibold tracking-[0.5em]"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </Field>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || resending || code.length !== 6}
          >
            {submitting ? 'Verifying…' : 'Verify code'}
          </Button>
          <div className="flex flex-col items-center gap-2 text-sm text-gray-ink">
            <p>
              Didn’t get it? Check spam, or{' '}
              <button
                type="button"
                className={linkButton}
                disabled={resending || submitting}
                onClick={() => void handleResend()}
              >
                {resending ? 'sending a new code…' : 'send a new code'}
              </button>
              .
            </p>
            <button
              type="button"
              className={linkButton}
              disabled={submitting}
              onClick={changeEmail}
            >
              Use a different email
            </button>
          </div>
        </form>
      )}
    </AuthSplitLayout>
  );
}
