import { Icon } from '../ui/Icon';

export type RoleValue = 'boarder' | 'landlord';

const OPTIONS: {
  value: RoleValue;
  title: string;
  tagline: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'boarder',
    title: 'Boarder',
    tagline: 'I’m looking for a room',
    description: 'Browse verified boarding houses, apply for a room and keep your stay in one place.',
    icon: 'search',
  },
  {
    value: 'landlord',
    title: 'Landlord',
    tagline: 'I rent out rooms',
    description: 'List your boarding house, review applications and keep track of rent.',
    icon: 'buildingOffice',
  },
];

/**
 * Boarder vs Landlord as two large radio cards.
 *
 * Built on native radios (visually hidden), so the group gets real radio semantics for free:
 * Tab enters the group, arrow keys move the selection, Space selects. The card styles itself
 * from its input with `has-[:checked]` / `has-[:focus-visible]`.
 */
export function RoleChoice({
  value,
  onChange,
  disabled = false,
  name = 'role',
  legend = 'Choose an account type',
  describedBy,
}: {
  value: RoleValue | null;
  onChange: (value: RoleValue) => void;
  disabled?: boolean;
  name?: string;
  legend?: string;
  describedBy?: string;
}) {
  return (
    <fieldset aria-describedby={describedBy} disabled={disabled} className="min-w-0">
      <legend className="sr-only">{legend}</legend>
      <div className="grid gap-3">
        {OPTIONS.map(option => (
          <label
            key={option.value}
            className="press-card group relative flex cursor-pointer items-start gap-4 rounded-2xl border border-border-strong bg-surface p-4 shadow-card has-[:checked]:border-primary has-[:checked]:bg-mint/45 has-[:checked]:shadow-[0_0_0_1px_var(--color-primary)] has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 sm:p-5"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-subtle text-primary transition-colors duration-150 group-has-[:checked]:bg-primary-strong group-has-[:checked]:text-white">
              <Icon name={option.icon} size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-medium leading-tight text-ink">
                {option.title}
              </span>
              <span className="mt-0.5 block text-sm font-semibold text-gray-ink">
                {option.tagline}
              </span>
              <span className="mt-1.5 block text-sm leading-relaxed text-gray-ink">
                {option.description}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-surface transition-colors duration-150 group-has-[:checked]:border-primary"
            >
              <span className="h-2.5 w-2.5 scale-0 rounded-full bg-primary transition-transform duration-150 group-has-[:checked]:scale-100" />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
