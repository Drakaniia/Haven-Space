import type { ButtonHTMLAttributes, Ref } from 'react';

const VARIANTS: Record<string, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  outline: 'border-2 border-primary bg-white text-primary hover:bg-mint',
  ghost: 'bg-transparent text-primary hover:bg-mint',
  danger: 'bg-error text-white hover:brightness-90',
};

export function Button({
  variant = 'primary',
  className = '',
  ref,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      className={`rounded-full px-4 py-2 font-semibold transition-all duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
