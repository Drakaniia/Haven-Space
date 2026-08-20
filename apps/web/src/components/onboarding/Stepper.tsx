import { motion } from 'framer-motion';

export interface StepperProps {
  currentStep: number;
  totalSteps: number;
}

export function Stepper({ currentStep, totalSteps }: StepperProps) {
  return (
    <div className="flex items-center gap-2 w-full">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <div
            key={index}
            className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden relative"
            role="progressbar"
            aria-valuenow={isActive ? 100 : isCompleted ? 100 : 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.div
              className={`absolute inset-0 rounded-full ${
                isCompleted ? 'bg-blue-600' : isActive ? 'bg-blue-600' : 'bg-transparent'
              }`}
              initial={false}
              animate={{
                width: isCompleted || isActive ? '100%' : '0%',
                opacity: isCompleted ? 1 : isActive ? 1 : 0,
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          </div>
        );
      })}
    </div>
  );
}
