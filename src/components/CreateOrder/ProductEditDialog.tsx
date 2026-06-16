import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SelectedProduct } from './types';
import { orderBtnPrimary } from './create-order-theme';

type ProductEditDialogProps = {
  product: SelectedProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: string,
    data: { name: string; classLabel: string; price: number; qty?: number },
  ) => void;
  showQty?: boolean;
  title?: string;
};

export default function ProductEditDialog({
  product,
  open,
  onOpenChange,
  onSave,
  showQty = true,
  title = 'Edit product',
}: ProductEditDialogProps) {
  const [name, setName] = useState('');
  const [classLabel, setClassLabel] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!product || !open) return;
    setName(product.name);
    setClassLabel(product.classLabel);
    setPrice(String(product.price));
    setQty(String(product.qty));
    setErrors({});
  }, [product, open]);

  const handleSave = () => {
    if (!product) return;

    const nextErrors: Record<string, string> = {};
    const trimmedName = name.trim();
    const trimmedClass = classLabel.trim();
    const priceNum = Number(price);
    const qtyNum = Number(qty);

    if (!trimmedName) nextErrors.name = 'Product name is required';
    if (!trimmedClass) nextErrors.classLabel = 'Class / bundle is required';
    if (!price.trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
      nextErrors.price = 'Enter a valid price';
    }
    if (showQty && (!qty.trim() || !Number.isFinite(qtyNum) || qtyNum < 1)) {
      nextErrors.qty = 'Quantity must be at least 1';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave(product.id, {
      name: trimmedName,
      classLabel: trimmedClass,
      price: priceNum,
      ...(showQty ? { qty: qtyNum } : {}),
    });
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[100] w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border bg-background p-6 shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
          onPointerDownOutside={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-product-name">Product name</Label>
              <Input
                id="edit-product-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
                className={cn(errors.name && 'border-destructive')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-product-class">Class / bundle</Label>
              <Input
                id="edit-product-class"
                value={classLabel}
                onChange={(e) => {
                  setClassLabel(e.target.value);
                  setErrors((prev) => ({ ...prev, classLabel: '' }));
                }}
                className={cn(errors.classLabel && 'border-destructive')}
              />
              {errors.classLabel && (
                <p className="text-xs text-destructive">{errors.classLabel}</p>
              )}
            </div>
            <div className={cn('grid gap-3', showQty ? 'grid-cols-2' : 'grid-cols-1')}>
              <div className="space-y-2">
                <Label htmlFor="edit-product-price">Price (₹)</Label>
                <Input
                  id="edit-product-price"
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setErrors((prev) => ({ ...prev, price: '' }));
                  }}
                  className={cn(errors.price && 'border-destructive')}
                />
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>
              {showQty && (
                <div className="space-y-2">
                  <Label htmlFor="edit-product-qty">Quantity</Label>
                  <Input
                    id="edit-product-qty"
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => {
                      setQty(e.target.value);
                      setErrors((prev) => ({ ...prev, qty: '' }));
                    }}
                    className={cn(errors.qty && 'border-destructive')}
                  />
                  {errors.qty && <p className="text-xs text-destructive">{errors.qty}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" className={orderBtnPrimary} onClick={handleSave}>
              Save changes
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
