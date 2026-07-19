import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, GitMerge, RefreshCw, Copy, Layers, Eye, Columns2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { GeneratedRecordBody } from "@/components/super-admin/generated-record-body";
import { normalizeAiToolResponsePayload } from "@/lib/ai-tool-response-payload";

type DuplicateMember = {
  _id: string;
  toolName: string;
  toolDisplayName: string;
  board: string;
  classLabel: string;
  subject: string;
  topic: string;
  subtopic: string;
  sourceType: string;
  reviewStatus: string;
  createdAt?: string;
  title?: string;
  preview: string;
  contentFingerprint: string;
  questionCount: number;
  suggestedPrimary: boolean;
};

type DuplicateGroup = {
  groupId: string;
  toolName: string;
  toolDisplayName: string;
  board: string;
  classLabel: string;
  subject: string;
  topic: string;
  subtopic: string;
  similarity: number;
  reason: string;
  count: number;
  suggestedPrimaryId: string;
  members: DuplicateMember[];
};

type FullRecordView = {
  id: string;
  title: string;
  toolName: string;
  content: string;
  loading: boolean;
  error?: string;
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function reasonLabel(reason: string) {
  if (reason === "identical_fingerprint") return "Same fingerprint";
  if (reason === "question_overlap") return "Shared questions";
  if (reason === "content_similarity") return "Similar text";
  return reason || "Similar";
}

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function cleanPreview(preview: string, title?: string) {
  const { formatted } = normalizeAiToolResponsePayload(preview);
  let text = (formatted || preview || "").replace(/\s+/g, " ").trim();
  // Strip leftover envelope if API still returns raw JSON.
  if (text.startsWith("{") && text.includes('"formatted"')) {
    try {
      const parsed = JSON.parse(preview);
      if (typeof parsed?.formatted === "string") {
        text = parsed.formatted.replace(/\s+/g, " ").trim();
      }
    } catch {
      /* keep text */
    }
  }
  if (!text || text === "(empty)") return "No preview text";
  if (title && text.toLowerCase().startsWith(title.toLowerCase())) {
    const rest = text.slice(title.length).replace(/^[\s:.\-–—]+/, "");
    return rest || text;
  }
  return text;
}

function memberTitle(member: DuplicateMember) {
  if (member.title && !member.title.startsWith("{")) return member.title;
  const { formatted } = normalizeAiToolResponsePayload(member.preview);
  const lines = (formatted || member.preview || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    const cleaned = line
      .replace(/^#+\s*/, "")
      .replace(/^Deck Title:\s*/i, "")
      .replace(/^Title:\s*/i, "")
      .trim();
    if (cleaned.length >= 4 && cleaned.length <= 120 && !cleaned.startsWith("{")) return cleaned;
  }
  return member.title || "Untitled record";
}

async function fetchFullRecord(id: string, fallbackTitle: string, toolName: string): Promise<FullRecordView> {
  const res = await fetch(`${API_BASE_URL}/api/super-admin/ai-tool-generations/document/${id}`, {
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || "Failed to load record");
  }
  const rawContent = json.data?.content || json.data?.generatedContent || "";
  const { formatted } = normalizeAiToolResponsePayload(rawContent);
  return {
    id,
    title: fallbackTitle || "Record",
    toolName: json.data?.toolName || toolName,
    content: formatted || String(rawContent || ""),
    loading: false,
  };
}

export default function AiToolDuplicatesPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [scannedRecords, setScannedRecords] = useState(0);
  const [candidateRecords, setCandidateRecords] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalRecordsInGroups, setTotalRecordsInGroups] = useState(0);
  const [totalExtraRecords, setTotalExtraRecords] = useState(0);
  const [truncatedGroups, setTruncatedGroups] = useState(false);
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [primaryByGroup, setPrimaryByGroup] = useState<Record<string, string>>({});
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});
  const [confirmGroup, setConfirmGroup] = useState<DuplicateGroup | null>(null);
  const [confirmMergeAll, setConfirmMergeAll] = useState(false);
  const [mergingAll, setMergingAll] = useState(false);
  const [viewRecords, setViewRecords] = useState<FullRecordView[]>([]);
  const [viewOpen, setViewOpen] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (toolFilter !== "all") qs.set("toolName", toolFilter);
      qs.set("limit", "2000");
      const res = await fetch(
        `${API_BASE_URL}/api/super-admin/ai-tool-generations/duplicates?${qs.toString()}`,
        { headers: authHeaders() },
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to load duplicates");
      }
      const list: DuplicateGroup[] = Array.isArray(json.data?.groups) ? json.data.groups : [];
      setGroups(list);
      setScannedRecords(Number(json.data?.scannedRecords) || 0);
      setCandidateRecords(Number(json.data?.candidateRecords) || 0);
      setTotalGroups(Number(json.data?.totalGroups) || list.length);
      setTotalRecordsInGroups(Number(json.data?.totalRecordsInGroups) || 0);
      setTotalExtraRecords(Number(json.data?.totalExtraRecords) || 0);
      setTruncatedGroups(Boolean(json.data?.truncatedGroups));

      const primaries: Record<string, string> = {};
      const selected: Record<string, string[]> = {};
      for (const group of list) {
        const primaryId = group.suggestedPrimaryId || group.members[0]?._id || "";
        primaries[group.groupId] = primaryId;
        selected[group.groupId] = group.members
          .map((m) => m._id)
          .filter((id) => id !== primaryId);
      }
      setPrimaryByGroup(primaries);
      setSelectedByGroup(selected);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load";
      setError(
        message === "Failed to fetch"
          ? "Could not reach the API. Restart the backend and refresh."
          : message,
      );
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [toolFilter]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const toolOptions = Array.from(
    new Map(groups.map((g) => [g.toolName, g.toolDisplayName || g.toolName])).entries(),
  );

  const setPrimary = (groupId: string, memberId: string) => {
    setPrimaryByGroup((prev) => ({ ...prev, [groupId]: memberId }));
    setSelectedByGroup((prev) => {
      const group = groups.find((g) => g.groupId === groupId);
      if (!group) return prev;
      const current = new Set(prev[groupId] || []);
      current.delete(memberId);
      for (const m of group.members) {
        if (m._id !== memberId) current.add(m._id);
      }
      return { ...prev, [groupId]: Array.from(current) };
    });
  };

  const toggleSelected = (groupId: string, memberId: string, checked: boolean) => {
    const primaryId = primaryByGroup[groupId];
    if (memberId === primaryId) return;
    setSelectedByGroup((prev) => {
      const set = new Set(prev[groupId] || []);
      if (checked) set.add(memberId);
      else set.delete(memberId);
      return { ...prev, [groupId]: Array.from(set) };
    });
  };

  const openViewFull = async (member: DuplicateMember, group: DuplicateGroup) => {
    setViewOpen(true);
    setViewRecords([
      {
        id: member._id,
        title: member.title || "Record",
        toolName: group.toolName,
        content: "",
        loading: true,
      },
    ]);
    try {
      const full = await fetchFullRecord(member._id, member.title || "Record", group.toolName);
      setViewRecords([full]);
    } catch (e: unknown) {
      setViewRecords([
        {
          id: member._id,
          title: member.title || "Record",
          toolName: group.toolName,
          content: "",
          loading: false,
          error: e instanceof Error ? e.message : "Failed to load",
        },
      ]);
    }
  };

  const openCompare = async (group: DuplicateGroup, memberId: string) => {
    const primaryId = primaryByGroup[group.groupId] || group.suggestedPrimaryId;
    const primary = group.members.find((m) => m._id === primaryId);
    const other = group.members.find((m) => m._id === memberId);
    if (!primary || !other) return;

    setViewOpen(true);
    setViewRecords([
      { id: primary._id, title: `Primary · ${primary.title || "Record"}`, toolName: group.toolName, content: "", loading: true },
      { id: other._id, title: `Compare · ${other.title || "Record"}`, toolName: group.toolName, content: "", loading: true },
    ]);

    const results = await Promise.allSettled([
      fetchFullRecord(primary._id, primary.title || "Record", group.toolName),
      fetchFullRecord(other._id, other.title || "Record", group.toolName),
    ]);

    const errMsg = (r: PromiseSettledResult<FullRecordView>) =>
      r.status === "rejected"
        ? r.reason instanceof Error
          ? r.reason.message
          : "Failed to load"
        : "";

    setViewRecords([
      results[0].status === "fulfilled"
        ? { ...results[0].value, title: `Primary · ${results[0].value.title}` }
        : {
            id: primary._id,
            title: `Primary · ${primary.title || "Record"}`,
            toolName: group.toolName,
            content: "",
            loading: false,
            error: errMsg(results[0]),
          },
      results[1].status === "fulfilled"
        ? { ...results[1].value, title: `Compare · ${results[1].value.title}` }
        : {
            id: other._id,
            title: `Compare · ${other.title || "Record"}`,
            toolName: group.toolName,
            content: "",
            loading: false,
            error: errMsg(results[1]),
          },
    ]);
  };

  const runMergeAll = async () => {
    if (totalGroups === 0 || totalExtraRecords === 0) {
      toast({
        title: "Nothing to merge",
        description: "No duplicate groups found.",
        variant: "destructive",
      });
      return;
    }

    setMergingAll(true);
    try {
      const body: Record<string, string> = {};
      if (toolFilter !== "all") body.toolName = toolFilter;
      const res = await fetch(
        `${API_BASE_URL}/api/super-admin/ai-tool-generations/duplicates/merge-all`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Merge all failed");
      }
      toast({
        title: "Merge all complete",
        description:
          json.message ||
          `Archived ${json.data?.archivedCount ?? totalExtraRecords} extras across ${json.data?.groupsMerged ?? totalGroups} groups.`,
      });
      setConfirmMergeAll(false);
      await loadGroups();
    } catch (e: unknown) {
      toast({
        title: "Merge all failed",
        description: e instanceof Error ? e.message : "Could not merge all groups",
        variant: "destructive",
      });
    } finally {
      setMergingAll(false);
    }
  };

  const runMerge = async (group: DuplicateGroup) => {
    const primaryId = primaryByGroup[group.groupId];
    const duplicateIds = (selectedByGroup[group.groupId] || []).filter((id) => id !== primaryId);
    if (!primaryId || duplicateIds.length === 0) {
      toast({
        title: "Nothing to merge",
        description: "Pick a primary record and at least one duplicate.",
        variant: "destructive",
      });
      return;
    }

    setMerging(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/super-admin/ai-tool-generations/duplicates/merge`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ primaryId, duplicateIds }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Merge failed");
      }
      toast({
        title: "Merged",
        description: json.message || `Archived ${duplicateIds.length} duplicate(s).`,
      });
      setConfirmGroup(null);
      await loadGroups();
    } catch (e: unknown) {
      toast({
        title: "Merge failed",
        description: e instanceof Error ? e.message : "Could not merge",
        variant: "destructive",
      });
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="w-full max-w-[min(100%,1200px)] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Copy className="w-6 h-6 text-violet-600" />
            AI Tool Data Duplicates
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review near-duplicates, open full content to cross-check, then merge. Primary is kept;
            selected duplicates are archived (hidden from teachers/students).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void loadGroups()}
            disabled={loading || merging || mergingAll}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Scan again
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-700"
            onClick={() => setConfirmMergeAll(true)}
            disabled={loading || merging || mergingAll || totalExtraRecords === 0}
          >
            {mergingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <GitMerge className="w-4 h-4 mr-2" />
            )}
            Merge all ({totalExtraRecords.toLocaleString()})
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="pt-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 min-w-[200px]">
            <Label>Filter by tool</Label>
            <Select value={toolFilter} onValueChange={setToolFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All tools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tools</SelectItem>
                {toolOptions.map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-slate-600 pb-2 space-y-2">
            <p>
              Scanned <strong>{scannedRecords.toLocaleString()}</strong> active records · compared{" "}
              <strong>{candidateRecords.toLocaleString()}</strong> in multi-record scopes
              {groups.length < totalGroups ? ` · showing ${groups.length} of ${totalGroups} groups` : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-slate-500">Duplicate groups</p>
                <p className="text-lg font-semibold text-slate-900">{totalGroups.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-slate-500">In those groups</p>
                <p className="text-lg font-semibold text-slate-900">
                  {totalRecordsInGroups.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                <p className="text-violet-700">Extras to archive</p>
                <p className="text-lg font-semibold text-violet-800">
                  {totalExtraRecords.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-emerald-700">Primaries to keep</p>
                <p className="text-lg font-semibold text-emerald-800">
                  {totalGroups.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Unique / unchanged (not in any duplicate group):{" "}
              <strong className="text-slate-700">
                {Math.max(0, scannedRecords - totalRecordsInGroups).toLocaleString()}
              </strong>
              {" · "}
              Active after merging all groups:{" "}
              <strong className="text-slate-700">
                {Math.max(0, scannedRecords - totalExtraRecords).toLocaleString()}
              </strong>
              {" "}
              ({scannedRecords.toLocaleString()} − {totalExtraRecords.toLocaleString()} extras)
            </p>
            {truncatedGroups && (
              <p className="text-amber-700 text-xs">
                Some groups were truncated in the list — use the tool filter to narrow results.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Scanning for duplicates…
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-600">
            <Layers className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-800">No duplicates found</p>
            <p className="text-sm mt-1">
              Active AI Tool Data records look unique for the current filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const primaryId = primaryByGroup[group.groupId] || group.suggestedPrimaryId;
            const selected = new Set(selectedByGroup[group.groupId] || []);
            const scopeLine = [group.board, group.classLabel, group.subject, group.topic, group.subtopic]
              .filter(Boolean)
              .join(" · ");

            return (
              <Card key={group.groupId} className="border-violet-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-violet-50/60 border-b border-violet-100 py-3 px-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-semibold text-slate-900">
                        {group.toolDisplayName || group.toolName}
                      </CardTitle>
                      <p className="text-xs text-slate-600 mt-1 break-words" title={scopeLine}>
                        {scopeLine || "No curriculum labels"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Badge variant="secondary">{group.count} records</Badge>
                      <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">
                        {Math.round(group.similarity * 100)}% · {reasonLabel(group.reason)}
                      </Badge>
                      <Button
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700"
                        disabled={merging || mergingAll || selected.size === 0}
                        onClick={() => setConfirmGroup(group)}
                      >
                        <GitMerge className="w-4 h-4 mr-1.5" />
                        Merge ({selected.size})
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100">
                  {group.members.map((member) => {
                    const isPrimary = member._id === primaryId;
                    const isSelected = selected.has(member._id);
                    const title = memberTitle(member);
                    const preview = cleanPreview(member.preview, title);

                    return (
                      <div
                        key={member._id}
                        className={`p-3 sm:p-4 flex gap-3 ${isPrimary ? "bg-emerald-50/50" : "bg-white"}`}
                      >
                        <div className="pt-1 shrink-0">
                          <Checkbox
                            checked={isPrimary ? false : isSelected}
                            disabled={isPrimary}
                            onCheckedChange={(v) =>
                              toggleSelected(group.groupId, member._id, v === true)
                            }
                            aria-label={
                              isPrimary ? "Primary record" : "Mark as duplicate to archive"
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className={`text-xs font-semibold rounded-full px-2.5 py-0.5 border ${
                                isPrimary
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                              }`}
                              onClick={() => setPrimary(group.groupId, member._id)}
                            >
                              {isPrimary ? "Primary (keep)" : "Set as primary"}
                            </button>
                            <Badge variant="outline" className="text-micro">
                              {member.sourceType}
                            </Badge>
                            <span className="text-mini text-slate-500">
                              {formatDate(member.createdAt)}
                            </span>
                            <span className="text-mini text-slate-400 font-mono">
                              …{member._id.slice(-8)}
                            </span>
                          </div>

                          <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                            {title}
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                            {preview}
                          </p>

                          <div className="flex flex-wrap gap-2 pt-0.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => void openViewFull(member, group)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              View full
                            </Button>
                            {!isPrimary && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 text-violet-700 hover:text-violet-800 hover:bg-violet-50"
                                onClick={() => void openCompare(group, member._id)}
                              >
                                <Columns2 className="w-3.5 h-3.5 mr-1.5" />
                                Compare with primary
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setViewRecords([]);
        }}
      >
        <DialogContent className="max-w-[min(96vw,1100px)] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="text-base">
              {viewRecords.length > 1 ? "Compare records" : "Full record"}
            </DialogTitle>
          </DialogHeader>
          <div
            className={`flex-1 overflow-y-auto p-4 ${
              viewRecords.length > 1 ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""
            }`}
          >
            {viewRecords.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col min-h-[200px]"
              >
                <div className="px-3 py-2 border-b bg-slate-50 text-sm font-medium text-slate-800 truncate">
                  {rec.title}
                  <span className="ml-2 text-mini font-mono text-slate-400">…{rec.id.slice(-8)}</span>
                </div>
                <div className="p-3 flex-1 overflow-y-auto max-h-[70vh]">
                  {rec.loading ? (
                    <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading full content…
                    </div>
                  ) : rec.error ? (
                    <p className="text-sm text-red-600">{rec.error}</p>
                  ) : (
                    <GeneratedRecordBody
                      content={rec.content}
                      toolType={rec.toolName}
                      className="text-sm"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmMergeAll}
        onOpenChange={(open) => {
          if (!open && !mergingAll) setConfirmMergeAll(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge all duplicate groups?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  This archives every extra copy across{" "}
                  <strong>{totalGroups.toLocaleString()}</strong> group
                  {totalGroups === 1 ? "" : "s"}
                  {toolFilter !== "all" ? ` (filter: ${toolFilter})` : ""}.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong className="text-violet-800">{totalExtraRecords.toLocaleString()}</strong>{" "}
                    extras will be archived
                  </li>
                  <li>
                    <strong className="text-emerald-800">{totalGroups.toLocaleString()}</strong>{" "}
                    primaries will be kept
                  </li>
                  <li>
                    Active records after merge:{" "}
                    <strong>
                      {Math.max(0, scannedRecords - totalExtraRecords).toLocaleString()}
                    </strong>
                  </li>
                </ul>
                <p className="text-slate-500">
                  Each group keeps its suggested primary (best/newest structured record). Teachers
                  and students will only see the kept primaries.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mergingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={mergingAll}
              className="bg-violet-600 hover:bg-violet-700"
              onClick={(e) => {
                e.preventDefault();
                void runMergeAll();
              }}
            >
              {mergingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Merging all…
                </>
              ) : (
                `Merge all ${totalExtraRecords.toLocaleString()} extras`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmGroup}
        onOpenChange={(open) => {
          if (!open) setConfirmGroup(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge duplicates?</AlertDialogTitle>
            <AlertDialogDescription>
              Keep the primary record active. Selected duplicates will be archived and hidden from
              teachers and students.
              {confirmGroup && (
                <span className="block mt-2 font-medium text-slate-800">
                  Archive {(selectedByGroup[confirmGroup.groupId] || []).length} record(s) into
                  primary …{(primaryByGroup[confirmGroup.groupId] || "").slice(-8)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={merging || !confirmGroup}
              onClick={(e) => {
                e.preventDefault();
                if (confirmGroup) void runMerge(confirmGroup);
              }}
            >
              {merging ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Merging…
                </>
              ) : (
                "Merge"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
