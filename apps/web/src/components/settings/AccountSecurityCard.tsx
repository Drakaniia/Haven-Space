import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ErrorState } from '../ui/ErrorState';
import { Field, PasswordInput } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import { changePassword } from '../../lib/api/auth';
import { ApiRequestError } from '../../lib/api/http';
import type { PushSettingsToast } from './SettingsSection';

const GOOGLE_ACCOUNT_URL = 'https://myaccount.google.com/security';

function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return 'Never changed';
  }

  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));

  if (Number.isNaN(date.getTime())) {
    return 'Never changed';
  }

  return `Last updated ${date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

/**
 * SECURITY card. Google-linked accounts (including accounts that also hold a
 * password) get the read-only connected state — "Google wins" per the spec —
 * while password accounts keep the inline current/new password form.
 */
export function AccountSecurityCard({
  token,
  email,
  hasPassword,
  googleConnected,
  passwordUpdatedAt,
  pushToast,
}: {
  token: string;
  email: string;
  hasPassword: boolean | undefined;
  googleConnected: boolean | undefined;
  passwordUpdatedAt: string | null;
  pushToast: PushSettingsToast;
}) {
  // An API that predates the flags (or a profile payload that failed to parse)
  // must not be guessed at: rendering the password form here is what made a
  // Google account look password-backed while its profile request was failing.
  if (hasPassword === undefined || googleConnected === undefined) {
    return <UnknownSecurityCard />;
  }

  if (googleConnected) {
    return <GoogleSecurityCard email={email} />;
  }

  return (
    <PasswordSecurityCard
      token={token}
      passwordUpdatedAt={passwordUpdatedAt}
      pushToast={pushToast}
    />
  );
}

function UnknownSecurityCard() {
  return (
    <Card>
      <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Icon name="shield" size={20} /> Account security
      </h3>
      <div className="mt-4">
        <ErrorState
          message="We couldn't determine how this account signs in."
          hint="Refresh the page. If this keeps happening, the API is running behind the app."
        />
      </div>
    </Card>
  );
}

function GoogleSecurityCard({ email }: { email: string }) {
  return (
    <Card>
      <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Icon name="shield" size={20} /> Account security
      </h3>
      <p className="mt-1 text-sm text-gray-ink">Your Haven Space account is connected to Google.</p>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Sign-in method
      </p>

      <div className="mt-2 flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
            <Icon name="google" size={20} />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-ink">Google</span>
            <span className="block truncate text-sm text-gray-ink">{email}</span>
          </span>
        </div>
        <StatusBadge status="active" label="Connected" />
      </div>

      <div className="mt-3 flex flex-col gap-2 rounded-xl bg-subtle px-4 py-3 text-sm text-gray-ink sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-start gap-2">
          <InfoGlyph />
          <span>
            Google handles your password and sign-in security. Manage them in your Google Account.
          </span>
        </span>
        <a
          href={GOOGLE_ACCOUNT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 font-semibold text-primary hover:text-primary-hover"
        >
          Manage Google Account ↗
        </a>
      </div>
    </Card>
  );
}

function PasswordSecurityCard({
  token,
  passwordUpdatedAt,
  pushToast,
}: {
  token: string;
  passwordUpdatedAt: string | null;
  pushToast: PushSettingsToast;
}) {
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const password = useMutation({
    mutationFn: () => changePassword(token, currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      pushToast({ tone: 'success', message: 'Password changed.' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to change password.'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    password.mutate();
  }

  return (
    <Card>
      <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Icon name="shield" size={20} /> Account security
      </h3>
      <p className="mt-1 text-sm text-gray-ink">
        Update the password you use to sign in to Haven Space.
      </p>

      <div className="mt-4 border-t border-border pt-4">
        <p className="font-semibold text-ink">Password</p>
        <p className="mt-0.5 text-sm text-gray-ink">{formatUpdatedAt(passwordUpdatedAt)}</p>
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="Current password" htmlFor="currentPassword">
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
          />
        </Field>
        <Field label="New password" htmlFor="newPassword">
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
          />
        </Field>
        <div>
          <Button type="submit" disabled={password.isPending}>
            {password.isPending ? 'Changing…' : 'Change password'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function InfoGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="mt-0.5 h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 11v5" />
      <path strokeLinecap="round" d="M12 8h.01" />
    </svg>
  );
}
