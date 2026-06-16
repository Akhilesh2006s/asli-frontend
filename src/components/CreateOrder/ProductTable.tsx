import { Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatInr, type SelectedProduct } from './types';
import { ProductIcon } from './product-icons';

type ProductTableProps = {
  products: SelectedProduct[];
  editableComp?: boolean;
  showDiscount?: boolean;
  showActions?: boolean;
  onCompChange?: (id: string, comp: number) => void;
  onEdit?: (product: SelectedProduct) => void;
  onDelete?: (product: SelectedProduct) => void;
};

function ProductMobileCard({
  product,
  editableComp,
  showDiscount,
  showActions,
  onCompChange,
  onEdit,
  onDelete,
}: {
  product: SelectedProduct;
  editableComp?: boolean;
  showDiscount?: boolean;
  showActions?: boolean;
  onCompChange?: (id: string, comp: number) => void;
  onEdit?: (product: SelectedProduct) => void;
  onDelete?: (product: SelectedProduct) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <ProductIcon product={product} className="h-10 w-10 shrink-0" iconClassName="h-4 w-4" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-gray-900 leading-snug">{product.name}</p>
          {!showDiscount && (
            <p className="mt-0.5 text-xs text-muted-foreground">{product.classLabel}</p>
          )}
        </div>
        <p className="shrink-0 text-sm font-semibold text-orange-600 tabular-nums">
          {formatInr(product.price * product.qty)}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-sm">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Qty</p>
          <p className="mt-0.5 font-medium tabular-nums">{product.qty}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Comp</p>
          {editableComp && onCompChange ? (
            <Input
              type="number"
              min={0}
              value={product.comp}
              onChange={(e) => onCompChange(product.id, Number(e.target.value) || 0)}
              className="mt-0.5 h-9 w-full max-w-[5.5rem] text-center text-sm"
            />
          ) : (
            <p className="mt-0.5 font-medium tabular-nums">{product.comp}</p>
          )}
        </div>
        {showDiscount && (
          <div className="col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Discount
            </p>
            <p className="mt-0.5 text-muted-foreground">—</p>
          </div>
        )}
      </div>

      {showActions && (
        <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 flex-1 gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
            onClick={() => onEdit?.(product)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 flex-1 gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => onDelete?.(product)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProductTable({
  products,
  editableComp = false,
  showDiscount = false,
  showActions = false,
  onCompChange,
  onEdit,
  onDelete,
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center">
        <p className="text-sm text-muted-foreground">No products added yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {products.map((p) => (
          <ProductMobileCard
            key={p.id}
            product={p}
            editableComp={editableComp}
            showDiscount={showDiscount}
            showActions={showActions}
            onCompChange={onCompChange}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead>Product</TableHead>
              {!showDiscount && <TableHead>Class</TableHead>}
              <TableHead className="text-center w-16">Qty</TableHead>
              <TableHead className="text-center w-20">Comp</TableHead>
              <TableHead className="text-right">Price</TableHead>
              {showDiscount && <TableHead className="text-right">Discount</TableHead>}
              {showActions && <TableHead className="text-right w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <ProductIcon product={p} className="h-9 w-9" iconClassName="h-4 w-4" />
                    <span className="font-medium text-sm">{p.name}</span>
                  </div>
                </TableCell>
                {!showDiscount && (
                  <TableCell className="text-sm text-muted-foreground">{p.classLabel}</TableCell>
                )}
                <TableCell className="text-center text-sm">{p.qty}</TableCell>
                <TableCell className="text-center">
                  {editableComp && onCompChange ? (
                    <Input
                      type="number"
                      min={0}
                      value={p.comp}
                      onChange={(e) => onCompChange(p.id, Number(e.target.value) || 0)}
                      className="mx-auto h-8 w-16 text-center text-sm"
                    />
                  ) : (
                    <span className="text-sm">{p.comp}</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">{formatInr(p.price * p.qty)}</TableCell>
                {showDiscount && (
                  <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
                )}
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-orange-200 text-orange-700 hover:bg-orange-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(p);
                        }}
                        title="Edit product"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(p);
                        }}
                        title="Delete product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
