import { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stepper } from './Stepper';

export interface WizardLayoutProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  children: ReactNode;
}

export function WizardLayout({ currentStep, totalSteps, title, children }: WizardLayoutProps) {
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto min-h-[400px] p-6 sm:p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="mb-8 w-full">
        <Stepper currentStep={currentStep} totalSteps={totalSteps} />
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
      </div>

      <div className="relative flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.1, 0.25, 1.0],
            }}
            className="flex-1 flex flex-col"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
