import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Toggle } from '../../../components/ui/Toggle';

export const Route = createFileRoute('/boarder/applications/settings')({
  component: ApplicationSettingsPage,
});

const ROWS = [
  {
    key: 'application_updates',
    label: 'Application status updates',
    description: 'When a landlord accepts or declines an application.',
  },
  {
    key: 'landlord_messages',
    label: 'Messages from landlords',
    description: 'When a landlord replies about a room you applied for.',
  },
  {
    key: 'announcements',
    label: 'Property announcements',
    description: 'House notices from properties you are applying to.',
  },
] as const;

function ApplicationSettingsPage() {
  const [prefs, setPrefs] = useState({
    application_updates: true,
    landlord_messages: true,
    announcements: false,
  });
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof typeof prefs) {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Application notifications"
        subtitle="Choose which application updates you want to hear about."
      />
      <Card padding="p-6">
        <p className="flex items-start gap-2 rounded-xl bg-subtle px-4 py-3 text-sm text-gray-ink">
          <Icon name="lightbulb" size={16} className="mt-0.5 text-muted" />
          These preferences are stored locally in this browser — the API does not yet expose a
          notification-settings endpoint.
        </p>

        <form className="mt-4" onSubmit={handleSubmit}>
          <div className="divide-y divide-border">
            {ROWS.map(row => (
              <Toggle
                key={row.key}
                id={`app-pref-${row.key}`}
                label={row.label}
                description={row.description}
                checked={prefs[row.key]}
                onChange={() => toggle(row.key)}
              />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <Button type="submit">Save preferences</Button>
            <p role="status" aria-live="polite" className="text-sm text-success-ink">
              {saved ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="check" size={16} />
                  Preferences saved (locally).
                </span>
              ) : null}
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
