import { Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon';

interface LoginPromptOverlayProps {
  open: boolean;
  /** Sanitized relative path to return to after login (e.g. '/haven-ai'). */
  redirect: string;
  onNotNow: () => void;
}

/**
 * Dismissible overlay shown when a guest hits their one free Haven AI question.
 * Offers Log in / Sign up (carrying a `?redirect=` so the user returns to the
 * chat with their history intact) or "Not now", which disables the composer.
 * Focus-managed like ConfirmDialog: focuses the primary action, Escape or
 * overlay-click dismisses, and focus returns to the trigger on close.
 */
export function LoginPromptOverlay({ open, redirect, onNotNow }: LoginPromptOverlayProps) {
  const loginRef = useRef<HTMLAnchorElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onNotNowRef = useRef(onNotNow);
  onNotNowRef.current = onNotNow;

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    loginRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onNotNowRef.current();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
      aria-describedby="login-prompt-description"
      className="modal-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]"
      onClick={onNotNow}
    >
      <div
        className="modal-pop relative w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-ink/5"
        onClick={event => event.stopPropagation()}
      >
        {/* Soft mint glow behind the badge */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-mint blur-3xl"
        />

        <div className="relative flex flex-col items-center px-8 pb-7 pt-9 text-center">
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute inset-0 -m-1.5 rounded-2xl bg-primary-strong/10"
            />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-strong to-primary-hover text-white shadow-pop">
              <Icon name="sparkles" size={26} />
            </div>
          </div>

          <h2
            id="login-prompt-title"
            className="mt-5 text-xl font-extrabold tracking-tight text-ink"
          >
            Log in to keep chatting
          </h2>
          <p
            id="login-prompt-description"
            className="mt-2 max-w-xs text-sm leading-relaxed text-gray-ink"
          >
            You&apos;ve used your one free Haven AI question. Log in or sign up for unlimited chat —
            your conversation will pick up right where you left off.
          </p>

          <div className="mt-7 flex w-full flex-col gap-3">
            <Link
              ref={loginRef}
              to="/auth/login"
              search={{ redirect }}
              className="w-full rounded-full bg-primary-strong px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Log in
            </Link>
            <Link
              to="/auth/choose"
              search={{ redirect }}
              className="w-full rounded-full border-2 border-primary bg-surface px-4 py-3 text-sm font-semibold text-primary transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Sign up
            </Link>
          </div>

          <button
            type="button"
            onClick={onNotNow}
            className="mt-5 text-sm font-medium text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
