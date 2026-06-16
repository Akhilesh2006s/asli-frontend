import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { confirmOrder, saveOrderDraft } from '@/lib/create-order-api';
import type { SavedOrder } from '@/lib/create-order-api';
import { CreateOrderProvider, useCreateOrder } from './CreateOrderContext';
import Step1_SchoolSelect from './Step1_SchoolSelect';
import Step2_ProductSelect from './Step2_ProductSelect';
import Step3_Financial from './Step3_Financial';
import Step4_Review, { SuccessAnimation } from './Step4_Review';
import { validateStep3Financial } from './types';
import { orderBtnPrimary } from './create-order-theme';

type CreateOrderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderSaved?: () => void;
  editOrder?: SavedOrder | null;
};

const stepVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

function CreateOrderWizard({
  onClose,
  onOrderSaved,
}: {
  onClose: () => void;
  onOrderSaved?: () => void;
}) {
  const { toast } = useToast();
  const {
    state,
    currentStep,
    setCurrentStep,
    resetOrder,
    triggerStep3Validation,
    editingOrderId,
    isEditMode,
  } = useCreateOrder();

  const [loading, setLoading] = useState<'draft' | 'confirm' | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const canGoNext = useCallback(() => {
    if (currentStep === 1) return Boolean(state.selectedSchool);
    if (currentStep === 2) return state.selectedProducts.length > 0;
    if (currentStep === 3) return Object.keys(validateStep3Financial(state)).length === 0;
    return true;
  }, [currentStep, state]);

  const handleNext = () => {
    if (currentStep === 3) {
      const errs = validateStep3Financial(state);
      if (Object.keys(errs).length > 0) {
        triggerStep3Validation();
        toast({
          title: 'Validation error',
          description: 'Please fill in all required financial fields.',
          variant: 'destructive',
        });
        return;
      }
    }
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handleSaveDraft = async () => {
    setLoading('draft');
    const result = await saveOrderDraft(state, editingOrderId ?? undefined);
    setLoading(null);
    if (result.success) {
      onOrderSaved?.();
      toast({ title: isEditMode ? 'Draft updated' : 'Draft saved', description: result.message });
      if (isEditMode) {
        resetOrder();
        onClose();
      }
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  const handleConfirm = async () => {
    setLoading('confirm');
    const result = await confirmOrder(state, editingOrderId ?? undefined);
    setLoading(null);
    if (result.success) {
      onOrderSaved?.();
      setShowSuccess(true);
      toast({
        title: isEditMode ? 'Order updated' : 'Order confirmed',
        description: result.message,
      });
      setTimeout(() => {
        resetOrder();
        setShowSuccess(false);
        onClose();
      }, 2200);
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  const steps = [
    <Step1_SchoolSelect key="1" />,
    <Step2_ProductSelect key="2" />,
    <Step3_Financial key="3" />,
    <Step4_Review key="4" />,
  ];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/50">
      <DialogPrimitive.Close asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 z-10 shrink-0 sm:right-4 sm:top-4"
        >
          <X className="h-5 w-5" />
        </Button>
      </DialogPrimitive.Close>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 pb-6 sm:px-6">
        <div className="w-full">
          {showSuccess ? (
            <SuccessAnimation />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative z-0 min-h-0"
              >
                {steps[currentStep - 1]}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {!showSuccess && (
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onClose}>
                Cancel
              </Button>
            )}

            <div
              className={cn(
                'flex w-full gap-2 sm:w-auto',
                currentStep === 4 ? 'flex-col sm:flex-row' : '',
              )}
            >
              {currentStep === 4 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-orange-200 text-orange-700 hover:bg-orange-50 sm:w-auto"
                    onClick={handleSaveDraft}
                    disabled={loading !== null}
                  >
                    {loading === 'draft' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    className={cn('w-full sm:w-auto', orderBtnPrimary)}
                    onClick={handleConfirm}
                    disabled={loading !== null}
                  >
                    {loading === 'confirm' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? 'Update Order' : 'Confirm Order'}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  className={cn('w-full sm:w-auto', orderBtnPrimary)}
                  onClick={handleNext}
                  disabled={!canGoNext()}
                >
                  {currentStep === 3 ? 'Review' : 'Continue'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateOrderModal({
  open,
  onOpenChange,
  onOrderSaved,
  editOrder,
}: CreateOrderModalProps) {
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const providerKey = editOrder?.id ? `edit-${editOrder.id}` : 'create';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl',
            'inset-0 h-[100dvh] max-h-[100dvh] w-full rounded-none border-0',
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[94vh] sm:w-[calc(100%-3rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98]',
          )}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <CreateOrderProvider key={providerKey} initialOrder={editOrder}>
            <CreateOrderWizard onClose={handleClose} onOrderSaved={onOrderSaved} />
          </CreateOrderProvider>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
