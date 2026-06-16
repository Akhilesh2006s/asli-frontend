import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { orderBtnPrimary } from './create-order-theme';

export type ProductFormValues = {
  name: string;
  classLabel: string;
  price: string;
  qty: string;
};

type ProductInlineEditFormProps = {
  values: ProductFormValues;
  errors: Record<string, string>;
  showQty?: boolean;
  onChange: (patch: Partial<ProductFormValues>) => void;
  onClearError: (key: string) => void;
  onCancel: () => void;
  onSave: () => void;
  className?: string;
};

export function emptyProductFormValues(): ProductFormValues {
  return { name: '', classLabel: '', price: '', qty: '1' };
}

export function productToFormValues(product: {
  name: string;
  classLabel: string;
  price: number;
  qty?: number;
}): ProductFormValues {
  return {
    name: product.name,
    classLabel: product.classLabel,
    price: String(product.price),
    qty: String(product.qty ?? 1),
  };
}

export function validateProductForm(
  values: ProductFormValues,
  showQty: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = values.name.trim();
  const classLabel = values.classLabel.trim();
  const price = Number(values.price);
  const qty = Number(values.qty);

  if (!name) errors.name = 'Product name is required';
  if (!classLabel) errors.classLabel = 'Class / bundle is required';
  if (!values.price.trim() || !Number.isFinite(price) || price <= 0) {
    errors.price = 'Enter a valid price';
  }
  if (showQty && (!values.qty.trim() || !Number.isFinite(qty) || qty < 1)) {
    errors.qty = 'Quantity must be at least 1';
  }

  return errors;
}

export default function ProductInlineEditForm({
  values,
  errors,
  showQty = false,
  onChange,
  onClearError,
  onCancel,
  onSave,
  className,
}: ProductInlineEditFormProps) {
  return (
    <div className={cn('border-t border-orange-100 bg-white px-4 py-4 space-y-4', className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="inline-product-name">Product name</Label>
          <Input
            id="inline-product-name"
            value={values.name}
            onChange={(e) => {
              onChange({ name: e.target.value });
              onClearError('name');
            }}
            className={cn(errors.name && 'border-destructive')}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="inline-product-class">Class / bundle</Label>
          <Input
            id="inline-product-class"
            value={values.classLabel}
            onChange={(e) => {
              onChange({ classLabel: e.target.value });
              onClearError('classLabel');
            }}
            className={cn(errors.classLabel && 'border-destructive')}
          />
          {errors.classLabel && (
            <p className="text-xs text-destructive">{errors.classLabel}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="inline-product-price">Price (₹)</Label>
          <Input
            id="inline-product-price"
            type="number"
            min={1}
            value={values.price}
            onChange={(e) => {
              onChange({ price: e.target.value });
              onClearError('price');
            }}
            className={cn(errors.price && 'border-destructive')}
          />
          {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
        </div>
        {showQty && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="inline-product-qty">Quantity</Label>
            <Input
              id="inline-product-qty"
              type="number"
              min={1}
              value={values.qty}
              onChange={(e) => {
                onChange({ qty: e.target.value });
                onClearError('qty');
              }}
              className={cn('max-w-[140px]', errors.qty && 'border-destructive')}
            />
            {errors.qty && <p className="text-xs text-destructive">{errors.qty}</p>}
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" className={cn('w-full sm:w-auto', orderBtnPrimary)} onClick={onSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
