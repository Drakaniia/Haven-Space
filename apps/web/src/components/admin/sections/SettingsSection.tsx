import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getSettings, patchSettings } from '../../../lib/api/admin';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { AdminSection } from '../AdminSection';
import { SettingsSkeleton } from '../AdminSkeletons';
import type { PushToast } from '../sections';

/**
 * Platform-wide configuration values.
 *
 * The card used to repeat its own heading ("System settings" + the same
 * subtitle) under a page heading, which is the "names itself twice" problem the
 * restructure removes — the section's `PageHeader` is now the only heading
 * (R14). The form itself is unchanged.
 */
function SettingsForm({
  settings,
  busy,
  onSave,
}: {
  settings: Record<string, string>;
  busy: boolean;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(settings);
  const [saved, setSaved] = useState(false);

  const set = (key: string, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    setSaved(false);
  };

  return (
    <Card className="max-w-xl">
      <form
        className="space-y-4"
        onSubmit={event => {
          event.preventDefault();
          onSave(values);
          setSaved(true);
        }}
      >
        {Object.entries(values).map(([key, value]) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium text-ink" htmlFor={`setting-${key}`}>
              {key.replaceAll('_', ' ')}
            </label>
            <input
              id={`setting-${key}`}
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-ink"
              value={value}
              onChange={event => set(key, event.target.value)}
            />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </Button>
          {saved ? <span className="text-sm text-success-ink">Saved.</span> : null}
        </div>
      </form>
    </Card>
  );
}

export function SettingsSection({ token, push }: { token: string; push: PushToast }) {
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => getSettings(token),
    enabled: Boolean(token),
  });

  const saveSettings = useMutation({
    mutationFn: (values: Record<string, string>) => patchSettings(token, values),
    onSuccess: result => {
      push({ tone: 'success', message: result.message });
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error: Error) => push({ tone: 'error', message: error.message }),
  });

  return (
    <AdminSection
      section="settings"
      isLoading={settings.isLoading}
      error={settings.error}
      skeleton={<SettingsSkeleton />}
    >
      {settings.data ? (
        <SettingsForm
          settings={settings.data.data}
          busy={saveSettings.isPending}
          onSave={values => saveSettings.mutate(values)}
        />
      ) : null}
    </AdminSection>
  );
}
