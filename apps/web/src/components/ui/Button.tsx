import type { ButtonHTMLAttributes, Ref } from 'react';

const VARIANTS: Record<string, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-gray-900 text-white hover:bg-black',
  outline: 'border-2 border-primary bg-white text-primary hover:bg-mint',
  ghost: 'bg-transparent text-primary hover:bg-mint',
  danger: 'bg-error text-white hover:brightness-90',
};

const SIZES: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ref,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      className={`rounded-full font-semibold transition-all duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
