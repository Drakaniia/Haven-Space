import { Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { buttonClasses } from '../ui/Button';
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
      className="modal-fade fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onNotNow}
    >
      <div
        className="modal-pop w-full max-w-md rounded-[20px] border border-border bg-surface p-6 shadow-pop sm:p-8"
        onClick={event => event.stopPropagation()}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint text-primary">
          <Icon name="sparkles" size={22} />
        </span>

        <h2 id="login-prompt-title" className="display-md mt-5 text-ink">
          Log in to keep chatting
        </h2>
        <p id="login-prompt-description" className="mt-3 leading-relaxed text-gray-ink">
          You have used your one free Haven AI question. Log in or create an account to keep going.
          Your conversation will be right where you left it.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Link
            ref={loginRef}
            to="/auth/login"
            search={{ redirect }}
            className={buttonClasses({ size: 'lg', className: 'w-full' })}
          >
            Log in
          </Link>
          <Link
            to="/auth/choose"
            search={{ redirect }}
            className={buttonClasses({ variant: 'outline', size: 'lg', className: 'w-full' })}
          >
            Create an account
          </Link>
          <button
            type="button"
            onClick={onNotNow}
            className={buttonClasses({ variant: 'ghost', size: 'md', className: 'w-full' })}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
