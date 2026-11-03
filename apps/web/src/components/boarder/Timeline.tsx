import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';

export type TimelineState = 'done' | 'current' | 'upcoming' | 'stopped';

export interface TimelineStep {
  key: string;
  title: string;
  description?: ReactNode;
  state: TimelineState;
}

const MARKER: Record<TimelineState, string> = {
  done: 'border-primary-strong bg-primary-strong text-white',
  current: 'border-primary bg-mint text-primary-dark',
  upcoming: 'border-border-strong bg-surface text-muted',
  stopped: 'border-error-border bg-error-tint text-error-ink',
};

const STATE_LABEL: Record<TimelineState, string> = {
  done: 'Completed',
  current: 'Current step',
  upcoming: 'Not started',
  stopped: 'Stopped',
};

/**
 * Vertical progress list: where an application or payment is, and what comes
 * next. Each step's state is spelled out for screen readers, never colour-only.
 */
export function Timeline({ steps, label }: { steps: TimelineStep[]; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;

        return (
          <li
            key={step.key}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="relative flex gap-3.5 pb-6 last:pb-0"
          >
            {!last ? (
              <span
                aria-hidden="true"
                className={`absolute left-[13px] top-8 bottom-1 w-px ${
                  step.state === 'done' ? 'bg-primary/50' : 'bg-border-strong/70'
                }`}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                MARKER[step.state]
              }`}
            >
              {step.state === 'done' ? (
                <Icon name="check" size={14} />
              ) : step.state === 'stopped' ? (
                <Icon name="close" size={12} />
              ) : (
                index + 1
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={`font-semibold ${
                  step.state === 'upcoming' ? 'text-gray-ink' : 'text-ink'
                }`}
              >
                {step.title}
                <span className="sr-only"> ({STATE_LABEL[step.state]})</span>
              </p>
              {step.description ? (
                <div className="mt-0.5 text-sm leading-relaxed text-gray-ink">
                  {step.description}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
