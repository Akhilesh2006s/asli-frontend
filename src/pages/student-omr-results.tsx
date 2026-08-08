import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, TrendingUp, Download, BookOpen, CheckCircle2 } from 'lucide-react';
import StudentShell from '@/components/layout/StudentShell';
import { getAuthToken } from '@/lib/auth-utils';
import { API_BASE_URL } from '@/lib/api-config';
import { Card, CardContent } from '@/components/ui/card';
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
    return [
      { key: 'Physics', score: selected.physics, color: 'bg-sky-500' },
      { key: 'Chemistry', score: selected.chemistry, color: 'bg-emerald-500' },
      { key: 'Mathematics', score: selected.maths, color: 'bg-orange-500' },
      { key: 'Biology', score: selected.biology, color: 'bg-violet-500' },
    ].filter((s) => subjectMax(s.score) > 0 || (s.score?.marks || 0) > 0);
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

  return (
    <StudentShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
              OMR Results
            </p>
            <h1 className="mt-1 flex items-center gap-2.5 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              <ScanLine className="h-7 w-7 shrink-0 text-orange-600" aria-hidden />
              OMR Results
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Optical mark recognition scores assigned by your school
              {history.length > 1 ? ` · ${history.length} tests` : ''}.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-orange-200 text-orange-800"
            disabled={!selected}
            onClick={downloadReport}
          >
            <Download className="mr-2 h-4 w-4" />
            Download report
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <Card className="rounded-2xl border-red-100">
            <CardContent className="p-6 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : !selected ? (
          <Card className="rounded-2xl border-orange-100">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <ScanLine className="mb-3 h-12 w-12 text-orange-300" />
              <p className="font-semibold text-slate-800">No OMR results yet</p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                When your school uploads an OMR score sheet and assigns your Candidate ID to your
                account, results will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="rounded-2xl border-orange-100">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="omr-exam-filter" className="text-slate-600">
                    Filter by exam
                  </Label>
                  <Select value={selected._id} onValueChange={setSelectedId}>
                    <SelectTrigger
                      id="omr-exam-filter"
                      className="h-11 rounded-xl border-slate-200 bg-white"
                    >
                      <SelectValue placeholder="Choose an OMR exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {history.map((h) => (
                        <SelectItem key={h._id} value={h._id}>
                          {h.testTitle || `Test #${h.testNo || h._id}`}
                          {h.testNo ? ` (#${h.testNo})` : ''}
                          {` · ${h.percentage}%`}
                          {formatTestDate(h.testDate) ? ` · ${formatTestDate(h.testDate)}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="shrink-0 text-xs text-slate-500 sm:pb-3">
                  {history.length} exam{history.length === 1 ? '' : 's'} available
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-2xl border-orange-100 bg-gradient-to-br from-white to-orange-50/40">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall score</p>
                  <p className="mt-2 text-4xl font-bold text-slate-900">{selected.percentage}%</p>
                  {trend != null ? (
                    <p
                      className={cn(
                        'mt-2 flex items-center gap-1 text-sm font-medium',
                        trend >= 0 ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      <TrendingUp className="h-4 w-4" />
                      {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs previous test
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      {history.length > 1 ? 'Selected OMR test' : 'Latest OMR test'}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-orange-100">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Test rank</p>
                  <p className="mt-2 text-4xl font-bold text-slate-900">
                    {selected.finalRank ?? selected.testRank ?? '—'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">From OMR score list</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-orange-100">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total marks</p>
                  <p className="mt-2 text-4xl font-bold text-slate-900">{selected.totalMarks}</p>
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2">{selected.testTitle}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-orange-100">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Subject performance</h2>
                    <p className="text-sm text-slate-500">
                      {selected.testTitle}
                      {formatTestDate(selected.testDate)
                        ? ` · ${formatTestDate(selected.testDate)}`
                        : ''}
                    </p>
                  </div>
                  <BookOpen className="h-5 w-5 text-orange-500" />
                </div>
                <div className="space-y-4">
                  {subjects.map((s) => {
                    const max = subjectMax(s.score);
                    const marks = s.score?.marks || 0;
                    const pct = subjectPct(s.score);
                    return (
                      <div key={s.key}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-800">{s.key}</p>
                          <p className="text-sm text-slate-600">
                            <span className="font-bold text-slate-900">
                              {marks} / {max}
                            </span>{' '}
                            · Grade {gradeFor(pct)}
                          </p>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn('h-full rounded-full transition-all', s.color)}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {history.length > 1 ? (
              <Card className="rounded-2xl border-orange-100">
                <CardContent className="p-5">
                  <h3 className="mb-3 font-semibold text-slate-900">All OMR tests</h3>
                  <div className="space-y-2">
                    {history.map((h) => {
                      const active = h._id === selected._id;
                      return (
                        <button
                          key={h._id}
                          type="button"
                          onClick={() => setSelectedId(h._id)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                            active
                              ? 'border-orange-200 bg-orange-50/70'
                              : 'border-slate-100 bg-slate-50/60 hover:border-slate-200 hover:bg-white',
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{h.testTitle}</p>
                            <p className="text-xs text-slate-500">
                              Test #{h.testNo || '—'}
                              {formatTestDate(h.testDate) ? ` · ${formatTestDate(h.testDate)}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-bold text-slate-900">{h.percentage}%</p>
                              <p className="text-xs text-slate-500">
                                Rank {h.finalRank ?? h.testRank ?? '—'}
                              </p>
                            </div>
                            {active ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-600" />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </motion.div>
        )}
      </div>
    </StudentShell>
  );
}
