import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, FileDown, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCurriculumCascade } from "@/hooks/use-curriculum-cascade";
import { GeneratedRecordBody } from "@/components/super-admin/generated-record-body";
import { AiToolRecordPreviewBody } from "@/components/super-admin/ai-tool-record-preview-body";
import {
  recordGenerationVariant,
  recordVariantAngle,
} from "@/lib/ai-tool-record-list-preview";
import { openAiToolRecordPdf } from "@/lib/ai-tool-record-pdf";
import { sortAiToolRecordsByVariantThenDate } from "@/lib/ai-tool-record-sort";
import { FlashcardViewer } from "@/components/flashcard-viewer";
import {
  MyStudyDecksViewer,
  deckViewerPayloadFromRecord,
} from "@/components/my-study-decks-viewer";
import {
  MockTestViewer,
  mockTestViewerPayloadFromRecord,
} from "@/components/mock-test-viewer";
import { ExamQuestionPaperViewer } from "@/components/exam-question-paper-viewer";
import {
  SmartStudyGuideViewer,
  studyGuideViewerPayloadFromRecord,
} from "@/components/smart-study-guide-viewer";
import {
  ConceptBreakdownViewer,
  conceptBreakdownViewerPayloadFromRecord,
} from "@/components/concept-breakdown-viewer";
import {
  PracticeQaViewer,
  practiceQaViewerPayloadFromRecord,
} from "@/components/practice-qa-viewer";
import {
  ChapterSummaryViewer,
  chapterSummaryViewerPayloadFromRecord,
} from "@/components/chapter-summary-viewer";
import {
  KeyPointsViewer,
  keyPointsViewerPayloadFromRecord,
} from "@/components/key-points-viewer";
import {
  QuickAssignmentViewer,
  quickAssignmentViewerPayloadFromRecord,
} from "@/components/quick-assignment-viewer";
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
import {
  ConceptMasteryViewer,
  conceptMasteryViewerPayloadFromRecord,
} from "@/components/concept-mastery-viewer";
import {
  filterSubjectsForAiTool,
  isStoryLanguageTool,
  isStoryPassageLanguageSubject,
} from "@/lib/ai-tool-subject-rules";
import {
  computeGeminiCostFromTokenUsage,
  emptyTokenTotals,
  formatCostInr,
  formatInr,
  formatTokenCount,
  mergeTokenTotals,
  mergeTokenUsageSnapshots,
  perRecordShareFromCost,
  type GeminiCostEstimate,
  type StoredRecordCost,
  type TokenCall,
  type TokenTotals,
  type TokenUsageSnapshot,
} from "@/lib/gemini-token-cost";
import { AiGeneratorAuditPanel } from "@/components/super-admin/ai-generator-audit";
import {
  GENERATION_RECORD_COUNT_MAX,
  GENERATION_RECORD_COUNT_MIN,
  generationRecordCountButtonLabel,
  isValidGenerationRecordCount,
  parseGenerationRecordCount,
  sanitizeGenerationRecordCountInput,
} from "@/lib/generation-record-count";

const MAX_GENERATION_BATCH_SIZE = GENERATION_RECORD_COUNT_MAX;
/** Parallel workers — each picks the latest avoid-list before calling Gemini. */
const BATCH_CONCURRENCY = 3;
const RECOVERY_ATTEMPTS_PER_VARIANT = 2;
const RECOVERY_ROUNDS_MAX = 1;

type VariantGenerateResult = {
  variant: number;
  ok: boolean;
  message?: string;
  generatedContent?: string;
  tokenTotals?: Partial<TokenTotals>;
  tokenUsage?: TokenUsageSnapshot;
  exchangeRateInr?: number;
};

/** Parallel workers for batch variant generation. */
async function runVariantWorkerPool(
  variants: number[],
  concurrency: number,
  runOne: (variant: number) => Promise<VariantGenerateResult>,
  onDone: (completed: number, total: number) => void,
): Promise<VariantGenerateResult[]> {
  const results: VariantGenerateResult[] = new Array(variants.length);
  let nextJob = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const jobIndex = nextJob;
      nextJob += 1;
      if (jobIndex >= variants.length) break;
      const variant = variants[jobIndex];
      const result = await runOne(variant);
      results[jobIndex] = result;
      completed += 1;
      onDone(completed, variants.length);
    }
  }

  const workers = Math.min(concurrency, variants.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

type ToolId =
  | "activity-project-generator"
  | "project-idea-lab"
  | "worksheet-mcq-generator"
  | "concept-mastery-helper"
  | "lesson-planner"
  | "study-schedule-maker"
  | "homework-creator"
  | "reading-practice-room"
  | "story-passage-creator"
  | "short-notes-summaries-maker"
  | "my-study-decks"
  | "flashcard-generator"
  | "daily-class-plan-maker"
  | "mock-test-builder"
  | "exam-question-paper-generator"
  | "smart-study-guide-generator"
  | "concept-breakdown-explainer"
  | "smart-qa-practice-generator"
  | "chapter-summary-creator"
  | "key-points-formula-extractor"
  | "quick-assignment-builder";

const TOOLS: Array<{ id: ToolId; name: string; description: string }> = [
  { id: "project-idea-lab", name: "Project Idea Lab", description: "14-point student project format with safety, observation table, creative output, and self-assessment." },
  { id: "activity-project-generator", name: "Activity / Project Generator", description: "13-point teacher activity kit with teacher and student instructions and assessment rubric." },
  { id: "worksheet-mcq-generator", name: "Worksheet & MCQ Generator", description: "Design worksheets and exam-quality MCQs." },
  { id: "concept-mastery-helper", name: "Concept Mastery Helper", description: "Generate concept explanations and mastery notes." },
  { id: "study-schedule-maker", name: "Study Schedule Maker", description: "13-point student study schedule with plan table, concept slot, and self-assessment." },
  { id: "lesson-planner", name: "Lesson Planner", description: "14-point teacher lesson plan with classroom activities and formative assessment." },
  { id: "homework-creator", name: "Homework Creator", description: "Generate homework tasks and practice sets." },
  { id: "reading-practice-room", name: "Reading Practice Room", description: "13-section reading practice with recall, infer, and connect questions (English, Hindi & Telugu only)." },
  { id: "story-passage-creator", name: "Story and Passage Creator", description: "19-section teacher story and passage sets (English, Hindi & Telugu only)." },
  { id: "short-notes-summaries-maker", name: "Short Notes & Summaries", description: "Create concise revision notes." },
  { id: "my-study-decks", name: "My Study Decks", description: "12-section student study decks with flashcard set, difficulty tags, and self-check." },
  { id: "flashcard-generator", name: "Flash Card Generator", description: "5-block teacher deck: Context, Foundations, HOTS Task/Solution cards, Study Aids, and Wrap-Up." },
  { id: "daily-class-plan-maker", name: "Daily Class Plan", description: "Create day-wise classroom plans." },
  { id: "mock-test-builder", name: "Mock Test Builder", description: "12-section mock tests with question paper, answer key, solutions, and remedial guidance." },
  { id: "exam-question-paper-generator", name: "Exam Question Paper Generator", description: "11-section exam papers: blueprint, sections A–E, answer key, marking scheme, and rubric." },
  { id: "smart-study-guide-generator", name: "Smart Study Guide Generator", description: "11-section study guides with overview, concepts, practice questions, and improvement tips." },
  { id: "concept-breakdown-explainer", name: "Concept Breakdown Explainer", description: "9-section concept breakdown with Indian-context examples and thinking prompts." },
  { id: "smart-qa-practice-generator", name: "Smart Q&A Practice Generator", description: "11-section practice sets with MCQs, sections A–G, and answer key with explanations." },
  { id: "chapter-summary-creator", name: "Chapter Summary Creator", description: "10-section chapter summaries with concepts, revision notes, and recall questions." },
  { id: "key-points-formula-extractor", name: "Key Points Extractor", description: "10-section key points: concepts, definitions, formulae, keywords, exam points, mnemonics, and one-minute summary." },
  { id: "quick-assignment-builder", name: "Quick Assignment Builder", description: "11-section assignment: objectives, concept questions, application tasks, rubric, and learning outcomes." },
];

const STUDENT_TOOL_IDS: ToolId[] = [
  "smart-study-guide-generator",
  "smart-qa-practice-generator",
  "concept-breakdown-explainer",
  "chapter-summary-creator",
  "key-points-formula-extractor",
  "quick-assignment-builder",
  "my-study-decks",
  "mock-test-builder",
  "project-idea-lab",
  "reading-practice-room",
  "study-schedule-maker",
];

const TEACHER_TOOL_IDS: ToolId[] = [
  "activity-project-generator",
  "worksheet-mcq-generator",
  "concept-mastery-helper",
  "lesson-planner",
  "exam-question-paper-generator",
  "daily-class-plan-maker",
  "homework-creator",
  "story-passage-creator",
  "short-notes-summaries-maker",
  "flashcard-generator",
];

const TEACHER_TOOL_LABELS: Partial<Record<ToolId, string>> = {
  "activity-project-generator": "Activity / Project Generator",
  "worksheet-mcq-generator": "Worksheet & MCQ Generator",
  "concept-mastery-helper": "Concept Mastery Helper",
  "lesson-planner": "Lesson Planner",
  "exam-question-paper-generator": "Exam Question Paper Generator",
  "daily-class-plan-maker": "Daily Class Plan Maker",
  "homework-creator": "Homework Creator",
  "short-notes-summaries-maker": "Short Notes & Summarizer",
};

type GeneratorRecord = {
  _id: string;
  generatedContent: string;
  createdAt?: string;
  metadata?: {
    structuredContent?: unknown;
    extraParams?: { generationVariant?: number; variantAngle?: string };
    cost?: StoredRecordCost;
  };
  generationVariant?: number | null;
  variantAngle?: string;
};

type GroupedSubtopic = { subtopicName: string; records: GeneratorRecord[] };
type GroupedTopic = { topicName: string; subtopics: GroupedSubtopic[] };
type GroupedSubject = { subjectName: string; topics: GroupedTopic[] };
type GroupedClass = { className: string; boardName?: string; subjects: GroupedSubject[] };
type GroupedTool = { toolName: string; toolSlug: string; classes: GroupedClass[] };

function isWorksheetToolValue(v: unknown): boolean {
  const t = String(v || "").trim().toLowerCase();
  return t === "worksheet-mcq-generator" || (t.includes("worksheet") && t.includes("mcq"));
}

export default function SuperAdminAiGenerator() {
  const { toast } = useToast();
  const [board, setBoard] = useState("CBSE");
  /** Records list is filtered only by board; independent of the generate form. */
  const [recordsBoardFilter, setRecordsBoardFilter] = useState("CBSE");
  const [boardOptions, setBoardOptions] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolId | "">("");
  const [classNumber, setClassNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [subTopic, setSubTopic] = useState("");
  const [questionType, setQuestionType] = useState("All Types");
  const [questionCount, setQuestionCount] = useState("10");
  const [generationRecordCount, setGenerationRecordCount] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [duration, setDuration] = useState("30");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLocked, setGenerationLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<"generate" | "audit">("generate");
  const [forceGenerateNew, setForceGenerateNew] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    phase?: string;
  } | null>(null);
  const [lastBatchSummary, setLastBatchSummary] = useState<{
    successCount: number;
    failedCount: number;
    batchSize: number;
    tokenUsage: TokenTotals;
    cost: GeminiCostEstimate;
    perRecordCost?: { usd: number; inr: number };
  } | null>(null);
  const [recordsTree, setRecordsTree] = useState<GroupedTool[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSubtopicKey, setDeletingSubtopicKey] = useState<string | null>(null);
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

  const subjectsForTool = useMemo(
    () => filterSubjectsForAiTool(selectedTool || "", subjects),
    [selectedTool, subjects],
  );
  const studentTools = useMemo(
    () => TOOLS.filter((tool) => STUDENT_TOOL_IDS.includes(tool.id)),
    [],
  );
  const teacherTools = useMemo(
    () => TOOLS.filter((tool) => TEACHER_TOOL_IDS.includes(tool.id)),
    [],
  );

  const currentTool = useMemo(() => TOOLS.find((t) => t.id === selectedTool), [selectedTool]);
  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("superAdminToken") || localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

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
          setBoardOptions(Array.from(new Set<string>(boardsFromOptions)).sort((a, b) => a.localeCompare(b)));
          return;
        }
        throw new Error("No boards in options response");
      } catch {
        try {
          // Fallback: still source boards only from ai_tool_topics rows.
          const listRes = await fetch(`${API_BASE_URL}/api/super-admin/ai-tool-topics?page=1&limit=200`, {
            headers: { ...authHeaders() },
            credentials: "include",
          });
          const listJson = await listRes.json();
          const boardsFromRows: string[] = Array.isArray(listJson?.data?.items)
            ? listJson.data.items.map((row: any) => String(row?.board || "").trim()).filter(Boolean)
            : [];
          setBoardOptions(Array.from(new Set<string>(boardsFromRows)).sort((a, b) => a.localeCompare(b)));
        } catch {
          setBoardOptions([]);
        }
      }
    };
    void loadBoards();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildExtraParams = () => {
    const payload: Record<string, any> = {};
    if (selectedTool === "worksheet-mcq-generator") {
      payload.questionType = questionType;
      payload.questionCount = Number(questionCount) || 10;
    }
    if (selectedTool === "smart-qa-practice-generator") {
      payload.questionType = questionType;
      payload.questionCount = Number(questionCount) || 10;
      payload.difficulty = difficulty;
    }
    if (
      selectedTool === "homework-creator" ||
      selectedTool === "mock-test-builder" ||
      selectedTool === "quick-assignment-builder"
    ) {
      payload.duration = Number(duration) || 30;
    }
    return payload;
  };

  const loadRecords = async () => {
    setRecordsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (recordsBoardFilter && recordsBoardFilter !== "__all__") {
        qs.set("board", recordsBoardFilter);
      }
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/records?${qs.toString()}`, {
        headers: { ...authHeaders() },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to load records");
      setRecordsTree(Array.isArray(json?.data?.grouped) ? json.data.grouped : []);
      setRecordsTotal(Number(json?.data?.total || 0));
    } catch (error: any) {
      setRecordsTree([]);
      setRecordsTotal(0);
      toast({
        title: "Records load failed",
        description: error?.message || "Could not load records.",
        variant: "destructive",
      });
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, [recordsBoardFilter]);

  const handleClassChange = (value: string) => {
    setClassNumber(value);
    setSubject("");
    setTopic("");
    setSubTopic("");
  };

  const handleBoardChange = (value: string) => {
    setBoard(value);
    setClassNumber("");
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

  const handleToolSelect = (toolId: ToolId) => {
    setSelectedTool(toolId);
    if (isStoryLanguageTool(toolId) && subject && !isStoryPassageLanguageSubject(subject)) {
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

  const parseBatchSize = () => parseGenerationRecordCount(generationRecordCount)!;

  const buildGenerationPayload = (forceUnlock = false) => ({
    toolSlug: selectedTool,
    toolName: currentTool?.name || selectedTool,
    board,
    className: classNumber,
    subjectName: subject,
    topicName: topic,
    subtopicName: subTopic,
    batchSize: parseBatchSize(),
    forceGenerate: forceGenerateNew,
    forceGenerateNew: forceGenerateNew,
    extraParams: buildExtraParams(),
    ...(forceUnlock ? { forceUnlock: true } : {}),
  });

  const releaseLockAndRetry = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/release-lock`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
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
      await generate({ forceUnlock: true });
    } catch (e: unknown) {
      toast({
        title: "Could not clear lock",
        description: e instanceof Error ? e.message : "Failed to clear lock",
        variant: "destructive",
      });
    }
  };

  const generate = async (opts?: { forceUnlock?: boolean }) => {
    if (!selectedTool || !board || !classNumber || !subject || !subTopic) {
      toast({
        title: "Missing fields",
        description: "Tool, board, class, subject and sub topic are required.",
        variant: "destructive",
      });
      return;
    }
    if (
      !topic &&
      ![
        "lesson-planner",
        "study-schedule-maker",
        "activity-project-generator",
        "project-idea-lab",
        "reading-practice-room",
        "story-passage-creator",
      ].includes(selectedTool)
    ) {
      toast({ title: "Missing topic", description: "Topic is required for this tool.", variant: "destructive" });
      return;
    }
    if (isStoryLanguageTool(selectedTool) && !isStoryPassageLanguageSubject(subject)) {
      toast({
        title: "English, Hindi, or Telugu only",
        description: "This tool works only with English, Hindi, or Telugu subjects.",
        variant: "destructive",
      });
      return;
    }
    if (!isValidGenerationRecordCount(generationRecordCount)) {
      toast({
        title: "Invalid record count",
        description: `Enter a whole number from ${GENERATION_RECORD_COUNT_MIN} to ${MAX_GENERATION_BATCH_SIZE} only.`,
        variant: "destructive",
      });
      return;
    }
    const batchSize = parseBatchSize();
    setIsGenerating(true);
    setGenerationLocked(false);
    setGenerationProgress({
      current: 0,
      total: batchSize,
      phase: "Server batch in progress (please wait)",
    });
    if (!opts?.forceUnlock) setLastBatchSummary(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/generate-batch`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(buildGenerationPayload(opts?.forceUnlock)),
      });
      const json = await res.json();
      const savedCount = Number(json?.data?.savedCount) || 0;
      const failedCount = Number(json?.data?.failedCount) || 0;
      const resultBatchSize = Number(json?.data?.batchSize) || batchSize;
      const failures: string[] = Array.isArray(json?.data?.failures) ? json.data.failures : [];

      if (!res.ok && savedCount === 0) {
        if (res.status === 409 || json?.data?.locked) {
          setGenerationLocked(true);
          throw new Error(
            json?.message ||
              "Generation already in progress for this topic. Use “Clear lock & retry” if a previous batch was interrupted.",
          );
        }
        throw new Error(json?.message || "Batch generation failed");
      }
      const mode = String(json?.data?.mode || "");
      const saturation = json?.data?.saturation;
      const geminiAvoided = Number(json?.data?.geminiGenerationsAvoided) || 0;
      const usage = json?.data?.tokenUsage;
      const tokenUsage =
        usage?.totals && typeof usage.totals === "object"
          ? { ...emptyTokenTotals(), ...usage.totals }
          : emptyTokenTotals();
      const tokenCalls: TokenCall[] = Array.isArray(usage?.calls) ? usage.calls : [];
      const exchangeRateInr = Number(json?.data?.cost?.exchangeRateInr) || 95.11;
      let cost: GeminiCostEstimate;
      const apiCost =
        json?.data?.cost && typeof json.data.cost === "object"
          ? (json.data.cost as GeminiCostEstimate)
          : null;
      if (apiCost && Number(apiCost.inr) >= 0) {
        cost = apiCost;
      } else {
        try {
          cost = computeGeminiCostFromTokenUsage({ totals: tokenUsage, calls: tokenCalls }, exchangeRateInr);
        } catch {
          cost = computeGeminiCostFromTokenUsage({ totals: tokenUsage, calls: [] }, exchangeRateInr);
        }
      }
      const perRecord =
        Number(cost.perRecordInr) > 0
          ? { usd: Number(cost.perRecordUsd || 0), inr: Number(cost.perRecordInr) }
          : perRecordShareFromCost(cost, savedCount || 1);

      setGenerationProgress({ current: savedCount, total: resultBatchSize, phase: "Complete" });
      setLastBatchSummary({
        successCount: savedCount,
        failedCount,
        batchSize: resultBatchSize,
        tokenUsage,
        cost,
        perRecordCost: perRecord,
      });

      if (savedCount === 0) {
        throw new Error(failures[0] || `All ${resultBatchSize} generations failed`);
      }

      const tokenNote = `${formatTokenCount(tokenUsage.totalTokens)} tokens (${formatTokenCount(tokenUsage.promptTokens)} in / ${formatTokenCount(tokenUsage.completionTokens)} out, ${tokenUsage.callCount} LLM calls). Batch cost: ${formatCostInr(cost.inr)}${savedCount > 0 ? ` · ~${formatCostInr(perRecord.inr)}/record` : ""}.`;
      toast({
        title:
          mode === "random_retrieval"
            ? `Retrieved ${savedCount} records from pool (0 Gemini tokens)`
            : savedCount === resultBatchSize
              ? `${resultBatchSize} unique records saved`
              : `${savedCount}/${resultBatchSize} records saved`,
        description:
          (mode === "random_retrieval"
            ? `Topic saturation: ${saturation?.saturationLevel || "Saturated"}. Random diverse selection from ${json?.data?.existingCountBefore ?? "existing"} records. `
            : savedCount === resultBatchSize
              ? "Batch orchestrator saved all unique variants with fingerprint indexing."
              : `${failures.length} slot(s) failed after max retries. `) +
          (geminiAvoided > 0 ? `Gemini generations avoided: ${geminiAvoided}. ` : "") +
          tokenNote,
        variant: failures.length > 0 ? "destructive" : "default",
      });
      await loadRecords();
    } catch (error: any) {
      toast({ title: "Generation failed", description: error?.message || "Could not generate", variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const openView = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/records/${id}`, {
        headers: { ...authHeaders() },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to fetch record");
      setActiveRecord(json.data);
    } catch (error: any) {
      toast({
        title: "Load failed",
        description: error?.message || "Could not load record.",
        variant: "destructive",
      });
    }
  };

  const openEdit = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/records/${id}`, {
        headers: { ...authHeaders() },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to fetch record");
      setEditRecord(json.data);
      setEditContent(String(json.data?.generatedContent || ""));
    } catch (error: any) {
      toast({
        title: "Load failed",
        description: error?.message || "Could not load record.",
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
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/records/${editRecord._id}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedContent: editContent,
          toolName: editRecord.toolName,
          toolSlug: editRecord.toolSlug,
          className: editRecord.className,
          subjectName: editRecord.subjectName,
          topicName: editRecord.topicName,
          subtopicName: editRecord.subtopicName,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Update failed");
      toast({ title: "Updated", description: "Record updated successfully." });
      setEditRecord(null);
      await loadRecords();
    } catch (error: any) {
      toast({ title: "Update failed", description: error?.message || "Could not update.", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!window.confirm("Delete this record permanently?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/records/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Delete failed");
      toast({ title: "Deleted", description: "Record deleted successfully." });
      await loadRecords();
    } catch (error: any) {
      toast({ title: "Delete failed", description: error?.message || "Could not delete.", variant: "destructive" });
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
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/records/all?${qs.toString()}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Delete all failed");
      const count = Number(json?.data?.deletedCount ?? 0);
      toast({
        title: "Deleted",
        description: json?.message || `Deleted ${count} record${count === 1 ? "" : "s"}.`,
      });
      setIsDeleteAllDialogOpen(false);
      await loadRecords();
    } catch (error: any) {
      toast({
        title: "Delete all failed",
        description: error?.message || "Could not delete all records.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const subtopicSectionKey = (
    toolSlug: string,
    className: string,
    boardName: string,
    subjectName: string,
    topicName: string,
    subtopicName: string,
  ) => `subtopic:${toolSlug}:${className}:${boardName}:${subjectName}:${topicName}:${subtopicName}`;

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
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/records/bulk-delete`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Bulk delete failed");
      }
      const deleted = Number(json?.data?.deletedCount ?? ids.length);
      const failed = Number(json?.data?.failedCount ?? 0);
      toast({
        title: "Deleted",
        description:
          failed > 0
            ? `Removed ${deleted} record(s); ${failed} could not be deleted.`
            : `Removed ${deleted} record(s) from this subtopic.`,
      });
      if (activeRecord && ids.includes(activeRecord._id)) {
        setActiveRecord(null);
      }
      await loadRecords();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete subtopic records.",
        variant: "destructive",
      });
    } finally {
      setDeletingSubtopicKey(null);
    }
  };

  const openPdf = async (id: string) => {
    try {
      await openAiToolRecordPdf(id);
    } catch (error: any) {
      toast({
        title: "PDF failed",
        description: error?.message || "Could not generate PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex gap-2">
        <Button
          variant={activeTab === "generate" ? "default" : "outline"}
          onClick={() => setActiveTab("generate")}
        >
          Generate
        </Button>
        <Button
          variant={activeTab === "audit" ? "default" : "outline"}
          onClick={() => setActiveTab("audit")}
        >
          Duplicate Audit & Analytics
        </Button>
      </div>

      {activeTab === "audit" ? <AiGeneratorAuditPanel /> : null}

      {activeTab === "generate" ? (
      <>
      <Card>
        <CardHeader>
          <CardTitle>Available Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Student</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {studentTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className={`rounded-xl border p-4 text-left transition ${selectedTool === tool.id ? "border-orange-400 bg-orange-50" : "bg-white hover:bg-slate-50"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-xs sm:text-sm">{tool.name}</p>
                      <p className="text-xs text-slate-600 mt-1">{tool.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Teacher</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {teacherTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className={`rounded-xl border p-4 text-left transition ${selectedTool === tool.id ? "border-orange-400 bg-orange-50" : "bg-white hover:bg-slate-50"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-xs sm:text-sm">
                        {TEACHER_TOOL_LABELS[tool.id] || tool.name}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">{tool.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Content</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-3">
            <Label>Selected Tool</Label>
            <div className="mt-1">{currentTool ? <Badge>{currentTool.name}</Badge> : <Badge variant="secondary">No tool selected</Badge>}</div>
            {isStoryLanguageTool(selectedTool) ? (
              <p className="mt-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-2 py-1.5">
                English, Hindi, and Telugu subjects only for Story &amp; Passage Creator.
              </p>
            ) : null}
          </div>
          <div>
            <Label>Board</Label>
            <Select value={board} onValueChange={handleBoardChange}>
              <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
              <SelectContent>
                {boardOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Class</Label>
            <Select value={classNumber} onValueChange={handleClassChange} disabled={!board || loadingClasses}>
              <SelectTrigger><SelectValue placeholder={!board ? "Select board first" : (loadingClasses ? "Loading classes..." : "Select class")} /></SelectTrigger>
              <SelectContent>{classOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={subject} onValueChange={handleSubjectChange} disabled={!classNumber || loadingSubjects}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !classNumber
                      ? "Select class first"
                      : loadingSubjects
                        ? "Loading subjects..."
                        : isStoryLanguageTool(selectedTool) && subjectsForTool.length === 0
                          ? "English, Hindi, or Telugu only"
                          : "Select subject"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subjectsForTool.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Topic</Label>
            <Select value={topic} onValueChange={handleTopicChange} disabled={!classNumber || !subject || loadingTopics}>
              <SelectTrigger>
                <SelectValue placeholder={!subject ? "Select class & subject first" : (loadingTopics ? "Loading topics..." : "Select topic")} />
              </SelectTrigger>
              <SelectContent>{topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sub Topic</Label>
            <Select value={subTopic} onValueChange={setSubTopic} disabled={!topic || loadingSubtopics}>
              <SelectTrigger>
                <SelectValue placeholder={!topic ? "Select topic first" : (loadingSubtopics ? "Loading sub topics..." : "Select sub topic")} />
              </SelectTrigger>
              <SelectContent>{subtopics.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {selectedTool === "worksheet-mcq-generator" ? (
            <div>
              <Label>Question Type</Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Single Option", "Multiple Option", "Integer Type", "All Types"].map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {selectedTool === "smart-qa-practice-generator" ? (
            <>
              <div>
                <Label>Question Count</Label>
                <Input value={questionCount} onChange={(e) => setQuestionCount(e.target.value)} />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["easy", "medium", "hard"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          ) : null}

          {(selectedTool === "homework-creator" ||
            selectedTool === "mock-test-builder" ||
            selectedTool === "quick-assignment-builder") && (
            <div>
              <Label>Duration (minutes)</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          )}

          <div className="lg:col-span-3 space-y-3">
            <div className="max-w-xs">
              <Label>Records to generate</Label>
              <Input
                type="number"
                min={GENERATION_RECORD_COUNT_MIN}
                max={MAX_GENERATION_BATCH_SIZE}
                placeholder={`${GENERATION_RECORD_COUNT_MIN}–${MAX_GENERATION_BATCH_SIZE}`}
                value={generationRecordCount}
                onChange={(e) => {
                  const next = sanitizeGenerationRecordCountInput(e.target.value);
                  if (next !== null) setGenerationRecordCount(next);
                }}
                disabled={isGenerating}
              />
              <p className="mt-1 text-xs text-slate-500">
                Only {GENERATION_RECORD_COUNT_MIN}–{MAX_GENERATION_BATCH_SIZE} allowed. Other values are not accepted.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <Checkbox
                checked={forceGenerateNew}
                onCheckedChange={(v) => setForceGenerateNew(v === true)}
              />
              Force Generate New Content (even when topic has 1000+ records)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
              <p className="text-xs text-slate-500 w-full sm:flex-1 sm:min-w-0">
                Smart strategy: 0–100 generate · 101–500 strong uniqueness · 501–1000 strict · 1000+ random pool (₹0, unless forced).
                Ultra economy: Flash-Lite only, 1 LLM call per record — lower cost for smaller batches.
              </p>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:shrink-0">
                <Button
                  onClick={() => void generate()}
                  disabled={isGenerating || !selectedTool || !isValidGenerationRecordCount(generationRecordCount)}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {generationRecordCountButtonLabel(generationRecordCount)}
                    </>
                  )}
                </Button>
                {generationLocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-amber-300 text-amber-800 hover:bg-amber-50 sm:w-auto"
                    disabled={isGenerating}
                    onClick={() => void releaseLockAndRetry()}
                  >
                    Clear lock & retry
                  </Button>
                ) : null}
              </div>
              {isGenerating && generationProgress ? (
                <p className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900 break-words">
                  {generationProgress.current > 0
                    ? `${generationProgress.current}/${generationProgress.total} saved…`
                    : generationProgress.phase || `Generating ${generationProgress.total}…`}
                </p>
              ) : null}
            </div>
            {lastBatchSummary ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-xs text-slate-700 space-y-2">
                <p className="font-semibold text-emerald-900">
                  Last batch: {lastBatchSummary.successCount}/{lastBatchSummary.batchSize} saved
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
                  Batch cost:{" "}
                  <span className="font-semibold text-emerald-900">{formatCostInr(lastBatchSummary.cost.inr)}</span>
                  {" "}(~${lastBatchSummary.cost.usd.toFixed(4)} USD at ₹{lastBatchSummary.cost.exchangeRateInr}/$)
                  {lastBatchSummary.successCount > 0 && lastBatchSummary.perRecordCost ? (
                    <>
                      {" · "}
                      <span className="font-medium text-emerald-800">
                        ~{formatCostInr(lastBatchSummary.perRecordCost.inr)}/record
                      </span>
                    </>
                  ) : null}
                </p>
                <p className="text-[11px] text-slate-500">
                  Model: {lastBatchSummary.cost.model} · Flash-Lite $0.10/M in · $0.40/M out
                </p>
                <p className="text-[11px] text-slate-500">{lastBatchSummary.cost.pricingNote}</p>
                {lastBatchSummary.cost.model.includes("mixed") ? (
                  <p className="text-[11px] text-slate-500">
                    Pricing model: {lastBatchSummary.cost.model}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <CardTitle className="mb-0">Records</CardTitle>
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
                      <span className="font-medium text-slate-900">{recordsTotal}</span> AI Generator record
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
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              Loading records...
            </div>
          ) : recordsTree.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-600">
              No records found
              {recordsBoardFilter !== "__all__" ? ` for board “${recordsBoardFilter}”.` : "."}
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
                        <AccordionItem key={`${toolNode.toolSlug}-${classNode.className}`} value={`class-${toolNode.toolSlug}-${classNode.className}`} className="border rounded-lg px-3 mb-2">
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
                                <AccordionItem key={`${classNode.className}-${subjectNode.subjectName}`} value={`subject-${classNode.className}-${subjectNode.subjectName}`} className="border rounded-lg px-3 mb-2">
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="text-left">
                                      <p className="text-xs text-slate-500">SUBJECT</p>
                                      <p className="font-medium">{subjectNode.subjectName}</p>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <Accordion type="multiple" className="w-full">
                                      {subjectNode.topics.map((topicNode) => (
                                        <AccordionItem key={`${subjectNode.subjectName}-${topicNode.topicName}`} value={`topic-${subjectNode.subjectName}-${topicNode.topicName}`} className="border rounded-lg px-3 mb-2">
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
                                                <AccordionItem key={`${topicNode.topicName}-${subtopicNode.subtopicName}`} value={`subtopic-${topicNode.topicName}-${subtopicNode.subtopicName}`} className="border rounded-lg px-3 mb-2">
                                                  <AccordionTrigger className="hover:no-underline">
                                                    <div className="text-left">
                                                      <p className="text-xs text-slate-500">SUBTOPIC</p>
                                                      <p className="font-medium">{subtopicNode.subtopicName}</p>
                                                    </div>
                                                  </AccordionTrigger>
                                                  <AccordionContent>
                                                    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/30 to-orange-50/20 shadow-sm overflow-hidden">
                                                      <div className="border-b border-slate-100/80 bg-white/80 px-4 py-3 flex items-center justify-between gap-2">
                                                        <div>
                                                          <p className="text-xs text-slate-500">RECORDS</p>
                                                          <p className="text-xs sm:text-sm font-semibold text-slate-900">
                                                            {subtopicNode.records.length} generation{subtopicNode.records.length === 1 ? "" : "s"}
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
                                                      <div className="p-4">
                                                      <div className="space-y-3">
                                                        {sortAiToolRecordsByVariantThenDate(subtopicNode.records).map((row) => (
                                                          <div key={row._id} className="group rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:border-orange-200/80 hover:shadow-md">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                              <div className="flex flex-wrap items-center gap-2">
                                                                <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                                                  {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
                                                                </p>
                                                                {row.generationVariant ? (
                                                                  <Badge variant="outline" className="text-[10px] h-5 border-orange-200 text-orange-800 bg-orange-50">
                                                                    Variant {row.generationVariant}
                                                                  </Badge>
                                                                ) : null}
                                                                {row.variantAngle ? (
                                                                  <span className="text-[10px] text-slate-500 max-w-[220px] truncate" title={row.variantAngle}>
                                                                    {row.variantAngle}
                                                                  </span>
                                                                ) : null}
                                                                {row.metadata?.cost?.inr != null && Number(row.metadata.cost.inr) > 0 ? (
                                                                  <Badge variant="outline" className="text-[10px] h-5 border-emerald-200 text-emerald-800 bg-emerald-50">
                                                                    {formatCostInr(Number(row.metadata.cost.inr))}
                                                                  </Badge>
                                                                ) : null}
                                                              </div>
                                                              <div className="flex items-center gap-1">
                                                                <Button
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  className="h-8 text-xs rounded-lg text-orange-700 hover:text-orange-800 hover:bg-orange-50"
                                                                  onClick={() => openView(row._id)}
                                                                >
                                                                  <Eye className="h-3.5 w-3.5 mr-1.5" /> View full
                                                                </Button>
                                                                <Button
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  className="h-8 text-xs rounded-lg text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                                                                  onClick={() => openEdit(row._id)}
                                                                >
                                                                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                                                                </Button>
                                                                <Button
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  className="h-8 text-xs rounded-lg text-red-700 hover:text-red-800 hover:bg-red-50"
                                                                  onClick={() => deleteRecord(row._id)}
                                                                  disabled={deletingId === row._id}
                                                                >
                                                                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {deletingId === row._id ? "Deleting..." : "Delete"}
                                                                </Button>
                                                                <Button
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  className="h-8 text-xs rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                                                                  onClick={() => openPdf(row._id)}
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
                                                            />
                                                          </div>
                                                        ))}
                                                      </div>
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

      </>
      ) : null}

      <Dialog
        open={!!activeRecord}
        onOpenChange={() => setActiveRecord(null)}
      >
        <DialogContent
          className={cn(
            "flex max-h-[min(92vh,920px)] w-[min(96vw,1400px)]",
            "max-w-[min(96vw,1400px)] sm:max-w-[min(96vw,1400px)] lg:max-w-[min(96vw,1400px)]",
            "flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-2xl",
          )}
        >
          <DialogHeader className="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-6">
            <DialogTitle>Generated Record</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
          <div className="min-w-0 bg-white border border-slate-200 rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm">
            {activeRecord?.toolSlug === "my-study-decks" ||
            activeRecord?.toolName === "my-study-decks" ? (
              <MyStudyDecksViewer
                {...deckViewerPayloadFromRecord(activeRecord)}
              />
            ) : activeRecord?.toolSlug === "flashcard-generator" ||
              activeRecord?.toolName === "flashcard-generator" ? (
              (() => {
                const deckPayload = deckViewerPayloadFromRecord(activeRecord);
                return (
                  <FlashcardViewer
                    content={deckPayload.content}
                    rawContent={deckPayload.rawContent}
                    variant="teacher"
                  />
                );
              })()
            ) : isWorksheetToolValue(activeRecord?.toolSlug) ||
              isWorksheetToolValue(activeRecord?.toolName) ? (
              <WorksheetMcqViewer
                content={String(activeRecord?.generatedContent || "")}
                rawContent={activeRecord}
                variant="teacher"
              />
            ) : activeRecord?.toolSlug === "study-schedule-maker" ||
              activeRecord?.toolName === "study-schedule-maker" ? (
              <LessonPlannerViewer
                content={String(activeRecord?.generatedContent || "")}
                rawContent={activeRecord}
                variant="student"
                toolKind="study-schedule-maker"
              />
            ) : activeRecord?.toolSlug === "lesson-planner" ||
              activeRecord?.toolName === "lesson-planner" ? (
              <LessonPlannerViewer
                content={String(activeRecord?.generatedContent || "")}
                rawContent={activeRecord}
                variant="teacher"
                toolKind="lesson-planner"
              />
            ) : activeRecord?.toolSlug === "daily-class-plan-maker" ||
              activeRecord?.toolName === "daily-class-plan-maker" ? (
              <DailyClassPlanViewer
                content={String(activeRecord?.generatedContent || "")}
                rawContent={activeRecord?.structuredContent || activeRecord}
                variant="teacher"
              />
            ) : activeRecord?.toolSlug === "homework-creator" ||
              activeRecord?.toolName === "homework-creator" ? (
              <HomeworkCreatorViewer
                content={String(activeRecord?.generatedContent || "")}
                rawContent={activeRecord}
              />
            ) : activeRecord?.toolSlug === "reading-practice-room" ||
              activeRecord?.toolName === "reading-practice-room" ||
              activeRecord?.toolSlug === "story-passage-creator" ||
              activeRecord?.toolName === "story-passage-creator" ? (
              <StoryPassageViewer
                content={String(activeRecord?.generatedContent || "")}
                rawData={activeRecord}
                variant={
                  activeRecord?.toolSlug === "reading-practice-room" ||
                  activeRecord?.toolName === "reading-practice-room"
                    ? "student"
                    : "default"
                }
              />
            ) : activeRecord?.toolSlug === "short-notes-summaries-maker" ||
              activeRecord?.toolName === "short-notes-summaries-maker" ? (
              <ShortNotesViewer
                content={String(activeRecord?.generatedContent || "")}
                rawContent={
                  activeRecord?.structuredContent ||
                  activeRecord?.metadata?.structuredContent ||
                  activeRecord
                }
              />
            ) : activeRecord?.toolSlug === "mock-test-builder" ||
              activeRecord?.toolName === "mock-test-builder" ? (
              <MockTestViewer {...mockTestViewerPayloadFromRecord(activeRecord)} />
            ) : activeRecord?.toolSlug === "exam-question-paper-generator" ||
              activeRecord?.toolName === "exam-question-paper-generator" ? (
              <ExamQuestionPaperViewer
                content={String(activeRecord?.generatedContent || "")}
                rawContent={
                  (activeRecord as { structuredContent?: unknown })?.structuredContent || activeRecord
                }
                variant="teacher"
              />
            ) : activeRecord?.toolSlug === "smart-study-guide-generator" ||
              activeRecord?.toolName === "smart-study-guide-generator" ? (
              <SmartStudyGuideViewer {...studyGuideViewerPayloadFromRecord(activeRecord)} />
            ) : activeRecord?.toolSlug === "concept-breakdown-explainer" ||
              activeRecord?.toolName === "concept-breakdown-explainer" ? (
              <ConceptBreakdownViewer {...conceptBreakdownViewerPayloadFromRecord(activeRecord)} />
            ) : activeRecord?.toolSlug === "smart-qa-practice-generator" ||
              activeRecord?.toolName === "smart-qa-practice-generator" ? (
              <PracticeQaViewer {...practiceQaViewerPayloadFromRecord(activeRecord)} />
            ) : activeRecord?.toolSlug === "chapter-summary-creator" ||
              activeRecord?.toolName === "chapter-summary-creator" ? (
              <ChapterSummaryViewer {...chapterSummaryViewerPayloadFromRecord(activeRecord)} />
            ) : activeRecord?.toolSlug === "key-points-formula-extractor" ||
              activeRecord?.toolName === "key-points-formula-extractor" ? (
              <KeyPointsViewer {...keyPointsViewerPayloadFromRecord(activeRecord)} />
            ) : activeRecord?.toolSlug === "quick-assignment-builder" ||
              activeRecord?.toolName === "quick-assignment-builder" ? (
              <QuickAssignmentViewer {...quickAssignmentViewerPayloadFromRecord(activeRecord)} />
            ) : activeRecord?.toolSlug === "activity-project-generator" ||
              activeRecord?.toolName === "activity-project-generator" ||
              activeRecord?.toolSlug === "project-idea-lab" ||
              activeRecord?.toolName === "project-idea-lab" ? (
              <ActivityProjectViewer {...activityViewerPayloadFromRecord(activeRecord)} />
            ) : activeRecord?.toolSlug === "concept-mastery-helper" ||
              activeRecord?.toolName === "concept-mastery-helper" ? (
              <ConceptMasteryViewer
                {...conceptMasteryViewerPayloadFromRecord(activeRecord)}
                variant="teacher"
              />
            ) : (
              <GeneratedRecordBody
                content={String(activeRecord?.generatedContent || "")}
                toolType={String(activeRecord?.toolSlug || activeRecord?.toolName || "")}
              />
            )}
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
              <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

