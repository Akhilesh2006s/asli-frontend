import { useRef, useState } from 'react';
import { Upload, FileText, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { uploadOrderDocument } from '@/lib/create-order-api';
import { ORDER_TYPE_OPTIONS, CATEGORY_OPTIONS, validateStep3Financial } from './types';
import { useCreateOrder } from './CreateOrderContext';
import ProductTable from './ProductTable';
import FinancialSummaryCard from './FinancialSummaryCard';

/** Extensions only — Windows shows matching PDF/images instead of a vague "Custom Files" filter. */
const ORDER_DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';
const ORDER_DOCUMENT_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ORDER_DOCUMENT_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

function isAllowedOrderDocument(file: File) {
  if (ORDER_DOCUMENT_MIME.includes(file.type)) return true;
  const dot = file.name.lastIndexOf('.');
  if (dot === -1) return false;
  return ORDER_DOCUMENT_EXT.includes(file.name.slice(dot).toLowerCase());
}

export default function Step3_Financial() {
  const {
    state,
    updateFinancial,
    updateProductComp,
    showStep3Errors,
  } = useCreateOrder();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const serverErrors = showStep3Errors ? validateStep3Financial(state) : {};

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedOrderDocument(file)) {
      toast({
        title: 'Invalid file',
        description: 'Upload a PDF or image (JPEG, PNG, WebP).',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { url, name } = await uploadOrderDocument(file);
      updateFinancial({
        document: file,
        documentPreviewUrl: url,
        documentName: name,
      });
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload document.', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openFilePicker = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  const clearDocument = () => {
    if (state.financial.documentPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.financial.documentPreviewUrl);
    }
    updateFinancial({ document: null, documentPreviewUrl: null, documentName: null });
  };

  return (
    <div className="flex flex-col gap-5 pb-2">
      <div className="pr-8">
        <h3 className="text-lg font-semibold text-gray-900">Financial Details</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure payment terms, discounts, and upload the source document.
        </p>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700">Product Summary</h4>
        <ProductTable
          products={state.selectedProducts}
          editableComp
          onCompChange={updateProductComp}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="orderType">
            Order Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={state.financial.orderType}
            onValueChange={(v) => {
              updateFinancial({ orderType: v as typeof state.financial.orderType });
            }}
          >
            <SelectTrigger id="orderType" className={cn(serverErrors.orderType && 'border-destructive')}>
              <SelectValue placeholder="Select order type" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {serverErrors.orderType && (
            <p className="text-xs text-destructive">{serverErrors.orderType}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={state.financial.category}
            onValueChange={(v) => {
              updateFinancial({ category: v as typeof state.financial.category });
            }}
          >
            <SelectTrigger id="category" className={cn(serverErrors.category && 'border-destructive')}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {serverErrors.category && <p className="text-xs text-destructive">{serverErrors.category}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentTerms">Payment Terms</Label>
          <Input
            id="paymentTerms"
            placeholder="e.g. Net 30"
            value={state.financial.paymentTerms}
            onChange={(e) => updateFinancial({ paymentTerms: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentDueDate">
            Payment Due Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="paymentDueDate"
            type="date"
            value={state.financial.paymentDueDate}
            onChange={(e) => {
              updateFinancial({ paymentDueDate: e.target.value });
            }}
            className={cn(serverErrors.paymentDueDate && 'border-destructive')}
          />
          {serverErrors.paymentDueDate && (
            <p className="text-xs text-destructive">{serverErrors.paymentDueDate}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes for this order…"
          rows={3}
          value={state.financial.notes}
          onChange={(e) => updateFinancial({ notes: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Source Document Upload</Label>
        <p className="text-xs text-muted-foreground">
          Physical Order Form, WhatsApp Screenshot, or Online Order Copy
        </p>
        {!state.financial.documentPreviewUrl ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={ORDER_DOCUMENT_ACCEPT}
              onChange={handleFileChange}
              disabled={uploading}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openFilePicker();
                }
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-8 transition-colors hover:border-orange-600/40 hover:bg-orange-50/30',
                uploading && 'pointer-events-none opacity-60',
              )}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-300 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Click to browse files</span>
                  <span className="text-xs text-muted-foreground mt-1">PDF, JPEG, PNG, or WebP</span>
                  <span className="text-xs text-muted-foreground mt-2 max-w-xs text-center">
                    Open a folder that contains your file (e.g. Downloads or Desktop).
                  </span>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
            {state.financial.document?.type.startsWith('image/') ? (
              <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg border sm:h-14 sm:w-14">
                <img
                  src={state.financial.documentPreviewUrl}
                  alt="Document preview"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                {state.financial.document?.type === 'application/pdf' ? (
                  <FileText className="h-7 w-7 text-orange-600" />
                ) : (
                  <ImageIcon className="h-7 w-7 text-orange-600" />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium break-all">{state.financial.documentName}</p>
              <p className="text-xs text-muted-foreground">Uploaded successfully</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="self-end sm:self-auto"
              onClick={clearDocument}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <FinancialSummaryCard
        computed={state.computed}
        specialDiscount={state.financial.specialDiscount}
        advanceReceived={state.financial.advanceReceived}
        onSpecialDiscountChange={(v) => updateFinancial({ specialDiscount: v })}
        onAdvanceChange={(v) => updateFinancial({ advanceReceived: v })}
        editable
      />

    </div>
  );
}
