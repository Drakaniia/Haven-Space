import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';

/** Canonical auth artwork (spec `auth-hero-map-locale`): its headline is baked into the pixels. */
export const AUTH_PANEL_IMAGE = '/assets/images/public/login_hero.webp';

/** Describes the artwork's baked-in headline for screen readers. */
export const AUTH_PANEL_IMAGE_ALT =
  'Find your haven, right next door. Verified boarding houses near you, managed by trusted landlords.';

export function AuthSplitLayout({
  title,
  subtitle,
  image = AUTH_PANEL_IMAGE,
  imageAlt = AUTH_PANEL_IMAGE_ALT,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  /** Left-panel artwork. Override only if a page genuinely needs different art. */
  image?: string;
  /** Describes the artwork for screen readers. */
  imageAlt?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left image panel.
          Pinned so the artwork can't be scrolled away while a long form (e.g. the landlord
          signup) scrolls past it, and `lg:h-screen` keeps it exactly one viewport tall so
          `object-cover` stops re-cropping as the form grows. The page must stay the scroll
          container: no ancestor may set `overflow`, or sticky silently stops working. */}
      <div className="relative hidden w-1/2 overflow-hidden bg-primary-strong lg:sticky lg:top-0 lg:block lg:h-screen">
        <img
          src={image}
          alt={imageAlt}
          fetchPriority="high"
          /* 20% keeps the artwork's baked-in headline clear of the left edge when the
             panel is narrower than the artwork and object-cover crops horizontally. */
          className="absolute inset-0 h-full w-full object-cover object-[20%_50%]"
        />
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center bg-cream px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <img
              src="/assets/images/Haven_Space_Logo.png"
              alt="Haven Space"
              className="h-9 w-9 object-contain"
            />
            <span className="text-lg font-bold text-primary">Haven Space</span>
          </Link>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-gray-ink">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 border-t border-border pt-4 text-sm">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({
  onClick,
  label = 'Continue with Google',
  disabled = false,
  loading = false,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      className={`flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
        isDisabled
          ? 'cursor-not-allowed border-border bg-subtle text-muted'
          : 'border-border-strong bg-surface text-ink hover:bg-mint'
      }`}
    >
      {loading ? (
        <span
          className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-border-strong border-t-primary"
          aria-hidden
        />
      ) : (
        <Icon name="google" size={18} />
      )}
      {loading ? 'Redirecting…' : label}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-gray-ink">
      <span className="h-px flex-1 bg-subtle" />
      or
      <span className="h-px flex-1 bg-subtle" />
    </div>
  );
}
