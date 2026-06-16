import { Building2, Calendar, FileText, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { SavedOrder } from '@/lib/create-order-api';
import { formatInr } from '@/components/CreateOrder/types';
import { orderBtnPrimary, orderCard, orderHeaderGradient } from '@/components/CreateOrder/create-order-theme';
import ProductTable from '@/components/CreateOrder/ProductTable';
import FinancialSummaryCard from '@/components/CreateOrder/FinancialSummaryCard';

type OrderDetailDialogProps = {
  order: SavedOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (order: SavedOrder) => void;
  onDelete?: (order: SavedOrder) => void;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN');
  } catch {
    return iso;
  }
}

function formatDueDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-900">{value || '—'}</p>
    </div>
  );
}

export default function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: OrderDetailDialogProps) {
  if (!order) return null;

  const { financial, computed } = order;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl lg:max-w-3xl">
        <div className={cn('shrink-0 px-4 py-4 text-white sm:px-6 sm:py-5', orderHeaderGradient)}>
          <DialogHeader className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-xl font-bold text-white">
                {order.orderNumber}
              </DialogTitle>
              <Badge
                className={cn(
                  'border-0 font-medium',
                  order.status === 'confirmed'
                    ? 'bg-emerald-500/90 text-white'
                    : 'bg-amber-400/90 text-amber-950',
                )}
              >
                {order.status === 'confirmed' ? 'Confirmed' : 'Draft'}
              </Badge>
            </div>
            <p className="text-sm text-orange-100 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {order.schoolName}
              <span className="text-orange-200">·</span>
              {order.brand}
            </p>
            <p className="text-xs text-orange-200/80">
              Created {formatDate(order.createdAt)}
            </p>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Order type" value={financial.orderType} />
            <InfoItem label="Category" value={financial.category} />
            <InfoItem label="Academic year" value={order.academicYear} />
            <InfoItem label="Payment due" value={formatDueDate(financial.paymentDueDate)} />
            {financial.paymentTerms && (
              <InfoItem label="Payment terms" value={financial.paymentTerms} />
            )}
            <InfoItem label="Grand total" value={formatInr(computed.grandTotal)} />
          </div>

          {financial.notes && (
            <div className={cn(orderCard, 'p-4 bg-slate-50 border-slate-100')}>
              <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700">{financial.notes}</p>
            </div>
          )}

          {financial.documentName && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FileText className="h-4 w-4 text-orange-600" />
              {financial.documentName}
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Products</h4>
            <ProductTable products={order.products} showDiscount />
          </div>

          <FinancialSummaryCard
            computed={computed}
            specialDiscount={financial.specialDiscount}
            advanceReceived={financial.advanceReceived}
            editable={false}
          />

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Balance due
            </span>
            <span
              className={cn(
                'text-lg font-bold tabular-nums',
                computed.balance > 0 ? 'text-amber-600' : 'text-emerald-600',
              )}
            >
              {formatInr(computed.balance)}
            </span>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-slate-50/80 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive sm:w-auto"
            onClick={() => {
              onDelete?.(order);
              onOpenChange(false);
            }}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
          <Button
            type="button"
            className={cn('w-full sm:w-auto', orderBtnPrimary)}
            onClick={() => {
              onEdit?.(order);
              onOpenChange(false);
            }}
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            Edit Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
