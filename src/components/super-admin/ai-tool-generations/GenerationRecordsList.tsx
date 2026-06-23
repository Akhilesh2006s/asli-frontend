import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar, Eye, Pencil, Trash2, FileDown } from "lucide-react";
import {
  fetchDocument,
  updateDocument,
  deleteDocument,
  patchDocumentStructured,
} from "./api";
import type { RecordRow } from "./api";
import { useToast } from "@/hooks/use-toast";
import {
  displayMcqQuestionSerial,
  extractMcqQuestionsFromRecord,
  isMcqTool,
  isStructuredPaperTool,
  isWorksheetMcqTool,
  type McqQuestion,
} from "@/lib/mcq-record-utils";
import {
  SectionGapFlagPanel,
  recordHasSectionGap,
  formatRecordPath,
} from "./SectionGapFlagPanel";
import { GeneratorRecordViewer } from "@/components/super-admin/generator-record-viewer";
import { AiToolRecordPreviewBody } from "@/components/super-admin/ai-tool-record-preview-body";
import { normalizeAiToolSlug } from "@/lib/normalize-ai-tool-slug";
import {
  recordGenerationVariant,
  recordVariantAngle,
} from "@/lib/ai-tool-record-list-preview";
import { openAiToolRecordPdf } from "@/lib/ai-tool-record-pdf";
import { sortAiToolRecordsByVariantThenDate } from "@/lib/ai-tool-record-sort";

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

function isBookGroundedRow(row: RecordRow): boolean {
  if (row.sourceType === "book_rag") return true;
  const meta = row.metadata;
  if (!meta || typeof meta !== "object") return false;
  return Boolean(meta.bookGenerator) || meta.formatSource === "bookRag";
}

function buildViewRecord(
  row: RecordRow | null,
  detail: Record<string, unknown> | null,
  fullText: string | null,
  defaultToolName: string,
): Record<string, unknown> {
  const toolName = normalizeAiToolSlug(
    String(detail?.toolName || row?.toolName || defaultToolName || ""),
  );
  const text = String(detail?.content || detail?.generatedContent || fullText || row?.content || "");
  return {
    ...(detail || {}),
    toolName,
    toolSlug: toolName,
    content: text,
    generatedContent: String(detail?.generatedContent || text),
    metadata: detail?.metadata ?? row?.metadata,
  };
}

export type GenerationRecordsListProps = {
  items: RecordRow[];
  defaultToolName?: string;
  onRefresh?: () => Promise<void> | void;
  loading?: boolean;
  emptyMessage?: string;
  showRecordPath?: boolean;
  renderRowExtras?: (row: RecordRow) => ReactNode;
};

export function GenerationRecordsList({
  items,
  defaultToolName = "",
  onRefresh,
  loading = false,
  emptyMessage = "No records.",
  showRecordPath = false,
  renderRowExtras,
}: GenerationRecordsListProps) {
  const { toast } = useToast();
  const [view, setView] = useState<RecordRow | null>(null);
  const [fullText, setFullText] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<RecordRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingQuestionKey, setDeletingQuestionKey] = useState<string | null>(null);
  const [viewDetail, setViewDetail] = useState<Record<string, unknown> | null>(null);

  const resolveToolName = (row: RecordRow) => row.toolName || defaultToolName;

  const openDoc = async (row: RecordRow) => {
    setView(row);
    const initialText = String(row.content || row.preview || "").trim();
    setFullText(initialText || "(No content available)");
    setViewDetail({
      board: row.board,
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

  const recordMcqQuestions = (row: RecordRow) =>
    extractMcqQuestionsFromRecord({
      ...row,
      toolName: normalizeAiToolSlug(resolveToolName(row)),
      generatedContent: String(row.content || row.preview || ""),
    });

  const removeQuestionFromRecord = async (row: RecordRow, questionIndex: number) => {
    const qs = recordMcqQuestions(row);
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
      await onRefresh?.();
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
      await onRefresh?.();
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
      await onRefresh?.();
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

  const openPdf = async (row: RecordRow) => {
    try {
      await openAiToolRecordPdf(row._id);
    } catch (error: unknown) {
      toast({
        title: "PDF failed",
        description: error instanceof Error ? error.message : "Could not generate PDF.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
        <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 animate-spin text-orange-500" />
        <p className="text-xs sm:text-sm">Loading records…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-xs sm:text-sm text-center text-slate-500 py-4 sm:py-6 lg:py-8 rounded-xl border border-dashed border-slate-200 bg-white/60">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {sortAiToolRecordsByVariantThenDate(items).map((row) => {
          const toolSlug = normalizeAiToolSlug(resolveToolName(row));
          const generationVariant = recordGenerationVariant(row);
          const variantAngle = recordVariantAngle(row);
          const hasGap = recordHasSectionGap(row);
          const previewRecord = {
            toolName: toolSlug,
            toolSlug,
            content: String(row.content || row.preview || ""),
            generatedContent: String(row.content || row.preview || ""),
            preview: row.preview,
            metadata: row.metadata,
            generationVariant,
            variantAngle,
          };
          return (
            <li
              key={row._id}
              className="group rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:border-orange-200/80 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                  </span>
                  {row.board ? (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {row.board}
                    </Badge>
                  ) : null}
                  {isBookGroundedRow(row) ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 border-violet-200 text-violet-800 bg-violet-50"
                    >
                      Book-based
                      {typeof row.metadata?.bookTitle === "string" && row.metadata.bookTitle
                        ? ` · ${row.metadata.bookTitle}`
                        : ""}
                    </Badge>
                  ) : null}
                  {generationVariant ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 border-orange-200 text-orange-800 bg-orange-50"
                    >
                      Variant {generationVariant}
                    </Badge>
                  ) : null}
                  {variantAngle ? (
                    <span
                      className="text-[10px] text-slate-500 max-w-[220px] truncate"
                      title={variantAngle}
                    >
                      {variantAngle}
                    </span>
                  ) : null}
                </div>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                    onClick={() => void openPdf(row)}
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1.5" />
                    PDF
                  </Button>
                </div>
              </div>

              {hasGap ? (
                <SectionGapFlagPanel
                  row={row}
                  defaultToolName={defaultToolName}
                  className="mb-3"
                />
              ) : null}

              {showRecordPath ? (
                <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 space-y-1.5">
                  {formatRecordPath(row).map(({ label, value }) => (
                    <p key={label} className="text-xs text-slate-700 leading-relaxed break-words">
                      <span className="font-medium text-slate-500">{label}: </span>
                      {value}
                    </p>
                  ))}
                </div>
              ) : null}

              {renderRowExtras ? <div className="mb-3">{renderRowExtras(row)}</div> : null}

              <AiToolRecordPreviewBody
                toolSlug={toolSlug}
                record={previewRecord}
                recordId={row._id}
                deletingQuestionKey={deletingQuestionKey}
                onDeleteQuestion={(questionIndex) => void removeQuestionFromRecord(row, questionIndex)}
              />
            </li>
          );
        })}
      </ul>

      <Dialog
        open={!!view}
        onOpenChange={() => {
          setView(null);
          setViewDetail(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-semibold text-slate-900">
              Generated content
            </DialogTitle>
          </DialogHeader>
          {fullText == null ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-orange-500" />
            </div>
          ) : (
            (() => {
              const viewRecord = buildViewRecord(view, viewDetail, fullText, defaultToolName);
              const resolvedTool = normalizeAiToolSlug(
                String(viewRecord.toolName || viewRecord.toolSlug || defaultToolName || ""),
              );
              const dialogQs = extractMcqQuestionsFromRecord({
                toolName: resolvedTool,
                content: String(viewRecord.content || ""),
                generatedContent: String(viewRecord.generatedContent || ""),
                metadata: viewRecord.metadata as RecordRow["metadata"],
              });
              const isPlainMcq =
                dialogQs.length > 0 &&
                isMcqTool(resolvedTool) &&
                !isWorksheetMcqTool(resolvedTool) &&
                normalizeAiToolSlug(resolvedTool) !== "smart-qa-practice-generator" &&
                !isStructuredPaperTool(resolvedTool);

              if (isPlainMcq) {
                return (
                  <div className="space-y-4 max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                    {dialogQs.map((q, idx) => (
                      <div
                        key={`dlg-q-${idx}`}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
                      >
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed pr-2">
                          Q{displayMcqQuestionSerial(q, idx)}. {q.question}
                        </p>
                        {q.options.length > 0 ? (
                          <ul className="space-y-2.5 pl-0.5">
                            {q.options.map((opt, j) => (
                              <li
                                key={j}
                                className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700"
                              >
                                <span
                                  className="mt-1.5 h-3.5 w-3.5 rounded-full border border-slate-400 shrink-0 bg-white"
                                  aria-hidden
                                />
                                <span>{opt}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {q.answer ? (
                          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                            Answer: {q.answer}
                          </p>
                        ) : null}
                        {q.explanation ? (
                          <p className="text-xs text-slate-500">Explanation: {q.explanation}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                  <GeneratorRecordViewer record={viewRecord} />
                </div>
              );
            })()
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent className="max-w-3xl rounded-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-semibold text-slate-900">
              Edit content
            </DialogTitle>
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
    </>
  );
}
