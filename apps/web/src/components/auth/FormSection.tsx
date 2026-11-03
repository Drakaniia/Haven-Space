import type { ReactNode } from 'react';

/**
 * A titled group of related fields inside a long form (account / property / verification).
 * Uses a real `<fieldset>` + `<legend>` so the group name is announced with its fields.
 */
export function FormSection({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={`min-w-0 ${className}`}>
      <legend className="font-display text-lg font-medium leading-tight tracking-[-0.01em] text-ink">
        {title}
      </legend>
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-gray-ink">{description}</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-5">{children}</div>
    </fieldset>
  );
}
