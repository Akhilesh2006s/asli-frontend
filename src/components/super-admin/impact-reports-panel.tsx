import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  FileText,
  Loader2,
  RefreshCw,
  School,
  Users,
  GraduationCap,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SchoolSnap = {
  _id?: string;
  adminId: string;
  schoolName?: string;
  schoolEmail?: string;
  location?: string;
  periodLabel?: string;
  teachersIssued?: number;
  teachersLoggedIn?: number;
  teachersActive?: number;
  teachersOccasional?: number;
  teachersInactive?: number;
  studentsIssued?: number;
  studentsAccessed?: number;
  studentsActive3Plus?: number;
  totalLearningSessions?: number;
  totalMinutesSpent?: number;
  aiExplanationsCount?: number;
  practiceAttempts?: number;
  repeatPracticeStudentPct?: number;
  avgSessionsPerActiveStudent?: number;
  keyObservation?: string;
  topSubjects?: Array<{ subject: string; sessions: number; pct: number }>;
  teachers?: Array<{ name: string; status: string; generationsCreated: number }>;
};

type Mode = "weekly" | "custom";

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfIsoWeekLocal(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

function authHeaders() {
  const token = getAuthToken() || "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function ImpactReportsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("");
  const [weekStart, setWeekStart] = useState(() => toInputDate(startOfIsoWeekLocal(new Date())));
  const [mode, setMode] = useState<Mode>("weekly");
  const [fromDate, setFromDate] = useState(() => toInputDate(new Date()));
  const [toDate, setToDate] = useState(() => toInputDate(new Date()));
  const [schools, setSchools] = useState<SchoolSnap[]>([]);
  const [selected, setSelected] = useState<SchoolSnap | null>(null);

  const periodQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (mode === "custom") {
      params.set("from", fromDate);
      params.set("to", toDate);
    } else {
      params.set("weekStart", weekStart);
    }
    return params;
  }, [mode, fromDate, toDate, weekStart]);

  const load = useCallback(
    async (build = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams(periodQuery);
        if (build) params.set("build", "1");
        const res = await fetch(`${API_BASE_URL}/api/super-admin/impact-reports?${params}`, {
          headers: authHeaders(),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to load");
        setPeriodLabel(json.data?.periodLabel || "");
        if (json.data?.weekStart && mode === "weekly") {
          setWeekStart(toInputDate(new Date(json.data.weekStart)));
        }
        setSchools(Array.isArray(json.data?.schools) ? json.data.schools : []);
      } catch (e: unknown) {
        toast({
          title: "Impact reports",
          description: e instanceof Error ? e.message : "Could not load",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, periodQuery, mode],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const shiftWeek = (delta: number) => {
    const d = new Date(`${weekStart}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setWeekStart(toInputDate(startOfIsoWeekLocal(d)));
  };

  const runPeriod = async () => {
    setRunning(true);
    try {
      const body =
        mode === "custom"
          ? { force: true, from: fromDate, to: toDate }
          : { force: true, weekStart };
      const res = await fetch(`${API_BASE_URL}/api/super-admin/impact-reports/run`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Run failed");
      toast({
        title: "Reports generated",
        description: `${json.data?.periodLabel || periodLabel || "Period"} — schools processed.`,
      });
      await load(false);
    } catch (e: unknown) {
      toast({
        title: "Generate failed",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const downloadPdf = async (adminId: string, name: string) => {
    try {
      const params = new URLSearchParams(periodQuery);
      const res = await fetch(
        `${API_BASE_URL}/api/super-admin/impact-reports/${adminId}/pdf?${params}`,
        { headers: { Authorization: authHeaders().Authorization } },
      );
      if (!res.ok) throw new Error("PDF download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `school-impact-${name.replace(/\s+/g, "-").slice(0, 40)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast({
        title: "PDF",
        description: e instanceof Error ? e.message : "Failed",
        variant: "destructive",
      });
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-800",
      occasional: "bg-amber-100 text-amber-800",
      inactive: "bg-slate-100 text-slate-600",
    };
    return map[s] || map.inactive;
  };

  return (
    <Card className="border-orange-100 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Weekly School Impact Reports
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Pick a week or a custom date range, generate, then download PDF.
              {periodLabel ? (
                <>
                  {" "}
                  Showing: <strong>{periodLabel}</strong>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button size="sm" onClick={() => void runPeriod()} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              Generate for period
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "weekly" ? "default" : "outline"}
              onClick={() => setMode("weekly")}
            >
              Weekly
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "custom" ? "default" : "outline"}
              onClick={() => setMode("custom")}
            >
              Day to day
            </Button>
          </div>

          {mode === "weekly" ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="impact-week">Week of (any day in that week)</Label>
                <Input
                  id="impact-week"
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="w-[180px] bg-white"
                />
              </div>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => shiftWeek(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Prev week
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => shiftWeek(1)}>
                  Next week
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button type="button" size="sm" onClick={() => void load(true)} disabled={loading}>
                Apply week
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="impact-from">From</Label>
                <Input
                  id="impact-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-[160px] bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="impact-to">To</Label>
                <Input
                  id="impact-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-[160px] bg-white"
                />
              </div>
              <Button type="button" size="sm" onClick={() => void load(true)} disabled={loading}>
                Apply range
              </Button>
              <p className="text-xs text-slate-500 w-full sm:w-auto">
                Max 93 days. Click Generate, then PDF on each school.
              </p>
            </div>
          )}
        </div>

        {loading && !schools.length ? (
          <p className="text-sm text-slate-500">Loading school snapshots…</p>
        ) : !schools.length ? (
          <p className="text-sm text-slate-500">
            No snapshots for this period yet. Click <strong>Generate for period</strong> to build from live usage,
            then download PDF.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">School</th>
                  <th className="px-3 py-2">Teachers active</th>
                  <th className="px-3 py-2">Students accessed</th>
                  <th className="px-3 py-2">Sessions</th>
                  <th className="px-3 py-2">AI / Practice</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => (
                  <tr key={String(s.adminId)} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{s.schoolName || "School"}</div>
                      <div className="text-xs text-slate-500">{s.location || s.schoolEmail}</div>
                    </td>
                    <td className="px-3 py-2">
                      {s.teachersActive ?? 0}
                      <span className="text-slate-400"> / {s.teachersIssued ?? 0}</span>
                    </td>
                    <td className="px-3 py-2">
                      {s.studentsAccessed ?? 0}
                      <span className="text-slate-400"> / {s.studentsIssued ?? 0}</span>
                    </td>
                    <td className="px-3 py-2">{s.totalLearningSessions ?? 0}</td>
                    <td className="px-3 py-2">
                      {s.aiExplanationsCount ?? 0} / {s.practiceAttempts ?? 0}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => setSelected(s)}>
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void downloadPdf(String(s.adminId), s.schoolName || "school")}
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected ? (
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <School className="h-4 w-4 text-orange-600" />
                  {selected.schoolName}
                </h3>
                <p className="text-xs text-slate-500">{selected.periodLabel || periodLabel}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
            <p className="text-sm text-slate-700">{selected.keyObservation}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Active teachers" value={selected.teachersActive} icon={GraduationCap} />
              <Stat label="Students accessed" value={selected.studentsAccessed} icon={Users} />
              <Stat label="Sessions" value={selected.totalLearningSessions} icon={Activity} />
              <Stat label="Repeat practice %" value={selected.repeatPracticeStudentPct} icon={FileText} />
            </div>
            {selected.topSubjects?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Top subjects</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.topSubjects.map((row) => (
                    <Badge key={row.subject} variant="secondary">
                      {row.subject}: {row.pct}%
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {selected.teachers?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Teachers</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.teachers.map((t) => (
                    <Badge
                      key={`${t.name}-${t.status}`}
                      className={cn(statusBadge(t.status))}
                    >
                      {t.name || "Teacher"} · {t.status} · {t.generationsCreated} gens
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-white bg-white/90 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-lg font-semibold text-slate-900">{value ?? 0}</p>
    </div>
  );
}

export default ImpactReportsPanel;
