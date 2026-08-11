import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api-config";
import {
  FileText,
  Loader2,
  RefreshCw,
  LogIn,
  Clock,
  BookOpen,
  Brain,
  ClipboardList,
  Flame,
  Target,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth-utils";

type ExamRow = {
  title?: string;
  percentage?: number;
  obtainedMarks?: number;
  totalMarks?: number;
  completedAt?: string | null;
};

type DigestMetrics = {
  activationDate?: string | null;
  loginCount?: number;
  loginDays?: number;
  lastActiveDate?: string | null;
  lifetimeLoginDays?: number;
  sessions?: number;
  minutes?: number;
  totalTimeLabel?: string;
  avgSessionMinutes?: number;
  daysActive?: number;
  topicsPractised?: number;
  topicsRepeated?: number;
  repeatPracticePct?: number;
  aiDoubts?: number;
  aiToolUses?: number;
  aiExplanations?: number;
  practiceAttempts?: number;
  practiceAccuracy?: number;
  iqAttempts?: number;
  homeworkSubmissions?: number;
  topSubjects?: string[];
  videosWatched?: number;
  chaptersCompleted?: number;
  streak?: number;
  masteryPct?: number;
  examAttempts?: number;
  avgExamPct?: number;
  bestExamPct?: number;
  examQuestionAccuracy?: number;
  exams?: ExamRow[];
};

type Digest = {
  title?: string;
  summary?: string;
  highlights?: string[];
  metrics?: DigestMetrics;
  weekStart?: string;
  weekEnd?: string;
};

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof LogIn;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5 pt-1">
      <Icon className="h-3.5 w-3.5 text-sky-600" />
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</p>
    </div>
  );
}

function n(v: unknown, fallback = 0) {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * In-app weekly digest for teacher or student dashboards.
 * @param apiBase either `/api/teacher` or `/api/student`
 */
export function WeeklyDigestCard({ apiBase }: { apiBase: "/api/teacher" | "/api/student" }) {
  const [loading, setLoading] = useState(true);
  const [digest, setDigest] = useState<Digest | null>(null);
  const isStudent = apiBase === "/api/student";

  const load = async (build = false) => {
    setLoading(true);
    try {
      const q = build ? "?build=1" : "";
      const res = await fetch(`${API_BASE_URL}${apiBase}/weekly-digest${q}`, {
        headers: { Authorization: `Bearer ${getAuthToken() || ""}` },
      });
      const json = await res.json();
      if (res.ok) setDigest(json.data || null);
      else setDigest(null);
    } catch {
      setDigest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(isStudent);
  }, [apiBase]);

  const m = digest?.metrics || {};
  const exams = Array.isArray(m.exams) ? m.exams : [];

  const hasRichStudentMetrics = useMemo(() => {
    if (!isStudent || !digest?.metrics) return false;
    return (
      "loginCount" in digest.metrics ||
      "examAttempts" in digest.metrics ||
      "aiExplanations" in digest.metrics ||
      "topicsPractised" in digest.metrics
    );
  }, [digest, isStudent]);

  return (
    <Card className="border-sky-100 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-600" />
            Weekly report
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void load(true)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !digest ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !digest ? (
          <p className="text-sm text-slate-500">
            Your weekly digest will appear here every Monday. Tap refresh to build one for this week.
          </p>
        ) : hasRichStudentMetrics ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{digest.title}</p>
              <p className="text-xs text-slate-500">{digest.summary}</p>
            </div>

            <SectionTitle icon={LogIn} title="Adoption" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <MetricTile label="Logins this week" value={n(m.loginCount)} hint="Days you opened the app" />
              <MetricTile label="Last active" value={m.lastActiveDate || "—"} />
              <MetricTile label="First activation" value={m.activationDate || "—"} />
            </div>

            <SectionTitle icon={Clock} title="Engagement" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <MetricTile label="Learning sessions" value={n(m.sessions)} />
              <MetricTile label="Total time" value={m.totalTimeLabel || `${n(m.minutes)} min`} />
              <MetricTile
                label="Avg session"
                value={n(m.avgSessionMinutes) > 0 ? `${n(m.avgSessionMinutes)} min` : "—"}
              />
            </div>

            <SectionTitle icon={BookOpen} title="Learning behaviour" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <MetricTile label="Topics practised" value={n(m.topicsPractised)} />
              <MetricTile label="Repeated topics" value={n(m.topicsRepeated)} />
              <MetricTile label="Repeat practice" value={`${n(m.repeatPracticePct)}%`} />
            </div>

            <SectionTitle icon={Brain} title="AI usage" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <MetricTile
                label="AI uses"
                value={n(m.aiExplanations)}
                hint={`Vidya ${n(m.aiDoubts)} · Tools ${n(m.aiToolUses)}`}
              />
              <MetricTile label="Practice / quizzes" value={n(m.practiceAttempts) + n(m.iqAttempts)} />
              <MetricTile
                label="Accuracy"
                value={n(m.practiceAttempts) > 0 ? `${n(m.practiceAccuracy)}%` : "—"}
              />
            </div>

            <SectionTitle icon={ClipboardList} title="Exams" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <MetricTile label="Exams written" value={n(m.examAttempts)} />
              <MetricTile
                label="Average score"
                value={n(m.examAttempts) > 0 ? `${n(m.avgExamPct)}%` : "—"}
              />
              <MetricTile
                label="Best score"
                value={n(m.examAttempts) > 0 ? `${n(m.bestExamPct)}%` : "—"}
              />
            </div>
            {exams.length > 0 ? (
              <ul className="space-y-1.5 rounded-xl border border-slate-100 bg-white px-3 py-2">
                {exams.slice(0, 6).map((exam, idx) => (
                  <li
                    key={`${exam.title}-${idx}`}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 text-slate-700 line-clamp-2">{exam.title}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                      {n(exam.percentage)}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No exams written this week yet.</p>
            )}

            <SectionTitle icon={Target} title="Content & progress" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <MetricTile
                label="Top subjects"
                value={m.topSubjects?.length ? m.topSubjects.slice(0, 2).join(", ") : "—"}
              />
              <MetricTile label="Videos watched" value={n(m.videosWatched)} />
              <MetricTile label="Chapters updated" value={n(m.chaptersCompleted)} />
              <MetricTile
                label="Current streak"
                value={n(m.streak) > 0 ? `${n(m.streak)} days` : "0"}
              />
              <MetricTile label="Mastery" value={`${n(m.masteryPct)}%`} />
              <MetricTile label="Homework submitted" value={n(m.homeworkSubmissions)} />
            </div>

            {(digest.highlights || []).length > 0 ? (
              <div className="rounded-xl bg-sky-50/80 border border-sky-100 px-3 py-2">
                <p className="text-xs font-bold text-sky-800 mb-1 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" />
                  This week at a glance
                </p>
                <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1">
                  {(digest.highlights || []).map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">{digest.title}</p>
            <p className="text-xs text-slate-500">{digest.summary}</p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              {(digest.highlights || []).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WeeklyDigestCard;
