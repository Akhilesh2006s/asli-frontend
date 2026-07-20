import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/api-config";
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
} from "lucide-react";

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

export function ImpactReportsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [schools, setSchools] = useState<SchoolSnap[]>([]);
  const [selected, setSelected] = useState<SchoolSnap | null>(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
    "Content-Type": "application/json",
  });

  const load = useCallback(async (build = false) => {
    setLoading(true);
    try {
      const q = build ? "?build=1" : "";
      const res = await fetch(`${API_BASE_URL}/api/super-admin/impact-reports${q}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load");
      setPeriodLabel(json.data?.periodLabel || "");
      setWeekStart(json.data?.weekStart || "");
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
  }, [toast]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const runWeek = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/impact-reports/run`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ force: true, weekStart: weekStart || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Run failed");
      toast({
        title: "Weekly reports generated",
        description: `Schools processed. Digests: ${json.data?.digests ?? "—"}. Emails: ${JSON.stringify(json.data?.email || {})}`,
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
      const res = await fetch(
        `${API_BASE_URL}/api/super-admin/impact-reports/${adminId}/pdf${weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : ""}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` } },
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
              Auto-builds every Monday. Period: <strong>{periodLabel || "current week"}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button size="sm" onClick={() => void runWeek()} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              Generate this week
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !schools.length ? (
          <p className="text-sm text-slate-500">Loading school snapshots…</p>
        ) : !schools.length ? (
          <p className="text-sm text-slate-500">
            No snapshots yet. Click <strong>Generate this week</strong> to build reports from live usage.
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
                <p className="text-xs text-slate-500">{selected.periodLabel}</p>
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
                    <Badge key={`${t.name}-${t.status}`} className={statusBadge(t.status)}>
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
