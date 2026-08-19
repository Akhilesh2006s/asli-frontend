import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatInr, formatReceiptDate, type SubscriptionReceipt } from '@/lib/individual-subscription';
import { Receipt } from 'lucide-react';

export function IndividualSubscriptionReceiptCard({
  receipt,
  className = '',
}: {
  receipt: SubscriptionReceipt;
  className?: string;
}) {
  const amount = receipt.amountInr ?? receipt.lastPaymentAmountInr;
  const paidOn = receipt.paidOn || receipt.lastPaidAt;
  const validUntil = receipt.validUntil || receipt.subscriptionExpiresAt;
  const recentPayments = Array.isArray(receipt.recentPayments) ? receipt.recentPayments.slice(0, 5) : [];

  return (
    <Card className={`border-sky-100 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4 text-sky-600" />
          Subscription receipt
          {receipt.statusLabel ? (
            <Badge variant="outline" className="ml-auto border-emerald-200 bg-emerald-50 text-emerald-800">
              {receipt.statusLabel}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <Row label="Plan" value={receipt.planLabel || receipt.paidPackageLabel || '—'} />
        <Row label="Billing" value={receipt.periodLabel || receipt.subscriptionPeriodLabel || '—'} />
        <Row label="Amount paid" value={formatInr(amount)} strong />
        <Row label="Paid on" value={formatReceiptDate(paidOn)} />
        <Row label="Valid until" value={formatReceiptDate(validUntil)} strong />
        {receipt.paymentReference ? (
          <Row label="Payment ID" value={receipt.paymentReference} mono />
        ) : null}
        {recentPayments.length > 0 ? (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recent payments
            </div>
            <div className="grid gap-2">
              {recentPayments.map((payment, index) => (
                <div
                  key={`${payment.paymentReference || payment.razorpayOrderId || 'payment'}-${index}`}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-800">
                      {payment.packageLabel || receipt.planLabel || 'Plan'}
                    </span>
                    <span className="font-bold text-sky-800">{formatInr(payment.amountInr)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>
                      {payment.periodLabel || 'Subscription'} · {formatReceiptDate(payment.paidAt)}
                    </span>
                    <span>Renews till {formatReceiptDate(payment.validUntil)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span
        className={`text-right ${strong ? 'font-bold text-sky-800' : 'font-medium text-slate-800'} ${mono ? 'max-w-[55%] truncate font-mono text-xs' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
