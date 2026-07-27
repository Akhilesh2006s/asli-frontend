import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";

type AuditItem = {
  _id: string;
  at: string;
  action: string;
  summary: string;
  method: string;
  path: string;
  statusCode: number | null;
  requestId?: string;
  ip?: string;
  actor?: { id?: string | null; role?: string | null; email?: string | null; name?: string | null };
  target?: { type?: string | null; id?: string | null; label?: string | null; email?: string | null };
  meta?: Record<string, unknown>;
  source?: string;
};

type DateMode = "all" | "weekly" | "custom";

function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfIsoWeekLocal(d: Date) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function endOfIsoWeekLocal(weekStartYmd: string) {
  const [y, m, d] = weekStartYmd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 6);
  return toInputDate(date);
}

function authHeaders() {
  const token = getAuthToken() || "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AuditLogsPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("all");
  const [weekStart, setWeekStart] = useState(() => toInputDate(startOfIsoWeekLocal(new Date())));
  const [fromDate, setFromDate] = useState(() => toInputDate(new Date()));
  const [toDate, setToDate] = useState(() => toInputDate(new Date()));
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(
    async (pageNum = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "40",
        });
        if (q.trim()) params.set("q", q.trim());
        if (action.trim()) params.set("action", action.trim());
        if (actor.trim()) params.set("actor", actor.trim());

        if (dateMode === "weekly") {
          const start = toInputDate(startOfIsoWeekLocal(new Date(`${weekStart}T12:00:00`)));
          params.set("from", start);
          params.set("to", endOfIsoWeekLocal(start));
        } else if (dateMode === "custom") {
          if (fromDate) params.set("from", fromDate);
          if (toDate) params.set("to", toDate);
        }

        const res = await fetch(`${API_BASE_URL}/api/super-admin/audit-logs?${params}`, {
          headers: authHeaders(),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load audit logs");
        }
        setItems(json.data.items || []);
        setPage(json.data.page || pageNum);
        setTotalPages(json.data.totalPages || 1);
        setTotal(json.data.total || 0);
      } catch (err: any) {
        toast({
          title: "Audit logs",
          description: err?.message || "Could not load logs",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [page, q, action, actor, dateMode, weekStart, fromDate, toDate, toast],
  );

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shiftWeek = (delta: number) => {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(toInputDate(startOfIsoWeekLocal(d)));
  };

  return (
    <div className="space-y-4">
      <Card className="border-orange-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScrollText className="h-5 w-5 text-orange-500" />
            Audit logs
          </CardTitle>
          <p className="text-sm text-slate-600">
            Every API call is stored with who, when, path, and status — including logins,
            reads, creates, updates, and deletes. Logs start from when this feature was
            deployed (older activity is not backfilled). High-noise paths (health checks,
            live streams) are excluded.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="audit-q">Search</Label>
              <Input
                id="audit-q"
                placeholder="email, path, student name, request id…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-action">Action</Label>
              <Input
                id="audit-action"
                placeholder="e.g. student.delete"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-actor">Actor</Label>
              <Input
                id="audit-actor"
                placeholder="email / role / id"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={dateMode === "all" ? "default" : "outline"}
                onClick={() => setDateMode("all")}
              >
                All time
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dateMode === "weekly" ? "default" : "outline"}
                onClick={() => setDateMode("weekly")}
              >
                Weekly
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dateMode === "custom" ? "default" : "outline"}
                onClick={() => setDateMode("custom")}
              >
                Day to day
              </Button>
            </div>

            {dateMode === "weekly" ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="audit-week">Week of (any day in that week)</Label>
                  <Input
                    id="audit-week"
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
              </div>
            ) : null}

            {dateMode === "custom" ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="audit-from">From</Label>
                  <Input
                    id="audit-from"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-[160px] bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="audit-to">To</Label>
                  <Input
                    id="audit-to"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-[160px] bg-white"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => void load(1)}
              disabled={loading}
              className="gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void load(page)}
              disabled={loading}
            >
              Refresh
            </Button>
            <span className="text-xs text-slate-500">{total} events</span>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Who</th>
                <th className="px-3 py-2 font-medium">Target / summary</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    No audit events yet. Perform an action (e.g. edit a student) then refresh.
                  </td>
                </tr>
              ) : null}
              {items.map((row) => (
                <tr
                  key={row._id}
                  className="border-t border-slate-100 align-top hover:bg-orange-50/40 cursor-pointer"
                  onClick={() => setExpanded((id) => (id === row._id ? null : row._id))}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                    {formatWhen(row.at)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {row.action}
                    </Badge>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {row.method} {row.path}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium text-slate-800">
                      {row.actor?.email || row.actor?.name || "—"}
                    </div>
                    <div className="text-slate-500">{row.actor?.role || "anonymous"}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    {row.summary}
                    {expanded === row._id ? (
                      <pre className="mt-2 max-w-xl overflow-auto rounded bg-slate-50 p-2 text-[10px] text-slate-600">
                        {JSON.stringify(
                          {
                            target: row.target,
                            ip: row.ip,
                            requestId: row.requestId,
                            meta: row.meta,
                            source: row.source,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        row.statusCode && row.statusCode >= 400 ? "destructive" : "secondary"
                      }
                    >
                      {row.statusCode ?? "—"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500">
            Page {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => void load(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
