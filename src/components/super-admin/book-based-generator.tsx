import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, CheckCircle2, ExternalLink, Eye, FileText, IndianRupee, Loader2, Sparkles, Trash2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { useCurriculumCascade } from "@/hooks/use-curriculum-cascade";
import { cn } from "@/lib/utils";
import { stripMarkdownSyntax } from "@/lib/strip-markdown-syntax";
import { extractMcqQuestionsFromRecord, isMcqTool } from "@/lib/mcq-record-utils";
import {
  BOOK_BASED_TOOLS,
  BOOK_GENERATOR_BATCH_SIZE,
  BOOK_UNIQUENESS_TARGET,
  type BookBasedToolId,
} from "@/lib/book-based-tools";
import {
  computeGeminiCostFromTokenUsage,
  emptyTokenTotals,
  formatInr,
  formatTokenCount,
  type GeminiCostEstimate,
  type TokenTotals,
} from "@/lib/gemini-token-cost";
import { GeneratedRecordBody } from "@/components/super-admin/generated-record-body";
import { WorksheetMcqViewer } from "@/components/worksheet-mcq-viewer";
import { HomeworkCreatorViewer } from "@/components/homework-creator-viewer";
import { LessonPlannerViewer } from "@/components/lesson-planner-viewer";
import { FlashcardViewer } from "@/components/flashcard-viewer";
import { MyStudyDecksViewer, deckViewerPayloadFromRecord } from "@/components/my-study-decks-viewer";
import { MockTestViewer, mockTestViewerPayloadFromRecord } from "@/components/mock-test-viewer";
import { ExamQuestionPaperViewer } from "@/components/exam-question-paper-viewer";
import { SmartStudyGuideViewer, studyGuideViewerPayloadFromRecord } from "@/components/smart-study-guide-viewer";
import { ConceptBreakdownViewer, conceptBreakdownViewerPayloadFromRecord } from "@/components/concept-breakdown-viewer";
import { PracticeQaViewer, practiceQaViewerPayloadFromRecord } from "@/components/practice-qa-viewer";
import { KeyPointsViewer, keyPointsViewerPayloadFromRecord } from "@/components/key-points-viewer";
import { ShortNotesViewer } from "@/components/short-notes-viewer";

type BookOption = {
  _id: string;
  title: string;
  board: string;
  class: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  chunkCount?: number;
  processingStatus?: string;
  embeddingsCreated?: boolean;
};

type BookRecord = {
  _id: string;
  toolName?: string;
  toolSlug?: string;
  topic?: string;
  subtopic?: string;
  generatedContent: string;
  createdAt?: string;
  metadata?: {
    bookTitle?: string;
    structuredContent?: unknown;
    ragChunkCount?: number;
    extraParams?: { generationVariant?: number; variantAngle?: string };
    generationVariant?: number;
  };
  generationVariant?: number | null;
  variantAngle?: string;
};

type GroupedSubtopic = { subtopicName: string; records: BookRecord[] };
type GroupedTopic = { topicName: string; subtopics: GroupedSubtopic[] };
type GroupedSubject = { subjectName: string; topics: GroupedTopic[] };
type GroupedClass = { className: string; boardName?: string; subjects: GroupedSubject[] };
type GroupedTool = { toolName: string; toolSlug: string; classes: GroupedClass[] };

function groupRecordsForTree(items: BookRecord[]): GroupedTool[] {
  const toolMap = new Map<string, GroupedTool>();

  for (const record of items) {
    const slug = String(record.toolSlug || record.toolName || "").trim();
    const display = String(record.toolName || slug).trim();
    if (!slug) continue;

    const toolKey = `${slug}::${display}`;
    if (!toolMap.has(toolKey)) {
      toolMap.set(toolKey, { toolName: display, toolSlug: slug, classes: [] });
    }
    const toolNode = toolMap.get(toolKey)!;

    const boardName = String((record as any).boardName || (record as any).board || "").trim();
    const className = String((record as any).className || (record as any).classLabel || "").trim();
    let classNode = toolNode.classes.find(
      (x) => x.className === className && String(x.boardName || "") === boardName,
    );
    if (!classNode) {
      classNode = { className, boardName, subjects: [] };
      toolNode.classes.push(classNode);
    }

    const subjectName = String((record as any).subjectName || (record as any).subject || "").trim();
    let subjectNode = classNode.subjects.find((x) => x.subjectName === subjectName);
    if (!subjectNode) {
      subjectNode = { subjectName, topics: [] };
      classNode.subjects.push(subjectNode);
    }

    const topicName = String((record as any).topicName || (record as any).topic || "General").trim() || "General";
    let topicNode = subjectNode.topics.find((x) => x.topicName === topicName);
    if (!topicNode) {
      topicNode = { topicName, subtopics: [] };
      subjectNode.topics.push(topicNode);
    }

    const subtopicName = String((record as any).subtopicName || (record as any).subtopic || "").trim();
    let subtopicNode = topicNode.subtopics.find((x) => x.subtopicName === subtopicName);
    if (!subtopicNode) {
      subtopicNode = { subtopicName, records: [] };
      topicNode.subtopics.push(subtopicNode);
    }

    subtopicNode.records.push({
      ...record,
      toolSlug: slug,
      toolName: display,
      generationVariant:
        record.generationVariant ??
        record.metadata?.generationVariant ??
        record.metadata?.extraParams?.generationVariant ??
        null,
      variantAngle: record.variantAngle || record.metadata?.extraParams?.variantAngle || "",
    });
  }

  return Array.from(toolMap.values());
}

function parseRecordsPayload(data: unknown): { tree: GroupedTool[]; total: number } {
  if (data && typeof data === "object" && Array.isArray((data as { grouped?: GroupedTool[] }).grouped)) {
    const payload = data as { grouped: GroupedTool[]; total?: number };
    return { tree: payload.grouped, total: Number(payload.total ?? payload.grouped.length) || 0 };
  }
  if (Array.isArray(data)) {
    const tree = groupRecordsForTree(data as BookRecord[]);
    return { tree, total: data.length };
  }
  return { tree: [], total: 0 };
}

function recordPreviewText(toolSlug: string, generatedContent: string, record?: BookRecord) {
  const slug = String(toolSlug || "").trim();
  if (slug === "my-study-decks") {
    const { content } = deckViewerPayloadFromRecord({ generatedContent, metadata: record?.metadata });
    return stripMarkdownSyntax(content).slice(0, 400);
  }
  if (slug === "mock-test-builder") {
    const { content } = mockTestViewerPayloadFromRecord({ generatedContent, metadata: record?.metadata });
    return stripMarkdownSyntax(content).split("\n").find((l) => l.trim())?.slice(0, 200) || "Mock Test";
  }
  return stripMarkdownSyntax(String(generatedContent || "")).slice(0, 400);
}

function statusBadge(status?: string, indexed?: boolean) {
  if (indexed || status === "indexed") return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Ready</Badge>;
  if (status === "processing") return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Indexing…</Badge>;
  if (status === "needs_ocr") return <Badge variant="destructive">Needs OCR</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

type BookBasedGeneratorProps = {
  onOpenBookKnowledge?: () => void;
};

export default function BookBasedGenerator({ onOpenBookKnowledge }: BookBasedGeneratorProps) {
  const { toast } = useToast();
  const [selectedTool, setSelectedTool] = useState<BookBasedToolId | "">("");
  const [boardOptions, setBoardOptions] = useState<string[]>([]);
  const [board, setBoard] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [subTopic, setSubTopic] = useState("");
  const [bookId, setBookId] = useState("");
  const [useBookKnowledge, setUseBookKnowledge] = useState(true);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [recordsTree, setRecordsTree] = useState<GroupedTool[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsBoardFilter, setRecordsBoardFilter] = useState("__all__");
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLocked, setGenerationLocked] = useState(false);
  const [progress, setProgress] = useState("");
  const [lastBatchSummary, setLastBatchSummary] = useState<{
    successCount: number;
    failedCount: number;
    tokenUsage: TokenTotals;
    cost: GeminiCostEstimate;
  } | null>(null);
  const [activeRecord, setActiveRecord] = useState<BookRecord | null>(null);

  const {
    classOptions,
    subjects,
    topics,
    subtopics,
    loadingClasses,
    loadingSubjects,
    loadingTopics,
    loadingSubtopics,
  } = useCurriculumCascade(classNumber || undefined, subject || undefined, topic || undefined, board || undefined);

  const currentTool = useMemo(() => BOOK_BASED_TOOLS.find((t) => t.id === selectedTool), [selectedTool]);
  const selectedBook = useMemo(() => books.find((b) => b._id === bookId), [books, bookId]);
  const bookReady = Boolean(selectedBook?.embeddingsCreated && selectedBook?.processingStatus === "indexed");
  const step1Done = Boolean(bookId && bookReady);
  const step2Done = Boolean(step1Done && classNumber && subject && topic && subTopic);
  const step3Done = Boolean(step2Done && selectedTool);

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("superAdminToken") || localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const applyBookToCurriculum = useCallback((book: BookOption) => {
    setBookId(book._id);
    if (book.board) setBoard(book.board);
    if (book.class) setClassNumber(book.class);
    if (book.subject) setSubject(book.subject);
    setTopic(book.topic || "");
    setSubTopic(book.subtopic || "");
  }, []);

  const loadBooks = async () => {
    setBooksLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/book-knowledge/books`, { headers: { ...authHeaders() } });
      const json = await res.json();
      if (json.success) setBooks(Array.isArray(json.data) ? json.data : []);
    } catch {
      setBooks([]);
    } finally {
      setBooksLoading(false);
    }
  };

  const loadRecords = async (boardOverride?: string) => {
    setRecordsLoading(true);
    try {
      const qs = new URLSearchParams();
      const boardFilter = boardOverride ?? recordsBoardFilter;
      if (boardFilter && boardFilter !== "__all__") {
        qs.set("board", boardFilter);
      }
      const res = await fetch(`${API_BASE_URL}/api/book-generator/records?${qs}`, { headers: { ...authHeaders() } });
      const json = await res.json();
      if (json.success) {
        const { tree, total } = parseRecordsPayload(json.data);
        setRecordsTree(tree);
        setRecordsTotal(total);
      } else {
        setRecordsTree([]);
        setRecordsTotal(0);
      }
    } catch {
      setRecordsTree([]);
      setRecordsTotal(0);
    } finally {
      setRecordsLoading(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!window.confirm("Delete this record permanently?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/book-generator/records/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Delete failed");
      toast({ title: "Deleted", description: "Record deleted." });
      await loadRecords();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    void loadBooks();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadBoards = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/super-admin/ai-tool-topics/options`, {
          headers: { ...authHeaders() },
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok || json?.success === false || cancelled) throw new Error("Options fetch failed");
        const boardsFromOptions: string[] = Array.isArray(json?.data?.boards)
          ? json.data.boards.map((b: unknown) => String(b || "").trim()).filter(Boolean)
          : [];
        if (boardsFromOptions.length > 0) {
          const boards = Array.from(new Set<string>(boardsFromOptions)).sort((a, b) => a.localeCompare(b));
          setBoardOptions(boards);
          if (!board && boards[0]) setBoard(boards[0]);
          return;
        }
        throw new Error("No boards in options response");
      } catch {
        try {
          const listRes = await fetch(`${API_BASE_URL}/api/super-admin/ai-tool-topics?page=1&limit=200`, {
            headers: { ...authHeaders() },
            credentials: "include",
          });
          const listJson = await listRes.json();
          const boardsFromRows: string[] = Array.isArray(listJson?.data?.items)
            ? listJson.data.items.map((row: any) => String(row?.board || "").trim()).filter(Boolean)
            : [];
          const boards = Array.from(new Set<string>(boardsFromRows)).sort((a, b) => a.localeCompare(b));
          if (!cancelled) {
            setBoardOptions(boards);
            if (!board && boards[0]) setBoard(boards[0]);
          }
        } catch {
          if (!cancelled) setBoardOptions([]);
        }
      }
    };
    void loadBoards();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBoardChange = (value: string) => {
    setBoard(value);
    setClassNumber("");
    setSubject("");
    setTopic("");
    setSubTopic("");
  };

  const handleClassChange = (value: string) => {
    setClassNumber(value);
    setSubject("");
    setTopic("");
    setSubTopic("");
  };

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setTopic("");
    setSubTopic("");
  };

  const handleTopicChange = (value: string) => {
    setTopic(value);
    setSubTopic("");
  };

  useEffect(() => {
    void loadRecords();
  }, [recordsBoardFilter]);

  const buildGenerationPayload = (forceUnlock = false) => ({
    toolSlug: selectedTool,
    bookId,
    board,
    className: classNumber,
    subjectName: subject,
    topicName: topic,
    subtopicName: subTopic,
    batchSize: BOOK_GENERATOR_BATCH_SIZE,
    useBookKnowledge,
    async: true,
    ...(forceUnlock ? { forceUnlock: true } : {}),
  });

  const applyBatchResult = async (data: Record<string, unknown>, json: { message?: string }) => {
    const usage = data.tokenUsage as { totals?: TokenTotals; calls?: unknown[] } | undefined;
    const tokenUsage =
      usage?.totals && typeof usage.totals === "object"
        ? { ...emptyTokenTotals(), ...usage.totals }
        : emptyTokenTotals();
    const tokenCalls = Array.isArray(usage?.calls) ? usage.calls : [];
    const exchangeRateInr = Number((data.cost as GeminiCostEstimate | undefined)?.exchangeRateInr) || 95.11;
    let cost: GeminiCostEstimate;
    try {
      cost = computeGeminiCostFromTokenUsage({ totals: tokenUsage, calls: tokenCalls }, exchangeRateInr);
    } catch {
      cost =
        data.cost && typeof data.cost === "object"
          ? (data.cost as GeminiCostEstimate)
          : computeGeminiCostFromTokenUsage({ totals: tokenUsage, calls: [] }, exchangeRateInr);
    }

    const savedCount = Number(data.savedCount) || 0;
    const failedCount = Number(data.failedCount) || 0;
    setLastBatchSummary({ successCount: savedCount, failedCount, tokenUsage, cost });

    const tokenNote = `${formatTokenCount(tokenUsage.totalTokens)} tokens · Est. ${formatInr(cost.inr)}`;
    if (savedCount > 0) {
      toast({ title: `${savedCount}/${data.batchSize || BOOK_GENERATOR_BATCH_SIZE} records saved`, description: tokenNote });
      setRecordsBoardFilter("__all__");
      await loadRecords("__all__");
    } else {
      const failures = data.failures as string[] | undefined;
      toast({
        title: "Batch failed",
        description: failures?.[0] || json.message || "No records were saved.",
        variant: "destructive",
      });
      await loadRecords();
    }
  };

  const pollBookGeneratorJob = async (jobId: string) => {
    const maxPolls = 400;
    for (let attempt = 0; attempt < maxPolls; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const res = await fetch(`${API_BASE_URL}/api/book-generator/jobs/${jobId}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      const job = (json.data || {}) as {
        done?: boolean;
        locked?: boolean;
        progress?: string;
        result?: Record<string, unknown>;
        error?: string;
      };

      if (job.progress) setProgress(job.progress);
      if (!job.done) continue;

      if (job.locked) {
        setGenerationLocked(true);
        toast({
          title: "Generation already in progress",
          description: "A previous batch may still be running, or a lock is stuck. Use “Clear lock & retry” below.",
          variant: "destructive",
        });
        return;
      }

      if (job.result) {
        await applyBatchResult(job.result, json);
        return;
      }

      toast({
        title: "Batch failed",
        description: job.error || json.message || "Generation job failed.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Still generating",
      description: "The batch is taking longer than expected. Check Records in a few minutes.",
    });
  };

  const releaseLockAndRetry = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/book-generator/release-lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(buildGenerationPayload()),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to clear lock");
      setGenerationLocked(false);
      const released = Number(json?.data?.released || 0);
      toast({
        title: released > 0 ? "Lock cleared" : "Ready to retry",
        description: json.message || "Starting a fresh batch…",
      });
      await handleGenerate({ forceUnlock: true });
    } catch (e: unknown) {
      toast({
        title: "Could not clear lock",
        description: e instanceof Error ? e.message : "Failed to clear lock",
        variant: "destructive",
      });
    }
  };

  const handleGenerate = async (opts?: { forceUnlock?: boolean }) => {
    if (!selectedTool || !bookId || !classNumber || !subject || !topic || !subTopic) {
      toast({
        title: "Complete all steps",
        description: "Select a textbook, pick curriculum (topic + sub-topic), then choose a tool.",
        variant: "destructive",
      });
      return;
    }
    if (!bookReady) {
      toast({ title: "Book not ready", description: "Wait for indexing to finish or reindex from Book Knowledge Base.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGenerationLocked(false);
    setProgress("Retrieving textbook chunks for your topic…");
    if (!opts?.forceUnlock) setLastBatchSummary(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/book-generator/generate-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(buildGenerationPayload(opts?.forceUnlock)),
      });
      const json = await res.json();

      if (res.status === 409 || json.locked || json.data?.locked) {
        setGenerationLocked(true);
        const existingJobId = json.data?.jobId;
        toast({
          title: "Generation already in progress",
          description: existingJobId
            ? "A batch is still running for this book/sub-topic. Wait a few minutes or use “Clear lock & retry”."
            : "A previous batch may still be running, or a lock is stuck. Use “Clear lock & retry” below.",
          variant: "destructive",
        });
        if (existingJobId) {
          setProgress("Resuming status check for in-progress batch…");
          await pollBookGeneratorJob(String(existingJobId));
        }
        return;
      }

      if (res.status === 202 && json.data?.jobId) {
        setProgress("Generation started — this may take several minutes…");
        await pollBookGeneratorJob(String(json.data.jobId));
        return;
      }

      const data = (json.data || {}) as Record<string, unknown>;
      await applyBatchResult(data, json);
    } catch (e: unknown) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Network or server error. If you saw a CORS message, the API likely timed out — deploy the latest backend and retry.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  };

  const renderViewer = (rec: BookRecord) => {
    const slug = rec.toolSlug || rec.toolName || "";
    const payload = { generatedContent: rec.generatedContent, metadata: rec.metadata, toolSlug: slug, toolName: slug };
    if (slug === "my-study-decks") return <MyStudyDecksViewer {...deckViewerPayloadFromRecord(payload)} />;
    if (slug === "flashcard-generator") return <FlashcardViewer content={rec.generatedContent} variant="teacher" />;
    if (slug === "worksheet-mcq-generator") return <WorksheetMcqViewer content={rec.generatedContent} rawContent={rec} variant="teacher" />;
    if (slug === "lesson-planner") return <LessonPlannerViewer content={rec.generatedContent} rawContent={rec} variant="teacher" toolKind="lesson-planner" />;
    if (slug === "homework-creator") return <HomeworkCreatorViewer content={rec.generatedContent} rawContent={rec} />;
    if (slug === "mock-test-builder") return <MockTestViewer {...mockTestViewerPayloadFromRecord(payload)} />;
    if (slug === "exam-question-paper-generator") return <ExamQuestionPaperViewer content={rec.generatedContent} rawContent={rec.metadata?.structuredContent || rec} variant="teacher" />;
    if (slug === "smart-study-guide-generator") return <SmartStudyGuideViewer {...studyGuideViewerPayloadFromRecord(payload)} />;
    if (slug === "concept-breakdown-explainer") return <ConceptBreakdownViewer {...conceptBreakdownViewerPayloadFromRecord(payload)} />;
    if (slug === "smart-qa-practice-generator") return <PracticeQaViewer {...practiceQaViewerPayloadFromRecord(payload)} />;
    if (slug === "key-points-formula-extractor") return <KeyPointsViewer {...keyPointsViewerPayloadFromRecord(payload)} />;
    if (slug === "short-notes-summaries-maker") return <ShortNotesViewer content={rec.generatedContent} rawContent={rec.metadata?.structuredContent || rec} />;
    return <GeneratedRecordBody content={rec.generatedContent} />;
  };

  const openView = (row: BookRecord) => {
    setActiveRecord(row);
  };

  return (
    <div className="w-full max-w-[min(100%,1400px)] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-violet-600" />
          Book-Based AI Generator
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Select an indexed textbook → pick curriculum topic/sub-topic → generate content grounded in your book.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Upload PDFs in <strong>Book Knowledge Base</strong> (sidebar). This page is only for generation.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-slate-700 space-y-1">
        <p className="font-semibold text-amber-900 flex items-center gap-1.5">
          <IndianRupee className="h-3.5 w-3.5" />
          Where Gemini cost applies
        </p>
        <p>
          <strong>Book upload / indexing</strong> (Book Knowledge Base): PDF text extraction is free. Embeddings use{" "}
          <code className="text-[11px] bg-white/80 px-1 rounded">EMBEDDING_PROVIDER=local</code> by default (₹0).
          Scanned PDF OCR may use a small Gemini charge.
        </p>
        <p>
          <strong>Content generation</strong> (this page): each batch of {BOOK_GENERATOR_BATCH_SIZE} records uses Gemini —
          token count and estimated ₹ cost appear below the Generate button after each run (same as AI Generator).
        </p>
      </div>

      {/* Flow steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { n: 1, label: "Select textbook", done: step1Done },
          { n: 2, label: "Curriculum inputs", done: step2Done },
          { n: 3, label: "Tool & generate", done: step3Done },
        ].map((s) => (
          <div
            key={s.n}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
              s.done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700",
            )}
          >
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", s.done ? "bg-emerald-600 text-white" : "bg-violet-100 text-violet-700")}>
              {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.n}
            </span>
            <span className="font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Select textbook from library */}
      <Card className="border-violet-200/80">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            Step 1 — Select Textbook
          </CardTitle>
          <p className="text-sm text-slate-500 font-normal">
            Choose a book you already uploaded in Book Knowledge Base. Upload new PDFs there — not here.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {books.length === 0 && !booksLoading ? (
            <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center space-y-3">
              <p className="text-sm text-slate-600">No textbooks indexed yet.</p>
              <Button
                type="button"
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => onOpenBookKnowledge?.()}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Book Knowledge Base to upload PDF
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">Your indexed textbooks</p>
                <Button type="button" variant="outline" size="sm" onClick={() => { void loadBooks(); }}>
                  Refresh list
                </Button>
              </div>
              {booksLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
              ) : (
                <ul className="max-h-72 overflow-y-auto space-y-2 rounded-lg border p-2">
                  {books.map((b) => (
                    <li key={b._id}>
                      <button
                        type="button"
                        onClick={() => applyBookToCurriculum(b)}
                        className={cn(
                          "w-full text-left rounded-lg border px-3 py-2 text-sm transition hover:bg-slate-50",
                          bookId === b._id ? "border-violet-500 bg-violet-50 ring-1 ring-violet-200" : "border-slate-200",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-slate-900 line-clamp-1">{b.title}</span>
                          {statusBadge(b.processingStatus, b.embeddingsCreated)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {b.board} · Class {b.class} · {b.subject}
                          {b.chunkCount ? ` · ${b.chunkCount} chunks` : ""}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {selectedBook ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <FileText className="h-4 w-4 shrink-0" />
              <span>
                Selected: <strong>{selectedBook.title}</strong>
                {bookReady ? " — ready for generation" : " — still indexing; reindex from Book Knowledge Base"}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Step 2: Curriculum */}
      <Card className={cn(!bookId && "opacity-60 pointer-events-none")}>
        <CardHeader>
          <CardTitle className="text-lg">Step 2 — Select Curriculum (your inputs)</CardTitle>
          <p className="text-sm text-slate-500 font-normal">
            Board/class/subject are pre-filled from the book. Pick the <strong>topic</strong> and <strong>sub-topic</strong> you want content for — generation uses these + textbook passages.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Board</Label>
            <Select value={board} onValueChange={handleBoardChange}>
              <SelectTrigger><SelectValue placeholder={boardOptions.length ? "Select board" : "Loading boards…"} /></SelectTrigger>
              <SelectContent>
                {boardOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classNumber} onValueChange={handleClassChange} disabled={!board || loadingClasses}>
              <SelectTrigger><SelectValue placeholder={!board ? "Select board first" : loadingClasses ? "Loading classes…" : "Select class"} /></SelectTrigger>
              <SelectContent>
                {classOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subject} onValueChange={handleSubjectChange} disabled={!classNumber || loadingSubjects}>
              <SelectTrigger><SelectValue placeholder={!classNumber ? "Select class first" : loadingSubjects ? "Loading subjects…" : "Select subject"} /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Topic</Label>
            <Select value={topic} onValueChange={handleTopicChange} disabled={!subject || loadingTopics}>
              <SelectTrigger><SelectValue placeholder={!subject ? "Select subject first" : loadingTopics ? "Loading topics…" : "Select topic"} /></SelectTrigger>
              <SelectContent>
                {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sub Topic</Label>
            <Select value={subTopic} onValueChange={setSubTopic} disabled={!topic || loadingSubtopics}>
              <SelectTrigger><SelectValue placeholder={!topic ? "Select topic first" : loadingSubtopics ? "Loading sub topics…" : "Select sub topic"} /></SelectTrigger>
              <SelectContent>
                {subtopics.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Tool + Generate */}
      <Card className={cn(!step2Done && "opacity-60")}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Step 3 — Choose Tool & Generate
          </CardTitle>
          <p className="text-sm text-slate-500 font-normal">
            AI retrieves relevant passages from <strong>{selectedBook?.title || "your textbook"}</strong> for{" "}
            <strong>{topic || "…"} / {subTopic || "…"}</strong> and generates {BOOK_GENERATOR_BATCH_SIZE} unique records.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {BOOK_BASED_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setSelectedTool(tool.id)}
                disabled={!step2Done}
                className={cn(
                  "text-left rounded-xl border p-4 transition shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedTool === tool.id ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200" : "border-slate-200 bg-white",
                )}
              >
                <p className="font-semibold text-sm text-slate-900">{tool.name}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tool.description}</p>
              </button>
            ))}
          </div>

          {selectedTool && step2Done ? (
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-violet-100 bg-violet-50/50 p-4">
              <div className="flex items-center gap-2">
                <Checkbox id="use-book-kb" checked={useBookKnowledge} onCheckedChange={(v) => setUseBookKnowledge(v === true)} />
                <Label htmlFor="use-book-kb" className="text-sm cursor-pointer">Use textbook as primary source (RAG)</Label>
              </div>
              <p className="text-xs text-slate-600 flex-1 min-w-[200px]">
                Combines your curriculum inputs with retrieved book content. Target: {BOOK_UNIQUENESS_TARGET}+ unique records per sub-topic.
              </p>
              <Button
                className="bg-violet-600 hover:bg-violet-700 shrink-0"
                onClick={() => void handleGenerate()}
                disabled={isGenerating || !bookReady}
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {isGenerating ? progress || "Generating…" : `Generate ${BOOK_GENERATOR_BATCH_SIZE} with Gemini`}
              </Button>
              {generationLocked ? (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-50"
                  disabled={isGenerating}
                  onClick={() => void releaseLockAndRetry()}
                >
                  Clear lock & retry
                </Button>
              ) : null}
            </div>
          ) : null}

          {lastBatchSummary ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-emerald-900">
                Last batch: {lastBatchSummary.successCount}/{BOOK_GENERATOR_BATCH_SIZE} saved
                {lastBatchSummary.failedCount > 0 ? ` (${lastBatchSummary.failedCount} failed)` : ""}
              </p>
              <p>
                Tokens:{" "}
                <span className="font-medium">{formatTokenCount(lastBatchSummary.tokenUsage.totalTokens)}</span> total
                {" "}({formatTokenCount(lastBatchSummary.tokenUsage.promptTokens)} prompt +{" "}
                {formatTokenCount(lastBatchSummary.tokenUsage.completionTokens)} completion,{" "}
                {lastBatchSummary.tokenUsage.callCount} LLM calls)
              </p>
              <p>
                Estimated Gemini cost:{" "}
                <span className="font-semibold text-emerald-900">{formatInr(lastBatchSummary.cost.inr)}</span>
                {" "}(~${lastBatchSummary.cost.usd.toFixed(4)} USD at ₹{lastBatchSummary.cost.exchangeRateInr}/$)
              </p>
              <p className="text-[11px] text-slate-500">{lastBatchSummary.cost.pricingNote}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <CardTitle className="mb-0 text-lg">Records ({recordsTotal})</CardTitle>
            <div className="flex flex-col gap-1.5 sm:w-64">
              <Label className="text-xs text-slate-600">Filter by board</Label>
              <Select value={recordsBoardFilter} onValueChange={setRecordsBoardFilter}>
                <SelectTrigger><SelectValue placeholder="Board" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All boards</SelectItem>
                  {boardOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Showing book-grounded records for:{" "}
            <span className="font-medium text-slate-700">
              {recordsBoardFilter === "__all__" ? "All boards" : recordsBoardFilter}
            </span>
          </p>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600 py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
              Loading records...
            </div>
          ) : recordsTree.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No book-grounded records
              {recordsBoardFilter !== "__all__" ? ` for board “${recordsBoardFilter}”. Try “All boards”.` : " yet. Select a textbook, pick curriculum, then generate."}
            </p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {recordsTree.map((toolNode) => (
                <AccordionItem key={toolNode.toolSlug} value={`tool-${toolNode.toolSlug}`} className="border rounded-xl px-3 mb-3">
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
                                              {topicNode.subtopics.map((subtopicNode) => (
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
                                                    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/30 to-violet-50/20 shadow-sm overflow-hidden">
                                                      <div className="border-b border-slate-100/80 bg-white/80 px-4 py-3">
                                                        <p className="text-xs text-slate-500">RECORDS</p>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                          {subtopicNode.records.length} generation{subtopicNode.records.length === 1 ? "" : "s"}
                                                        </p>
                                                      </div>
                                                      <div className="p-4 space-y-3">
                                                        {subtopicNode.records.map((row) => (
                                                          <div
                                                            key={row._id}
                                                            className="group rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:border-violet-200/80 hover:shadow-md"
                                                          >
                                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                              <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-xs text-slate-500">
                                                                  {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
                                                                </p>
                                                                {row.metadata?.bookTitle ? (
                                                                  <Badge variant="outline" className="text-[10px] h-5 border-violet-200 text-violet-800 bg-violet-50">
                                                                    {row.metadata.bookTitle}
                                                                  </Badge>
                                                                ) : null}
                                                                {row.generationVariant ? (
                                                                  <Badge variant="outline" className="text-[10px] h-5 border-violet-200 text-violet-800 bg-violet-50">
                                                                    Variant {row.generationVariant}
                                                                  </Badge>
                                                                ) : null}
                                                              </div>
                                                              <div className="flex items-center gap-1">
                                                                <Button
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  className="h-8 text-xs rounded-lg text-violet-700 hover:text-violet-800 hover:bg-violet-50"
                                                                  onClick={() => openView(row)}
                                                                >
                                                                  <Eye className="h-3.5 w-3.5 mr-1.5" /> View full
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
                                                              </div>
                                                            </div>
                                                            {(() => {
                                                              const parsedMcqs = isMcqTool(toolNode.toolSlug)
                                                                ? extractMcqQuestionsFromRecord({
                                                                    toolName: toolNode.toolSlug,
                                                                    generatedContent: String(row.generatedContent || ""),
                                                                  })
                                                                : [];
                                                              if (parsedMcqs.length > 0) {
                                                                return (
                                                                  <div className="space-y-3">
                                                                    {parsedMcqs.slice(0, 2).map((q, i) => (
                                                                      <div key={`${row._id}-mcq-${i}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                                                        <p className="text-sm font-medium text-slate-900">Q{i + 1}. {q.question}</p>
                                                                      </div>
                                                                    ))}
                                                                  </div>
                                                                );
                                                              }
                                                              return (
                                                                <p className="text-sm text-slate-700 line-clamp-4 leading-relaxed border-l-2 border-violet-200 pl-3">
                                                                  {recordPreviewText(toolNode.toolSlug, String(row.generatedContent || ""), row)}
                                                                </p>
                                                              );
                                                            })()}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
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
            <DialogTitle>Generated Record (Book-RAG)</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6">
            <div className="min-w-0 rounded-xl border bg-white p-4 shadow-sm">
              {activeRecord ? renderViewer(activeRecord) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
