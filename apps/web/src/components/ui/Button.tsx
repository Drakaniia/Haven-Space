import type { ButtonHTMLAttributes, Ref } from 'react';

/*
  Solid variants paint `primary-strong` rather than `primary`, keeping the fill
  separate from the accent so the two can diverge if a theme ever needs it.
*/
const VARIANTS: Record<string, string> = {
  primary: 'bg-primary-strong text-white hover:bg-primary-hover',
  secondary: 'bg-ink text-cream hover:bg-ink/90',
  outline: 'border-2 border-primary bg-surface text-primary hover:bg-mint',
  ghost: 'bg-transparent text-primary hover:bg-mint',
  danger: 'bg-error text-white hover:brightness-90',
  /** Destructive row action that shouldn't shout: red text, quiet until hovered. */
  dangerGhost: 'bg-transparent text-error-ink hover:bg-error-tint',
  /** Amber CTA for "finish setting up" prompts. Uses `warning-strong` for the
      same reason `primary` uses `primary-strong`: a fill, not an accent. */
  warning: 'bg-warning-strong text-white hover:brightness-90',
  /**
   * Cautionary row action (admin's "Flag") — the amber sibling of
   * `dangerGhost`. Added so a quiet row action can say "needs attention"
   * without a literal palette colour or an `!important` override
   * (`admin-apple-ui-restructure` R25).
   */
  warningGhost: 'bg-transparent text-warning-ink hover:bg-warning-tint',
};

const SIZES: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
};

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'dangerGhost'
  | 'warning'
  | 'warningGhost';
export type ButtonSize = 'sm' | 'md';

/**
 * The one button look, addressable from a `<Link>` too.
 *
 * Pages need navigation that reads as a button ("Manage", "+ Create listing"),
 * and before this helper each one inlined its own colours — three competing
 * primary styles across the landlord surface (`landlord-apple-ui-restructure`
 * R18/R19). Links use this; `<Button>` uses this.
 *
 * Press feedback lives on `:active` so it fires on pointer-down, matching the
 * rest of the shell.
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return `inline-flex items-center justify-center rounded-full font-semibold transition-all duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ref,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
}) {
  return <button ref={ref} className={buttonClasses({ variant, size, className })} {...props} />;
}
