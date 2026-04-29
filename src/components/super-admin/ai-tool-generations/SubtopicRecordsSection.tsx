import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileDown, Calendar, Eye, FileStack, Pencil, Trash2 } from "lucide-react";
import {
  fetchRecords,
  fetchDocument,
  fetchExportBundle,
  updateDocument,
  deleteDocument,
  patchDocumentStructured,
} from "./api";
import type { RecordRow } from "./api";
import { downloadGenerationsPdf } from "./pdf-utils";
import { useToast } from "@/hooks/use-toast";
import {
  extractMcqQuestionsFromRecord,
  isMcqTool,
  type McqQuestion,
} from "@/lib/mcq-record-utils";

function labelEmpty(v: string) {
  return v === "" || v == null ? "(None)" : v;
}

function questionsToStructuredPayload(questions: McqQuestion[]) {
  return questions.map((q) => ({
    question: q.question,
    options: q.options.map((o) => o.replace(/^[A-D]\)\s*/i, "").trim()),
    answer: q.answer.replace(/^[A-D]\)\s*/i, "").trim(),
    explanation: String(q.explanation || "").trim(),
  }));
}

function toEditablePlainText(content: string) {
  return String(content || "")
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}/g, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/!\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderSimpleContent(content: string) {
  const lines = toEditablePlainText(content)
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  const isBullet = (line: string) => /^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line);
  const isHeading = (line: string) =>
    !isBullet(line) &&
    line.length <= 70 &&
    /^[A-Za-z][A-Za-z0-9\s/&(),'-]{2,}:?$/.test(line) &&
    !line.endsWith(".");

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (isHeading(line)) {
          return (
            <h4 key={`h-${idx}`} className="pt-2 text-sm font-semibold text-slate-900">
              {line.replace(/:$/, "")}
            </h4>
          );
        }
        if (isBullet(line)) {
          const cleaned = line.replace(/^[-*•]\s+/, "").trim();
          return (
            <div key={`b-${idx}`} className="flex items-start gap-2 text-sm text-slate-800 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
              <span>{cleaned}</span>
            </div>
          );
        }
        return (
          <p key={`p-${idx}`} className="text-sm text-slate-800 leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}

function readDetailValue(detail: Record<string, unknown> | null, key: string, fallback = ""): string {
  if (!detail) return fallback;
  const v = detail[key];
  if (v == null) return fallback;
  return String(v);
}

export function SubtopicRecordsSection({
  parents,
}: {
  parents: Record<string, string>;
}) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<RecordRow[]>([]);
  const [view, setView] = useState<RecordRow | null>(null);
  const [fullText, setFullText] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<RecordRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingQuestionKey, setDeletingQuestionKey] = useState<string | null>(null);
  const [viewDetail, setViewDetail] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchRecords(parents, page, 20);
      setTotal(r.data.total);
      setItems(r.data.items);
    } finally {
      setLoading(false);
    }
  }, [parents, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openDoc = async (row: RecordRow) => {
    setView(row);
    const initialText = String(row.content || row.preview || "").trim();
    setFullText(initialText || "(No content available)");
    setViewDetail({
      toolName: row.toolName,
      toolDisplayName: row.toolDisplayName,
      classLabel: row.classLabel,
      subject: row.subject,
      topic: row.topic,
      subtopic: row.subtopic,
      content: initialText || "",
      generatedContent: initialText || "",
      metadata: row.metadata,
    });
    try {
      const r = await fetchDocument(row._id);
      setViewDetail(r.data as Record<string, unknown>);
      setFullText(String(r.data.content || ""));
    } catch {
      // Keep list payload content as fallback when document endpoint fails for legacy ids.
    }
  };

  const removeQuestionFromRecord = async (row: RecordRow, questionIndex: number) => {
    const qs = extractMcqQuestionsFromRecord(row);
    if (questionIndex < 0 || questionIndex >= qs.length) return;
    const nextQs = qs.filter((_, i) => i !== questionIndex);
    const key = `${row._id}:${questionIndex}`;
    setDeletingQuestionKey(key);
    try {
      const prev = (row.metadata?.structuredContent as Record<string, unknown>) || {};
      await patchDocumentStructured(row._id, {
        ...prev,
        questions: questionsToStructuredPayload(nextQs),
      });
      toast({ title: "Updated", description: "Question removed from this record." });
      await load();
      if (view && view._id === row._id && viewDetail) {
        const r = await fetchDocument(row._id);
        setViewDetail(r.data as Record<string, unknown>);
      }
    } catch {
      toast({
        title: "Update failed",
        description: "Could not remove question.",
        variant: "destructive",
      });
    } finally {
      setDeletingQuestionKey(null);
    }
  };

  const openEdit = async (row: RecordRow) => {
    setEditRow(row);
    setEditContent("");
    try {
      const r = await fetchDocument(row._id);
      setEditContent(toEditablePlainText(r.data.content || ""));
    } catch {
      setEditContent("");
      toast({
        title: "Failed",
        description: "Could not load content for editing.",
        variant: "destructive",
      });
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    if (!editContent.trim()) {
      toast({
        title: "Missing content",
        description: "Content cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    setSavingEdit(true);
    try {
      await updateDocument(editRow._id, editContent);
      toast({ title: "Updated", description: "Record updated successfully." });
      setEditRow(null);
      await load();
      if (view && view._id === editRow._id) {
        setFullText(editContent);
      }
    } catch {
      toast({
        title: "Update failed",
        description: "Could not update record.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const removeRow = async (row: RecordRow) => {
    const ok = window.confirm("Delete this record permanently?");
    if (!ok) return;
    setDeletingId(row._id);
    try {
      await deleteDocument(row._id);
      toast({ title: "Deleted", description: "Record deleted successfully." });
      if (view && view._id === row._id) {
        setView(null);
        setFullText(null);
      }
      await load();
    } catch {
      toast({
        title: "Delete failed",
        description: "Could not delete record.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const pdfThisSubtopic = async () => {
    const r = await fetchExportBundle(parents, 500);
    const recs = r.data.records.map((x) => ({
      toolDisplayName: x.toolDisplayName,
      toolName: x.toolName,
      classLabel: x.classLabel,
      subject: x.subject,
      topic: x.topic,
      subtopic: x.subtopic,
      content: x.content,
      createdAt: x.createdAt,
    }));
    await downloadGenerationsPdf(
      `${parents.toolName || "tool"}_${parents.subtopic || "sub"}`,
      recs,
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/30 to-orange-50/20 shadow-sm overflow-hidden">
      <div className="border-b border-slate-100/80 bg-white/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
            <FileStack className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Records</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {total} generation{total !== 1 ? "s" : ""}
              <span className="text-slate-300 mx-1.5">·</span>
              <span className="font-medium text-slate-700">{labelEmpty(parents.subtopic || "")}</span>
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm shrink-0"
          onClick={pdfThisSubtopic}
        >
          <FileDown className="w-4 h-4 mr-2" />
          PDF
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-sm">Loading records…</p>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-center text-slate-500 py-8 rounded-xl border border-dashed border-slate-200 bg-white/60">
            No records for this path.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((row) => {
              const mcqQs = isMcqTool(parents.toolName)
                ? extractMcqQuestionsFromRecord(row)
                : [];
              return (
                <li
                  key={row._id}
                  className="group rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:border-orange-200/80 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs rounded-lg text-orange-700 hover:text-orange-800 hover:bg-orange-50"
                        onClick={() => openDoc(row)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View full
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs rounded-lg text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deletingId === row._id}
                        className="h-8 text-xs rounded-lg text-red-700 hover:text-red-800 hover:bg-red-50"
                        onClick={() => removeRow(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        {deletingId === row._id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                  {mcqQs.length > 0 ? (
                    <div className="space-y-3">
                      {mcqQs.map((q, qIdx) => (
                        <div
                          key={`${row._id}-mcq-${qIdx}`}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900 leading-relaxed flex-1">
                              Q{qIdx + 1}. {q.question}
                            </p>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deletingQuestionKey === `${row._id}:${qIdx}`}
                              onClick={() => removeQuestionFromRecord(row, qIdx)}
                              aria-label="Delete question"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <ul className="mt-3 space-y-2.5 pl-0.5">
                            {q.options.map((opt, j) => (
                              <li key={j} className="flex items-start gap-2.5 text-sm text-slate-700">
                                <span
                                  className="mt-1.5 h-3.5 w-3.5 rounded-full border border-slate-400 shrink-0 bg-white"
                                  aria-hidden
                                />
                                <span>{opt}</span>
                              </li>
                            ))}
                          </ul>
                          {q.answer ? (
                            <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                              <span className="font-semibold">Answer:</span> {q.answer}
                            </p>
                          ) : null}
                          {q.explanation ? (
                            <p className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                              <span className="font-semibold">Explanation:</span> {q.explanation}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 line-clamp-4 leading-relaxed border-l-2 border-orange-200 pl-3">
                      {toEditablePlainText(String(row.content || row.preview || ""))}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {total > 20 && (
          <div className="flex gap-2 justify-center pt-2 border-t border-slate-100/80">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Badge variant="secondary" className="self-center rounded-lg px-3 tabular-nums">
              Page {page} · {total} total
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}

        <Dialog
          open={!!view}
          onOpenChange={() => {
            setView(null);
            setViewDetail(null);
          }}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900">Generated content</DialogTitle>
            </DialogHeader>
            {fullText == null ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin w-8 h-8 text-orange-500" />
              </div>
            ) : (() => {
                const dialogQs = viewDetail
                  ? extractMcqQuestionsFromRecord({
                      toolName: String(viewDetail.toolName || parents.toolName || ""),
                      content: String(viewDetail.content || ""),
                      generatedContent: String(viewDetail.generatedContent || viewDetail.content || ""),
                      metadata: viewDetail.metadata,
                    })
                  : [];
                if (dialogQs.length > 0) {
                  return (
                    <div className="space-y-4 max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                      {dialogQs.map((q, idx) => (
                        <div
                          key={`dlg-q-${idx}`}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
                        >
                          <p className="text-sm font-semibold text-slate-900 leading-relaxed pr-2">
                            Q{idx + 1}. {q.question}
                          </p>
                          <ul className="space-y-2.5 pl-0.5">
                            {q.options.map((opt, j) => (
                              <li key={j} className="flex items-start gap-2.5 text-sm text-slate-700">
                                <span
                                  className="mt-1.5 h-3.5 w-3.5 rounded-full border border-slate-400 shrink-0 bg-white"
                                  aria-hidden
                                />
                                <span>{opt}</span>
                              </li>
                            ))}
                          </ul>
                          {q.answer ? (
                            <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                              Answer: {q.answer}
                            </p>
                          ) : null}
                          {q.explanation ? (
                            <p className="text-xs text-slate-500">
                              Explanation: {q.explanation}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  );
                }
                const displayTool =
                  readDetailValue(viewDetail, "toolDisplayName") ||
                  readDetailValue(viewDetail, "toolName") ||
                  view?.toolDisplayName ||
                  view?.toolName ||
                  "-";
                const displayClass = readDetailValue(viewDetail, "classLabel") || view?.classLabel || "-";
                const displaySubject = readDetailValue(viewDetail, "subject") || view?.subject || "-";
                const displayTopic = readDetailValue(viewDetail, "topic") || view?.topic || "-";
                const displaySubtopic = readDetailValue(viewDetail, "subtopic") || view?.subtopic || "-";
                return (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-h-[min(70vh,620px)] overflow-y-auto">
                    <div className="space-y-1.5 text-slate-900">
                      <p className="text-xl font-semibold">Generated Record</p>
                      <p className="text-base font-medium">{displayTool}</p>
                    </div>
                    <div className="mt-4 space-y-1 text-sm leading-relaxed text-slate-900">
                      <p><span className="font-semibold">Class:</span> {displayClass}</p>
                      <p><span className="font-semibold">Subject:</span> {displaySubject}</p>
                      <p><span className="font-semibold">Topic:</span> {displayTopic}</p>
                      <p><span className="font-semibold">Subtopic:</span> {displaySubtopic}</p>
                    </div>
                    <div className="mt-5 pt-4 border-t border-slate-200">
                      {renderSimpleContent(fullText)}
                    </div>
                  </div>
                );
              })()}
          </DialogContent>
        </Dialog>

        <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
          <DialogContent className="max-w-3xl rounded-2xl border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900">Edit content</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[320px]"
                placeholder="Update content..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditRow(null)}>
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
