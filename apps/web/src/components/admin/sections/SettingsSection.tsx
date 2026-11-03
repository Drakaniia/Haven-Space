import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { getSettings, patchSettings } from '../../../lib/api/admin';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { TextArea, TextInput } from '../../ui/Field';
import { Toggle } from '../../ui/Toggle';
import { AdminSection } from '../AdminSection';
import { SettingsSkeleton } from '../AdminSkeletons';
import type { PushToast } from '../sections';

/**
 * How each known setting key is presented. The API returns a flat
 * `Record<string, string>`; grouping, labels and the control type are purely
 * presentational, and every value is still sent back as the same string.
 * Keys the console doesn't know yet fall into "Other" as plain text fields, so
 * a new server-side setting is never hidden.
 */
type FieldKind = 'text' | 'textarea' | 'percent' | 'flag';

interface FieldSpec {
  key: string;
  label: string;
  hint?: string;
  kind: FieldKind;
}

const GROUPS: { title: string; description: string; fields: FieldSpec[] }[] = [
  {
    title: 'Fees',
    description: 'Charged on each successful booking.',
    fields: [
      {
        key: 'platform_fee_percent',
        label: 'Platform fee',
        hint: 'A percentage, e.g. 5.00.',
        kind: 'percent',
      },
    ],
  },
  {
    title: 'Maintenance',
    description: 'A notice for planned downtime.',
    fields: [
      {
        key: 'maintenance_message',
        label: 'Maintenance message',
        hint: 'Leave empty when no maintenance is planned.',
        kind: 'textarea',
      },
    ],
  },
  {
    title: 'Legal documents',
    description: 'The versions of the policies people agree to.',
    fields: [
      { key: 'terms_version', label: 'Terms of service version', hint: 'e.g. 1.0', kind: 'text' },
      { key: 'privacy_version', label: 'Privacy policy version', hint: 'e.g. 1.0', kind: 'text' },
    ],
  },
  {
    title: 'Notifications',
    description: 'Alerts for the admin team.',
    fields: [
      {
        key: 'notify_admin_new_landlord',
        label: 'Notify admins about new landlords',
        kind: 'flag',
      },
    ],
  },
];

const KNOWN_KEYS = new Set(GROUPS.flatMap(group => group.fields.map(field => field.key)));

function humanizeKey(key: string): string {
  const text = key.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card padding="p-0">
      <section aria-labelledby={`settings-${title}`}>
        <header className="border-b border-border/70 px-5 py-4">
          <h2 id={`settings-${title}`} className="font-display text-lg font-medium text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-gray-ink">{description}</p>
        </header>
        <div className="space-y-5 px-5 py-5">{children}</div>
      </section>
    </Card>
  );
}

function SettingField({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `setting-${spec.key}`;
  const hintId = spec.hint ? `${id}-hint` : undefined;

  if (spec.kind === 'flag') {
    return (
      <Toggle
        id={id}
        label={spec.label}
        description={spec.hint}
        checked={value === '1' || value === 'true'}
        onChange={checked => onChange(checked ? '1' : '0')}
      />
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={id}>
        {spec.label}
      </label>
      {spec.kind === 'textarea' ? (
        <TextArea
          id={id}
          rows={3}
          aria-describedby={hintId}
          value={value}
          onChange={event => onChange(event.target.value)}
        />
      ) : spec.kind === 'percent' ? (
        <div className="relative max-w-[12rem]">
          <TextInput
            id={id}
            inputMode="decimal"
            aria-describedby={hintId}
            value={value}
            onChange={event => onChange(event.target.value)}
            className="tabular pr-9"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-ink"
          >
            %
          </span>
        </div>
      ) : (
        <TextInput
          id={id}
          aria-describedby={hintId}
          value={value}
          onChange={event => onChange(event.target.value)}
          className="max-w-sm"
        />
      )}
      {spec.hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-gray-ink">
          {spec.hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Platform-wide configuration, grouped by what each value is for.
 *
 * The section's `PageHeader` is the only heading (R14). The form tracks its
 * saved baseline, so the save bar can say "Unsaved changes", offer Discard,
 * and only report "Saved" once the server has actually accepted the values.
 */
function SettingsForm({
  settings,
  busy,
  onSave,
}: {
  settings: Record<string, string>;
  busy: boolean;
  onSave: (values: Record<string, string>) => Promise<unknown>;
}) {
  const [baseline, setBaseline] = useState<Record<string, string>>(settings);
  const [values, setValues] = useState<Record<string, string>>(settings);
  const [saved, setSaved] = useState(false);

  const dirtyKeys = Object.keys(values).filter(key => values[key] !== baseline[key]);
  const dirty = dirtyKeys.length > 0;
  const otherKeys = Object.keys(values).filter(key => !KNOWN_KEYS.has(key));

  const set = (key: string, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    setSaved(false);
  };

  return (
    <form
      className="max-w-3xl space-y-6"
      onSubmit={async event => {
        event.preventDefault();
        try {
          await onSave(values);
          setBaseline(values);
          setSaved(true);
        } catch {
          // The mutation's own `onError` toasts the reason; the edits stay put.
        }
      }}
    >
      {GROUPS.map(group => {
        const fields = group.fields.filter(field => field.key in values);
        if (fields.length === 0) return null;
        return (
          <SettingsGroup key={group.title} title={group.title} description={group.description}>
            {fields.map(field => (
              <SettingField
                key={field.key}
                spec={field}
                value={values[field.key] ?? ''}
                onChange={value => set(field.key, value)}
              />
            ))}
          </SettingsGroup>
        );
      })}

      {otherKeys.length > 0 ? (
        <SettingsGroup title="Other" description="Settings this console has no dedicated control for yet.">
          {otherKeys.map(key => (
            <SettingField
              key={key}
              spec={{ key, label: humanizeKey(key), kind: 'text' }}
              value={values[key] ?? ''}
              onChange={value => set(key, value)}
            />
          ))}
        </SettingsGroup>
      ) : null}

      <div className="sticky bottom-4 z-20">
        <div className="chrome-float flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 shadow-pop">
          <p className="text-sm text-gray-ink" aria-live="polite">
            {busy
              ? 'Saving…'
              : dirty
                ? `${dirtyKeys.length} unsaved ${dirtyKeys.length === 1 ? 'change' : 'changes'}`
                : saved
                  ? <span className="font-medium text-success-ink">Saved.</span>
                  : 'All changes saved.'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!dirty || busy}
              onClick={() => {
                setValues(baseline);
                setSaved(false);
              }}
            >
              Discard
            </Button>
            <Button type="submit" size="sm" disabled={busy || !dirty}>
              {busy ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </div>
      </div>
    </form>
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
      onRetry={() => void settings.refetch()}
      skeleton={<SettingsSkeleton />}
    >
      {settings.data ? (
        <SettingsForm
          settings={settings.data.data}
          busy={saveSettings.isPending}
          onSave={values => saveSettings.mutateAsync(values)}
        />
      ) : null}
    </AdminSection>
  );
}
