import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, CheckCircle2, ExternalLink, FileText, FolderTree, IndianRupee, Loader2, Sparkles } from "lucide-react";
import { GeneratorRecordsPanel } from "@/components/super-admin/generator-records-panel";
import { GenerationRecordCountField } from "@/components/super-admin/generation-record-count-field";
import { API_BASE_URL } from "@/lib/api-config";
import { networkErrorUserMessage, resilientFetch } from "@/lib/resilient-fetch";
import { useToast } from "@/hooks/use-toast";
import { useCurriculumCascade } from "@/hooks/use-curriculum-cascade";
import { cn } from "@/lib/utils";
import {
  BOOK_BASED_STUDENT_TOOLS,
  BOOK_BASED_TEACHER_TOOLS,
  BOOK_BASED_TOOLS,
  BOOK_GENERATOR_MAX_BATCH_SIZE,
  BOOK_UNIQUENESS_TARGET,
  type BookBasedTool,
  type BookBasedToolId,
} from "@/lib/book-based-tools";
import {
  filterSubjectsForAiTool,
  isLanguageExcludedTool,
  isStoryLanguageTool,
  isStoryPassageLanguageSubject,
  LANGUAGE_EXCLUDED_TOOL_ERROR,
} from "@/lib/ai-tool-subject-rules";
import {
  computeGeminiCostFromTokenUsage,
  emptyTokenTotals,
  formatInr,
  formatTokenCount,
  type GeminiCostEstimate,
  type TokenCall,
  type TokenTotals,
} from "@/lib/gemini-token-cost";
import {
  GENERATION_RECORD_COUNT_MIN,
  generationRecordCountButtonLabel,
  isValidGenerationRecordCount,
  parseGenerationRecordCount,
} from "@/lib/generation-record-count";
import { sortClassLabelsAscending } from "@/lib/super-admin-curriculum-classes";
import {
  DEFAULT_GENERATION_QUALITY_TIER,
  GENERATION_QUALITY_TIERS,
  type GenerationQualityTierId,
} from "@/lib/generation-quality-tier";

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

function statusBadge(status?: string, indexed?: boolean) {
  if (indexed || status === "indexed") return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Ready</Badge>;
  if (status === "processing") return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Indexing…</Badge>;
  if (status === "needs_ocr") return <Badge variant="destructive">Needs OCR</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function normalizeClassLabel(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "Unassigned";
  if (/^iit-\d+/i.test(trimmed) || trimmed === "Class-6-IIT") return "Class 6";
  return /^class\b/i.test(trimmed) ? trimmed : `Class ${trimmed}`;
}

type BookListGroup = {
  key: string;
  label: string;
  books: BookOption[];
};

function groupBooksByClass(books: BookOption[]): BookListGroup[] {
  const map = new Map<string, BookListGroup>();
  for (const book of books) {
    const board = String(book.board || "Other").trim() || "Other";
    const classLabel = normalizeClassLabel(book.class);
    const key = `${board}|${classLabel}`;
    const label = `${board} · ${classLabel}`;
    const existing = map.get(key);
    if (existing) {
      existing.books.push(book);
    } else {
      map.set(key, { key, label, books: [book] });
    }
  }
  return Array.from(map.values())
    .map((group) => ({
      ...group,
      books: [...group.books].sort((a, b) => {
        const subjectCmp = String(a.subject || "").localeCompare(String(b.subject || ""));
        if (subjectCmp !== 0) return subjectCmp;
        return String(a.title || "").localeCompare(String(b.title || ""));
      }),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function groupBooksBySubject(books: BookOption[]): BookListGroup[] {
  const map = new Map<string, BookListGroup>();
  for (const book of books) {
    const board = String(book.board || "Other").trim() || "Other";
    const subject = String(book.subject || "Other").trim() || "Other";
    const key = `${board}|${subject}`;
    const label = `${board} · ${subject}`;
    const existing = map.get(key);
    if (existing) {
      existing.books.push(book);
    } else {
      map.set(key, { key, label, books: [book] });
    }
  }
  return Array.from(map.values())
    .map((group) => ({
      ...group,
      books: [...group.books].sort((a, b) => {
        const classCmp = normalizeClassLabel(a.class).localeCompare(normalizeClassLabel(b.class));
        if (classCmp !== 0) return classCmp;
        return String(a.title || "").localeCompare(String(b.title || ""));
      }),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

type BookBasedGeneratorProps = {
  onOpenBookKnowledge?: () => void;
  onOpenAiToolData?: () => void;
};

export default function BookBasedGenerator({ onOpenBookKnowledge, onOpenAiToolData }: BookBasedGeneratorProps) {
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
  const [qualityTier, setQualityTier] = useState<GenerationQualityTierId>(DEFAULT_GENERATION_QUALITY_TIER);
  const [generationRecordCount, setGenerationRecordCount] = useState("");
  const [books, setBooks] = useState<BookOption[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLocked, setGenerationLocked] = useState(false);
  const [progress, setProgress] = useState("");
  const [lastBatchSummary, setLastBatchSummary] = useState<{
    successCount: number;
    failedCount: number;
    batchSize: number;
    tokenUsage: TokenTotals;
    cost: GeminiCostEstimate;
    failures: string[];
  } | null>(null);
  const [recordsReloadNonce, setRecordsReloadNonce] = useState(0);

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
  const subjectsForTool = useMemo(
    () => filterSubjectsForAiTool(selectedTool || "", subjects),
    [selectedTool, subjects],
  );
  const classOptionsForSelect = useMemo(
    () => sortClassLabelsAscending(classOptions),
    [classOptions],
  );
  const subjectOptionsForSelect = useMemo(
    () => (selectedTool ? subjectsForTool : subjects),
    [selectedTool, subjectsForTool, subjects],
  );
  const selectedBook = useMemo(() => books.find((b) => b._id === bookId), [books, bookId]);
  const bookReady = Boolean(selectedBook?.embeddingsCreated && selectedBook?.processingStatus === "indexed");
  const step1Done = Boolean(bookId && bookReady);
  const curriculumDone = Boolean(step1Done && classNumber && subject && topic && subTopic);
  const step2Done = Boolean(curriculumDone && selectedTool);

  const [bookGroupMode, setBookGroupMode] = useState<"class" | "subject">("class");
  const [bookGroupFilter, setBookGroupFilter] = useState("__all__");

  const bookGroups = useMemo(
    () => (bookGroupMode === "class" ? groupBooksByClass(books) : groupBooksBySubject(books)),
    [books, bookGroupMode],
  );

  const visibleBookGroups = useMemo(() => {
    if (bookGroupFilter === "__all__") return bookGroups;
    return bookGroups.filter((group) => group.key === bookGroupFilter);
  }, [bookGroupFilter, bookGroups]);

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("superAdminToken") || localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const selectBook = useCallback((book: BookOption) => {
    setBookId(book._id);
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

  useEffect(() => {
    void loadBooks();
  }, []);

  useEffect(() => {
    const boardKey = String(board || "").toUpperCase().replace(/[\s/\\-]+/g, "");
    const isIitBoard = boardKey.includes("IIT") || boardKey.includes("NEET") || boardKey.includes("JEE");
    if (isIitBoard && (classNumber === "IIT-6" || classNumber === "Class-6-IIT")) {
      setClassNumber("Class 6");
    }
  }, [board, classNumber]);

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

  const handleToolSelect = (toolId: BookBasedToolId) => {
    setSelectedTool(toolId);
    if (isStoryLanguageTool(toolId) && subject && !isStoryPassageLanguageSubject(subject)) {
      setSubject("");
      setTopic("");
      setSubTopic("");
    }
    if (isLanguageExcludedTool(toolId) && subject && isStoryPassageLanguageSubject(subject)) {
      setSubject("");
      setTopic("");
      setSubTopic("");
    }
  };

  useEffect(() => {
    if (!isStoryLanguageTool(selectedTool)) return;
    if (!subject || isStoryPassageLanguageSubject(subject)) return;
    setSubject("");
    setTopic("");
    setSubTopic("");
  }, [selectedTool, subject]);

  useEffect(() => {
    if (!isLanguageExcludedTool(selectedTool)) return;
    if (!subject || !isStoryPassageLanguageSubject(subject)) return;
    setSubject("");
    setTopic("");
    setSubTopic("");
  }, [selectedTool, subject]);

  const renderToolButton = (tool: BookBasedTool) => (
    <button
      key={tool.id}
      type="button"
      onClick={() => handleToolSelect(tool.id as BookBasedToolId)}
      disabled={!step1Done}
      className={cn(
        "text-left rounded-xl border p-4 transition shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
        selectedTool === tool.id ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200" : "border-slate-200 bg-white",
      )}
    >
      <p className="font-semibold text-sm text-slate-900">{tool.name}</p>
      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tool.description}</p>
    </button>
  );

  const parseBatchSize = () => parseGenerationRecordCount(generationRecordCount)!;

  const buildGenerationPayload = (forceUnlock = false) => ({
    toolSlug: selectedTool,
    bookId,
    board,
    className: classNumber,
    subjectName: subject,
    topicName: topic,
    subtopicName: subTopic,
    batchSize: parseBatchSize(),
    useBookKnowledge,
    qualityTier,
    async: true,
    ...(forceUnlock ? { forceUnlock: true } : {}),
  });

  const applyBatchResult = async (data: Record<string, unknown>, json: { message?: string }) => {
    const usage = data.tokenUsage as { totals?: TokenTotals; calls?: TokenCall[] } | undefined;
    const tokenUsage =
      usage?.totals && typeof usage.totals === "object"
        ? { ...emptyTokenTotals(), ...usage.totals }
        : emptyTokenTotals();
    const tokenCalls: TokenCall[] = Array.isArray(usage?.calls) ? usage.calls : [];
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
    const bookTextUsed = data.bookTextUsed !== false;
    const ragChunkCount = Number(data.ragChunkCount) || 0;
    const resultBatchSize = Number(data.batchSize) || parseGenerationRecordCount(generationRecordCount) || 0;
    const batchFailures = Array.isArray(data.failures) ? (data.failures as string[]) : [];
    setLastBatchSummary({
      successCount: savedCount,
      failedCount,
      batchSize: resultBatchSize,
      tokenUsage,
      cost,
      failures: batchFailures,
    });

    const tokenNote = `${formatTokenCount(tokenUsage.totalTokens)} tokens · Est. ${formatInr(cost.inr)}`;
    if (savedCount > 0) {
      setRecordsReloadNonce((n) => n + 1);
      toast({
        title: `${savedCount}/${resultBatchSize} saved`,
        description: bookTextUsed
          ? `${tokenNote}. Used ${ragChunkCount} textbook passage(s). Browse below or in AI Tool Data.`
          : `${tokenNote}. Warning: no textbook passages were retrieved — content may not be book-grounded. Reindex the book or verify topic/subtopic.`,
        variant: bookTextUsed ? "default" : "destructive",
      });
    } else {
      const failures = data.failures as string[] | undefined;
      const failedCount = Number(data.failedCount) || 0;
      const allBusy =
        Array.isArray(failures) &&
        failures.length > 0 &&
        failures.every((line) => /temporarily busy|503|429|UNAVAILABLE/i.test(line));
      const allSpendCap =
        Array.isArray(failures) &&
        failures.length > 0 &&
        failures.every((line) => /spending cap|monthly spend|Billing\/Spend/i.test(line));
      const retryHint = allSpendCap
        ? " Raise the Gemini project spending cap in Google AI Studio (Billing/Spend), then retry."
        : allBusy
          ? " Gemini may be rate-limited. Wait 1–2 minutes, try Balanced or Fast, or generate fewer records (3–5)."
          : "";
      const failNote =
        failures?.length && failedCount > 0
          ? `${failedCount} slot(s) failed. ${failures[0]}${failures.length > 1 ? ` (+${failures.length - 1} more)` : ""}${retryHint}`
          : `${json.message || "No records were saved."}${retryHint}`;
      toast({
        title: "Batch failed",
        description: failNote,
        variant: "destructive",
      });
    }
  };

  const pollBookGeneratorJob = async (jobId: string) => {
    const maxPolls = 400;
    for (let attempt = 0; attempt < maxPolls; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
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
      description: "The batch is taking longer than expected. Check AI Tool Data in a few minutes.",
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
    if (isStoryLanguageTool(selectedTool) && !isStoryPassageLanguageSubject(subject)) {
      toast({
        title: "English, Hindi, or Telugu only",
        description: "Story & Passage and Reading Practice tools work only with English, Hindi, or Telugu subjects.",
        variant: "destructive",
      });
      return;
    }
    if (isLanguageExcludedTool(selectedTool) && isStoryPassageLanguageSubject(subject)) {
      toast({
        title: "Language subjects not supported",
        description: LANGUAGE_EXCLUDED_TOOL_ERROR,
        variant: "destructive",
      });
      return;
    }
    if (!isValidGenerationRecordCount(generationRecordCount)) {
      toast({
        title: "Invalid record count",
        description: `Enter a whole number from ${GENERATION_RECORD_COUNT_MIN} to ${BOOK_GENERATOR_MAX_BATCH_SIZE} only.`,
        variant: "destructive",
      });
      return;
    }
    const batchSize = parseBatchSize();
    setIsGenerating(true);
    setGenerationLocked(false);
    setProgress("Retrieving textbook chunks for your topic…");
    if (!opts?.forceUnlock) setLastBatchSummary(null);
    try {
      const res = await resilientFetch(`${API_BASE_URL}/api/book-generator/generate-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(buildGenerationPayload(opts?.forceUnlock)),
        retries: 2,
        retryDelayMs: 2500,
        timeoutMs: 0,
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
        setProgress(`Generation started — 0/${batchSize} saved (this may take 10–25 min for heavy tools)…`);
        await pollBookGeneratorJob(String(json.data.jobId));
        return;
      }

      const data = (json.data || {}) as Record<string, unknown>;
      await applyBatchResult(data, json);
    } catch (e: unknown) {
      toast({
        title: "Generation failed",
        description: networkErrorUserMessage(e),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
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
          Same tool output as AI Generator, but built from your textbook passages. Saved records appear below and in{" "}
          <strong>AI Tool Data</strong> for teachers and students.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Upload PDFs in <strong>Book Knowledge Base</strong> (sidebar). Browse or edit saved output in{" "}
          <strong>AI Tool Data</strong> (sidebar).
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
          <strong>Content generation</strong> (this page): choose how many records to generate per batch ({GENERATION_RECORD_COUNT_MIN}–{BOOK_GENERATOR_MAX_BATCH_SIZE}) with Gemini.
          <strong> Premium</strong> uses Gemini 3.1 Pro Preview; <strong>Balanced</strong> and <strong>Fast</strong> use Gemini 3.1 Flash-Lite.
          Token count and estimated ₹ cost appear below after each run.
        </p>
      </div>

      {/* Flow steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { n: 1, label: "Select textbook", done: step1Done },
          { n: 2, label: "Tool & inputs", done: step2Done },
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
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-slate-800">Your indexed textbooks</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={bookGroupMode} onValueChange={(v) => { setBookGroupMode(v as "class" | "subject"); setBookGroupFilter("__all__"); }}>
                    <SelectTrigger className="h-8 w-[9.5rem] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class">Group by class</SelectItem>
                      <SelectItem value="subject">Group by subject</SelectItem>
                    </SelectContent>
                  </Select>
                  {bookGroups.length > 1 ? (
                    <Select value={bookGroupFilter} onValueChange={setBookGroupFilter}>
                      <SelectTrigger className="h-8 w-[11rem] text-xs">
                        <SelectValue placeholder="All groups" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All groups</SelectItem>
                        {bookGroups.map((group) => (
                          <SelectItem key={group.key} value={group.key}>
                            {group.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" onClick={() => { void loadBooks(); }}>
                    Refresh list
                  </Button>
                </div>
              </div>
              {booksLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
              ) : (
                <div className="max-h-[min(22rem,52vh)] overflow-y-auto rounded-lg border">
                  {visibleBookGroups.map((group) => (
                    <section key={group.key} className="border-b border-slate-100 last:border-b-0">
                      <p className="sticky top-0 z-10 border-b border-violet-100 bg-violet-50/95 px-3 py-2 text-xs font-bold uppercase tracking-wide text-violet-900 backdrop-blur-sm">
                        {group.label}
                        <span className="ml-2 font-medium normal-case tracking-normal text-violet-700">
                          ({group.books.length})
                        </span>
                      </p>
                      <ul className="space-y-2 p-2">
                        {group.books.map((b) => (
                          <li key={b._id}>
                            <button
                              type="button"
                              onClick={() => selectBook(b)}
                              className={cn(
                                "w-full text-left rounded-lg border px-3 py-2.5 text-sm transition hover:bg-slate-50",
                                bookId === b._id ? "border-violet-500 bg-violet-50 ring-1 ring-violet-200" : "border-slate-200",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium text-slate-900 line-clamp-2">{b.title}</span>
                                {statusBadge(b.processingStatus, b.embeddingsCreated)}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {bookGroupMode === "class"
                                  ? `${b.subject || "Subject"}${b.chunkCount ? ` · ${b.chunkCount} chunks` : ""}`
                                  : `${normalizeClassLabel(b.class)}${b.chunkCount ? ` · ${b.chunkCount} chunks` : ""}`}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
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

      {/* Step 2: Curriculum + tool + generate */}
      <Card className={cn(!bookId && "opacity-60 pointer-events-none")}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Step 2 — Choose Tool, Then Inputs
          </CardTitle>
          <p className="text-sm text-slate-500 font-normal">
            Pick a <strong>tool</strong> first, then fill <strong>board</strong>, <strong>class</strong>, <strong>subject</strong>, <strong>topic</strong>, <strong>sub-topic</strong>, and record count (1–{BOOK_GENERATOR_MAX_BATCH_SIZE}) to generate.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
        <div className="space-y-6">
          <div>
            <p className="mb-1 text-sm font-semibold text-slate-900">1. Choose tool</p>
            <p className="mb-3 text-sm text-slate-500">
              <strong>{BOOK_BASED_STUDENT_TOOLS.length} student</strong> and <strong>{BOOK_BASED_TEACHER_TOOLS.length} teacher</strong> tools for{" "}
              <strong>{selectedBook?.title || "your textbook"}</strong>.
            </p>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Student ({BOOK_BASED_STUDENT_TOOLS.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {BOOK_BASED_STUDENT_TOOLS.map(renderToolButton)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Teacher ({BOOK_BASED_TEACHER_TOOLS.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {BOOK_BASED_TEACHER_TOOLS.map(renderToolButton)}
            </div>
          </div>
        </div>

        <div className={cn("space-y-4 border-t border-slate-200 pt-6", !selectedTool && "opacity-60 pointer-events-none")}>
          <p className="text-sm font-semibold text-slate-900">2. Curriculum inputs</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                {classOptionsForSelect.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subject} onValueChange={handleSubjectChange} disabled={!classNumber || loadingSubjects}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !classNumber
                      ? "Select class first"
                      : loadingSubjects
                        ? "Loading subjects…"
                        : isStoryLanguageTool(selectedTool) && subjectsForTool.length === 0
                          ? "English, Hindi, or Telugu only"
                          : isLanguageExcludedTool(selectedTool) && subjectsForTool.length === 0
                            ? "Not available for English, Hindi, or Telugu"
                            : "Select subject"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subjectOptionsForSelect.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
          <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
            <GenerationRecordCountField
              id="book-generation-count"
              value={generationRecordCount}
              onChange={setGenerationRecordCount}
              disabled={isGenerating}
            />
          </div>
        </div>

          {selectedTool && curriculumDone ? (
            <div className="flex flex-col gap-3 rounded-lg border border-violet-100 bg-violet-50/50 p-4 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {currentTool ? (
                  <Badge variant="secondary" className="shrink-0 max-w-full">
                    {currentTool.audience === "student" ? "Student" : "Teacher"} · {currentTool.name}
                  </Badge>
                ) : null}
                {isStoryLanguageTool(selectedTool) ? (
                  <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-2 py-1.5 w-full sm:w-auto">
                    English, Hindi, and Telugu subjects only for this tool.
                  </p>
                ) : null}
                {isLanguageExcludedTool(selectedTool) ? (
                  <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 w-full sm:w-auto">
                    Not available for English, Hindi, or Telugu subjects.
                  </p>
                ) : null}
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="use-book-kb" checked={useBookKnowledge} onCheckedChange={(v) => setUseBookKnowledge(v === true)} />
                <Label htmlFor="use-book-kb" className="text-sm cursor-pointer leading-snug">
                  Use textbook as primary source (RAG)
                </Label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-quality-tier" className="text-sm">
                  Generation quality
                </Label>
                <Select
                  value={qualityTier}
                  onValueChange={(v) => setQualityTier(v as GenerationQualityTierId)}
                  disabled={isGenerating}
                >
                  <SelectTrigger id="book-quality-tier" className="max-w-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENERATION_QUALITY_TIERS.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-600">
                  {GENERATION_QUALITY_TIERS.find((t) => t.id === qualityTier)?.description}
                </p>
              </div>
              <p className="text-xs text-slate-600 w-full">
                Combines your curriculum inputs with retrieved book content.
              </p>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto sm:shrink-0"
                  onClick={() => void handleGenerate()}
                  disabled={isGenerating || !bookReady || !isValidGenerationRecordCount(generationRecordCount)}
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {isGenerating ? "Generating…" : generationRecordCountButtonLabel(generationRecordCount)}
                </Button>
                {generationLocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full shrink-0 border-amber-300 text-amber-800 hover:bg-amber-50 sm:w-auto"
                    disabled={isGenerating}
                    onClick={() => void releaseLockAndRetry()}
                  >
                    Clear lock & retry
                  </Button>
                ) : null}
              </div>
              {isGenerating && progress ? (
                <p className="w-full rounded-md border border-violet-200 bg-violet-100/70 px-3 py-2 text-xs leading-relaxed text-violet-900 break-words">
                  {progress}
                </p>
              ) : null}
            </div>
          ) : null}

          {lastBatchSummary ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-emerald-900">
                Last batch: {lastBatchSummary.successCount}/{lastBatchSummary.batchSize} saved
                {lastBatchSummary.failedCount > 0 ? ` (${lastBatchSummary.failedCount} failed)` : ""}
              </p>
              {lastBatchSummary.failures && lastBatchSummary.failures.length > 0 ? (
                <div className="rounded-md border border-red-200 bg-red-50/80 px-2.5 py-2 text-red-900">
                  <p className="font-semibold">Failed slots</p>
                  {lastBatchSummary.failures.every((line) => /spending cap|monthly spend|Billing\/Spend/i.test(line)) ? (
                    <p className="mt-1 text-[11px] leading-relaxed">
                      Gemini monthly spending cap is reached. Open Google AI Studio → Billing/Spend, raise the project cap (or add billing), then retry. Switching to Fast/Balanced will not help until the cap is raised.
                    </p>
                  ) : lastBatchSummary.failures.every((line) => /temporarily busy|503|429|UNAVAILABLE/i.test(line)) ? (
                    <p className="mt-1 text-[11px] leading-relaxed">
                      Gemini looks busy or rate-limited. Wait a minute, switch to Balanced/Fast, or generate fewer records at once.
                    </p>
                  ) : null}
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {lastBatchSummary.failures.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
        </div>
        </CardContent>
      </Card>

      <GeneratorRecordsPanel
        apiPrefix="/api/book-generator"
        boardOptions={boardOptions}
        boardFilterDefault="__all__"
        accent="violet"
        title="Records"
        subtitle="Textbook-grounded generations — same layout as AI Generator. Also visible in AI Tool Data for end users."
        showBookBadge
        reloadNonce={recordsReloadNonce}
        headerExtra={
          onOpenAiToolData ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-orange-200 text-orange-800 hover:bg-orange-50"
              onClick={() => onOpenAiToolData()}
            >
              <FolderTree className="h-3.5 w-3.5 mr-1.5" />
              AI Tool Data
            </Button>
          ) : null
        }
      />
    </div>
  );
}
