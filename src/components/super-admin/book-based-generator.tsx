import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, CheckCircle2, ExternalLink, FileText, FolderTree, IndianRupee, Loader2, Sparkles } from "lucide-react";
import { GeneratorRecordsPanel } from "@/components/super-admin/generator-records-panel";
import { API_BASE_URL } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { useCurriculumCascade } from "@/hooks/use-curriculum-cascade";
import { cn } from "@/lib/utils";
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
  const [books, setBooks] = useState<BookOption[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLocked, setGenerationLocked] = useState(false);
  const [progress, setProgress] = useState("");
  const [lastBatchSummary, setLastBatchSummary] = useState<{
    successCount: number;
    failedCount: number;
    tokenUsage: TokenTotals;
    cost: GeminiCostEstimate;
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
      setRecordsReloadNonce((n) => n + 1);
      toast({
        title: `${savedCount}/${data.batchSize || BOOK_GENERATOR_BATCH_SIZE} saved`,
        description: `${tokenNote}. Browse below or in AI Tool Data — same records, textbook-grounded content.`,
      });
    } else {
      const failures = data.failures as string[] | undefined;
      const failedCount = Number(data.failedCount) || 0;
      const failNote =
        failures?.length && failedCount > 0
          ? `${failedCount} slot(s) failed. ${failures[0]}${failures.length > 1 ? ` (+${failures.length - 1} more)` : ''}`
          : json.message || "No records were saved.";
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
        setProgress(`Generation started — 0/${BOOK_GENERATOR_BATCH_SIZE} saved (this may take 10–25 min for heavy tools)…`);
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
          <strong>Content generation</strong> (this page): each batch generates {BOOK_GENERATOR_BATCH_SIZE} records with Gemini.
          Token count and estimated ₹ cost appear below after each run. Run again to build toward {BOOK_UNIQUENESS_TARGET}+ unique records per sub-topic.
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
            {" "}Each batch runs <strong>3 Gemini calls at a time</strong> — exam papers and mock tests often take <strong>10–25 minutes</strong>.
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
                Combines your curriculum inputs with retrieved book content. Target: {BOOK_UNIQUENESS_TARGET}+ unique records per sub-topic ({BOOK_GENERATOR_BATCH_SIZE} per batch).
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
