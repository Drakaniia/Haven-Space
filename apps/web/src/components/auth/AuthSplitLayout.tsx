import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';

/** Canonical auth artwork (spec `auth-hero-map-locale`): its headline is baked into the pixels. */
export const AUTH_PANEL_IMAGE = '/assets/images/public/login_hero.webp';

/** Describes the artwork's baked-in headline for screen readers. */
export const AUTH_PANEL_IMAGE_ALT =
  'Find your haven, right next door. Verified boarding houses near you, managed by trusted landlords.';

/**
 * Two-panel auth frame: pinned artwork on the left (desktop only), one calm form column on
 * the right. Every auth screen names itself once with `title`; `subtitle` says what happens
 * next. `footer` holds the cross-links between login / signup / forgot.
 */
export function AuthSplitLayout({
  title,
  subtitle,
  image = AUTH_PANEL_IMAGE,
  imageAlt = AUTH_PANEL_IMAGE_ALT,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
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
      <div className="relative hidden w-[46%] overflow-hidden bg-primary-dark lg:sticky lg:top-0 lg:block lg:h-screen">
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
      <main className="paper-grain flex w-full items-start justify-center px-5 pb-12 pt-8 sm:items-center sm:px-8 sm:py-14 lg:w-[54%]">
        <div className="rise-in w-full max-w-[420px]">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2.5 rounded-lg sm:mb-12"
            aria-label="Haven Space home"
          >
            <img
              src="/assets/images/Haven_Space_Logo.png"
              alt=""
              className="h-8 w-8 object-contain"
            />
            <span className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">
              Haven Space
            </span>
          </Link>
          <div>
            <h1 className="font-display text-[1.75rem] font-medium leading-[1.1] tracking-[-0.02em] text-ink sm:text-[2.125rem]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-gray-ink">{subtitle}</p>
            ) : null}
          </div>
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-10 border-t border-border pt-5 text-center text-sm text-gray-ink">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
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
      className={`flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border px-4 text-[0.9375rem] font-semibold shadow-card transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 ${
        isDisabled
          ? 'cursor-not-allowed border-border bg-subtle text-muted shadow-none'
          : 'border-border-strong bg-surface text-ink hover:border-[#b9af98] hover:bg-cream'
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
      {loading ? 'Redirecting to Google…' : label}
    </button>
  );
}

export function AuthDivider({ label = 'or use your email' }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-medium text-muted">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
