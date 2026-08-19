import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { formatReceiptDate } from '@/lib/individual-subscription';
import { CreditCard } from 'lucide-react';

export function TrialUpgradeBanner({
  daysLeft,
  trialEndsAt,
}: {
  daysLeft?: number | null;
  trialEndsAt?: string | null;
}) {
  const days = daysLeft ?? 0;
  const urgent = days <= 2;

  return (
    <div
      className={`mb-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${
        urgent ? 'border-orange-300 bg-orange-50' : 'border-sky-200 bg-sky-50'
      }`}
    >
      <div className="flex-1">
        <p className={`text-sm font-bold ${urgent ? 'text-orange-900' : 'text-sky-900'}`}>
          {urgent ? 'Trial ending soon — subscribe now' : 'Subscribe anytime during your trial'}
        </p>
        <p className={`mt-1 text-xs sm:text-sm ${urgent ? 'text-orange-800' : 'text-sky-800'}`}>
          {days > 0
            ? `${days} day${days === 1 ? '' : 's'} left${trialEndsAt ? ` · trial ends ${formatReceiptDate(trialEndsAt)}` : ''}. Pay now and get a receipt with your renewal date — no need to wait until expiry.`
            : 'Choose Boards, IIT, or both. Your receipt shows amount paid and valid-until date.'}
        </p>
      </div>
      <Link href="/auth/subscribe">
        <Button size="sm" className="w-full shrink-0 bg-sky-600 hover:bg-sky-700 sm:w-auto">
          <CreditCard className="mr-2 h-4 w-4" />
          View plans
        </Button>
      </Link>
    </div>
  );
}
