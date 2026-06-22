import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar, Eye, Pencil, Trash2 } from "lucide-react";
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
  examPaperRecordListPreview,
  isMcqTool,
  isStructuredPaperTool,
  isWorksheetMcqTool,
  mockTestRecordListPreview,
  isExamQuestionPaperTool,
  isMockTestTool,
  worksheetRecordListPreview,
  type McqQuestion,
} from "@/lib/mcq-record-utils";
import { GeneratedRecordBody } from "@/components/super-admin/generated-record-body";
import { ExamQuestionPaperViewer } from "@/components/exam-question-paper-viewer";
import { MockTestViewer, mockTestViewerPayloadFromRecord } from "@/components/mock-test-viewer";
import { HomeworkCreatorViewer } from "@/components/homework-creator-viewer";
import { LessonPlannerViewer } from "@/components/lesson-planner-viewer";
import { DailyClassPlanViewer } from "@/components/daily-class-plan-viewer";
import { StoryPassageViewer } from "@/components/story-passage-viewer";
import { ShortNotesViewer } from "@/components/short-notes-viewer";
import { WorksheetMcqViewer } from "@/components/worksheet-mcq-viewer";
import {
  ActivityProjectViewer,
  activityViewerPayloadFromRecord,
} from "@/components/activity-project-viewer";
import { isActivityToolSlug, normalizeAiToolSlug } from "@/lib/normalize-ai-tool-slug";
import {
  PracticeQaViewer,
  practiceQaViewerPayloadFromRecord,
} from "@/components/practice-qa-viewer";
import {
  countPracticeQaQuestions,
  resolvePracticeQaFromPayload,
} from "@/lib/parse-practice-qa";

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

function isWorksheetToolValue(v: unknown): boolean {
  const t = String(v || "").trim().toLowerCase();
  return t === "worksheet-mcq-generator" || (t.includes("worksheet") && t.includes("mcq"));
}

function isLessonPlannerToolValue(v: unknown): boolean {
  const t = String(v || "").trim().toLowerCase();
  return t === "lesson-planner" || t === "study-schedule-maker";
}

function isDailyClassPlanToolValue(v: unknown): boolean {
  const t = String(v || "").trim().toLowerCase();
  return t === "daily-class-plan-maker";
}

function isHomeworkCreatorToolValue(v: unknown): boolean {
  const t = String(v || "").trim().toLowerCase();
  return t === "homework-creator";
}

function isStoryPassageToolValue(v: unknown): boolean {
  const t = String(v || "").trim().toLowerCase();
  return t === "story-passage-creator" || t === "reading-practice-room";
}

function isShortNotesToolValue(v: unknown): boolean {
  const t = String(v || "").trim().toLowerCase();
  return t === "short-notes-summaries-maker";
}

function isActivityToolValue(v: unknown): boolean {
  return isActivityToolSlug(v);
}

function isPracticeQaToolValue(v: unknown): boolean {
  return normalizeAiToolSlug(v) === "smart-qa-practice-generator";
}

function practiceQaRecordListPreview(row: RecordRow): string {
  const payload = practiceQaViewerPayloadFromRecord({
    content: String(row.content || row.preview || ""),
    generatedContent: String(row.content || row.preview || ""),
    metadata: row.metadata,
  });
  const { practice, markdownFallback } = resolvePracticeQaFromPayload(
    payload.content,
    payload.rawContent,
  );
  if (practice) {
    const title = String(practice.title || "").trim();
    const count = countPracticeQaQuestions(practice);
    const firstQ = practice.sections
      .flatMap((section) => section.questions)
      .find((question) => String(question.question || "").trim());
    if (firstQ) {
      const line = `Q${firstQ.questionNumber || 1}. ${String(firstQ.question).trim()}`;
      return title ? `${title} — ${line}` : line;
    }
    if (title) return count ? `${title} · ${count} questions` : title;
  }
  if (markdownFallback) return toEditablePlainText(markdownFallback).slice(0, 240);
  return toEditablePlainText(String(row.content || row.preview || "")).slice(0, 240);
}

function isBookGroundedRow(row: RecordRow): boolean {
  if (row.sourceType === "book_rag") return true;
  const meta = row.metadata;
  if (!meta || typeof meta !== "object") return false;
  return Boolean(meta.bookGenerator) || meta.formatSource === "bookRag";
}

function structuredContentFromViewDetail(
  detail: Record<string, unknown> | null | undefined,
): unknown {
  if (!detail) return undefined;
  if (detail.structuredContent != null) return detail.structuredContent;
  const metadata = detail.metadata;
  if (metadata && typeof metadata === "object") {
    return (metadata as Record<string, unknown>).structuredContent;
  }
  return undefined;
}

function viewDetailRawContent(detail: Record<string, unknown> | null | undefined): unknown {
  return structuredContentFromViewDetail(detail) ?? detail;
}
import {
  SectionGapFlagPanel,
  recordHasSectionGap,
} from "./SectionGapFlagPanel";
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
        {items.map((row) => {
          const toolSlug = normalizeAiToolSlug(resolveToolName(row));
          const isWorksheet = isWorksheetMcqTool(toolSlug);
          const isPracticeQa = isPracticeQaToolValue(toolSlug);
          const isExamPaper = isExamQuestionPaperTool(toolSlug);
          const isMockTest = isMockTestTool(toolSlug);
          const mcqQs =
            isMcqTool(toolSlug) && !isWorksheet && !isPracticeQa && !isStructuredPaperTool(toolSlug)
              ? recordMcqQuestions(row)
              : [];
          const previewText = isWorksheet
            ? worksheetRecordListPreview(row)
            : isPracticeQa
              ? practiceQaRecordListPreview(row)
              : isExamPaper
                ? examPaperRecordListPreview(row)
                : isMockTest
                  ? mockTestRecordListPreview(row)
                  : toEditablePlainText(String(row.content || row.preview || ""));
          const hasGap = recordHasSectionGap(row);
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
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {row.board || "—"}
                  </Badge>
                  {isBookGroundedRow(row) ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-violet-200 text-violet-800 bg-violet-50"
                    >
                      Book-based
                      {typeof row.metadata?.bookTitle === "string" && row.metadata.bookTitle
                        ? ` · ${row.metadata.bookTitle}`
                        : ""}
                    </Badge>
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

              {mcqQs.length > 0 ? (
                <div className="space-y-3">
                  {mcqQs.map((q, qIdx) => (
                    <div
                      key={`${row._id}-mcq-${qIdx}`}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs sm:text-sm font-medium text-slate-900 leading-relaxed flex-1">
                          Q{displayMcqQuestionSerial(q, qIdx)}. {q.question}
                        </p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deletingQuestionKey === `${row._id}:${qIdx}`}
                          onClick={() => removeQuestionFromRecord(row, qIdx)}
                          aria-label="Delete question"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {q.options.length > 0 ? (
                        <ul className="mt-3 space-y-2.5 pl-0.5">
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
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm">
                  <p className="text-xs sm:text-sm text-slate-700 line-clamp-4 leading-relaxed">
                    {previewText}
                  </p>
                </div>
              )}
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
              const dialogQs = viewDetail
                ? extractMcqQuestionsFromRecord({
                    toolName: normalizeAiToolSlug(
                      viewDetail.toolName || view?.toolName || defaultToolName || "",
                    ),
                    content: String(viewDetail.content || fullText || ""),
                    generatedContent: String(
                      viewDetail.generatedContent || viewDetail.content || fullText || "",
                    ),
                    metadata: viewDetail.metadata,
                  })
                : [];
              const resolvedTool = normalizeAiToolSlug(
                viewDetail?.toolName || view?.toolName || defaultToolName || "",
              );
              if (isWorksheetToolValue(resolvedTool)) {
                return (
                  <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                    <WorksheetMcqViewer content={String(fullText || "")} variant="teacher" />
                  </div>
                );
              }
              if (isLessonPlannerToolValue(resolvedTool)) {
                const lpToolKind =
                  String(resolvedTool || "").trim().toLowerCase() === "study-schedule-maker"
                    ? "study-schedule-maker"
                    : "lesson-planner";
                return (
                  <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                    <LessonPlannerViewer
                      content={String(fullText || "")}
                      rawContent={viewDetail}
                      variant={lpToolKind === "study-schedule-maker" ? "student" : "teacher"}
                      toolKind={lpToolKind}
                    />
                  </div>
                );
              }
              if (isDailyClassPlanToolValue(resolvedTool)) {
                return (
                  <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                    <DailyClassPlanViewer
                      content={String(fullText || "")}
                      rawContent={viewDetailRawContent(viewDetail)}
                      variant="teacher"
                    />
                  </div>
                );
              }
              if (isHomeworkCreatorToolValue(resolvedTool)) {
                return (
                  <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                    <HomeworkCreatorViewer content={String(fullText || "")} rawContent={viewDetail} />
                  </div>
                );
              }
              if (isStoryPassageToolValue(resolvedTool)) {
                return (
                  <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                    <StoryPassageViewer content={String(fullText || "")} rawData={viewDetail} />
                  </div>
                );
              }
              if (isShortNotesToolValue(resolvedTool)) {
                return (
                  <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                    <ShortNotesViewer
                      content={String(fullText || "")}
                      rawContent={viewDetailRawContent(viewDetail)}
                    />
                  </div>
                );
              }
              if (isActivityToolValue(resolvedTool)) {
                return (
                  <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                    <ActivityProjectViewer
                      {...activityViewerPayloadFromRecord({
                        ...(viewDetail || {}),
                        generatedContent: String(fullText || ""),
                        toolSlug: resolvedTool,
                      })}
                    />
                  </div>
                );
              }
              if (isPracticeQaToolValue(resolvedTool)) {
                return (
                  <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                    <PracticeQaViewer
                      {...practiceQaViewerPayloadFromRecord({
                        ...(viewDetail || {}),
                        content: String(fullText || ""),
                        generatedContent: String(fullText || ""),
                      })}
                    />
                  </div>
                );
              }
              if (isExamQuestionPaperTool(resolvedTool)) {
                return (
                  <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                    <ExamQuestionPaperViewer
                      content={String(fullText || "")}
                      rawContent={viewDetailRawContent(viewDetail)}
                      variant="teacher"
                    />
                  </div>
                );
              }
              if (isMockTestTool(resolvedTool)) {
                const mockPayload = mockTestViewerPayloadFromRecord({
                  ...(viewDetail || {}),
                  content: String(fullText || ""),
                  generatedContent: String(fullText || ""),
                  metadata: viewDetail?.metadata as Record<string, unknown> | undefined,
                });
                return (
                  <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1">
                    <MockTestViewer {...mockPayload} />
                  </div>
                );
              }
              if (dialogQs.length > 0) {
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
                <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm max-h-[min(70vh,620px)] overflow-y-auto">
                  <GeneratedRecordBody content={fullText} toolType={resolvedTool} />
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
