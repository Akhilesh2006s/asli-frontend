import { motion } from 'framer-motion';
import { Building2, Calendar, FileText, Tag, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ACADEMIC_YEAR } from './types';
import { useCreateOrder } from './CreateOrderContext';
import ProductTable from './ProductTable';
import FinancialSummaryCard from './FinancialSummaryCard';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between py-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-gray-900 break-words">{value || '—'}</span>
      </div>
  );
}

export default function Step4_Review() {
  const { state } = useCreateOrder();
  const { selectedSchool, selectedProducts, financial, computed } = state;

  if (!selectedSchool) return null;

  const formatDate = (iso: string) => {
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
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Review Order</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Verify all details before confirming or saving as draft.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-orange-600" />
          <h4 className="text-sm font-semibold text-gray-900">Order Info</h4>
        </div>
        <div className="divide-y divide-gray-100">
          <InfoRow label="School Name" value={selectedSchool.name} />
          <InfoRow label="Brand" value={selectedSchool.brand} />
          <InfoRow label="Order Type" value={financial.orderType} />
          <InfoRow label="Category" value={financial.category} />
          <InfoRow label="Academic Year" value={ACADEMIC_YEAR} />
          <InfoRow label="Payment Due Date" value={formatDate(financial.paymentDueDate)} />
          {financial.paymentTerms && (
            <InfoRow label="Payment Terms" value={financial.paymentTerms} />
          )}
        </div>
        {financial.notes && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-gray-700">{financial.notes}</p>
          </div>
        )}
        {financial.documentName && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{financial.documentName}</span>
            <Badge variant="outline" className="text-xs">Attached</Badge>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Tag className="h-4 w-4 text-orange-600" />
          <h4 className="text-sm font-semibold text-gray-900">Products</h4>
        </div>
        <ProductTable products={selectedProducts} showDiscount />
      </div>

      <FinancialSummaryCard
        computed={computed}
        specialDiscount={financial.specialDiscount}
        advanceReceived={financial.advanceReceived}
        editable={false}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col gap-1 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2.5 text-sm text-emerald-700 sm:flex-row sm:items-center sm:gap-2"
      >
        <Calendar className="h-4 w-4 shrink-0" />
        <span className="leading-snug">
          Order for <strong>{ACADEMIC_YEAR}</strong> · Balance due{' '}
          <strong>{formatDate(financial.paymentDueDate)}</strong>
        </span>
      </motion.div>
    </div>
  );
}

export function SuccessAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"
      >
        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 text-xl font-semibold text-gray-900"
      >
        Order Confirmed!
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-1 text-sm text-muted-foreground"
      >
        The order has been submitted successfully.
      </motion.p>
    </motion.div>
  );
}
