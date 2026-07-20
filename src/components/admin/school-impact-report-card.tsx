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
  Users,
  GraduationCap,
  Activity,
} from "lucide-react";

type SchoolSnap = {
  schoolName?: string;
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
  practiceCorrectRate?: number;
  keyObservation?: string;
  topSubjects?: Array<{ subject: string; sessions: number; pct: number }>;
  teachers?: Array<{ name: string; status: string; generationsCreated: number; email?: string }>;
};

export function SchoolImpactReportCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [snap, setSnap] = useState<SchoolSnap | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/impact-report`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load");
      setSnap(json.data || null);
    } catch (e: unknown) {
      toast({
        title: "School impact report",
        description: e instanceof Error ? e.message : "Could not load",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadPdf = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/impact-report/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
      });
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `school-impact-${(snap?.schoolName || "school").replace(/\s+/g, "-")}.pdf`;
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

  return (
    <Card className="border-orange-100 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Weekly School Impact Snapshot
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {snap?.periodLabel || "Current week"} · your school only
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={() => void downloadPdf()} disabled={!snap}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !snap ? (
          <p className="text-sm text-slate-500">Building snapshot from live usage…</p>
        ) : !snap ? (
          <p className="text-sm text-slate-500">No data yet for this week.</p>
        ) : (
          <>
            <p className="text-sm text-slate-700">{snap.keyObservation}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <Mini label="Teachers active" value={`${snap.teachersActive ?? 0}/${snap.teachersIssued ?? 0}`} icon={GraduationCap} />
              <Mini label="Students accessed" value={`${snap.studentsAccessed ?? 0}/${snap.studentsIssued ?? 0}`} icon={Users} />
              <Mini label="Sessions" value={String(snap.totalLearningSessions ?? 0)} icon={Activity} />
              <Mini label="Repeat practice" value={`${snap.repeatPracticeStudentPct ?? 0}%`} icon={FileText} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <p><span className="text-slate-500">AI doubts:</span> {snap.aiExplanationsCount ?? 0}</p>
              <p><span className="text-slate-500">Practice attempts:</span> {snap.practiceAttempts ?? 0}</p>
              <p><span className="text-slate-500">Minutes:</span> {snap.totalMinutesSpent ?? 0}</p>
              <p><span className="text-slate-500">Occasional teachers:</span> {snap.teachersOccasional ?? 0}</p>
              <p><span className="text-slate-500">Inactive teachers:</span> {snap.teachersInactive ?? 0}</p>
              <p><span className="text-slate-500">Avg sessions / student:</span> {snap.avgSessionsPerActiveStudent ?? 0}</p>
            </div>
            {snap.topSubjects?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {snap.topSubjects.map((s) => (
                  <Badge key={s.subject} variant="secondary">
                    {s.subject}: {s.pct}%
                  </Badge>
                ))}
              </div>
            ) : null}
            {snap.teachers?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {snap.teachers.map((t) => (
                  <Badge
                    key={`${t.email || t.name}-${t.status}`}
                    className={
                      t.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : t.status === "occasional"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                    }
                  >
                    {t.name || "Teacher"} · {t.status}
                  </Badge>
                ))}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Mini({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2">
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default SchoolImpactReportCard;
