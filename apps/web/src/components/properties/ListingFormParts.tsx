import { useId, useState, type DragEvent, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';

/**
 * Building blocks for the landlord's long forms — create listing, edit listing
 * and edit room — so the three read as one family.
 *
 * A section is a two-column band on wide screens: the heading and a sentence of
 * helper text on the left, the fields on the right. On a phone it stacks. The
 * bands sit inside one card separated by hairlines, so a long form reads as a
 * few scannable groups rather than a single column of inputs.
 */

export const FORM_SECTION_GRID =
  'grid gap-x-10 gap-y-5 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]';

export function FormSectionHeading({
  id,
  title,
  description,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h2 id={id} className="font-display text-lg font-medium tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {description ? (
        <p className="mt-1.5 text-sm leading-relaxed text-gray-ink">{description}</p>
      ) : null}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <section aria-labelledby={id} className={FORM_SECTION_GRID}>
      <FormSectionHeading id={id} title={title} description={description} />
      <div className="grid min-w-0 content-start gap-5">{children}</div>
    </section>
  );
}

/** Small helper line under a field. */
export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-relaxed text-gray-ink">{children}</p>;
}

/**
 * Selectable amenity chip. `aria-pressed` carries the state for assistive tech;
 * the fill and the check mark carry it visually, so selection never depends on
 * colour alone.
 */
export function AmenityToggle({
  label,
  selected,
  disabled,
  onToggle,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:active:scale-100 ${
        selected
          ? 'border-primary/50 bg-mint text-primary-dark'
          : 'border-border-strong bg-surface text-gray-ink hover:border-primary/40 hover:text-ink'
      }`}
    >
      <Icon name={selected ? 'check' : 'plus'} size={14} className={selected ? '' : 'text-muted'} />
      {label}
    </button>
  );
}

/**
 * Photo upload area. A real (visually hidden, still focusable) file input sits
 * inside the label, so it works by click, by keyboard and by drag-and-drop.
 * States: idle, dragging, busy (uploading), and full/disabled.
 */
export function PhotoDropzone({
  title,
  hint,
  accept = 'image/*',
  multiple = true,
  busy = false,
  busyLabel = 'Uploading…',
  full = false,
  fullLabel = 'Photo limit reached',
  disabled = false,
  compact = false,
  inputId,
  onFiles,
}: {
  title: string;
  hint: string;
  accept?: string;
  multiple?: boolean;
  busy?: boolean;
  busyLabel?: string;
  full?: boolean;
  fullLabel?: string;
  disabled?: boolean;
  compact?: boolean;
  inputId?: string;
  onFiles: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inactive = disabled || busy || full;

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (inactive) return;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={event => {
        event.preventDefault();
        if (!inactive) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex items-center gap-3 rounded-xl border border-dashed text-left transition-[background-color,border-color] duration-150 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 ${
        compact ? 'px-3.5 py-3' : 'px-4 py-5 sm:px-5'
      } ${
        inactive
          ? 'cursor-not-allowed border-border bg-subtle/60'
          : dragging
          ? 'cursor-copy border-primary bg-mint'
          : 'cursor-pointer border-border-strong bg-cream/60 hover:border-primary/60 hover:bg-mint/50'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-xl ${
          compact ? 'h-9 w-9' : 'h-11 w-11'
        } ${inactive ? 'bg-surface text-muted' : 'bg-surface text-primary shadow-card'}`}
      >
        <Icon name="photo" size={compact ? 18 : 22} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink" aria-live="polite">
          {busy ? busyLabel : full ? fullLabel : dragging ? 'Drop to add' : title}
        </span>
        <span className="mt-0.5 block text-xs text-gray-ink">{hint}</span>
      </span>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={inactive}
        onChange={event => {
          const files = Array.from(event.target.files ?? []);
          // Allow re-picking the same file after an error.
          event.target.value = '';
          if (files.length > 0) onFiles(files);
        }}
      />
    </label>
  );
}

/**
 * The form's footer. Sticky so the primary action stays reachable anywhere in
 * a long form; opaque because content scrolls beneath it. The left side states
 * what saving will do (draft / published), the right side holds the buttons.
 */
export function FormSaveBar({ status, children }: { status?: ReactNode; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-b-2xl border-t border-border bg-surface px-5 py-4 shadow-[0_-8px_24px_-16px_rgb(28_32_25/0.18)] sm:px-8">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-gray-ink">
        {status}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
