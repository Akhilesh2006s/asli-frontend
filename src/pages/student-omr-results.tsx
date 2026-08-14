import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ScanLine,
  TrendingUp,
  TrendingDown,
  Download,
  Medal,
  Hash,
  CalendarDays,
} from 'lucide-react';
import StudentShell from '@/components/layout/StudentShell';
import { SchoolOnlyGuard } from '@/components/student/SchoolOnlyGuard';
import { getAuthToken } from '@/lib/auth-utils';
import { API_BASE_URL } from '@/lib/api-config';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type SubjectScore = { r?: number; w?: number; l?: number; marks?: number };

type OmrRow = {
  _id: string;
  percentage: number;
  totalMarks: number;
  totalQuestions?: number;
  correct?: number;
  wrong?: number;
  left?: number;
  finalRank?: number | null;
  testRank?: number | null;
  maths?: SubjectScore;
  physics?: SubjectScore;
  chemistry?: SubjectScore;
  biology?: SubjectScore;
  testTitle?: string;
  testDate?: string | null;
  testNo?: string;
};

function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
}

function subjectMax(s?: SubjectScore): number {
  if (!s) return 20;
  const attempted = (s.r || 0) + (s.w || 0) + (s.l || 0);
  return attempted > 0 ? attempted : 20;
}

function subjectPct(s?: SubjectScore): number {
  const max = subjectMax(s);
  if (!max) return 0;
  return Math.round(((s?.marks || 0) / max) * 100);
}

function formatTestDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

const SUBJECT_META = [
  { key: 'Physics', field: 'physics' as const, bar: 'bg-sky-500', chip: 'bg-sky-50 text-sky-800 border-sky-100' },
  { key: 'Chemistry', field: 'chemistry' as const, bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
  { key: 'Mathematics', field: 'maths' as const, bar: 'bg-orange-500', chip: 'bg-orange-50 text-orange-900 border-orange-100' },
  { key: 'Biology', field: 'biology' as const, bar: 'bg-violet-500', chip: 'bg-violet-50 text-violet-900 border-violet-100' },
];

export default function StudentOmrResultsPage() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<OmrRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getAuthToken();
    setLoading(true);
    fetch(`${API_BASE_URL}/api/student/omr-results`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load results');
        const list: OmrRow[] = Array.isArray(data.data?.history)
          ? data.data.history
          : data.data?.latest
            ? [data.data.latest]
            : [];
        setHistory(list);
        setSelectedId(list[0]?._id || null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () => history.find((h) => h._id === selectedId) || history[0] || null,
    [history, selectedId],
  );

  const selectedIndex = useMemo(
    () => (selected ? history.findIndex((h) => h._id === selected._id) : -1),
    [history, selected],
  );

  const trend = useMemo(() => {
    if (selectedIndex < 0 || selectedIndex >= history.length - 1) return null;
    const prev = history[selectedIndex + 1];
    if (!prev || !selected) return null;
    return Math.round(((selected.percentage || 0) - (prev.percentage || 0)) * 10) / 10;
  }, [history, selected, selectedIndex]);

  const subjects = useMemo(() => {
    if (!selected) return [];
    return SUBJECT_META.map((meta) => ({
      ...meta,
      score: selected[meta.field],
    })).filter((s) => subjectMax(s.score) > 0 || (s.score?.marks || 0) > 0);
  }, [selected]);

  const downloadReport = () => {
    if (!selected) return;
    const lines = [
      ['Field', 'Value'],
      ['Test', selected.testTitle || ''],
      ['Test No', selected.testNo || ''],
      ['Percentage', String(selected.percentage)],
      ['Total Marks', String(selected.totalMarks)],
      ['Rank', String(selected.finalRank ?? selected.testRank ?? '')],
      ...subjects.map((s) => [s.key, `${s.score?.marks || 0}/${subjectMax(s.score)}`]),
    ];
    const csv = lines.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omr-result-${selected.testNo || selected._id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rank = selected?.finalRank ?? selected?.testRank;
  const scorePct = Math.min(100, Math.max(0, Number(selected?.percentage) || 0));

  return (
    <SchoolOnlyGuard>
    <StudentShell>
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                <ScanLine className="h-5 w-5" aria-hidden />
              </span>
              Offline Results
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Sheet scores from your school
              {history.length ? ` · ${history.length} test${history.length === 1 ? '' : 's'}` : ''}.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-orange-200 text-orange-800"
            disabled={!selected}
            onClick={downloadReport}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download CSV
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : !selected ? (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 px-6 py-10 text-center">
            <ScanLine className="mx-auto mb-2 h-10 w-10 text-orange-300" />
            <p className="font-semibold text-slate-800">No Offline Results Yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              When your school uploads an Offline Score Sheet and links your Candidate ID, scores show up
              here.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {history.length > 1 ? (
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <Label htmlFor="omr-exam-filter" className="shrink-0 text-xs font-medium text-slate-500">
                  Exam
                </Label>
                <Select value={selected._id} onValueChange={setSelectedId}>
                  <SelectTrigger
                    id="omr-exam-filter"
                    className="h-10 flex-1 rounded-xl border-slate-200 bg-white"
                  >
                    <SelectValue placeholder="Choose an Offline Exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {history.map((h) => (
                      <SelectItem key={h._id} value={h._id}>
                        {h.testTitle || `Test #${h.testNo || h._id}`}
                        {` · ${h.percentage}%`}
                        {formatTestDate(h.testDate) ? ` · ${formatTestDate(h.testDate)}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {/* Hero score band */}
            <div className="overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50/80 shadow-sm">
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-6">
                <div className="relative mx-auto h-28 w-28 shrink-0 sm:mx-0">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      className="stroke-orange-100"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      className="stroke-orange-500"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={`${scorePct} ${100 - scorePct}`}
                      pathLength={100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums text-slate-900">
                      {selected.percentage}%
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Grade {gradeFor(scorePct)}
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                      Overall score
                    </p>
                    <h2 className="mt-0.5 text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                      {selected.testTitle || 'Offline Test'}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500 sm:justify-start">
                      {formatTestDate(selected.testDate) ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatTestDate(selected.testDate)}
                        </span>
                      ) : null}
                      {selected.testNo ? (
                        <span className="inline-flex items-center gap-1">
                          <Hash className="h-3.5 w-3.5" />
                          Test {selected.testNo}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-white/80 bg-white/90 px-2.5 py-2 shadow-sm">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Marks
                      </p>
                      <p className="text-lg font-bold tabular-nums text-slate-900">
                        {selected.totalMarks}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/80 bg-white/90 px-2.5 py-2 shadow-sm">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Rank
                      </p>
                      <p className="flex items-center gap-1 text-lg font-bold tabular-nums text-slate-900">
                        <Medal className="h-4 w-4 text-amber-500" />
                        {rank ?? '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/80 bg-white/90 px-2.5 py-2 shadow-sm">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Trend
                      </p>
                      {trend != null ? (
                        <p
                          className={cn(
                            'flex items-center gap-0.5 text-sm font-bold tabular-nums',
                            trend >= 0 ? 'text-emerald-600' : 'text-red-600',
                          )}
                        >
                          {trend >= 0 ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {trend >= 0 ? '+' : ''}
                          {trend}%
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-slate-500">—</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject grid */}
            <div>
              <h3 className="mb-2.5 text-sm font-semibold text-slate-800">Subject performance</h3>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {subjects.map((s) => {
                  const max = subjectMax(s.score);
                  const marks = s.score?.marks || 0;
                  const pct = subjectPct(s.score);
                  return (
                    <div
                      key={s.key}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{s.key}</p>
                          <p className="text-xs text-slate-500">
                            Right {s.score?.r ?? 0} · Wrong {s.score?.w ?? 0} · Left {s.score?.l ?? 0}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'rounded-lg border px-2 py-0.5 text-xs font-bold',
                            s.chip,
                          )}
                        >
                          {gradeFor(pct)}
                        </span>
                      </div>
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <p className="text-xl font-bold tabular-nums text-slate-900">
                          {marks}
                          <span className="text-sm font-medium text-slate-400"> / {max}</span>
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-slate-600">{pct}%</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn('h-full rounded-full transition-all', s.bar)}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {history.length > 1 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">All Offline Tests</h3>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {history.map((h) => {
                    const active = h._id === selected._id;
                    return (
                      <button
                        key={h._id}
                        type="button"
                        onClick={() => setSelectedId(h._id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm transition-colors',
                          active ? 'bg-orange-50/80' : 'hover:bg-slate-50',
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{h.testTitle}</p>
                          <p className="text-xs text-slate-500">
                            {formatTestDate(h.testDate) || `Test #${h.testNo || '—'}`}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-bold tabular-nums text-slate-900">{h.percentage}%</p>
                          <p className="text-[11px] text-slate-500">
                            Rank {h.finalRank ?? h.testRank ?? '—'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </div>
    </StudentShell>
    </SchoolOnlyGuard>
  );
}
