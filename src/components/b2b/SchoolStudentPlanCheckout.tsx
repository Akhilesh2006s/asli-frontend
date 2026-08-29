import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api-config';
import { authJsonHeaders } from '@/lib/auth-utils';

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function SchoolStudentPlanCheckout({ user, onPaid }: { user: any; onPaid?: () => void }) {
  const [config, setConfig] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/billing/student-school-plan`, { headers: authJsonHeaders(), credentials: 'include' })
      .then((r) => r.json()).then(setConfig).catch(() => setError('Could not load your school payment plan.'));
  }, []);

  const pay = async () => {
    setBusy(true); setError('');
    try {
      if (!(await loadRazorpay())) throw new Error('Could not load Razorpay.');
      const orderRes = await fetch(`${API_BASE_URL}/api/billing/individual/order`, {
        method: 'POST', headers: authJsonHeaders(), credentials: 'include',
        body: JSON.stringify({ packageType: 'school', period: 'year' }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.message || 'Could not start payment.');
      new (window as any).Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency || 'INR', order_id: order.orderId,
        name: 'AsliLearn.ai', description: 'Student yearly subscription', prefill: order.prefill,
        handler: async (response: any) => {
          const verifyRes = await fetch(`${API_BASE_URL}/api/billing/individual/verify`, {
            method: 'POST', headers: authJsonHeaders(), credentials: 'include',
            body: JSON.stringify({ ...response, packageType: 'school', period: 'year' }),
          });
          const verified = await verifyRes.json();
          if (!verifyRes.ok) return setError(verified.message || 'Payment verification failed.');
          onPaid?.();
        },
        modal: { ondismiss: () => setBusy(false) }, theme: { color: '#4f46e5' },
      }).open();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start payment.'); }
    finally { setBusy(false); }
  };

  if (!config) return <p className="text-sm text-slate-600">Loading yearly plan…</p>;
  const amount = Number(config.plan?.amountInr || user?.schoolStudentAnnualPriceInr || 0);
  return <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
    <div><p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">School student plan</p>
      <p className="mt-1 text-3xl font-bold text-slate-950">₹{amount.toLocaleString('en-IN')} <span className="text-sm font-medium text-slate-600">/ year</span></p>
      <p className="mt-2 text-sm text-slate-600">One yearly subscription for your student account. Teachers and school administrators are not billed here.</p></div>
    {config.onlineEnabled ? <Button className="w-full" disabled={busy || amount <= 0} onClick={pay}>{busy ? 'Opening payment…' : 'Pay securely with Razorpay'}</Button> :
      <div className="rounded-lg bg-white p-3 text-sm text-slate-700">Your school collects this payment offline. Please contact your school administrator or AsliLearn support to activate access.</div>}
    {config.paymentMode === 'both' && <p className="text-xs text-slate-600">You may pay online here or pay your school offline.</p>}
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>;
}
