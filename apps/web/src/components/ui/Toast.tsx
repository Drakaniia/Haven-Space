import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePendingToast, type ToastItem, type ToastTone } from '../../lib/toast';

const TONE_STYLES: Record<ToastTone, { bar: string; icon: string }> = {
  success: { bar: 'bg-success', icon: 'text-success' },
  error: { bar: 'bg-error', icon: 'text-error' },
  info: { bar: 'bg-info', icon: 'text-info' },
  warning: { bar: 'bg-warning', icon: 'text-warning' },
};

/**
 * Inline SVG tone icons. The shared `Icon` component renders `<img>` tags,
 * whose SVG content can't be recolored via CSS — inline SVGs inherit
 * `currentColor`, so `text-*` classes tint them.
 */
function ToneIcon({ tone }: { tone: ToastTone }) {
  switch (tone) {
    case 'success':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'warning':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
          <path strokeLinecap="round" d="M12 9v4" />
          <path strokeLinecap="round" d="M12 17h.01" />
        </svg>
      );
    case 'info':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 11v5" />
          <path strokeLinecap="round" d="M12 8h.01" />
        </svg>
      );
  }
}

export function Toast({
  tone,
  message,
  onDismiss,
  duration = 4000,
  action,
}: {
  tone: ToastTone;
  message: ReactNode;
  onDismiss: () => void;
  duration?: number;
  action?: ToastItem['action'];
}) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const styles = TONE_STYLES[tone];

  return (
    <div className="toast-in pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border bg-surface py-3 pl-4 pr-2.5 shadow-pop">
      {/* Colored left accent bar */}
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${styles.bar}`} />
      <span className={`shrink-0 ${styles.icon}`}>
        <ToneIcon tone={tone} />
      </span>
      <p className="min-w-0 flex-1 text-sm font-medium text-ink">{message}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-primary hover:bg-mint"
        >
          {action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="shrink-0 rounded-full p-1 text-muted transition hover:bg-subtle hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

const POSITION_CLASSES: Record<NonNullable<ToastStackProps['position']>, string> = {
  'top-right': 'top-20 right-4 items-end',
  'top-left': 'top-20 left-4 items-start',
  'bottom-right': 'bottom-4 right-4 items-end',
  'bottom-left': 'bottom-4 left-4 items-start',
};

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Fixed-position vertical stack of toasts. Rendered once per view (the global
 * ToastHost) or with local state by any feature that wants immediate feedback.
 * `top-*` values clear the fixed navbar; `z-[60]` keeps toasts above modals.
 */
export function ToastStack({ toasts, onDismiss, position = 'top-right' }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 ${POSITION_CLASSES[position]}`}
    >
      {toasts.map(toast => {
        const { id, ...rest } = toast;
        return <Toast key={id} {...rest} onDismiss={() => onDismiss(id)} />;
      })}
    </div>
  );
}

/**
 * Local toast state for in-place actions (no navigation). Features render
 * `<ToastStack toasts={...} onDismiss={...} />` themselves and push toasts on
 * success — no provider or global state required.
 */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const push = useCallback((toast: Omit<ToastItem, 'id'>) => {
    nextId.current += 1;
    setToasts(prev => [...prev, { id: `toast-${nextId.current}`, ...toast }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, push, dismiss };
}

/**
 * Global consumer of the sessionStorage bridge. Mount once in the root layout:
 * it reads pending toasts (stashed by login/logout before navigating) on mount
 * and on every route change, then displays them stacked.
 */
export function ToastHost() {
  const pending = usePendingToast();
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    if (!pending) return;
    push(pending);
  }, [pending, push]);

  return <ToastStack toasts={toasts} onDismiss={dismiss} />;
}
