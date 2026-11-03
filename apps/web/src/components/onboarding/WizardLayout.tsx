import { type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Stepper } from './Stepper';

export interface WizardLayoutProps {
  /** Zero-based index of the current step. */
  currentStep: number;
  totalSteps: number;
  title: string;
  /** Short step names, used by the indicator ("Step 2 of 3 · Property"). */
  steps?: string[];
  /** One line under the title saying what this step is for. */
  description?: ReactNode;
  /** Banner above the step's form (e.g. a failed save). */
  alert?: ReactNode;
  children: ReactNode;
}

/**
 * Onboarding wizard frame: indicator and title on the canvas, the step's form on one card.
 *
 * Nothing here may set `overflow`: each step's `WizardActions` bar is `sticky` to the bottom of
 * the viewport on phones, and an overflow ancestor would silently disable that.
 */
export function WizardLayout({
  currentStep,
  totalSteps,
  title,
  steps,
  description,
  alert,
  children,
}: WizardLayoutProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <header className="mb-6 sm:mb-8">
        <Stepper currentStep={currentStep} totalSteps={totalSteps} labels={steps} />
        <h1 className="mt-6 font-display text-[1.75rem] font-medium leading-[1.1] tracking-[-0.02em] text-ink sm:text-[2.125rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-gray-ink">
            {description}
          </p>
        ) : null}
      </header>

      {alert ? <div className="mb-4">{alert}</div> : null}

      <div className="rounded-2xl border border-border/80 bg-surface px-5 pt-6 shadow-card sm:px-8 sm:pb-8 sm:pt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
