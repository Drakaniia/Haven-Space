import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, PasswordInput, TextInput } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { ToastStack, useToasts } from '../../components/ui/Toast';
import { ApiRequestError } from '../../lib/api/http';
import { changePassword } from '../../lib/api/auth';
import { getProfile, updateProfile, uploadAvatar } from '../../lib/api/account';
import { useAuth } from '../../lib/auth-context';
import { setStoredAuth } from '../../lib/auth-store';
import { BOARDER_NAV } from '../../lib/nav';

export const Route = createFileRoute('/boarder/settings')({
  component: () => (
    <Protected role="boarder">
      <SettingsPage />
    </Protected>
  ),
});

function SettingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();

  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(token!),
    enabled: Boolean(token),
  });

  // Seed the form once the profile loads.
  const [seeded, setSeeded] = useState(false);
  if (profile.data && !seeded) {
    const user = profile.data.user as {
      first_name?: string;
      last_name?: string;
      phone_number?: string;
    };
    setFirstName(user.first_name ?? '');
    setLastName(user.last_name ?? '');
    setPhone(user.phone_number ?? '');
    setSeeded(true);
  }

  const saveProfile = useMutation({
    mutationFn: () =>
      updateProfile(token!, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim() || null,
      }),
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Write the fresh user to the store so the navbar/user menu updates
      // immediately (AUTH_CHANGED_EVENT re-syncs the auth context).
      setStoredAuth(token!, undefined, data.user);
      push({ tone: 'success', message: 'Profile updated.' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update profile.'),
  });

  const avatar = useMutation({
    mutationFn: (file: File) => uploadAvatar(token!, file),
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setStoredAuth(token!, undefined, data.user);
      push({ tone: 'success', message: 'Avatar updated.' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to upload avatar.'),
  });

  const password = useMutation({
    mutationFn: () => changePassword(token!, currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      push({ tone: 'success', message: 'Password changed.' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to change password.'),
  });

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    saveProfile.mutate();
  }

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    password.mutate();
  }

  if (profile.isLoading) return <Spinner />;

  return (
    <RoleShell title="Settings" nav={BOARDER_NAV}>
      <div className="flex max-w-2xl flex-col gap-6">
        <ToastStack toasts={toasts} onDismiss={dismiss} />
        {error ? <ErrorState message={error} /> : null}

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Icon name="user" size={20} /> Profile
          </h2>
          <form className="mt-4 flex flex-col gap-4" onSubmit={handleProfileSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" htmlFor="firstName">
                <TextInput
                  id="firstName"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </Field>
              <Field label="Last name" htmlFor="lastName">
                <TextInput
                  id="lastName"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Phone number" htmlFor="phone">
              <TextInput
                id="phone"
                type="tel"
                placeholder="+63 9XX XXX XXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Icon name="photo" size={20} /> Profile picture
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <label className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
              Choose an image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={avatar.isPending}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setError(null);
                    avatar.mutate(file);
                  }
                }}
              />
            </label>
            {avatar.isPending ? <span className="text-sm text-gray-ink">Uploading…</span> : null}
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Icon name="settings" size={20} /> Change password
          </h2>
          <form className="mt-4 flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
            <Field label="Current password" htmlFor="currentPassword">
              <PasswordInput
                id="currentPassword"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field label="New password" htmlFor="newPassword">
              <PasswordInput
                id="newPassword"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={password.isPending}>
              {password.isPending ? 'Changing…' : 'Change password'}
            </Button>
          </form>
        </Card>
      </div>
    </RoleShell>
  );
}
