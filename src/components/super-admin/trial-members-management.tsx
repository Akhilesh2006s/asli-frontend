import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { formatIitCategoryLabel } from '@/lib/products';
import {
  Clock,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TrialMember = {
  id: string;
  role: 'student' | 'teacher';
  fullName: string;
  email: string;
  phone: string;
  schoolName: string;
  classNumber: string;
  interestedCourses: string[];
  interestedSubjects: string[];
  iitCategories: string[];
  subscriptionStatus: string;
  trialStartsAt?: string | null;
  trialEndsAt?: string | null;
  trialDaysLeft?: number | null;
  trialActive?: boolean;
  trialExceeded?: boolean;
  paymentRequired?: boolean;
  trialAllowedContentTypes: string[];
  trialAllowedAiTools: string[];
  trialAdminNotes: string;
  trialPaymentAmount?: number | null;
  trialPaidAt?: string | null;
  trialPaymentMethod?: string;
  trialPaymentReference?: string;
  isActive: boolean;
  createdAt?: string | null;
};

type Summary = {
  total: number;
  trialActive: number;
  exceeded: number;
  paid: number;
  students: number;
  teachers: number;
};

const QUICK_TRIAL_DAYS = [1, 3, 7, 14, 30];

const COMMON_AI_TOOLS = [
  { id: 'worksheet-mcq-generator', label: 'Worksheet & MCQ' },
  { id: 'exam-question-paper-generator', label: 'Exam Question Paper' },
  { id: 'lesson-planner', label: 'Lesson Planner' },
  { id: 'concept-mastery-helper', label: 'Concept Mastery' },
  { id: 'flashcard-generator', label: 'Flashcards' },
  { id: 'short-notes-summaries-maker', label: 'Short Notes' },
  { id: 'homework-creator', label: 'Homework Creator' },
  { id: 'activity-project-generator', label: 'Activity & Project' },
];

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem('authToken') ||
    localStorage.getItem('superAdminToken') ||
    localStorage.getItem('token');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function statusBadge(m: TrialMember) {
  if (m.subscriptionStatus === 'active') {
    return <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Paid / Active</Badge>;
  }
  if (m.trialExceeded || m.subscriptionStatus === 'expired') {
    return (
      <Badge className="bg-red-100 text-red-900 hover:bg-red-100">
        Trial exceeded
      </Badge>
    );
  }
  if (m.trialActive) {
    return (
      <Badge className="bg-amber-100 text-amber-950 hover:bg-amber-100">
        Trial · {m.trialDaysLeft ?? '—'}d left
      </Badge>
    );
  }
  return <Badge variant="outline">{m.subscriptionStatus || 'none'}</Badge>;
}

export default function TrialMembersManagement() {
  const { toast } = useToast();
  const [members, setMembers] = useState<TrialMember[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [contentTypeOptions, setContentTypeOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TrialMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applyingDefaults, setApplyingDefaults] = useState(false);
  const [batchDefaults, setBatchDefaults] = useState({
    trialAllowedContentTypes: [] as string[],
    trialAllowedAiTools: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    trialDays: '7',
    subscriptionStatus: 'trial',
    trialAllowedContentTypes: [] as string[],
    trialAllowedAiTools: [] as string[],
    trialAdminNotes: '',
    trialPaymentAmount: '',
    trialPaidAt: '',
    trialPaymentMethod: 'manual',
    trialPaymentReference: '',
    isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (search.trim()) params.set('q', search.trim());
      const res = await fetch(`${API_BASE_URL}/api/super-admin/trial-members?${params}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load');
      setMembers(json.data?.members || []);
      setSummary(json.data?.summary || null);
      setContentTypeOptions(json.data?.contentTypeOptions || []);
    } catch (e) {
      toast({
        title: 'Could not load trial members',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter, search, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (m: TrialMember) => {
    setEditing(m);
    const paidAtLocal = m.trialPaidAt
      ? new Date(m.trialPaidAt).toISOString().slice(0, 16)
      : '';
    setEditForm({
      trialDays: String(Math.max(1, m.trialDaysLeft || 7)),
      subscriptionStatus: m.subscriptionStatus || 'trial',
      trialAllowedContentTypes: [...(m.trialAllowedContentTypes || [])],
      trialAllowedAiTools: [...(m.trialAllowedAiTools || [])],
      trialAdminNotes: m.trialAdminNotes || '',
      trialPaymentAmount:
        m.trialPaymentAmount != null && Number.isFinite(m.trialPaymentAmount)
          ? String(m.trialPaymentAmount)
          : '',
      trialPaidAt: paidAtLocal,
      trialPaymentMethod: m.trialPaymentMethod || 'manual',
      trialPaymentReference: m.trialPaymentReference || '',
      isActive: m.isActive !== false,
    });
  };

  const paymentPayload = () => {
    const amountRaw = editForm.trialPaymentAmount.trim();
    return {
      trialPaymentAmount: amountRaw === '' ? null : Number(amountRaw),
      trialPaymentMethod: editForm.trialPaymentMethod || '',
      trialPaymentReference: editForm.trialPaymentReference.trim(),
      trialPaidAt: editForm.trialPaidAt
        ? new Date(editForm.trialPaidAt).toISOString()
        : null,
    };
  };

  const saveMember = async (extra: Record<string, unknown> = {}) => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/trial-members/${editing.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          role: editing.role,
          subscriptionStatus: editForm.subscriptionStatus,
          trialAllowedContentTypes: editForm.trialAllowedContentTypes,
          trialAllowedAiTools: editForm.trialAllowedAiTools,
          trialAdminNotes: editForm.trialAdminNotes,
          isActive: editForm.isActive,
          ...paymentPayload(),
          ...extra,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Update failed');
      toast({ title: 'Trial member updated', description: json.message });
      if (json.data) openEdit(json.data);
      await load();
    } catch (e) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const memberKey = (m: TrialMember) => `${m.role}:${m.id}`;

  const toggleSelected = (m: TrialMember) => {
    const key = memberKey(m);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const applyDefaultsToSelected = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: 'Select members first',
        description: 'Check one or more members, then apply content/AI defaults.',
        variant: 'destructive',
      });
      return;
    }
    setApplyingDefaults(true);
    try {
      const memberIds = [...selectedIds].map((key) => {
        const [role, id] = key.split(':');
        return { id, role };
      });
      const res = await fetch(`${API_BASE_URL}/api/super-admin/trial-members/apply-defaults`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          memberIds,
          trialAllowedContentTypes: batchDefaults.trialAllowedContentTypes,
          trialAllowedAiTools: batchDefaults.trialAllowedAiTools,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Apply failed');
      toast({
        title: 'Defaults applied',
        description: json.message,
      });
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      toast({
        title: 'Could not apply defaults',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setApplyingDefaults(false);
    }
  };

  const toggleContentType = (type: string) => {
    setEditForm((prev) => ({
      ...prev,
      trialAllowedContentTypes: prev.trialAllowedContentTypes.includes(type)
        ? prev.trialAllowedContentTypes.filter((t) => t !== type)
        : [...prev.trialAllowedContentTypes, type],
    }));
  };

  const toggleTool = (id: string) => {
    setEditForm((prev) => ({
      ...prev,
      trialAllowedAiTools: prev.trialAllowedAiTools.includes(id)
        ? prev.trialAllowedAiTools.filter((t) => t !== id)
        : [...prev.trialAllowedAiTools, id],
    }));
  };

  const exceededCount = useMemo(
    () => members.filter((m) => m.trialExceeded).length,
    [members],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Trial members</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Individual teacher and student signups. Manage trial length, record payments, mark trials
            exceeded, and restrict which content / AI tools they can use.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            { label: 'Total', value: summary.total },
            { label: 'Trial active', value: summary.trialActive },
            { label: 'Exceeded', value: summary.exceeded, warn: true },
            { label: 'Paid', value: summary.paid },
            { label: 'Students', value: summary.students },
            { label: 'Teachers', value: summary.teachers },
          ].map((s) => (
            <Card key={s.label} className={cn(s.warn && s.value > 0 && 'border-red-200')}>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {exceededCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">{exceededCount} member(s) have exceeded their trial</p>
            <p className="mt-1 text-xs text-red-800">
              They are blocked from AI tools until you extend the trial, mark them paid, or they
              subscribe.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>Filter by status, role, or search name / email / school.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="trial">Trial active</SelectItem>
                <SelectItem value="exceeded">Trial exceeded</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Apply content / AI defaults to selected
                </p>
                <p className="text-xs text-slate-500">
                  Empty lists mean all content types / all AI tools (no extra restriction). Select
                  members below, set defaults here, then apply.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={applyingDefaults || selectedIds.size === 0}
                onClick={() => void applyDefaultsToSelected()}
              >
                {applyingDefaults ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Apply to {selectedIds.size || 0} selected
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              {(contentTypeOptions.length
                ? contentTypeOptions
                : ['Video', 'Audio', 'TextBook', 'Workbook', 'Material', 'Homework']
              ).map((type) => (
                <label key={`batch-ct-${type}`} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={batchDefaults.trialAllowedContentTypes.includes(type)}
                    onCheckedChange={() =>
                      setBatchDefaults((prev) => ({
                        ...prev,
                        trialAllowedContentTypes: prev.trialAllowedContentTypes.includes(type)
                          ? prev.trialAllowedContentTypes.filter((t) => t !== type)
                          : [...prev.trialAllowedContentTypes, type],
                      }))
                    }
                  />
                  {type}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-3">
              {COMMON_AI_TOOLS.map((tool) => (
                <label key={`batch-ai-${tool.id}`} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={batchDefaults.trialAllowedAiTools.includes(tool.id)}
                    onCheckedChange={() =>
                      setBatchDefaults((prev) => ({
                        ...prev,
                        trialAllowedAiTools: prev.trialAllowedAiTools.includes(tool.id)
                          ? prev.trialAllowedAiTools.filter((t) => t !== tool.id)
                          : [...prev.trialAllowedAiTools, tool.id],
                      }))
                    }
                  />
                  {tool.label}
                </label>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No individual trial members yet. They appear here after self-signup.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {members.map((m) => (
                <div
                  key={`${m.role}-${m.id}`}
                  className={cn(
                    'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
                    m.trialExceeded && 'bg-red-50/40',
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <Checkbox
                      className="mt-1"
                      checked={selectedIds.has(memberKey(m))}
                      onCheckedChange={() => toggleSelected(m)}
                      aria-label={`Select ${m.fullName}`}
                    />
                    <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {m.role === 'teacher' ? (
                        <GraduationCap className="h-4 w-4 text-sky-600" />
                      ) : (
                        <UserRound className="h-4 w-4 text-orange-600" />
                      )}
                      <p className="font-medium text-slate-900">{m.fullName || '—'}</p>
                      <Badge variant="outline" className="capitalize">
                        {m.role}
                      </Badge>
                      {statusBadge(m)}
                      {!m.isActive && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                    <p className="truncate text-xs text-slate-600">
                      {m.email} · {m.phone || 'no phone'} · {m.schoolName || 'no school'}
                      {m.classNumber ? ` · ${m.classNumber}` : ''}
                    </p>
                    {(m.trialPaymentAmount != null || m.trialPaidAt) && (
                      <p className="text-xs text-emerald-800">
                        Paid
                        {m.trialPaymentAmount != null ? ` ₹${m.trialPaymentAmount}` : ''}
                        {m.trialPaidAt
                          ? ` · ${new Date(m.trialPaidAt).toLocaleDateString()}`
                          : ''}
                        {m.trialPaymentMethod ? ` · ${m.trialPaymentMethod}` : ''}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(m.interestedCourses || []).slice(0, 4).map((c) => (
                        <Badge key={c} variant="secondary" className="text-micro">
                          {c}
                        </Badge>
                      ))}
                      {(m.iitCategories || []).map((c) => (
                        <Badge
                          key={c}
                          variant="outline"
                          className="border-sky-200 bg-sky-50 text-micro text-sky-900"
                        >
                          IIT {formatIitCategoryLabel(c)}
                        </Badge>
                      ))}
                      {(m.interestedSubjects || []).slice(0, 5).map((s) => (
                        <Badge key={s} variant="outline" className="text-micro">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    {m.trialEndsAt && (
                      <p className="flex items-center gap-1 text-mini text-slate-500">
                        <Clock className="h-3 w-3" />
                        Trial ends {new Date(m.trialEndsAt).toLocaleString()}
                      </p>
                    )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                    Manage trial
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage trial — {editing?.fullName}</DialogTitle>
            <DialogDescription>
              {editing?.email} · {editing?.role}. Set trial days, mark exceeded / paid, and restrict
              content.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-5 py-2">
              <div className="flex flex-wrap gap-2">
                {QUICK_TRIAL_DAYS.map((d) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void saveMember({ resetTrial: true, trialDays: d })}
                  >
                    Set {d}-day trial
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void saveMember({ extendDays: 1 })}
                >
                  +1 day
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void saveMember({ extendDays: 7 })}
                >
                  +7 days
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subscription status</Label>
                  <Select
                    value={editForm.subscriptionStatus}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, subscriptionStatus: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="active">Paid / unlocked</SelectItem>
                      <SelectItem value="expired">Trial exceeded</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Custom trial days (then use Save)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={editForm.trialDays}
                    onChange={(e) => setEditForm((p) => ({ ...p, trialDays: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                <Label className="font-medium text-emerald-950">Payment (manual)</Label>
                <p className="text-xs text-emerald-900/80">
                  Record amount and reference when unlocking. Marking paid sets status to active and
                  unlocks the gate.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={editForm.trialPaymentAmount}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, trialPaymentAmount: e.target.value }))
                      }
                      placeholder="e.g. 499"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select
                      value={editForm.trialPaymentMethod || 'manual'}
                      onValueChange={(v) =>
                        setEditForm((p) => ({ ...p, trialPaymentMethod: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Paid at</Label>
                    <Input
                      type="datetime-local"
                      value={editForm.trialPaidAt}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, trialPaidAt: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference</Label>
                    <Input
                      value={editForm.trialPaymentReference}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, trialPaymentReference: e.target.value }))
                      }
                      placeholder="UPI txn / receipt #"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                <Label className="font-medium">Content allowed on trial</Label>
                <p className="text-xs text-slate-500">
                  Empty = all content types (no extra restriction). Check types to allow only those
                  during trial.
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {(contentTypeOptions.length
                    ? contentTypeOptions
                    : ['Video', 'Audio', 'TextBook', 'Workbook', 'Material', 'Homework']
                  ).map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={editForm.trialAllowedContentTypes.includes(type)}
                        onCheckedChange={() => toggleContentType(type)}
                      />
                      {type}
                    </label>
                  ))}
                </div>
                {editForm.trialAllowedContentTypes.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-8 px-2 text-xs"
                    onClick={() =>
                      setEditForm((p) => ({ ...p, trialAllowedContentTypes: [] }))
                    }
                  >
                    Clear content restrictions
                  </Button>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                <Label className="font-medium">AI tools allowed on trial</Label>
                <p className="text-xs text-slate-500">
                  Empty = all AI tools. Check tools to allow only those during trial.
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {COMMON_AI_TOOLS.map((tool) => (
                    <label key={tool.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={editForm.trialAllowedAiTools.includes(tool.id)}
                        onCheckedChange={() => toggleTool(tool.id)}
                      />
                      {tool.label}
                    </label>
                  ))}
                </div>
                {editForm.trialAllowedAiTools.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-8 px-2 text-xs"
                    onClick={() => setEditForm((p) => ({ ...p, trialAllowedAiTools: [] }))}
                  >
                    Clear AI tool restrictions
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Admin notes</Label>
                <Textarea
                  value={editForm.trialAdminNotes}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, trialAdminNotes: e.target.value }))
                  }
                  rows={3}
                  placeholder="Internal notes…"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={editForm.isActive}
                  onCheckedChange={(v) =>
                    setEditForm((p) => ({ ...p, isActive: v === true }))
                  }
                />
                Account active (uncheck to deactivate login)
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="destructive"
              disabled={saving}
              onClick={() => void saveMember({ subscriptionStatus: 'expired' })}
            >
              Mark trial exceeded
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() =>
                void saveMember({
                  subscriptionStatus: 'active',
                  ...paymentPayload(),
                  trialPaidAt: editForm.trialPaidAt
                    ? new Date(editForm.trialPaidAt).toISOString()
                    : new Date().toISOString(),
                })
              }
            >
              Unlock as paid
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() =>
                void saveMember({
                  resetTrial: true,
                  trialDays: Math.max(1, parseInt(editForm.trialDays, 10) || 7),
                })
              }
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save &amp; reset trial days
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => void saveMember()}
            >
              Save restrictions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
