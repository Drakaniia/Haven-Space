/**
 * Switch. Announced as a switch (`role="switch"` + `aria-checked`), not a
 * checkbox, because flipping it takes effect immediately — there is no form
 * submit. The whole row is the control so the hit area is comfortably larger
 * than the 24px track, and the label text is inside the button rather than a
 * sibling `<label>` (a button cannot be labelled by one).
 *
 * `disabled` is used while a save is in flight; the caller reverts the value on
 * failure, so the thumb never settles on an unsaved state.
 */
export function Toggle({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  description,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-4 rounded-xl px-1 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-sm text-gray-ink">{description}</span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-out ${
          checked ? 'bg-primary-strong' : 'bg-border-strong'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgb(28_32_25/0.25)] transition-transform duration-200 ease-[var(--ease-settle)] motion-reduce:transition-none ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}
