import { Link, createFileRoute, useSearch } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { AuthAlert, AuthStatus } from '../../components/auth/AuthAlert';
import { AuthSplitLayout } from '../../components/auth/AuthSplitLayout';
import { Button, buttonClasses } from '../../components/ui/Button';
import { Field, PasswordInput } from '../../components/ui/Field';
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

type FieldErrors = Partial<Record<'newPassword' | 'confirmPassword', string>>;

const footerLink = 'font-semibold text-primary underline-offset-4 hover:underline';

function ResetPasswordPage() {
  const { email, request_id } = useSearch({ from: '/auth/reset-password' });
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const linkIncomplete = !email || !request_id;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!email || !request_id) {
      setError('This reset link is incomplete. Please request a new reset code.');
      return;
    }
    if (newPassword !== confirm) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setFieldErrors({ newPassword: 'Password must be at least 8 characters long' });
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

  const liveMismatch =
    confirm.length > 0 && confirm.length >= newPassword.length && confirm !== newPassword
      ? 'Passwords do not match'
      : null;

  if (success) {
    return (
      <AuthSplitLayout
        title="Password updated"
        subtitle="You can now log in with your new password."
      >
        <AuthStatus
          tone="success"
          icon="check"
          actions={
            <Link to="/auth/login" className={buttonClasses({ size: 'lg', className: 'w-full' })}>
              Log in
            </Link>
          }
        >
          Your password has been updated. Use it the next time you log in
          {email ? (
            <>
              {' '}
              as <span className="font-semibold text-ink">{email}</span>
            </>
          ) : null}
          .
        </AuthStatus>
      </AuthSplitLayout>
    );
  }

  if (linkIncomplete) {
    return (
      <AuthSplitLayout
        title="This reset link isn’t valid"
        subtitle="It may be incomplete or already used."
        footer={
          <p>
            Remembered it?{' '}
            <Link to="/auth/login" className={footerLink}>
              Back to login
            </Link>
          </p>
        }
      >
        <AuthStatus
          tone="error"
          icon="clock"
          actions={
            <Link
              to="/auth/forgot-password"
              className={buttonClasses({ size: 'lg', className: 'w-full' })}
            >
              Request a new code
            </Link>
          }
        >
          This reset link is incomplete. Please request a new reset code.
        </AuthStatus>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      title="Choose a new password"
      subtitle={
        <>
          For <span className="font-semibold text-ink">{email}</span>. Use at least 8
          characters.
        </>
      }
      footer={
        <p>
          Remembered it?{' '}
          <Link to="/auth/login" className={footerLink}>
            Back to login
          </Link>
        </p>
      }
    >
      {error ? (
        <AuthAlert
          title={error}
          action={
            <Link to="/auth/forgot-password" className={footerLink}>
              Request a new code
            </Link>
          }
        />
      ) : null}
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Field label="New password" htmlFor="newPassword" error={fieldErrors.newPassword}>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            placeholder="8 or more characters"
            required
            minLength={8}
            autoFocus
            aria-invalid={fieldErrors.newPassword ? true : undefined}
            value={newPassword}
            onChange={e => {
              setNewPassword(e.target.value);
              if (fieldErrors.newPassword) setFieldErrors(f => ({ ...f, newPassword: undefined }));
            }}
          />
        </Field>
        <Field
          label="Confirm new password"
          htmlFor="confirmPassword"
          error={fieldErrors.confirmPassword ?? liveMismatch}
        >
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Type it again"
            required
            minLength={8}
            aria-invalid={fieldErrors.confirmPassword || liveMismatch ? true : undefined}
            value={confirm}
            onChange={e => {
              setConfirm(e.target.value);
              if (fieldErrors.confirmPassword)
                setFieldErrors(f => ({ ...f, confirmPassword: undefined }));
            }}
          />
        </Field>
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
          {submitting ? 'Updating password…' : 'Update password'}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
