import { useId, type ReactNode } from 'react';
import type { ToastTone } from '../../lib/toast';

/**
 * One labelled group on the Settings page. The eyebrow is the section's real
 * heading (`h2`), so card titles inside it are `h3` and the page keeps a
 * straight h1 → h2 → h3 outline.
 */
export function SettingsSection({ label, children }: { label: string; children: ReactNode }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </h2>
      {children}
    </section>
  );
}

export interface SettingsToast {
  tone: ToastTone;
  message: string;
}

/**
 * Settings cards report success/failure through the page's existing ToastStack
 * instead of mounting a second fixed stack on top of it.
 */
export type PushSettingsToast = (toast: SettingsToast) => void;
