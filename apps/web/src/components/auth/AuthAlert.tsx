import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';

export type AuthAlertTone = 'error' | 'success' | 'info';

const TONES: Record<AuthAlertTone, { box: string; icon: string }> = {
  error: { box: 'border-error-border bg-error-tint text-error-ink', icon: 'report' },
  success: { box: 'border-success-border bg-success-tint text-success-ink', icon: 'check' },
  info: { box: 'border-border bg-mint/70 text-primary-dark', icon: 'lightbulb' },
};

/**
 * Compact banner for auth forms: a server error, a "code sent" confirmation, or a hint.
 * Errors are announced assertively (`role="alert"`); confirmations politely (`role="status"`).
 */
export function AuthAlert({
  tone = 'error',
  title,
  children,
  action,
  className = 'mb-5',
}: {
  tone?: AuthAlertTone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${t.box} ${className}`}
    >
      <Icon name={t.icon} size={18} className="mt-px" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug">{title}</p>
        {children ? <div className="mt-1 leading-relaxed opacity-90">{children}</div> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}

/**
 * Terminal state of an auth flow (link sent, password changed, link expired): a tinted
 * glyph, one sentence of explanation, then the next action(s).
 */
export function AuthStatus({
  tone,
  icon,
  children,
  actions,
}: {
  tone: 'success' | 'error' | 'info';
  icon: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  const badge =
    tone === 'success'
      ? 'bg-success-tint text-success-ink'
      : tone === 'error'
      ? 'bg-error-tint text-error-ink'
      : 'bg-mint text-primary';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className="flex flex-col gap-6">
      <div className="flex items-start gap-4 rounded-2xl border border-border/80 bg-surface p-5 shadow-card">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${badge}`}
        >
          <Icon name={icon} size={22} />
        </span>
        <div className="min-w-0 pt-0.5 text-[0.9375rem] leading-relaxed text-gray-ink">
          {children}
        </div>
      </div>
      <div className="flex flex-col gap-3">{actions}</div>
    </div>
  );
}
