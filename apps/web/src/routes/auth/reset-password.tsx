import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, PasswordInput, TextInput } from '../../components/ui/Field';
import { ApiRequestError } from '../../lib/api/http';
import { resetPassword } from '../../lib/api/auth';

interface ResetSearch {
  email?: string;
  request_id?: string;
}

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
    request_id: typeof search.request_id === 'string' ? search.request_id : undefined,
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { email, request_id } = useSearch({ from: '/auth/reset-password' });
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !request_id) {
      setError('This reset link is incomplete. Please request a new reset code.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email, Number(request_id), newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout
      title={success ? 'Password Reset Successful!' : 'Reset Your Password'}
      subtitle={
        success
          ? 'You can now log in with your new password.'
          : 'Create a new password for your account.'
      }
    >
      {success ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-md bg-mint p-3 text-sm">
            Your password has been updated. Head back to login to continue.
          </div>
          <Link to="/auth/login" className="text-center text-primary hover:underline">
            Go to Login
          </Link>
        </div>
      ) : (
        <>
          {error ? <ErrorState message={error} /> : null}
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field label="New Password" htmlFor="newPassword">
              <PasswordInput
                id="newPassword"
                name="newPassword"
                autoComplete="new-password"
                placeholder="Enter your new password"
                required
                minLength={8}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm Password" htmlFor="confirmPassword">
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Confirm your new password"
                required
                minLength={8}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Resetting…' : 'Reset Password'}
            </Button>
          </form>
        </>
      )}
      {!success ? (
        <p className="mt-6 text-sm">
          Remember your password?{' '}
          <Link to="/auth/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      ) : null}
    </AuthSplitLayout>
  );
}
