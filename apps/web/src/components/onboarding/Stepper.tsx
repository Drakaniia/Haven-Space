export interface StepperProps {
  /** Zero-based index of the current step. */
  currentStep: number;
  totalSteps: number;
  /** Optional short name per step ("Profile", "Property"…), shown as "Step 2 of 3 · Property". */
  labels?: string[];
}

/**
 * Step indicator: a sentence-case "Step 2 of 3 · Property" line plus one segment per step.
 * Segment labels show from `sm` up; on phones the sentence alone carries it.
 */
export function Stepper({ currentStep, totalSteps, labels }: StepperProps) {
  const label = labels?.[currentStep];

  return (
    <div className="w-full">
      <p className="kicker" aria-live="polite">
        Step {currentStep + 1} of {totalSteps}
        {label ? <span className="text-gray-ink"> · {label}</span> : null}
      </p>
      <ol className="mt-3 flex w-full gap-2" aria-label="Setup progress">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const done = index < currentStep;
          const current = index === currentStep;
          const name = labels?.[index] ?? `Step ${index + 1}`;
          return (
            <li
              key={index}
              className="min-w-0 flex-1"
              aria-current={current ? 'step' : undefined}
            >
              <span className="block h-1.5 overflow-hidden rounded-full bg-border">
                <span
                  className={`block h-full rounded-full bg-primary transition-[width] duration-300 ease-settle motion-reduce:transition-none ${
                    done || current ? 'w-full' : 'w-0'
                  }`}
                />
              </span>
              <span
                aria-hidden="true"
                className={`mt-2 hidden truncate text-xs sm:block ${
                  current ? 'font-semibold text-ink' : done ? 'text-gray-ink' : 'text-muted'
                }`}
              >
                {name}
              </span>
              <span className="sr-only">
                {name}
                {done ? ' (completed)' : current ? ' (current)' : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
