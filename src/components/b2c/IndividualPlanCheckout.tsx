import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api-config';
import { getAuthToken } from '@/lib/auth-utils';
import { INDIVIDUAL_CLASS_OPTIONS } from '@/lib/individual-signup';
import {
  B2C_BOARD_PRICE,
  B2C_IIT_PRICE,
  B2C_STUDENT_BOTH_PRICE,
  B2C_TEACHER_IIT_PRICE,
  B2C_TEACHER_BOTH_PRICE,
  CLASS_TRACK_MATRIX,
  IIT_TRACK_SPECS,
  classNumbersFromLabel,
  recommendedTrackForClass,
  tracksForClass,
  type IitTrackCode,
} from '@/lib/iit-track-specs';

export type PlanPackage = 'board' | 'iit' | 'both';

type PlanOption = {
  amountInr: number;
  listPriceInr?: number;
  discountPercent?: number;
  period: 'month' | 'year';
  label: string;
};

type PackOptions = { month: PlanOption | null; year: PlanOption | null };

type Catalog = {
  student: Record<PlanPackage, PackOptions>;
  teacher: Record<PlanPackage, PackOptions>;
};

function packFromLegacy(plan: PlanOption): PackOptions {
  return plan.period === 'year'
    ? { month: null, year: plan }
    : { month: plan, year: null };
}

const FALLBACK_PLANS: Catalog = {
  student: {
    board: packFromLegacy({ amountInr: B2C_BOARD_PRICE, period: 'month', label: 'Boards' }),
    iit: packFromLegacy({ amountInr: B2C_IIT_PRICE, period: 'month', label: 'IIT Foundation' }),
    both: packFromLegacy({ amountInr: B2C_STUDENT_BOTH_PRICE, period: 'month', label: 'Boards + IIT' }),
  },
  teacher: {
    board: packFromLegacy({ amountInr: B2C_BOARD_PRICE, period: 'month', label: 'Boards' }),
    iit: packFromLegacy({ amountInr: B2C_TEACHER_IIT_PRICE, period: 'year', label: 'IIT Foundation' }),
    both: packFromLegacy({ amountInr: B2C_TEACHER_BOTH_PRICE, period: 'year', label: 'Boards + IIT' }),
  },
};

function asPack(raw: unknown): PackOptions {
  const v = raw as PackOptions & PlanOption;
  if (v && (v.month || v.year)) {
    return { month: v.month || null, year: v.year || null };
  }
  if (v && typeof v.amountInr === 'number') {
    return packFromLegacy(v);
  }
  return { month: null, year: null };
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function periodLabel(period: string) {
  return period === 'year' ? '/ year' : '/ month';
}

export function IndividualPlanCheckout({
  initialClass = '',
  initialTrack = '',
  initialPackage = 'board',
  userId,
  role = 'student',
  userName,
  userEmail,
  variant = 'page',
}: {
  initialClass?: string;
  initialTrack?: string;
  initialPackage?: PlanPackage;
  userId?: string | null;
  role?: string;
  userName?: string;
  userEmail?: string;
  variant?: 'page' | 'card';
}) {
  const [, setLocation] = useLocation();
  const billingRole = String(role || '').toLowerCase() === 'teacher' ? 'teacher' : 'student';
  const [classLabel, setClassLabel] = useState(initialClass || 'Class 6');
  const [packageType, setPackageType] = useState<PlanPackage>(initialPackage === 'iit' ? 'iit' : initialPackage === 'both' ? 'both' : 'board');
  const classNumber = classNumbersFromLabel(classLabel) || 6;
  const allowedTracks = tracksForClass(classNumber);
  const defaultTrack = (allowedTracks.some((t) => t.code === initialTrack)
    ? initialTrack
    : recommendedTrackForClass(classNumber)) as IitTrackCode;
  const [track, setTrack] = useState<IitTrackCode>(defaultTrack);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<Catalog>(FALLBACK_PLANS);
  const [payConfigured, setPayConfigured] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>(
    billingRole === 'teacher' && (packageType === 'iit' || packageType === 'both') ? 'year' : 'month',
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/billing/config`);
        const json = await res.json();
        if (cancelled || !json?.success) return;
        if (json.plans) setPlans(json.plans as Catalog);
        setPayConfigured(Boolean(json.configured && json.keyId));
      } catch {
        if (!cancelled) setPayConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTrack = IIT_TRACK_SPECS.find((t) => t.code === track);
  const matrix = CLASS_TRACK_MATRIX.find((row) => row.classNumber === classNumber);
  const needsIitTrack = packageType === 'iit' || packageType === 'both';
  const pack = asPack(plans[billingRole][packageType]);
  const catalogPlan = pack[billingPeriod] || pack.year || pack.month;
  const price = catalogPlan?.amountInr || 0;
  const listPrice = catalogPlan?.listPriceInr || price;
  const discountPercent = catalogPlan?.discountPercent || 0;
  const period = catalogPlan?.period || billingPeriod;

  useEffect(() => {
    if (pack[billingPeriod]) return;
    setBillingPeriod(pack.year ? 'year' : 'month');
  }, [packageType, billingRole, plans, billingPeriod, pack.month, pack.year]);

  const packageOptions = useMemo(
    () =>
      ([
        ['board', asPack(plans[billingRole].board)],
        ['iit', asPack(plans[billingRole].iit)],
        ['both', asPack(plans[billingRole].both)],
      ] as const),
    [billingRole, plans],
  );

  const onClassChange = (value: string) => {
    setClassLabel(value);
    const n = classNumbersFromLabel(value) || 6;
    const nextAllowed = tracksForClass(n);
    if (!nextAllowed.some((t) => t.code === track)) {
      setTrack(recommendedTrackForClass(n));
    }
  };

  const persistStudentPlan = async () => {
    if (!userId || billingRole === 'teacher') return true;
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        classNumber: classLabel,
        iitCategories: needsIitTrack && track ? [track] : [],
        interestedCourses:
          packageType === 'board'
            ? ['Board Exams']
            : packageType === 'iit'
              ? ['IIT Foundation']
              : ['IIT Foundation', 'Board Exams'],
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Could not save your plan.');
    }
    return true;
  };

  const handlePay = async () => {
    if (!userId) {
      setLocation(
        `/auth/register?class=${encodeURIComponent(classLabel)}&track=${track}&package=${packageType}`,
      );
      return;
    }
    setSaving(true);
    setError('');
    try {
      await persistStudentPlan();
      if (!payConfigured) {
        throw new Error('Online payments are not available yet. Please contact AsliLearn.');
      }
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk || !(window as any).Razorpay) {
        throw new Error('Could not load Razorpay. Check your connection and try again.');
      }
      const token = getAuthToken();
      const orderRes = await fetch(`${API_BASE_URL}/api/billing/individual/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          packageType,
          period: billingPeriod,
          classLabel,
          track: needsIitTrack ? track : '',
        }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.success) {
        throw new Error(orderJson.message || 'Could not start payment.');
      }

      const rzp = new (window as any).Razorpay({
        key: orderJson.keyId,
        amount: orderJson.amount,
        currency: orderJson.currency || 'INR',
        name: 'AsliLearn.ai',
        description: `${catalogPlan?.label || 'Plan'} · ${classLabel}`,
        order_id: orderJson.orderId,
        prefill: {
          name: orderJson.prefill?.name || userName || '',
          email: orderJson.prefill?.email || userEmail || '',
          contact: orderJson.prefill?.contact || '',
        },
        notes: {
          packageType,
          period: billingPeriod,
          classLabel,
          track: needsIitTrack ? track : '',
        },
        theme: { color: '#0284c7' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/billing/individual/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                ...response,
                packageType,
                period: billingPeriod,
                classLabel,
                track: needsIitTrack ? track : '',
              }),
            });
            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok || !verifyJson.success) {
              throw new Error(verifyJson.message || 'Payment succeeded but could not activate the plan.');
            }
            window.location.href = verifyJson.redirect || (billingRole === 'teacher' ? '/teacher/dashboard' : '/dashboard');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not confirm payment.');
            setSaving(false);
          }
        },
        modal: {
          ondismiss: () => setSaving(false),
        },
      });
      rzp.on('payment.failed', (resp: { error?: { description?: string } }) => {
        setError(resp?.error?.description || 'Payment failed. Please try again.');
        setSaving(false);
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start payment.');
      setSaving(false);
    }
  };

  return (
    <div className={cn(variant === 'card' ? '' : 'space-y-6')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Class</Label>
          <Select value={classLabel} onValueChange={onClassChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {INDIVIDUAL_CLASS_OPTIONS.filter((c) => classNumbersFromLabel(c)! <= 10).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Package</Label>
          <div className="grid grid-cols-3 gap-2">
            {packageOptions.map(([id, packOpt]) => {
              const shown = packOpt.month || packOpt.year;
              const yearOpt = packOpt.year;
              return (
              <button
                key={id}
                type="button"
                onClick={() => setPackageType(id)}
                className={cn(
                  'rounded-xl border px-2 py-2 text-left text-sm font-semibold sm:px-3',
                  packageType === id
                    ? 'border-sky-400 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-600',
                )}
              >
                {shown?.label || id}
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                  {shown ? `₹${shown.amountInr} ${periodLabel(shown.period)}` : '—'}
                </span>
                {yearOpt && packOpt.month ? (
                  <span className="block text-[11px] font-normal text-emerald-700">
                    ₹{yearOpt.amountInr} / year
                    {yearOpt.discountPercent ? ` · ${yearOpt.discountPercent}% off` : ''}
                  </span>
                ) : null}
              </button>
              );
            })}
          </div>
        </div>
      </div>

      {needsIitTrack ? (
        <div className="space-y-3">
          <Label>IIT material for {classLabel}</Label>
          <p className="text-xs text-slate-500">
            Choose Alpha or Beta (Gamma where offered) so quizzes, Vidya AI and practice exams follow that book.
            {matrix ? (
              <>
                {' '}
                Recommended for Class {classNumber}:{' '}
                <strong>{IIT_TRACK_SPECS.find((t) => t.code === matrix.recommended)?.name}</strong>.
              </>
            ) : null}
          </p>
          <div className="grid gap-3">
            {IIT_TRACK_SPECS.map((spec) => {
              const allowed = spec.classNumbers.includes(classNumber);
              const selected = track === spec.code;
              return (
                <button
                  key={spec.code}
                  type="button"
                  disabled={!allowed}
                  onClick={() => {
                    if (!allowed) return;
                    setTrack(spec.code);
                  }}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition',
                    spec.tone.bg,
                    selected && allowed ? `${spec.tone.border} ring-2 ring-sky-400` : spec.tone.border,
                    !allowed && 'cursor-not-allowed opacity-45 grayscale',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={cn('text-xs font-bold uppercase tracking-wide', spec.tone.badge)}>
                        {spec.classes}
                      </p>
                      <p className="mt-0.5 font-display text-lg font-bold text-slate-900">{spec.book}</p>
                      <p className="mt-1 text-sm text-slate-600">{spec.headline}</p>
                    </div>
                    {selected && allowed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600" /> : null}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{spec.forWhom}</p>
                  {!allowed ? (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Not offered for {classLabel}. Choose a class in {spec.classes}.
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Boards covers school-syllabus videos, notes, quizzes and practice exams. Add IIT Foundation anytime
          for Asli Prep Alpha / Beta books and the tools tied to them.
        </p>
      )}

      {selectedTrack && needsIitTrack ? (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <GraduationCap className="h-4 w-4 text-sky-700" />
            What you get on {selectedTrack.book}
          </p>
          <ul className="mt-3 space-y-1.5">
            {selectedTrack.points.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your plan</p>
          {pack.month && pack.year ? (
            <div className="mt-1 mb-2 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(['month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setBillingPeriod(p)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-semibold',
                    billingPeriod === p ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-500',
                  )}
                >
                  {p === 'year' ? (
                    <>
                      Yearly
                      {pack.year?.discountPercent ? ` · ${pack.year.discountPercent}% off` : ''}
                    </>
                  ) : (
                    'Monthly'
                  )}
                </button>
              ))}
            </div>
          ) : null}
          <p className="font-display text-2xl font-extrabold text-slate-900">
            ₹{price}
            <span className="text-sm font-medium text-slate-500">{periodLabel(period)}</span>
          </p>
          {discountPercent > 0 && listPrice > price ? (
            <p className="text-xs text-emerald-700">
              <span className="mr-1 text-slate-400 line-through">₹{listPrice}</span>
              {discountPercent}% yearly discount
            </p>
          ) : null}
          <p className="text-sm text-slate-600">
            {classLabel}
            {needsIitTrack && selectedTrack ? ` · ${selectedTrack.book}` : ' · Boards'}
            {packageType === 'both' ? ' + Boards' : ''}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[220px]">
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <Button className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700" onClick={() => void handlePay()} disabled={saving}>
            {saving ? 'Opening payment…' : userId ? 'Pay with Razorpay' : 'Start 7-day free trial'}
          </Button>
          {!userId ? (
            <Link href={`/auth/register?class=${encodeURIComponent(classLabel)}&track=${track}&package=${packageType}`}>
              <Button variant="outline" className="h-11 w-full">
                Create account
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
