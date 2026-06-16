import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from './types';
import { useCreateOrder } from './CreateOrderContext';

type StepperHeaderProps = {
  variant?: 'default' | 'light';
};

export default function StepperHeader({ variant = 'default' }: StepperHeaderProps) {
  const { currentStep, goToStep, maxReachableStep } = useCreateOrder();
  const progress = ((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100;
  const isLight = variant === 'light';

  return (
    <nav aria-label="Order creation progress" className="w-full space-y-3">
      <div
        className={cn(
          'h-1.5 w-full overflow-hidden rounded-full',
          isLight ? 'bg-white/25' : 'bg-slate-100',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            isLight ? 'bg-white' : 'bg-gradient-to-r from-orange-500 to-amber-500',
          )}
          style={{ width: `${Math.max(progress, 8)}%` }}
        />
      </div>

      <ol className="grid grid-cols-4 gap-1 sm:gap-2">
        {WIZARD_STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isClickable = isCompleted && step.id <= maxReachableStep;

          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && goToStep(step.id)}
                className={cn(
                  'flex w-full flex-col items-center gap-1.5 rounded-lg px-1 py-2 transition-colors sm:flex-row sm:justify-center sm:gap-2',
                  isActive && (isLight ? 'bg-white/15' : 'bg-orange-50'),
                  isClickable && (isLight ? 'hover:bg-white/20' : 'hover:bg-orange-50/80'),
                  !isClickable && !isActive && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all',
                    isActive &&
                      (isLight
                        ? 'bg-white text-orange-600 ring-4 ring-white/25'
                        : 'bg-orange-600 text-white ring-4 ring-orange-100'),
                    isCompleted &&
                      !isActive &&
                      (isLight ? 'bg-white/95 text-orange-600' : 'bg-orange-600 text-white'),
                    !isActive &&
                      !isCompleted &&
                      (isLight
                        ? 'border-2 border-white/45 bg-transparent text-white/75'
                        : 'border-2 border-slate-200 bg-white text-slate-400'),
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    step.id
                  )}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-medium leading-tight text-center sm:text-xs',
                    isActive &&
                      (isLight ? 'text-white font-semibold' : 'text-orange-600 font-semibold'),
                    isCompleted && !isActive && (isLight ? 'text-white/90' : 'text-orange-600'),
                    !isActive &&
                      !isCompleted &&
                      (isLight ? 'text-white/65' : 'text-slate-400'),
                  )}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
