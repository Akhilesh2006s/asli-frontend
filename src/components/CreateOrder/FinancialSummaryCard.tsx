import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { orderSummaryCard, orderAccentText, orderAmountInput } from './create-order-theme';
import { formatInr, type ComputedFinancials } from './types';

type FinancialSummaryCardProps = {
  computed: ComputedFinancials;
  specialDiscount: number;
  advanceReceived: number;
  onSpecialDiscountChange?: (value: number) => void;
  onAdvanceChange?: (value: number) => void;
  editable?: boolean;
  className?: string;
};

function AmountInput({
  label,
  value,
  onChange,
  editable,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  editable?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <Label className="text-sm text-muted-foreground font-normal">{label}</Label>
      {editable && onChange ? (
        <div className="flex items-center gap-1 sm:shrink-0">
          <span className={cn('text-xs font-medium', orderAccentText)}>₹</span>
          <Input
            type="number"
            min={0}
            value={value || ''}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
            className={orderAmountInput}
          />
        </div>
      ) : (
        <span className="text-sm font-medium">{formatInr(value)}</span>
      )}
    </div>
  );
}

export default function FinancialSummaryCard({
  computed,
  specialDiscount,
  advanceReceived,
  onSpecialDiscountChange,
  onAdvanceChange,
  editable = false,
  className,
}: FinancialSummaryCardProps) {
  return (
    <div className={cn(orderSummaryCard, 'p-4 shadow-sm', className)}>
      <h4 className={cn('mb-3 text-sm font-semibold', orderAccentText)}>Financial Summary</h4>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-sm font-medium">{formatInr(computed.subtotal)}</span>
        </div>
        <AmountInput
          label="Special Discount"
          value={specialDiscount}
          onChange={onSpecialDiscountChange}
          editable={editable}
        />
        {!editable && specialDiscount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Discount</span>
            <span className="text-sm font-medium text-emerald-600">−{formatInr(specialDiscount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">GST (12%)</span>
          <span className="text-sm font-medium">{formatInr(computed.gst)}</span>
        </div>
        <Separator className="bg-orange-100" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Grand Total</span>
          <span className={cn('text-base font-bold', orderAccentText)}>{formatInr(computed.grandTotal)}</span>
        </div>
        <AmountInput
          label="Advance Received"
          value={advanceReceived}
          onChange={onAdvanceChange}
          editable={editable}
        />
        <Separator className="bg-orange-100" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Balance</span>
          <span
            className={cn(
              'text-base font-bold',
              computed.balance > 0 ? 'text-amber-600' : 'text-emerald-600',
            )}
          >
            {formatInr(computed.balance)}
          </span>
        </div>
      </div>
    </div>
  );
}
