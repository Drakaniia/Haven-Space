import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { AccountSecurityCard } from '../../components/settings/AccountSecurityCard';
import { NotificationPreferencesCard } from '../../components/settings/NotificationPreferencesCard';
import { SettingsSection } from '../../components/settings/SettingsSection';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, TextInput } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { ToastStack, useToasts } from '../../components/ui/Toast';
import { ApiRequestError } from '../../lib/api/http';
import { getProfile, updateProfile, uploadAvatar } from '../../lib/api/account';
import { useAuth } from '../../lib/auth-context';
import { setStoredAuth } from '../../lib/auth-store';
import { useBoarderNav } from '../../lib/use-boarder-nav';

export const Route = createFileRoute('/boarder/settings')({
  component: () => (
    <Protected role="boarder">
      <SettingsPage />
    </Protected>
  ),
});

function SettingsPage() {
  const { token } = useAuth();
  const nav = useBoarderNav();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
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

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    saveProfile.mutate();
  }

  function focusProfileForm() {
    firstNameRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    firstNameRef.current?.focus({ preventScroll: true });
  }

  return (
    <RoleShell nav={nav}>
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, notification preferences, and account security."
      />
      <div className="flex max-w-3xl flex-col gap-6">
        <ToastStack toasts={toasts} onDismiss={dismiss} />
        {error ? <ErrorState message={error} /> : null}

        {profile.isLoading ? (
          <Spinner />
        ) : profile.isError || !profile.data ? (
          <ErrorState
            message="We couldn't load your account details."
            hint="Refresh the page. If this keeps happening, the API may be missing its latest migration."
            action={
              <Button variant="outline" size="sm" onClick={() => void profile.refetch()}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            <SettingsSection label="Account">
              <Card>
                <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <Icon name="user" size={20} /> Profile
                </h3>
                <p className="mt-1 text-sm text-gray-ink">
                  Your personal information used on Haven Space.
                </p>
                <form className="mt-4 flex flex-col gap-4" onSubmit={handleProfileSubmit}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field label="First name" htmlFor="firstName">
                      <TextInput
                        id="firstName"
                        ref={firstNameRef}
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
                    <Field label="Phone number" htmlFor="phone">
                      <TextInput
                        id="phone"
                        type="tel"
                        placeholder="+63 9XX XXX XXXX"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Button type="submit" disabled={saveProfile.isPending}>
                      {saveProfile.isPending ? 'Saving…' : 'Save profile'}
                    </Button>
                    <button
                      type="button"
                      onClick={focusProfileForm}
                      className="text-sm font-semibold text-primary hover:text-primary-hover"
                    >
                      Edit profile →
                    </button>
                  </div>
                </form>
              </Card>

              <Card>
                <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <Icon name="photo" size={20} /> Profile picture
                </h3>
                <div className="mt-4 flex items-center gap-3">
                  <label className="cursor-pointer rounded-full border border-border-strong px-4 py-2 text-sm font-medium transition-all duration-100 ease-out hover:bg-subtle active:scale-[0.97]">
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
                  {avatar.isPending ? (
                    <span className="text-sm text-gray-ink">Uploading…</span>
                  ) : null}
                </div>
              </Card>
            </SettingsSection>

            <SettingsSection label="Preferences">
              <NotificationPreferencesCard token={token!} role="boarder" pushToast={push} />
            </SettingsSection>

            <SettingsSection label="Security">
              <AccountSecurityCard
                token={token!}
                email={profile.data?.user.email ?? ''}
                hasPassword={profile.data.user.has_password}
                googleConnected={profile.data.user.google_connected}
                passwordUpdatedAt={profile.data.user.password_updated_at ?? null}
                pushToast={push}
              />
            </SettingsSection>
          </>
        )}
      </div>
    </RoleShell>
  );
}
