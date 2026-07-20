import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api-config";
import { FileText, Loader2, RefreshCw } from "lucide-react";

type Digest = {
  title?: string;
  summary?: string;
  highlights?: string[];
  metrics?: Record<string, unknown>;
  weekStart?: string;
};

/**
 * In-app weekly digest for teacher or student dashboards.
 * @param apiBase either `/api/teacher` or `/api/student`
 */
export function WeeklyDigestCard({ apiBase }: { apiBase: "/api/teacher" | "/api/student" }) {
  const [loading, setLoading] = useState(true);
  const [digest, setDigest] = useState<Digest | null>(null);

  const load = async (build = false) => {
    setLoading(true);
    try {
      const q = build ? "?build=1" : "";
      const res = await fetch(`${API_BASE_URL}${apiBase}/weekly-digest${q}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
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
    void load(false);
  }, [apiBase]);

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
