import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api-config';
import { GraduationCap, Loader2, RefreshCw, Search, UserRound } from 'lucide-react';

type PaidMember = {
  id: string;
  role: 'student' | 'teacher';
  fullName: string;
  email: string;
  phone?: string;
  schoolName?: string;
  subscriptionStatus: string;
  converted?: boolean;
  convertedAt?: string | null;
  trialPaidAt?: string | null;
  trialPaymentAmount?: number | null;
  trialPaymentMethod?: string;
  trialPaymentReference?: string;
  createdAt?: string | null;
};

type Summary = {
  total: number;
  paid: number;
  converted: number;
  conversionRate: number;
  revenueInr: number;
  trialActive: number;
  exceeded: number;
};

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem('authToken') ||
    localStorage.getItem('superAdminToken') ||
    localStorage.getItem('token');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN');
  } catch {
    return '—';
  }
}

/**
 * Individual (B2C) paid subscriptions — converted trial members.
 * Editing still happens under Trial Members.
 */
export default function IndividualSubscriptionsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<PaidMember[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [paidRes, allRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/super-admin/trial-members?status=paid`, {
          headers: authHeaders(),
        }),
        fetch(`${API_BASE_URL}/api/super-admin/trial-members?status=all`, {
          headers: authHeaders(),
        }),
      ]);
      const paidJson = await paidRes.json().catch(() => ({}));
      const allJson = await allRes.json().catch(() => ({}));
      if (!paidRes.ok || !paidJson?.success) {
        throw new Error(paidJson?.message || 'Failed to load individual subscriptions');
      }
      setMembers(Array.isArray(paidJson.data?.members) ? paidJson.data.members : []);
      if (allJson?.success && allJson.data?.summary) {
        setSummary(allJson.data.summary);
      } else {
        setSummary(paidJson.data?.summary || null);
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not load individual subscriptions',
        variant: 'destructive',
      });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.fullName, m.email, m.schoolName, m.phone].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [members, search]);

  return (
    <div className="space-y-5">
      <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Individual subscriptions (B2C)</CardTitle>
          <CardDescription>
            These are trial members marked <strong>Paid / Converted</strong> (Unlock as paid in Trial
            Members). School Razorpay billing is on the other tabs — this list is individuals only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs text-slate-500">Converted (paid)</p>
              <p className="text-2xl font-bold text-slate-900">{summary?.paid ?? members.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Still on trial</p>
              <p className="text-2xl font-bold text-slate-900">{summary?.trialActive ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Trial exceeded</p>
              <p className="text-2xl font-bold text-slate-900">{summary?.exceeded ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Conversion rate</p>
              <p className="text-2xl font-bold text-slate-900">
                {summary?.conversionRate != null ? `${summary.conversionRate}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Recorded B2C revenue</p>
              <p className="text-2xl font-bold text-slate-900">
                {summary?.revenueInr != null ? formatInr(summary.revenueInr) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Converted members</CardTitle>
            <CardDescription>
              How to convert: Trial Members → open member → Unlock as paid (sets status active +
              payment date).
            </CardDescription>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search name / email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No converted individual subscriptions yet. Mark trial members as paid to see them here.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Converted on</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Method / ref</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={`${m.role}-${m.id}`}>
                      <TableCell>
                        <div className="min-w-[10rem]">
                          <p className="font-medium text-slate-900">{m.fullName || '—'}</p>
                          <p className="text-xs text-slate-500 break-all">{m.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {m.role === 'teacher' ? (
                            <GraduationCap className="h-3 w-3" />
                          ) : (
                            <UserRound className="h-3 w-3" />
                          )}
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(m.convertedAt || m.trialPaidAt)}</TableCell>
                      <TableCell>
                        {m.trialPaymentAmount != null ? formatInr(Number(m.trialPaymentAmount)) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {[m.trialPaymentMethod, m.trialPaymentReference].filter(Boolean).join(' · ') ||
                          '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                          Converted
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
