import { useState } from 'react';
import { Minus, Package, Pencil, Plus, Trash2, PenLine, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatInr, type ProductBundle, type SelectedProduct } from './types';
import { useCreateOrder } from './CreateOrderContext';
import { ProductIcon } from './product-icons';
import { orderBtnPrimary } from './create-order-theme';
import ProductInlineEditForm, {
  emptyProductFormValues,
  productToFormValues,
  validateProductForm,
  type ProductFormValues,
} from './ProductInlineEditForm';

function newCustomProductId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const emptyCustomForm = () => ({
  name: '',
  classLabel: '',
  price: '',
});

function bundleToProduct(bundle: ProductBundle): SelectedProduct {
  return {
    id: bundle.id,
    name: bundle.name,
    classLabel: bundle.classLabel,
    price: bundle.price,
    qty: 1,
    comp: 0,
    isCustom: bundle.id.startsWith('custom-'),
  };
}

export default function Step2_ProductSelect() {
  const { toast } = useToast();
  const {
    state,
    catalogBundles,
    catalogLoading,
    addProduct,
    updateProductQty,
    removeProduct,
    updateCatalogBundle,
    removeCatalogBundle,
    addCatalogBundle,
  } = useCreateOrder();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState(emptyCustomForm);
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [catalogEditForm, setCatalogEditForm] = useState<ProductFormValues>(emptyProductFormValues());
  const [catalogEditErrors, setCatalogEditErrors] = useState<Record<string, string>>({});
  const [catalogBusyId, setCatalogBusyId] = useState<string | null>(null);

  const runningTotal = state.selectedProducts.reduce(
    (sum, p) => sum + p.price * p.qty,
    0,
  );

  const handleAddCatalog = (bundle: ProductBundle) => {
    addProduct(bundleToProduct(bundle));
    toast({ title: 'Added to order', description: bundle.name });
  };

  const startCatalogEdit = (bundle: ProductBundle) => {
    setEditingCatalogId(bundle.id);
    setCatalogEditForm(productToFormValues(bundle));
    setCatalogEditErrors({});
  };

  const cancelCatalogEdit = () => {
    setEditingCatalogId(null);
    setCatalogEditForm(emptyProductFormValues());
    setCatalogEditErrors({});
  };

  const saveCatalogEdit = async (bundleId: string) => {
    const errors = validateProductForm(catalogEditForm, false);
    if (Object.keys(errors).length > 0) {
      setCatalogEditErrors(errors);
      return;
    }

    const name = catalogEditForm.name.trim();
    const classLabel = catalogEditForm.classLabel.trim();
    const price = Number(catalogEditForm.price);

    setCatalogBusyId(bundleId);
    const result = await updateCatalogBundle(bundleId, { name, classLabel, price });
    setCatalogBusyId(null);

    if (result.success) {
      cancelCatalogEdit();
      toast({ title: 'Product updated', description: `${name} saved in catalog.` });
    } else {
      toast({ title: 'Update failed', description: result.message, variant: 'destructive' });
    }
  };

  const handleDeleteCatalog = async (bundle: ProductBundle) => {
    setCatalogBusyId(bundle.id);
    const result = await removeCatalogBundle(bundle.id);
    setCatalogBusyId(null);

    if (result.success) {
      if (editingCatalogId === bundle.id) cancelCatalogEdit();
      toast({ title: 'Product deleted', description: `${bundle.name} removed from catalog.` });
    } else {
      toast({ title: 'Delete failed', description: result.message, variant: 'destructive' });
    }
  };

  const handleDeleteOrderProduct = (product: SelectedProduct) => {
    removeProduct(product.id);
    toast({ title: 'Product removed', description: `${product.name} removed from the order.` });
  };

  const handleAddCustom = async () => {
    const errors: Record<string, string> = {};
    const name = customForm.name.trim();
    const classLabel = customForm.classLabel.trim();
    const price = Number(customForm.price);

    if (!name) errors.name = 'Product name is required';
    if (!classLabel) errors.classLabel = 'Class / bundle label is required';
    if (!customForm.price.trim() || !Number.isFinite(price) || price <= 0) {
      errors.price = 'Enter a valid price greater than 0';
    }

    if (Object.keys(errors).length > 0) {
      setCustomErrors(errors);
      return;
    }

    const id = newCustomProductId();
    const bundle: ProductBundle = { id, name, classLabel, price };

    const result = await addCatalogBundle({ ...bundle, isCustom: true });
    if (!result.success) {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
      return;
    }

    addProduct({ ...bundleToProduct(bundle), isCustom: true });

    setCustomForm(emptyCustomForm());
    setCustomErrors({});
    setShowCustomForm(false);
    toast({ title: 'Product added', description: `${name} added to catalog and order.` });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Select Products</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add from the catalog or create a new product for this order.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {catalogLoading ? (
          <div className="sm:col-span-2 flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : catalogBundles.length === 0 ? (
          <div className="sm:col-span-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center text-sm text-muted-foreground">
            No products in catalog. Add a new product below.
          </div>
        ) : (
        catalogBundles.map((bundle) => {
          const isCustomCatalog = bundle.id.startsWith('custom-');
          const isEditing = editingCatalogId === bundle.id;

          return (
            <div
              key={bundle.id}
              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="p-4">
                <div className="flex gap-3">
                  <ProductIcon product={{ ...bundle, isCustom: isCustomCatalog }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{bundle.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {bundle.classLabel}
                      </Badge>
                      <span className="text-sm font-semibold text-orange-600">
                        {formatInr(bundle.price)}
                      </span>
                    </div>
                  </div>
                </div>

                {!isEditing && (
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
                    <Button
                      type="button"
                      size="sm"
                      className={cn(orderBtnPrimary, 'h-9 px-2 text-xs sm:text-sm')}
                      onClick={() => handleAddCatalog(bundle)}
                    >
                      <Plus className="h-4 w-4 sm:mr-1" />
                      <span className="hidden min-[380px]:inline">Add</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1 border-orange-200 px-2 text-xs text-orange-700 hover:bg-orange-50 sm:text-sm"
                      onClick={() => startCatalogEdit(bundle)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden min-[380px]:inline">Edit</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1 border-red-200 px-2 text-xs text-red-600 hover:bg-red-50 sm:text-sm"
                      disabled={catalogBusyId === bundle.id}
                      onClick={() => void handleDeleteCatalog(bundle)}
                    >
                      {catalogBusyId === bundle.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden min-[380px]:inline">Delete</span>
                    </Button>
                  </div>
                )}
              </div>

              {isEditing && (
                <ProductInlineEditForm
                  values={catalogEditForm}
                  errors={catalogEditErrors}
                  onChange={(patch) => setCatalogEditForm((f) => ({ ...f, ...patch }))}
                  onClearError={(key) =>
                    setCatalogEditErrors((err) => ({ ...err, [key]: '' }))
                  }
                  onCancel={cancelCatalogEdit}
                  onSave={() => void saveCatalogEdit(bundle.id)}
                />
              )}
            </div>
          );
        })
        )}
      </div>

      <div className="rounded-xl border border-dashed border-orange-600/30 bg-orange-50/20">
        {!showCustomForm ? (
          <button
            type="button"
            onClick={() => setShowCustomForm(true)}
            className="flex w-full items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-orange-600 hover:bg-orange-50/60 transition-colors rounded-xl"
          >
            <PenLine className="h-4 w-4" />
            Add New Product
          </button>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">New Product</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={() => {
                  setShowCustomForm(false);
                  setCustomForm(emptyCustomForm());
                  setCustomErrors({});
                }}
              >
                Cancel
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customProductName">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customProductName"
                  placeholder="e.g. Alpha – Class IX"
                  value={customForm.name}
                  onChange={(e) => {
                    setCustomForm((f) => ({ ...f, name: e.target.value }));
                    setCustomErrors((err) => ({ ...err, name: '' }));
                  }}
                  className={cn(customErrors.name && 'border-destructive')}
                />
                {customErrors.name && (
                  <p className="text-xs text-destructive">{customErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customClassLabel">
                  Class / Bundle <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customClassLabel"
                  placeholder="e.g. 4 Subject Bundle"
                  value={customForm.classLabel}
                  onChange={(e) => {
                    setCustomForm((f) => ({ ...f, classLabel: e.target.value }));
                    setCustomErrors((err) => ({ ...err, classLabel: '' }));
                  }}
                  className={cn(customErrors.classLabel && 'border-destructive')}
                />
                {customErrors.classLabel && (
                  <p className="text-xs text-destructive">{customErrors.classLabel}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customPrice">
                  Price (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customPrice"
                  type="number"
                  min={1}
                  placeholder="e.g. 3500"
                  value={customForm.price}
                  onChange={(e) => {
                    setCustomForm((f) => ({ ...f, price: e.target.value }));
                    setCustomErrors((err) => ({ ...err, price: '' }));
                  }}
                  className={cn(customErrors.price && 'border-destructive')}
                />
                {customErrors.price && (
                  <p className="text-xs text-destructive">{customErrors.price}</p>
                )}
              </div>
            </div>

            <Button type="button" className={cn('w-full sm:w-auto', orderBtnPrimary)} onClick={handleAddCustom}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Added Products</h4>

        {state.selectedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10">
            <Package className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">No products added yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add from the catalog or create a new product above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {state.selectedProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-orange-200 bg-orange-50/30 px-3 py-3 sm:px-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <ProductIcon product={product} className="h-10 w-10 shrink-0" iconClassName="h-4 w-4" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm text-gray-900 leading-snug">{product.name}</p>
                        {product.isCustom && (
                          <Badge variant="outline" className="text-[10px] border-orange-200 text-orange-600">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {product.classLabel} · {formatInr(product.price)} each
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-orange-600 tabular-nums sm:hidden">
                      {formatInr(product.price * product.qty)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-orange-100 pt-3 sm:border-0 sm:pt-0">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-orange-200"
                        onClick={() => {
                          if (product.qty <= 1) handleDeleteOrderProduct(product);
                          else updateProductQty(product.id, product.qty - 1);
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{product.qty}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-orange-200"
                        onClick={() => updateProductQty(product.id, product.qty + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="hidden text-sm font-semibold text-orange-600 tabular-nums sm:block">
                      {formatInr(product.price * product.qty)}
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1 border-red-200 text-red-600 hover:bg-red-50 sm:hidden"
                      onClick={() => handleDeleteOrderProduct(product)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <div
              className={cn(
                'flex flex-col gap-1 rounded-xl border border-orange-100 sm:flex-row sm:items-center sm:justify-between',
                'bg-orange-50/80 px-4 py-3 mt-3',
              )}
            >
              <span className="text-sm text-muted-foreground">
                {state.selectedProducts.length} product
                {state.selectedProducts.length !== 1 ? 's' : ''} ·{' '}
                {state.selectedProducts.reduce((s, p) => s + p.qty, 0)} units
              </span>
              <span className="text-lg font-bold text-orange-600 tabular-nums">
                {formatInr(runningTotal)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
