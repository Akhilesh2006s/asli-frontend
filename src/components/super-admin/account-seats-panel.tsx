import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, Loader2, RefreshCw, Save, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";

type SchoolSeatRow = {
  id: string;
  schoolName?: string;
  name?: string;
  email?: string;
  licensedStudents?: number;
  licensedTeachers?: number;
  accountSeatsNotes?: string;
  stats?: { students?: number; teachers?: number };
};

type DraftSeats = {
  licensedStudents: string;
  licensedTeachers: string;
  accountSeatsNotes: string;
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function usageClass(used: number, licensed: number): string {
  if (!licensed) return "text-slate-600";
  if (used > licensed) return "text-red-600 font-semibold";
  if (used / licensed >= 0.9) return "text-amber-700 font-medium";
  return "text-emerald-700";
}

export default function AccountSeatsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rows, setRows] = useState<SchoolSeatRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftSeats>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        headers: authHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to load schools");
      }
      const list: SchoolSeatRow[] = Array.isArray(json.data) ? json.data : [];
      setRows(list);
      const nextDrafts: Record<string, DraftSeats> = {};
      for (const row of list) {
        if (!row?.id) continue;
        nextDrafts[row.id] = {
          licensedStudents: String(row.licensedStudents ?? 0),
          licensedTeachers: String(row.licensedTeachers ?? 0),
          accountSeatsNotes: String(row.accountSeatsNotes ?? ""),
        };
      }
      setDrafts(nextDrafts);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Could not load account seats",
        variant: "destructive",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.schoolName, r.name, r.email].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.usedStudents += r.stats?.students || 0;
        acc.usedTeachers += r.stats?.teachers || 0;
        acc.licensedStudents += r.licensedStudents || 0;
        acc.licensedTeachers += r.licensedTeachers || 0;
        return acc;
      },
      { usedStudents: 0, usedTeachers: 0, licensedStudents: 0, licensedTeachers: 0 }
    );
  }, [filtered]);

  const saveRow = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const licensedStudents = Math.max(0, Math.floor(Number(draft.licensedStudents) || 0));
    const licensedTeachers = Math.max(0, Math.floor(Number(draft.licensedTeachers) || 0));
    setSavingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/admins/${id}/account-seats`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          licensedStudents,
          licensedTeachers,
          accountSeatsNotes: draft.accountSeatsNotes,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to save");
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                licensedStudents: json.data.licensedStudents,
                licensedTeachers: json.data.licensedTeachers,
                accountSeatsNotes: json.data.accountSeatsNotes,
                stats: {
                  ...r.stats,
                  students: json.data.usedStudents ?? r.stats?.students,
                  teachers: json.data.usedTeachers ?? r.stats?.teachers,
                },
              }
            : r
        )
      );
      setDrafts((prev) => ({
        ...prev,
        [id]: {
          licensedStudents: String(json.data.licensedStudents ?? 0),
          licensedTeachers: String(json.data.licensedTeachers ?? 0),
          accountSeatsNotes: String(json.data.accountSeatsNotes ?? ""),
        },
      }));
      toast({ title: "Saved", description: "Teacher and student seat limits updated." });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Could not save seats",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-orange-100 bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700 text-xs font-medium uppercase tracking-wide">
              <Users className="h-4 w-4" />
              Students used
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totals.usedStudents}
              <span className="text-sm font-medium text-slate-500"> / {totals.licensedStudents}</span>
            </p>
            <p className="text-xs text-slate-500">Across listed schools</p>
          </CardContent>
        </Card>
        <Card className="border-teal-100 bg-gradient-to-br from-teal-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-teal-700 text-xs font-medium uppercase tracking-wide">
              <GraduationCap className="h-4 w-4" />
              Teachers used
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totals.usedTeachers}
              <span className="text-sm font-medium text-slate-500"> / {totals.licensedTeachers}</span>
            </p>
            <p className="text-xs text-slate-500">Across listed schools</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Account seats by school</CardTitle>
            <CardDescription>
              Used counts are live from registered accounts. Licensed teacher and student seats are
              entered manually per school.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Input
              placeholder="Search school…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:w-56"
            />
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
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
          ) : !filtered.length ? (
            <p className="py-10 text-center text-sm text-slate-500">No schools found.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>School</TableHead>
                    <TableHead>Students used</TableHead>
                    <TableHead>Students licensed</TableHead>
                    <TableHead>Teachers used</TableHead>
                    <TableHead>Teachers licensed</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const draft = drafts[row.id] || {
                      licensedStudents: "0",
                      licensedTeachers: "0",
                      accountSeatsNotes: "",
                    };
                    const usedStudents = row.stats?.students || 0;
                    const usedTeachers = row.stats?.teachers || 0;
                    const licStudents = Number(draft.licensedStudents) || 0;
                    const licTeachers = Number(draft.licensedTeachers) || 0;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="min-w-[10rem]">
                            <p className="font-medium text-slate-900">
                              {row.schoolName || row.name || "School"}
                            </p>
                            <p className="text-xs text-slate-500 break-all">{row.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className={usageClass(usedStudents, licStudents)}>
                          {usedStudents}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            className="w-24"
                            value={draft.licensedStudents}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, licensedStudents: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell className={usageClass(usedTeachers, licTeachers)}>
                          {usedTeachers}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            className="w-24"
                            value={draft.licensedTeachers}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, licensedTeachers: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Optional note"
                            className="min-w-[8rem]"
                            value={draft.accountSeatsNotes}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, accountSeatsNotes: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingId === row.id}
                            onClick={() => saveRow(row.id)}
                          >
                            {savingId === row.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            <span className="ml-1.5">Save</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
