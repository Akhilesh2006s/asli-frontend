import { useState } from 'react';
import { Plus, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SelectedProduct } from './types';
import { useCreateOrder } from './CreateOrderContext';

const emptyForm = () => ({
  name: '',
  classLabel: '',
  price: '',
});

type FormErrors = {
  name?: string;
  price?: string;
};

export default function AddNewProductForm() {
  const { addProduct } = useCreateOrder();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = 'Product name is required';
    const price = Number(form.price);
    if (!form.price.trim() || Number.isNaN(price) || price <= 0) {
      next.price = 'Enter a valid price greater than 0';
    }
    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const product: SelectedProduct = {
      id: `custom-${crypto.randomUUID()}`,
      name: form.name.trim(),
      classLabel: form.classLabel.trim() || 'Custom',
      price: Number(form.price),
      qty: 1,
      comp: 0,
    };

    addProduct(product);
    setForm(emptyForm());
    setErrors({});
    setOpen(false);
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed border-orange-600/40 text-orange-600 hover:bg-orange-50"
        onClick={() => setOpen(true)}
      >
        <PackagePlus className="h-4 w-4 mr-2" />
        Add New Product
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-orange-600/30 bg-orange-50/40 p-4 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-orange-600">Add New Product</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={() => {
            setOpen(false);
            setForm(emptyForm());
            setErrors({});
          }}
        >
          Cancel
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="newProductName">
            Product Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="newProductName"
            placeholder="e.g. Alpha – Class IX"
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErrors((err) => ({ ...err, name: undefined }));
            }}
            className={cn(errors.name && 'border-destructive')}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="newProductClass">Class / Bundle</Label>
          <Input
            id="newProductClass"
            placeholder="e.g. 4 Subject Bundle"
            value={form.classLabel}
            onChange={(e) => setForm((f) => ({ ...f, classLabel: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newProductPrice">
            Price (₹) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="newProductPrice"
            type="number"
            min={1}
            placeholder="e.g. 3500"
            value={form.price}
            onChange={(e) => {
              setForm((f) => ({ ...f, price: e.target.value }));
              setErrors((err) => ({ ...err, price: undefined }));
            }}
            className={cn(errors.price && 'border-destructive')}
          />
          {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700">
        <Plus className="h-4 w-4 mr-2" />
        Add
      </Button>
    </form>
  );
}
