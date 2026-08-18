import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getAuthToken } from '@/lib/auth-utils';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { IndianRupee, Loader2, Save } from 'lucide-react';

type Rates = {
  studentBoardMonth: number;
  studentIitMonth: number;
  studentBothMonth: number | null;
  studentBoardYear: number | null;
  studentIitYear: number | null;
  studentBothYear: number | null;
  studentYearlyDiscountPercent: number;
  teacherBoardMonth: number;
  teacherBoardYear: number | null;
  teacherIitYear: number;
  teacherBothYear: number | null;
  teacherYearlyDiscountPercent: number;
};

type PreviewOption = {
  amountInr: number;
  listPriceInr: number;
  discountPercent: number;
  period: string;
  label: string;
} | null;

type Preview = {
  student: Record<string, { month: PreviewOption; year: PreviewOption }>;
  teacher: Record<string, { month: PreviewOption; year: PreviewOption }>;
};

const EMPTY: Rates = {
  studentBoardMonth: 99,
  studentIitMonth: 249,
  studentBothMonth: null,
  studentBoardYear: null,
  studentIitYear: null,
  studentBothYear: null,
  studentYearlyDiscountPercent: 0,
  teacherBoardMonth: 99,
  teacherBoardYear: null,
  teacherIitYear: 3999,
  teacherBothYear: null,
  teacherYearlyDiscountPercent: 0,
};

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function numOrBlank(v: number | null | undefined) {
  return v == null || Number.isNaN(Number(v)) ? '' : String(v);
}

function parseOptional(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseRequired(raw: string, fallback: number) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function PriceField({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-slate-600">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function IndividualPlanRatesPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/individual-plan-rates`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Could not load rates');
      const rates: Rates = { ...EMPTY, ...(json.rates || {}) };
      setForm({
        studentBoardMonth: String(rates.studentBoardMonth),
        studentIitMonth: String(rates.studentIitMonth),
        studentBothMonth: numOrBlank(rates.studentBothMonth),
        studentBoardYear: numOrBlank(rates.studentBoardYear),
        studentIitYear: numOrBlank(rates.studentIitYear),
        studentBothYear: numOrBlank(rates.studentBothYear),
        studentYearlyDiscountPercent: String(rates.studentYearlyDiscountPercent ?? 0),
        teacherBoardMonth: String(rates.teacherBoardMonth),
        teacherBoardYear: numOrBlank(rates.teacherBoardYear),
        teacherIitYear: String(rates.teacherIitYear),
        teacherBothYear: numOrBlank(rates.teacherBothYear),
        teacherYearlyDiscountPercent: String(rates.teacherYearlyDiscountPercent ?? 0),
      });
      setPreview(json.preview || null);
    } catch (e) {
      toast({
        title: 'Could not load plan rates',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        studentBoardMonth: parseRequired(form.studentBoardMonth, 99),
        studentIitMonth: parseRequired(form.studentIitMonth, 249),
        studentBothMonth: parseOptional(form.studentBothMonth),
        studentBoardYear: parseOptional(form.studentBoardYear),
        studentIitYear: parseOptional(form.studentIitYear),
        studentBothYear: parseOptional(form.studentBothYear),
        studentYearlyDiscountPercent: Math.min(90, parseRequired(form.studentYearlyDiscountPercent, 0)),
        teacherBoardMonth: parseRequired(form.teacherBoardMonth, 99),
        teacherBoardYear: parseOptional(form.teacherBoardYear),
        teacherIitYear: parseRequired(form.teacherIitYear, 3999),
        teacherBothYear: parseOptional(form.teacherBothYear),
        teacherYearlyDiscountPercent: Math.min(90, parseRequired(form.teacherYearlyDiscountPercent, 0)),
      };
      const res = await fetch(`${API_BASE_URL}/api/super-admin/individual-plan-rates`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Save failed');
      const rates: Rates = { ...EMPTY, ...(json.rates || {}) };
      setForm({
        studentBoardMonth: String(rates.studentBoardMonth),
        studentIitMonth: String(rates.studentIitMonth),
        studentBothMonth: numOrBlank(rates.studentBothMonth),
        studentBoardYear: numOrBlank(rates.studentBoardYear),
        studentIitYear: numOrBlank(rates.studentIitYear),
        studentBothYear: numOrBlank(rates.studentBothYear),
        studentYearlyDiscountPercent: String(rates.studentYearlyDiscountPercent ?? 0),
        teacherBoardMonth: String(rates.teacherBoardMonth),
        teacherBoardYear: numOrBlank(rates.teacherBoardYear),
        teacherIitYear: String(rates.teacherIitYear),
        teacherBothYear: numOrBlank(rates.teacherBothYear),
        teacherYearlyDiscountPercent: String(rates.teacherYearlyDiscountPercent ?? 0),
      });
      setPreview(json.preview || null);
      toast({ title: 'Rates saved', description: 'Checkout and Razorpay will use these prices.' });
    } catch (e) {
      toast({
        title: 'Could not save rates',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: string, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const previewLine = (opt: PreviewOption) => {
    if (!opt) return '—';
    if (opt.discountPercent > 0 && opt.listPriceInr > opt.amountInr) {
      return `${formatInr(opt.amountInr)} / ${opt.period} (${opt.discountPercent}% off ${formatInr(opt.listPriceInr)})`;
    }
    return `${formatInr(opt.amountInr)} / ${opt.period}`;
  };

  return (
    <Card className="border-orange-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <IndianRupee className="h-5 w-5 text-orange-600" />
          Individual plan rates
        </CardTitle>
        <CardDescription>
          Fix every individual (B2C) rate here. Checkout always offers monthly and yearly. Leave yearly ₹
          blank to use month × 12. Yearly discount % comes off that yearly list (0 = full year price).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading rates…
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">Students</p>
                  <Badge variant="outline">Monthly default</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <PriceField
                    id="studentBoardMonth"
                    label="Boards ₹ / month"
                    value={form.studentBoardMonth || ''}
                    onChange={(v) => setField('studentBoardMonth', v)}
                  />
                  <PriceField
                    id="studentBoardYear"
                    label="Boards ₹ / year"
                    placeholder="blank = month × 12"
                    value={form.studentBoardYear || ''}
                    onChange={(v) => setField('studentBoardYear', v)}
                  />
                  <PriceField
                    id="studentIitMonth"
                    label="IIT ₹ / month"
                    value={form.studentIitMonth || ''}
                    onChange={(v) => setField('studentIitMonth', v)}
                  />
                  <PriceField
                    id="studentIitYear"
                    label="IIT ₹ / year"
                    placeholder="blank = month × 12"
                    value={form.studentIitYear || ''}
                    onChange={(v) => setField('studentIitYear', v)}
                  />
                  <PriceField
                    id="studentBothMonth"
                    label="Both ₹ / month"
                    placeholder="blank = Boards + IIT"
                    value={form.studentBothMonth || ''}
                    onChange={(v) => setField('studentBothMonth', v)}
                  />
                  <PriceField
                    id="studentBothYear"
                    label="Both ₹ / year"
                    placeholder="blank = month × 12"
                    value={form.studentBothYear || ''}
                    onChange={(v) => setField('studentBothYear', v)}
                  />
                </div>
                <PriceField
                  id="studentYearlyDiscountPercent"
                  label="Yearly discount %"
                  hint="0 = yearly is month × 12 with no discount. Example: 15 = 15% off yearly list."
                  value={form.studentYearlyDiscountPercent || '0'}
                  onChange={(v) => setField('studentYearlyDiscountPercent', v)}
                />
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">Teachers</p>
                  <Badge variant="outline">IIT billed yearly</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <PriceField
                    id="teacherBoardMonth"
                    label="Boards ₹ / month"
                    value={form.teacherBoardMonth || ''}
                    onChange={(v) => setField('teacherBoardMonth', v)}
                  />
                  <PriceField
                    id="teacherBoardYear"
                    label="Boards ₹ / year"
                    placeholder="blank = month × 12"
                    value={form.teacherBoardYear || ''}
                    onChange={(v) => setField('teacherBoardYear', v)}
                  />
                  <PriceField
                    id="teacherIitYear"
                    label="IIT ₹ / year"
                    value={form.teacherIitYear || ''}
                    onChange={(v) => setField('teacherIitYear', v)}
                  />
                  <PriceField
                    id="teacherBothYear"
                    label="Both ₹ / year"
                    placeholder="blank = IIT year + Boards × 12"
                    value={form.teacherBothYear || ''}
                    onChange={(v) => setField('teacherBothYear', v)}
                  />
                </div>
                <PriceField
                  id="teacherYearlyDiscountPercent"
                  label="Yearly discount %"
                  hint="Comes off teacher yearly list prices (IIT, Both, and Boards yearly if set)."
                  value={form.teacherYearlyDiscountPercent || '0'}
                  onChange={(v) => setField('teacherYearlyDiscountPercent', v)}
                />
              </div>
            </div>

            {preview ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="mb-2 text-sm font-semibold text-emerald-900">What members will see at checkout</p>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  {(['student', 'teacher'] as const).map((role) => (
                    <ul key={role} className="space-y-1 text-slate-700">
                      <li className="font-medium capitalize text-slate-900">{role}</li>
                      {['board', 'iit', 'both'].map((pkg) => (
                        <li key={`${role}-${pkg}`}>
                          <span className="capitalize">{pkg}</span>
                          {' · '}
                          {previewLine(preview[role]?.[pkg]?.month)}
                          {preview[role]?.[pkg]?.year
                            ? ` · ${previewLine(preview[role][pkg].year)}`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  ))}
                </div>
              </div>
            ) : null}

            <Button onClick={() => void save()} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save rates
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
