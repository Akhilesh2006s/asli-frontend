import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, FileDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { GeneratorRecordViewer } from "@/components/super-admin/generator-record-viewer";
import { AiToolRecordPreviewBody } from "@/components/super-admin/ai-tool-record-preview-body";
import {
  recordGenerationVariant,
  recordVariantAngle,
} from "@/lib/ai-tool-record-list-preview";
import { openAiToolRecordPdf } from "@/lib/ai-tool-record-pdf";
import { sortAiToolRecordsByVariantThenDate } from "@/lib/ai-tool-record-sort";
import { cn } from "@/lib/utils";

type GeneratorRecord = {
  _id: string;
  generatedContent: string;
  createdAt?: string;
  metadata?: {
    bookTitle?: string;
    listPreview?: string;
    structuredContent?: unknown;
    extraParams?: { generationVariant?: number; variantAngle?: string };
  };
  generationVariant?: number | null;
  variantAngle?: string;
};

type GroupedSubtopic = { subtopicName: string; records: GeneratorRecord[] };
type GroupedTopic = { topicName: string; subtopics: GroupedSubtopic[] };
type GroupedSubject = { subjectName: string; topics: GroupedTopic[] };
type GroupedClass = { className: string; boardName?: string; subjects: GroupedSubject[] };
type GroupedTool = { toolName: string; toolSlug: string; classes: GroupedClass[] };

function countGroupedRecords(tree: GroupedTool[]): number {
  let n = 0;
  for (const tool of tree) {
    for (const cls of tool.classes) {
      for (const subj of cls.subjects) {
        for (const topic of subj.topics) {
          for (const st of topic.subtopics) {
            n += st.records.length;
          }
        }
      }
    }
  }
  return n;
}

function authHeaders(): Record<string, string> {
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("superAdminToken") ||
    localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function subtopicSectionKey(
  toolSlug: string,
  className: string,
  boardName: string,
  subjectName: string,
  topicName: string,
  subtopicName: string,
) {
  return `subtopic:${toolSlug}:${className}:${boardName}:${subjectName}:${topicName}:${subtopicName}`;
}

export type GeneratorRecordsPanelProps = {
  apiPrefix: "/api/ai-generator" | "/api/book-generator";
  boardOptions: string[];
  boardFilterDefault?: string;
  accent?: "orange" | "violet";
  title?: string;
  subtitle?: string;
  showBookBadge?: boolean;
  showDeleteAll?: boolean;
  reloadNonce?: number;
  headerExtra?: React.ReactNode;
};

export function GeneratorRecordsPanel({
  apiPrefix,
  boardOptions,
  boardFilterDefault = "__all__",
  accent = "orange",
  title = "Records",
  subtitle,
  showBookBadge = false,
  showDeleteAll = true,
  reloadNonce = 0,
  headerExtra,
}: GeneratorRecordsPanelProps) {
  const { toast } = useToast();
  const [recordsBoardFilter, setRecordsBoardFilter] = useState(boardFilterDefault);
  const [recordsTree, setRecordsTree] = useState<GroupedTool[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsLoadedCount, setRecordsLoadedCount] = useState(0);
  const [recordsTruncated, setRecordsTruncated] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<Record<string, unknown> | null>(null);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSubtopicKey, setDeletingSubtopicKey] = useState<string | null>(null);

  const accentBorder = accent === "violet" ? "border-violet-200" : "border-orange-200";
  const accentBg = accent === "violet" ? "bg-violet-50 text-violet-800" : "bg-orange-50 text-orange-800";
  const accentHover = accent === "violet" ? "hover:border-violet-200/80" : "hover:border-orange-200/80";
  const accentBtn = accent === "violet" ? "text-violet-700 hover:text-violet-800 hover:bg-violet-50" : "text-orange-700 hover:text-orange-800 hover:bg-orange-50";
  const accentLine = accent === "violet" ? "border-violet-200" : "border-orange-200";
  const gradientVia = accent === "violet" ? "to-violet-50/20" : "to-orange-50/20";

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (recordsBoardFilter && recordsBoardFilter !== "__all__") {
        qs.set("board", recordsBoardFilter);
      }
      const res = await fetch(`${API_BASE_URL}${apiPrefix}/records?${qs.toString()}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to load records");
      const grouped = Array.isArray(json?.data?.grouped) ? json.data.grouped : [];
      setRecordsTree(grouped);
      setRecordsTotal(Number(json?.data?.total || 0));
      const loaded = Number(json?.data?.loadedCount);
      setRecordsLoadedCount(Number.isFinite(loaded) && loaded > 0 ? loaded : countGroupedRecords(grouped));
      setRecordsTruncated(Boolean(json?.data?.truncated));
    } catch (error: unknown) {
      setRecordsTree([]);
      setRecordsTotal(0);
      setRecordsLoadedCount(0);
      setRecordsTruncated(false);
      toast({
        title: "Records load failed",
        description: error instanceof Error ? error.message : "Could not load records.",
        variant: "destructive",
      });
    } finally {
      setRecordsLoading(false);
    }
  }, [apiPrefix, recordsBoardFilter, toast]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords, reloadNonce]);

  const openView = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}${apiPrefix}/records/${id}`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to fetch record");
      setActiveRecord(json.data);
    } catch (error: unknown) {
      toast({
        title: "Load failed",
        description: error instanceof Error ? error.message : "Could not load record.",
        variant: "destructive",
      });
    }
  };

  const openEdit = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}${apiPrefix}/records/${id}`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to fetch record");
      setEditRecord(json.data);
      setEditContent(String(json.data?.generatedContent || ""));
    } catch (error: unknown) {
      toast({
        title: "Load failed",
        description: error instanceof Error ? error.message : "Could not load record.",
        variant: "destructive",
      });
    }
  };

  const saveEdit = async () => {
    if (!editRecord) return;
    if (!editContent.trim()) {
      toast({ title: "Missing content", description: "Content cannot be empty.", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE_URL}${apiPrefix}/records/${editRecord._id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ generatedContent: editContent }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Update failed");
      toast({ title: "Updated", description: "Record updated successfully." });
      setEditRecord(null);
      await loadRecords();
    } catch (error: unknown) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Could not update.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!window.confirm("Delete this record permanently?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}${apiPrefix}/records/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Delete failed");
      toast({ title: "Deleted", description: "Record deleted successfully." });
      if (activeRecord && String(activeRecord._id) === id) setActiveRecord(null);
      await loadRecords();
    } catch (error: unknown) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAllRecords = async () => {
    setIsDeletingAll(true);
    try {
      const qs = new URLSearchParams();
      if (recordsBoardFilter && recordsBoardFilter !== "__all__") {
        qs.set("board", recordsBoardFilter);
      }
      const res = await fetch(`${API_BASE_URL}${apiPrefix}/records/all?${qs.toString()}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Delete all failed");
      const count = Number(json?.data?.deletedCount ?? 0);
      toast({
        title: "Deleted",
        description: json?.message || `Deleted ${count} record${count === 1 ? "" : "s"}.`,
      });
      setIsDeleteAllDialogOpen(false);
      setActiveRecord(null);
      await loadRecords();
    } catch (error: unknown) {
      toast({
        title: "Delete all failed",
        description: error instanceof Error ? error.message : "Could not delete all records.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const deleteAllSubtopicRecords = async (
    records: GeneratorRecord[],
    subtopicLabel: string,
    sectionKey: string,
  ) => {
    const ids = records.map((r) => r._id).filter(Boolean);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Delete all ${ids.length} record${ids.length !== 1 ? "s" : ""} in subtopic “${subtopicLabel}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingSubtopicKey(sectionKey);
    try {
      const res = await fetch(`${API_BASE_URL}${apiPrefix}/records/bulk-delete`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Bulk delete failed");
      const deleted = Number(json?.data?.deletedCount ?? ids.length);
      toast({ title: "Deleted", description: `Removed ${deleted} record(s) from this subtopic.` });
      if (activeRecord && ids.includes(String(activeRecord._id))) setActiveRecord(null);
      await loadRecords();
    } catch (error: unknown) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete subtopic records.",
        variant: "destructive",
      });
    } finally {
      setDeletingSubtopicKey(null);
    }
  };

  const openPdf = async (id: string) => {
    try {
      await openAiToolRecordPdf(id);
    } catch (error: unknown) {
      toast({
        title: "PDF failed",
        description: error instanceof Error ? error.message : "Could not generate PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="mb-0">
                {title} ({recordsTotal.toLocaleString()})
                {recordsTruncated && recordsLoadedCount > 0 ? (
                  <span className="text-sm font-normal text-amber-700 ml-2">
                    — showing {recordsLoadedCount.toLocaleString()} newest
                  </span>
                ) : null}
              </CardTitle>
              {subtitle ? <p className="text-sm text-slate-500 font-normal mt-1">{subtitle}</p> : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1.5 sm:w-64">
                <Label className="text-xs text-slate-600">Filter by board</Label>
                <Select value={recordsBoardFilter} onValueChange={setRecordsBoardFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All boards</SelectItem>
                    {boardOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showDeleteAll ? (
                <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="shrink-0"
                      disabled={recordsLoading || recordsTotal === 0 || isDeletingAll}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      {isDeletingAll ? "Deleting..." : "Delete All"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete all records?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete{" "}
                        <span className="font-medium text-slate-900">{recordsTotal}</span> record
                        {recordsTotal === 1 ? "" : "s"}
                        {recordsBoardFilter === "__all__"
                          ? " across all boards."
                          : ` for board “${recordsBoardFilter}”.`}
                        {" "}This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isDeletingAll}
                        onClick={(e) => {
                          e.preventDefault();
                          void deleteAllRecords();
                        }}
                      >
                        {isDeletingAll ? "Deleting..." : "Delete All"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
              {headerExtra}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Showing records for:{" "}
            <span className="font-medium text-slate-700">
              {recordsBoardFilter === "__all__" ? "All boards" : recordsBoardFilter}
            </span>
          </p>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600 py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading records...
            </div>
          ) : recordsTree.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No records found
              {recordsBoardFilter !== "__all__" ? ` for board “${recordsBoardFilter}”.` : " yet."}
            </p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {recordsTree.map((toolNode) => (
                <AccordionItem
                  key={toolNode.toolSlug}
                  value={`tool-${toolNode.toolSlug}`}
                  className="border rounded-xl px-3 mb-3"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="text-left">
                      <p className="font-semibold">{toolNode.toolName}</p>
                      <p className="text-xs text-slate-500">{toolNode.toolSlug}</p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-xs text-slate-500 mb-3">Classes in this tool</p>
                    <Accordion type="multiple" className="w-full">
                      {toolNode.classes.map((classNode) => (
                        <AccordionItem
                          key={`${toolNode.toolSlug}-${classNode.className}`}
                          value={`class-${toolNode.toolSlug}-${classNode.className}`}
                          className="border rounded-lg px-3 mb-2"
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="text-left">
                              <p className="text-xs text-slate-500">CLASS</p>
                              <p className="font-medium">
                                {classNode.className}
                                {classNode.boardName ? ` (${classNode.boardName})` : ""}
                              </p>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Accordion type="multiple" className="w-full">
                              {classNode.subjects.map((subjectNode) => (
                                <AccordionItem
                                  key={`${classNode.className}-${subjectNode.subjectName}`}
                                  value={`subject-${classNode.className}-${subjectNode.subjectName}`}
                                  className="border rounded-lg px-3 mb-2"
                                >
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="text-left">
                                      <p className="text-xs text-slate-500">SUBJECT</p>
                                      <p className="font-medium">{subjectNode.subjectName}</p>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <Accordion type="multiple" className="w-full">
                                      {subjectNode.topics.map((topicNode) => (
                                        <AccordionItem
                                          key={`${subjectNode.subjectName}-${topicNode.topicName}`}
                                          value={`topic-${subjectNode.subjectName}-${topicNode.topicName}`}
                                          className="border rounded-lg px-3 mb-2"
                                        >
                                          <AccordionTrigger className="hover:no-underline">
                                            <div className="text-left">
                                              <p className="text-xs text-slate-500">TOPIC</p>
                                              <p className="font-medium">{topicNode.topicName || "General"}</p>
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent>
                                            <Accordion type="multiple" className="w-full">
                                              {topicNode.subtopics.map((subtopicNode) => {
                                                const subtopicKey = subtopicSectionKey(
                                                  toolNode.toolSlug,
                                                  classNode.className,
                                                  classNode.boardName || "",
                                                  subjectNode.subjectName,
                                                  topicNode.topicName,
                                                  subtopicNode.subtopicName,
                                                );
                                                const isDeletingSubtopic = deletingSubtopicKey === subtopicKey;
                                                return (
                                                  <AccordionItem
                                                    key={`${topicNode.topicName}-${subtopicNode.subtopicName}`}
                                                    value={`subtopic-${topicNode.topicName}-${subtopicNode.subtopicName}`}
                                                    className="border rounded-lg px-3 mb-2"
                                                  >
                                                    <AccordionTrigger className="hover:no-underline">
                                                      <div className="text-left">
                                                        <p className="text-xs text-slate-500">SUBTOPIC</p>
                                                        <p className="font-medium">{subtopicNode.subtopicName}</p>
                                                      </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                      <div
                                                        className={cn(
                                                          "rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/30 shadow-sm overflow-hidden",
                                                          gradientVia,
                                                        )}
                                                      >
                                                        <div className="border-b border-slate-100/80 bg-white/80 px-4 py-3 flex items-center justify-between gap-2">
                                                          <div>
                                                            <p className="text-xs text-slate-500">RECORDS</p>
                                                            <p className="text-sm font-semibold text-slate-900">
                                                              {subtopicNode.records.length} generation
                                                              {subtopicNode.records.length === 1 ? "" : "s"}
                                                            </p>
                                                          </div>
                                                          {subtopicNode.records.length > 0 ? (
                                                            <Button
                                                              type="button"
                                                              variant="outline"
                                                              size="sm"
                                                              className="h-8 gap-1.5 rounded-lg border-red-200 text-red-700 hover:bg-red-50 shrink-0"
                                                              disabled={isDeletingSubtopic || !!deletingId || isDeletingAll}
                                                              onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                void deleteAllSubtopicRecords(
                                                                  subtopicNode.records,
                                                                  subtopicNode.subtopicName,
                                                                  subtopicKey,
                                                                );
                                                              }}
                                                            >
                                                              {isDeletingSubtopic ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                              ) : (
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                              )}
                                                              Delete all ({subtopicNode.records.length})
                                                            </Button>
                                                          ) : null}
                                                        </div>
                                                        <div className="p-4 space-y-3">
                                                          {sortAiToolRecordsByVariantThenDate(subtopicNode.records).map((row) => (
                                                            <div
                                                              key={row._id}
                                                              className={cn(
                                                                "group rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:shadow-md",
                                                                accentHover,
                                                              )}
                                                            >
                                                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                  <p className="text-xs text-slate-500">
                                                                    {row.createdAt
                                                                      ? new Date(row.createdAt).toLocaleString()
                                                                      : "-"}
                                                                  </p>
                                                                  {showBookBadge && row.metadata?.bookTitle ? (
                                                                    <Badge
                                                                      variant="outline"
                                                                      className={cn("text-[10px] h-5", accentBorder, accentBg)}
                                                                    >
                                                                      {row.metadata.bookTitle}
                                                                    </Badge>
                                                                  ) : null}
                                                                  {row.generationVariant || recordGenerationVariant(row) ? (
                                                                    <Badge
                                                                      variant="outline"
                                                                      className={cn("text-[10px] h-5", accentBorder, accentBg)}
                                                                    >
                                                                      Variant {row.generationVariant || recordGenerationVariant(row)}
                                                                    </Badge>
                                                                  ) : null}
                                                                  {(row.variantAngle || recordVariantAngle(row)) ? (
                                                                    <span
                                                                      className="text-[10px] text-slate-500 max-w-[220px] truncate"
                                                                      title={row.variantAngle || recordVariantAngle(row)}
                                                                    >
                                                                      {row.variantAngle || recordVariantAngle(row)}
                                                                    </span>
                                                                  ) : null}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                  <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className={cn("h-8 text-xs rounded-lg", accentBtn)}
                                                                    onClick={() => void openView(row._id)}
                                                                  >
                                                                    <Eye className="h-3.5 w-3.5 mr-1.5" /> View full
                                                                  </Button>
                                                                  <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-xs rounded-lg text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                                                                    onClick={() => void openEdit(row._id)}
                                                                  >
                                                                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                                                                  </Button>
                                                                  <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-xs rounded-lg text-red-700 hover:text-red-800 hover:bg-red-50"
                                                                    onClick={() => void deleteRecord(row._id)}
                                                                    disabled={deletingId === row._id}
                                                                  >
                                                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                                                    {deletingId === row._id ? "Deleting..." : "Delete"}
                                                                  </Button>
                                                                  <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-xs rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                                                                    onClick={() => void openPdf(row._id)}
                                                                  >
                                                                    <FileDown className="h-3.5 w-3.5 mr-1.5" /> PDF
                                                                  </Button>
                                                                </div>
                                                              </div>
                                                              <AiToolRecordPreviewBody
                                                                toolSlug={toolNode.toolSlug}
                                                                record={{
                                                                  toolSlug: toolNode.toolSlug,
                                                                  generatedContent: String(row.generatedContent || ""),
                                                                  content: String(row.generatedContent || ""),
                                                                  metadata: row.metadata,
                                                                  generationVariant:
                                                                    row.generationVariant ??
                                                                    recordGenerationVariant(row) ??
                                                                    undefined,
                                                                  variantAngle:
                                                                    row.variantAngle || recordVariantAngle(row),
                                                                }}
                                                                recordId={row._id}
                                                                textClassName={accentLine}
                                                              />
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    </AccordionContent>
                                                  </AccordionItem>
                                                );
                                              })}
                                            </Accordion>
                                          </AccordionContent>
                                        </AccordionItem>
                                      ))}
                                    </Accordion>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!activeRecord} onOpenChange={() => setActiveRecord(null)}>
        <DialogContent className="flex max-h-[min(92vh,920px)] w-[min(96vw,1400px)] max-w-[min(96vw,1400px)] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6">
            <DialogTitle>Generated Record</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6">
            <div className="min-w-0 rounded-xl border bg-white p-4 shadow-sm">
              <GeneratorRecordViewer record={activeRecord} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[320px]" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditRecord(null)}>
                Cancel
              </Button>
              <Button onClick={() => void saveEdit()} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
