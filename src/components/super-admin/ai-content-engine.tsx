import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { toCurriculumSelectRows, type CurriculumSelectRow } from "@/lib/vidya-subjects";
import {
  filterSubjectRowsForAiTool,
  isStoryPassageLanguageSubject,
  STORY_PASSAGE_TOOL_ID,
  subjectLabelFromRows,
} from "@/lib/ai-tool-subject-rules";
import { isDeprecatedAiToolIdentifier } from "@/lib/ai-tool-registry";
import { coerceHomeworkText as coerceHomeworkFieldText } from "@/lib/coerce-homework-text";
import {
  Wrench,
  School,
  BookOpen,
  BookText,
  Pin,
  FolderOpen,
  CircleCheck,
  FlaskConical,
  Target,
  ClipboardList,
  Lightbulb,
  Key,
  Clock3,
  BarChart3,
  ScrollText,
  Star,
  Layers,
  CalendarDays,
  Trash2,
  Loader2,
  Eye,
  HelpCircle,
} from "lucide-react";

/** Keep in sync with ASLI-STUD-BACK/routes/pdf-rag.js AI_PDF_MAX_FILE_BYTES */
const AI_PDF_MAX_MB = 100;
const AI_PDF_MAX_BYTES = AI_PDF_MAX_MB * 1024 * 1024;

/** Merge legacy typo CBSC with CBSE when grouping list rows (matches backend board helpers). */
function canonicalCurriculumBoardLabel(raw: string): string {
  const s = String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!s || s === "-") return s || "-";
  if (s.toUpperCase() === "CBSC") return "CBSE";
  return s;
}

type PdfItem = {
  _id: string;
  board?: string;
  originalName: string;
  fileUrl: string;
  subject: string;
  classLabel: string;
  chapter: string;
  processingStatus: "pending" | "processing" | "processed" | "failed";
  approvalStatus?: "pending" | "approved" | "rejected";
  toolType?: string;
  topic?: string;
  subTopic?: string;
  contentType?: string;
  structuredContent?: any;
  renderContent?: any;
  chunkCount: number;
  uploadDate: string;
  /** Plain-text layout from DB when structured JSON is sparse (ai_pdf master rows). */
  generatedContent?: string;
};

type UploadStep = "idle" | "uploading" | "extracting" | "validating" | "parsing" | "saving" | "done" | "error";

const STEP_MESSAGES: Record<UploadStep, string> = {
  idle: "",
  uploading: "Uploading PDF...",
  extracting: "Extracting PDF content...",
  validating: "Validating structured JSON...",
  parsing: "Extracting all items from PDF (multi-item pass)...",
  saving: "Saving validated records...",
  done: "",
  error: "",
};

export default function AIContentEngine() {
  const { toast } = useToast();
  const [items, setItems] = useState<PdfItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [subject, setSubject] = useState("");
  const [board, setBoard] = useState("CBSE");
  /** PDF records list is filtered only by board; independent of upload/curriculum form. */
  const [recordsBoardFilter, setRecordsBoardFilter] = useState("__all__");
  const [boardOptions, setBoardOptions] = useState<string[]>([]);
  const [classLabel, setClassLabel] = useState("");
  const [topic, setTopic] = useState("");
  const [subTopic, setSubTopic] = useState("");
  const [toolType, setToolType] = useState("");
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [subjectRows, setSubjectRows] = useState<CurriculumSelectRow[]>([]);
  const [topicRows, setTopicRows] = useState<CurriculumSelectRow[]>([]);
  const [subtopicRows, setSubtopicRows] = useState<CurriculumSelectRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const [deletingPdfId, setDeletingPdfId] = useState("");
  const [deletingQuestionKey, setDeletingQuestionKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [lastUploadResult, setLastUploadResult] = useState<{ totalSaved: number } | null>(null);
  const [pdfContentViewId, setPdfContentViewId] = useState<string | null>(null);

  const [mismatchDetails, setMismatchDetails] = useState<
    null | {
      selectedSubject?: string;
      detectedSubject?: string;
      selectedTopic?: string;
      detectedTopic?: string;
      selectedTool?: string;
      detectedTool?: string;
    }
  >(null);

  const toolOptions = useMemo(
    () => [
      { value: "activity-project-generator", label: "Activity & Project Generator" },
      { value: "worksheet-mcq-generator", label: "Worksheet & MCQ Generator" },
      { value: "concept-mastery-helper", label: "Concept Mastery Helper" },
      { value: "lesson-planner", label: "Lesson Planner" },
      { value: "homework-creator", label: "Homework Creator" },
      { value: "rubrics-evaluation-generator", label: "Rubrics, Evaluation & Report Card" },
      { value: "story-passage-creator", label: "Story & Passage Creator" },
      { value: "short-notes-summaries-maker", label: "Short Notes & Summaries" },
      { value: "flashcard-generator", label: "Flashcard Generator" },
      { value: "daily-class-plan-maker", label: "Daily Class Plan" },
      { value: "exam-question-paper-generator", label: "Exam Question Paper" },
      { value: "smart-study-guide-generator", label: "Smart Study Guide Generator" },
      { value: "concept-breakdown-explainer", label: "Concept Breakdown Explainer" },
      { value: "smart-qa-practice-generator", label: "Smart Q&A Practice Generator" },
      { value: "chapter-summary-creator", label: "Chapter Summary Creator" },
      { value: "key-points-formula-extractor", label: "Key Points Extractor" },
      { value: "quick-assignment-builder", label: "Quick Assignment Builder" },
    ],
    [],
  );

  const fieldClassName =
    "h-11 border-slate-300 bg-slate-50 text-slate-800 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0";
  const labelClassName = "text-slate-700";
  const reqStar = <span className="text-red-600">*</span>;
  const getToolLabel = (toolValue?: string) =>
    toolOptions.find((tool) => tool.value === String(toolValue || "").trim())?.label || toolValue || "-";

  const subjectRowsForTool = useMemo(
    () => filterSubjectRowsForAiTool(toolType, subjectRows),
    [toolType, subjectRows],
  );

  const parseQuestionBlob = (blob: string) => {
    const cleaned = String(blob || "")
      .replace(/\s+/g, " ")
      .replace(/Correct Answer\s*:/gi, "Answer:")
      .trim();
    if (!cleaned) return [];

    const segments = cleaned
      .split(/\s*(?:Q(?:uestion)?\s*\d+[\.\):]|(?:^|\s)\d+[\.\)])\s*/gi)
      .map((part) => part.trim())
      .filter(Boolean);

    return segments.map((segment) => {
      const answerMatch = segment.match(/Answer\s*:\s*([^]+)$/i);
      const answerRaw = answerMatch ? answerMatch[1].trim() : "";
      const withoutAnswer = answerMatch ? segment.slice(0, answerMatch.index).trim() : segment;
      const optionMatches = Array.from(
        withoutAnswer.matchAll(/([A-D])[\).]\s*([^]+?)(?=(?:\s+[A-D][\).]\s*)|$)/gi),
      );
      const options = optionMatches.map((m) => `${m[1].toUpperCase()}) ${String(m[2] || "").trim()}`).filter(Boolean);
      const questionText = optionMatches.length > 0
        ? withoutAnswer.slice(0, optionMatches[0].index).trim()
        : withoutAnswer.trim();
      return {
        question: questionText.replace(/^\W+/, "").trim(),
        options,
        answer: answerRaw,
      };
    }).filter((entry) => entry.question);
  };

  const normalizeOptions = (entry: any) => {
    if (!Array.isArray(entry?.options)) return [];
    return entry.options
      .map((opt: any, idx: number) => {
        const text = String(opt || "").trim();
        if (!text) return "";
        if (/^[A-D][\).]/i.test(text)) return text.replace(/^([A-D])\./i, "$1)");
        return `${String.fromCharCode(65 + idx)}) ${text}`;
      })
      .filter(Boolean);
  };

  const toQuestionArray = (value: any) => {
    const baseRows = (Array.isArray(value) ? value : [])
      .flatMap((entry: any) => {
        const questionRaw = String(entry?.question || entry?.prompt || entry?.text || "").trim();
        const answerRaw = String(entry?.answer || entry?.correctAnswer || "").trim();
        const options = normalizeOptions(entry);
        const looksMergedBlob =
          questionRaw.length > 240 ||
          /\bQ(?:uestion)?\s*\d+[\.\):]/i.test(questionRaw) ||
          (/A[\).]/i.test(questionRaw) && /B[\).]/i.test(questionRaw) && /C[\).]/i.test(questionRaw));
        if (looksMergedBlob) {
          return parseQuestionBlob(questionRaw);
        }
        return [{
          question: questionRaw,
          options,
          answer: answerRaw,
        }];
      })
      .filter((entry) => entry.question);

    return baseRows.filter(
      (entry, idx, arr) => arr.findIndex((q) => q.question.toLowerCase() === entry.question.toLowerCase()) === idx,
    );
  };

  const renderSectionHeader = (icon: ReactNode, title: string) => (
    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs sm:text-sm">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        {icon}
      </span>
      <span>{title}</span>
    </div>
  );

  const handleDeleteQuestion = async (record: PdfItem, questionIndex: number) => {
    const key = `${record._id}:${questionIndex}`;
    setDeletingQuestionKey(key);
    try {
      const currentQuestions = Array.isArray(record.structuredContent?.questions)
        ? record.structuredContent.questions
        : [];
      const nextQuestions = currentQuestions.filter((_: any, idx: number) => idx !== questionIndex);
      const nextStructured = { ...(record.structuredContent || {}), questions: nextQuestions };
      const res = await fetch(`${API_BASE_URL}/api/pdf/${record._id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredContent: nextStructured,
          contentType: record.contentType,
          toolType: record.toolType,
          topic: record.topic || "",
          subTopic: record.subTopic || "",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to delete question");
      }
      toast({ title: "Question deleted", description: "The question was removed from this record." });
      await fetchList();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete question",
        variant: "destructive",
      });
    } finally {
      setDeletingQuestionKey(null);
    }
  };

  const activityTitleForDisplay = (raw: string, record: PdfItem): string => {
    const bad =
      /^(?:\d+\.\s*)?(?:title\s*[—:-]\s*)?(materials required|learning objectives|step-by-step procedure|teacher instructions|expected learning outcomes|assessment criteria(?:\s*\(rubric\))?|rubric|real[-\s]?life application|title)\s*$/i;
    let t = String(raw || "").replace(/\s+/g, " ").trim();
    t = t.replace(/^1\.\s*title\s*[—:-]\s*/i, "").trim();
    if (/title\s*[—:-]\s*materials required/i.test(t)) {
      t = t.replace(/\s*title\s*[—:-]\s*materials required\s*$/i, "").trim();
    }
    const dashParts = t.split(/\s*[—–]\s/).map((p) => p.trim()).filter(Boolean);
    if (dashParts.length >= 2 && bad.test(dashParts[dashParts.length - 1])) {
      t = dashParts.slice(0, -1).join(" — ");
    }
    if (!t || bad.test(t)) {
      const meta = (record as { metadata?: { bulkItemIndex?: number } }).metadata;
      const n = meta?.bulkItemIndex != null ? Number(meta.bulkItemIndex) + 1 : null;
      const isLesson =
        record.toolType === "lesson-planner" || record.toolType === "daily-class-plan-maker";
      const label = isLesson ? "Lesson" : "Activity";
      return n != null ? `${label} ${n}` : label;
    }
    return t;
  };

  /** Curiosity-style PDFs sometimes append an index after the last activity's section 9; strip for display. */
  const trimActivityRealLifeDisplayTail = (raw: string): string => {
    const s = String(raw || "").trim();
    if (!s) return s;
    const inlineCut = s.search(
      /\s(?:Included Activities\s*:|Activities\s+\d{1,3}\s*[-–]\s*\d{1,3}\s*\(|The remaining activities follow|Each activity is fully structured using)\b/i,
    );
    if (inlineCut > 0) return s.slice(0, inlineCut).trim();
    return s;
  };

  const pdfRecordPreviewLine = (record: PdfItem): string => {
    const rc =
      record.renderContent && typeof record.renderContent === "object"
        ? (record.renderContent as Record<string, unknown>)
        : null;
    const sc =
      record.structuredContent && typeof record.structuredContent === "object"
        ? (record.structuredContent as Record<string, unknown>)
        : null;
    const pick = (o: Record<string, unknown> | null) => {
      if (!o) return "";
      if (record.toolType === "flashcard-generator") {
        const cards = Array.isArray(o.cards) ? o.cards : [];
        const first = cards[0] && typeof cards[0] === "object" ? (cards[0] as Record<string, unknown>) : null;
        return String(o.front || first?.front || o.title || "").trim();
      }
      return String(o.concept_name || o.title || o.name || o.lesson_name || "").trim();
    };
    return (
      pick(rc) ||
      pick(sc) ||
      String(record.topic || "").trim() ||
      String(record.subTopic || "").trim() ||
      String(record.chapter || "").trim() ||
      String(record.originalName || "").trim() ||
      "Saved PDF — use View for full structured content"
    );
  };

  const pdfRecordViewHint = (record: PdfItem): string => {
    switch (record.toolType) {
      case "flashcard-generator":
        return "Open View for this card — Front, Back, Memory Cue, Skill Focus, Example Use, Peer Prompt, and Reflection.";
      case "short-notes-summaries-maker":
        return "Open View for the full 10-section short notes layout.";
      case "story-passage-creator":
        return "Open View for the full story & passage layout.";
      case "worksheet-mcq-generator":
        return "Open View for practice questions, answers, and marking details.";
      case "quick-assignment-builder":
        return "Open View for the 11-section assignment: objectives, concept questions, application tasks, rubric, and outcomes.";
      case "smart-qa-practice-generator":
        return "Open View for the 14-section practice set: sections A–G, real-life questions, answer key, and Bloom/difficulty tags.";
      case "smart-study-guide-generator":
        return "Open View for the 11-section study guide: overview, objectives, concepts, practice questions, and improvement tips.";
      case "concept-breakdown-explainer":
        return "Open View for the 9-section concept breakdown: definition, steps, Indian-context examples, and thinking prompts.";
      case "chapter-summary-creator":
        return "Open View for the 11-section chapter summary: overview, concepts, exam points, and recall questions.";
      case "key-points-formula-extractor":
        return "Open View for the 10-section key points layout: concepts, definitions, formulae, exam points, and one-minute summary.";
      default:
        return "Open View for the full lesson layout — objectives, materials, steps, and rubrics.";
    }
  };

  const renderEducationalContent = (item: PdfItem) => {
    const content = (item.renderContent && typeof item.renderContent === "object" ? item.renderContent : null) || {};
    const fallback = (item.structuredContent && typeof item.structuredContent === "object" ? item.structuredContent : null) || {};
    const kind =
      item.toolType === "story-passage-creator"
        ? "story"
        : item.toolType === "short-notes-summaries-maker"
          ? "shortNotes"
        : item.toolType === "key-points-formula-extractor"
          ? "keyPoints"
        : item.toolType === "quick-assignment-builder"
          ? "quickAssignment"
        : item.toolType === "chapter-summary-creator"
          ? "chapterSummary"
        : item.toolType === "smart-study-guide-generator"
          ? "studyGuide"
        : item.toolType === "concept-breakdown-explainer"
          ? "conceptBreakdown"
        : item.toolType === "smart-qa-practice-generator"
          ? "practiceQa"
          : item.toolType === "flashcard-generator"
            ? "flashcards"
            : String(content.kind || "").trim();

    if (item.toolType === "concept-breakdown-explainer" || kind === "conceptBreakdown") {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) {
            return v.flatMap((x) => {
              if (typeof x === "string") return [String(x).trim()].filter(Boolean);
              return [];
            });
          }
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };
      const conceptTitle =
        pickStr("concept_title", "concept_name", "title", "name") || "Concept";
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const emptyHint = (text: string) => <p className="text-xs text-slate-500 italic">{text}</p>;
      const importantTerms = (() => {
        const raw = rc.important_terms ?? fb.important_terms ?? fb.keywords ?? fb.terms;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((t) => {
            if (t && typeof t === "object") {
              const row = t as Record<string, unknown>;
              return {
                term: String(row.term || row.keyword || row.name || "").trim(),
                definition: String(row.definition || "").trim(),
              };
            }
            return { term: String(t ?? "").trim(), definition: "" };
          })
          .filter((t) => t.term);
      })();

      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<Lightbulb className="h-3 w-3 sm:h-4 sm:w-4" />, conceptTitle)}
            <p className="text-xs text-slate-500 pl-9">Concept Breakdown Explainer — 9-section template</p>
          </div>
          {section(
            "1. Concept Title",
            <p className="text-xs sm:text-sm font-medium text-slate-900">{conceptTitle}</p>,
          )}
          {section(
            "2. Simple Definition",
            pickStr("simple_definition", "simple_explanation", "explanation") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("simple_definition", "simple_explanation", "explanation")}
              </p>
            ) : (
              emptyHint("No simple definition.")
            ),
          )}
          {section(
            "3. Step-by-step Concept Breakdown",
            listFrom(rc.breakdown_steps, fb.breakdown_steps, fb.steps).length > 0 ? (
              <ol className="text-xs sm:text-sm space-y-1 text-slate-800 list-decimal pl-4">
                {listFrom(rc.breakdown_steps, fb.breakdown_steps, fb.steps).map((step, i) => (
                  <li key={`${item._id}-cbd-step-${i}`}>{step}</li>
                ))}
              </ol>
            ) : (
              emptyHint("No breakdown steps.")
            ),
          )}
          {section(
            "4. Real-life and Indian Context Examples",
            listFrom(
              rc.real_life_examples,
              fb.real_life_examples,
              fb.indian_context_examples,
              fb.examples,
            ).length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.real_life_examples,
                  fb.real_life_examples,
                  fb.indian_context_examples,
                  fb.examples,
                ).map((ex, i) => (
                  <li key={`${item._id}-cbd-ex-${i}`}>- {ex}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No examples.")
            ),
          )}
          {section(
            "5. Important Terms and Keywords",
            importantTerms.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {importantTerms.map((t, i) => (
                  <li key={`${item._id}-cbd-term-${i}`}>
                    <span className="font-medium">{t.term}</span>
                    {t.definition ? ` — ${t.definition}` : null}
                  </li>
                ))}
              </ul>
            ) : (
              emptyHint("No terms or keywords.")
            ),
          )}
          {section(
            "6. Concept Check Questions",
            listFrom(rc.concept_check_questions, fb.concept_check_questions, fb.quick_check_questions)
              .length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.concept_check_questions,
                  fb.concept_check_questions,
                  fb.quick_check_questions,
                ).map((q, i) => (
                  <li key={`${item._id}-cbd-qc-${i}`}>- {q}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No concept check questions.")
            ),
          )}
          {section(
            "7. Application-based Thinking Question",
            pickStr("application_thinking_question", "application_question") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("application_thinking_question", "application_question")}
              </p>
            ) : (
              emptyHint("No application-based question.")
            ),
          )}
          {section(
            "8. Higher-order Thinking Prompt",
            pickStr("higher_order_thinking_prompt", "hots_prompt", "hots_question") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("higher_order_thinking_prompt", "hots_prompt", "hots_question")}
              </p>
            ) : (
              emptyHint("No higher-order thinking prompt.")
            ),
          )}
          {section(
            "9. Quick Revision Summary",
            pickStr("quick_revision_summary", "revision_summary", "summary") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("quick_revision_summary", "revision_summary", "summary")}
              </p>
            ) : (
              emptyHint("No quick revision summary.")
            ),
          )}
        </div>
      );
    }

    if (
      item.toolType !== "short-notes-summaries-maker" &&
      item.toolType !== "story-passage-creator" &&
      item.toolType !== "flashcard-generator" &&
      item.toolType !== "chapter-summary-creator" &&
      item.toolType !== "smart-study-guide-generator" &&
      item.toolType !== "key-points-formula-extractor" &&
      item.toolType !== "concept-breakdown-explainer" &&
      (item.toolType === "concept-mastery-helper" ||
        kind === "concept" ||
        String(fallback.concept_name || "").trim())
    ) {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const pickArr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (Array.isArray(v) && v.length) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
        }
        return [];
      };
      const conceptTitle = pickStr("concept_name", "title", "name") || "Concept";
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const bodyFromMarkdown = String(item.generatedContent || "").trim();
      const hasStructured = Boolean(
        pickStr(
          "lesson",
          "simple_definition",
          "explanation",
          "step_by_step_explanation",
          "content",
          "summary",
          "why_important",
          "real_example",
          "exam_tips",
        ) ||
          pickArr("key_points").length ||
          pickArr("common_mistakes").length ||
          pickArr("concept_check_questions").length,
      );
      return (
        <div className="space-y-3">
          {renderSectionHeader(<Lightbulb className="h-3 w-3 sm:h-4 sm:w-4" />, conceptTitle)}
          {pickStr("simple_definition")
            ? section("1. Simple Definition", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{pickStr("simple_definition")}</p>)
            : null}
          {pickStr("why_important")
            ? section("2. Why This Concept Is Important", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{pickStr("why_important")}</p>)
            : null}
          {pickStr("prior_knowledge_needed")
            ? section("3. Prior Knowledge Needed", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{pickStr("prior_knowledge_needed")}</p>)
            : null}
          {pickStr("lesson", "explanation", "step_by_step_explanation", "content", "summary")
            ? section(
                "4. Step-by-step Explanation",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {pickStr("lesson", "explanation", "step_by_step_explanation", "content", "summary")}
                </p>,
              )
            : null}
          {pickStr("diagram_suggestion")
            ? section("5. Diagram / Visualisation Suggestion", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{pickStr("diagram_suggestion")}</p>)
            : null}
          {pickStr("real_example")
            ? section("6. Real-life Examples", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{pickStr("real_example")}</p>)
            : null}
          {pickArr("common_mistakes").length
            ? section(
                "7. Common Misconceptions and Corrections",
                <ul className="text-xs sm:text-sm space-y-1">
                  {pickArr("common_mistakes").map((line, i) => (
                    <li key={`${item._id}-cm-${i}`}>- {line}</li>
                  ))}
                </ul>,
              )
            : null}
          {pickArr("concept_check_questions").length
            ? section(
                "8. Concept Check Questions",
                <ul className="text-xs sm:text-sm space-y-1">
                  {pickArr("concept_check_questions").map((line, i) => (
                    <li key={`${item._id}-cc-${i}`}>- {line}</li>
                  ))}
                </ul>,
              )
            : null}
          {pickArr("key_points").length
            ? section(
                "9. Key Points to Remember",
                <ul className="text-xs sm:text-sm space-y-1">
                  {pickArr("key_points").map((line, i) => (
                    <li key={`${item._id}-kp-${i}`}>- {line}</li>
                  ))}
                </ul>,
              )
            : null}
          {pickStr("exam_tips")
            ? section("10. Exam Tips", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{pickStr("exam_tips")}</p>)
            : null}
          {pickStr("hots_question")
            ? section("11. Higher-order Thinking Question", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{pickStr("hots_question")}</p>)
            : null}
          {pickStr("self_reflection_prompt")
            ? section("12. Quick Self-reflection Prompt", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{pickStr("self_reflection_prompt")}</p>)
            : null}
          {!hasStructured && bodyFromMarkdown ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
              <p className="text-xs font-semibold text-amber-900 mb-2">Extracted content</p>
              <pre className="max-h-96 overflow-y-auto text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {bodyFromMarkdown}
              </pre>
            </div>
          ) : null}
          {!hasStructured && !bodyFromMarkdown ? (
            <p className="text-xs text-slate-500 italic">No concept sections extracted. Re-upload with Concept Mastery Helper selected.</p>
          ) : null}
        </div>
      );
    }

    if (
      item.toolType === "homework-creator" ||
      kind === "homework" ||
      (item.toolType === "homework-creator" &&
        (fallback.instructions ||
          fallback.application_tasks ||
          fallback.creative_thinking_question ||
          fallback.parent_note))
    ) {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          const text = coerceHomeworkFieldText(v);
          if (text) return text;
        }
        return "";
      };
      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) {
            return v.flatMap((x) => {
              const line = coerceHomeworkFieldText(x);
              return line ? [line] : [];
            });
          }
          if (typeof v === "object") {
            const line = coerceHomeworkFieldText(v);
            return line ? [line] : [];
          }
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };
      const practiceQuestions = toQuestionArray(
        rc.practiceQuestions || fb.practice_questions || rc.questions || fb.questions || [],
      );
      const applicationTasks = listFrom(rc.applicationTasks, fb.application_tasks);
      const hwTitle = pickStr("title", "homework_title", "name") || "Homework";
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const fallbackBody = String(item.generatedContent || "").trim();
      const hasStructured = Boolean(
        pickStr("instructions") ||
          practiceQuestions.length ||
          applicationTasks.length ||
          pickStr("creativeThinkingQuestion", "creative_thinking_question") ||
          pickStr("realLifeObservationTask", "real_life_observation_task") ||
          pickStr("challengeQuestion", "challenge_question") ||
          pickStr("supportHint", "support_hint") ||
          pickStr("answerHints", "answer_hints") ||
          pickStr("parentNote", "parent_note"),
      );

      return (
        <div className="space-y-3">
          {renderSectionHeader(<ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />, hwTitle)}
          {pickStr("instructions", "student_instructions")
            ? section(
                "2. Clear Student Instructions",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("instructions", "student_instructions")}
                </p>,
              )
            : null}
          {practiceQuestions.length > 0
            ? section(
                "3. Practice Questions",
                <div className="space-y-3">
                  {practiceQuestions.map((q, i) => (
                    <div key={`${item._id}-hw-q-${i}`} className="rounded-lg border border-slate-100 p-3 space-y-2">
                      <p className="text-xs sm:text-sm font-medium">Q{i + 1}. {q.question}</p>
                      {q.options.length > 0 && (
                        <ul className="text-xs sm:text-sm space-y-1 text-slate-700">
                          {q.options.map((opt: string, idx: number) => (
                            <li key={`${item._id}-hw-q-${i}-o-${idx}`}>- {opt}</li>
                          ))}
                        </ul>
                      )}
                      {q.answer ? (
                        <p className="text-xs text-emerald-700">
                          <span className="font-medium">Answer:</span> {q.answer}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>,
              )
            : null}
          {applicationTasks.length > 0
            ? section(
                "4. Application-based Tasks",
                <ul className="text-xs sm:text-sm space-y-1">
                  {applicationTasks.map((t, i) => (
                    <li key={`${item._id}-hw-app-${i}`}>- {t}</li>
                  ))}
                </ul>,
              )
            : null}
          {pickStr("creativeThinkingQuestion", "creative_thinking_question")
            ? section(
                "5. One Creative / Thinking Question",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("creativeThinkingQuestion", "creative_thinking_question")}
                </p>,
              )
            : null}
          {pickStr("realLifeObservationTask", "real_life_observation_task")
            ? section(
                "6. One Real-life Observation Task",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("realLifeObservationTask", "real_life_observation_task")}
                </p>,
              )
            : null}
          {pickStr("challengeQuestion", "challenge_question")
            ? section(
                "7. Challenge Question",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("challengeQuestion", "challenge_question")}
                </p>,
              )
            : null}
          {pickStr("supportHint", "support_hint", "hints")
            ? section(
                "8. Support Hint",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("supportHint", "support_hint", "hints")}
                </p>,
              )
            : null}
          {pickStr("answerHints", "answer_hints", "answer_key")
            ? section(
                "9. Answer Hints / Key Points",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("answerHints", "answer_hints", "answer_key")}
                </p>,
              )
            : null}
          {pickStr("parentNote", "parent_note")
            ? section(
                "10. Parent Note",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("parentNote", "parent_note")}
                </p>,
              )
            : null}
          {!hasStructured && fallbackBody ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
              <p className="text-xs font-semibold text-amber-900 mb-2">Extracted content (sections not mapped)</p>
              <pre className="max-h-72 overflow-y-auto text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {fallbackBody.slice(0, 120000)}
              </pre>
            </div>
          ) : null}
        </div>
      );
    }

    if (item.toolType === "smart-qa-practice-generator" || kind === "practiceQa") {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const PRACTICE_QA_SECTION_ORDER = [
        "Section A: MCQs",
        "Section B: Fill in the Blanks",
        "Section C: Match the Following",
        "Section D: Very Short Answer Questions",
        "Section E: Short Answer Questions",
        "Section F: Application / Case-based Questions",
        "Section G: HOTS / Analytical Questions",
      ];
      const mapSectionName = (name: string) => {
        const n = String(name || "").trim();
        if (/^section\s*a|mcq|multiple\s*choice/i.test(n)) return PRACTICE_QA_SECTION_ORDER[0];
        if (/^section\s*b|fill|blank|fib/i.test(n)) return PRACTICE_QA_SECTION_ORDER[1];
        if (/^section\s*c|match/i.test(n)) return PRACTICE_QA_SECTION_ORDER[2];
        if (/^section\s*d|very\s*short|vsa/i.test(n)) return PRACTICE_QA_SECTION_ORDER[3];
        if (/^section\s*e|short\s*answer/i.test(n) && !/very/i.test(n)) return PRACTICE_QA_SECTION_ORDER[4];
        if (/^section\s*f|application|case/i.test(n)) return PRACTICE_QA_SECTION_ORDER[5];
        if (/^section\s*g|hots|analytical/i.test(n)) return PRACTICE_QA_SECTION_ORDER[6];
        return PRACTICE_QA_SECTION_ORDER.includes(n) ? n : n;
      };
      const sectionsRaw = (rc.sections ?? fb.sections ?? []) as {
        sectionName?: string;
        title?: string;
        questions?: unknown[];
      }[];
      const sectionMap = new Map<string, ReturnType<typeof toQuestionArray>>();
      const addToSection = (name: string, qs: ReturnType<typeof toQuestionArray>) => {
        const key = mapSectionName(name);
        const prev = sectionMap.get(key) || [];
        sectionMap.set(key, [...prev, ...qs]);
      };
      if (Array.isArray(sectionsRaw)) {
        for (const sec of sectionsRaw) {
          addToSection(String(sec?.sectionName || sec?.title || "Section"), toQuestionArray(sec?.questions || []));
        }
      }
      const flatQs = toQuestionArray(rc.questions || fb.questions || fb.practice_questions || []);
      if (flatQs.length) {
        for (const q of flatQs) {
          let sec = String((q as { section?: string }).section || "").trim();
          const qt = String(q.question || "");
          if (!sec || sec === "Questions") {
            if ((q as { options?: string[] }).options?.length) sec = PRACTICE_QA_SECTION_ORDER[0];
            else if (/_{2,}/.test(qt)) sec = PRACTICE_QA_SECTION_ORDER[1];
            else if (/match\s*(the\s*)?following/i.test(qt)) sec = PRACTICE_QA_SECTION_ORDER[2];
            else if (/application|case[\s-]*based/i.test(qt)) sec = PRACTICE_QA_SECTION_ORDER[5];
            else if (/hots|analytical/i.test(qt)) sec = PRACTICE_QA_SECTION_ORDER[6];
            else if (/\?/.test(qt) && qt.split(/\s+/).length <= 22) sec = PRACTICE_QA_SECTION_ORDER[3];
            else if (/\?/.test(qt)) sec = PRACTICE_QA_SECTION_ORDER[4];
            else sec = PRACTICE_QA_SECTION_ORDER[3];
          }
          addToSection(mapSectionName(sec), [q]);
        }
      }
      const sections = PRACTICE_QA_SECTION_ORDER.map((sectionName, idx) => ({
        sectionName,
        displayLabel: `${4 + idx}. ${sectionName}`,
        questions: sectionMap.get(sectionName) || [],
      }));
      const realLifeQs = toQuestionArray(
        rc.realLifeProblemSolvingQuestions ||
          fb.real_life_problem_solving_questions ||
          fb.real_life_questions ||
          [],
      );
      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };
      const pqTitle = pickStr("title", "practice_set_title", "name") || activityTitleForDisplay("Practice Q&A", item);
      const objectives = listFrom(rc.learningObjectives, fb.learning_objectives, fb.objectives);
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const renderQuestion = (q: ReturnType<typeof toQuestionArray>[0], key: string) => {
        const qx = q as {
          question_number?: number;
          marks?: number;
          type?: string;
          bloom_level?: string;
          difficulty_tag?: string;
          explanation?: string;
        };
        return (
          <div key={key} className="rounded-lg border border-slate-100 p-3 space-y-2">
            <p className="text-xs sm:text-sm font-medium">
              Q{qx.question_number != null ? String(qx.question_number) : ""}. {q.question}
              {qx.type ? (
                <span className="ml-2 text-xs font-normal text-slate-500">({qx.type})</span>
              ) : null}
            </p>
            {q.options.length > 0 && (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-700">
                {q.options.map((opt: string, idx: number) => (
                  <li key={`${key}-o-${idx}`} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full border border-slate-500" />
                    <span>{opt.replace(/^[A-D][\).]\s*/i, `${String.fromCharCode(65 + idx)}) `)}</span>
                  </li>
                ))}
              </ul>
            )}
            {q.answer ? (
              <p className="text-xs text-emerald-700">
                <span className="font-medium">Answer:</span> {q.answer}
              </p>
            ) : null}
            {qx.explanation ? (
              <p className="text-xs text-slate-700">
                <span className="font-medium">Explanation:</span> {qx.explanation}
              </p>
            ) : null}
            {(qx.bloom_level || qx.difficulty_tag) && (
              <p className="text-xs text-slate-500">
                {qx.bloom_level ? (
                  <span>
                    <span className="font-medium">Bloom:</span> {qx.bloom_level}
                  </span>
                ) : null}
                {qx.bloom_level && qx.difficulty_tag ? " · " : null}
                {qx.difficulty_tag ? (
                  <span>
                    <span className="font-medium">Difficulty:</span> {qx.difficulty_tag}
                  </span>
                ) : null}
              </p>
            )}
          </div>
        );
      };

      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<HelpCircle className="h-3 w-3 sm:h-4 sm:w-4" />, pqTitle)}
            <p className="text-xs text-slate-500 pl-9">Smart Q&amp;A Practice — 14-section template</p>
          </div>
          {section("1. Practice Set Title", <p className="text-xs sm:text-sm font-medium text-slate-900">{pqTitle}</p>)}
          {objectives.length > 0
            ? section(
                "2. Learning Objectives",
                <ul className="text-xs sm:text-sm space-y-1">
                  {objectives.map((line, i) => (
                    <li key={`${item._id}-pqa-lo-${i}`}>- {line}</li>
                  ))}
                </ul>,
              )
            : section("2. Learning Objectives", <p className="text-xs text-slate-500 italic">No objectives.</p>)}
          {pickStr("instructions", "student_instructions")
            ? section(
                "3. Instructions to Students",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("instructions", "student_instructions")}
                </p>,
              )
            : section("3. Instructions to Students", <p className="text-xs text-slate-500 italic">No instructions.</p>)}
          {sections.map((sec, sIdx) =>
            section(
              sec.displayLabel || sec.sectionName,
              sec.questions.length > 0 ? (
                <div className="space-y-3">
                  {sec.questions.map((q, qIdx) =>
                    renderQuestion(q, `${item._id}-pqa-${sIdx}-q-${qIdx}`),
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No questions in this section.</p>
              ),
            ),
          )}
          {section(
            "11. Real-life Problem-solving Questions",
            realLifeQs.length > 0 ? (
              <div className="space-y-3">
                {realLifeQs.map((q, qIdx) => renderQuestion(q, `${item._id}-pqa-rl-${qIdx}`))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No real-life problem-solving questions.</p>
            ),
          )}
          {pickStr("answerKeyWithExplanations", "answer_key_with_explanations", "answer_key", "answerKey")
            ? section(
                "12. Answer Key with Explanations",
                <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {pickStr("answerKeyWithExplanations", "answer_key_with_explanations", "answer_key", "answerKey")}
                </pre>,
              )
            : section("12. Answer Key with Explanations", <p className="text-xs text-slate-500 italic">No answer key.</p>)}
          {section(
            "13. Bloom's Level Tag for Each Question",
            <p className="text-xs text-slate-500 italic">
              Shown per question above when extracted or generated.
            </p>,
          )}
          {section(
            "14. Difficulty Tag for Each Question",
            <p className="text-xs text-slate-500 italic">
              Shown per question above when extracted or generated.
            </p>,
          )}
        </div>
      );
    }

    if (item.toolType === "worksheet-mcq-generator" || kind === "worksheet") {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };
      const WORKSHEET_SECTION_ORDER = [
        "Section A: MCQs",
        "Section B: Fill in the Blanks",
        "Section C: Very Short Answer Questions",
        "Section D: Short Answer Questions",
        "Section E: Competency / Real-life Application Questions",
      ];
      const mapSectionName = (name: string) => {
        const n = String(name || "").trim();
        if (/^section\s*a|mcq|multiple\s*choice/i.test(n)) return WORKSHEET_SECTION_ORDER[0];
        if (/^section\s*b|fill|blank|fib/i.test(n)) return WORKSHEET_SECTION_ORDER[1];
        if (/^section\s*c|very\s*short|vsa/i.test(n)) return WORKSHEET_SECTION_ORDER[2];
        if (/^section\s*d|short\s*answer/i.test(n) && !/very/i.test(n)) return WORKSHEET_SECTION_ORDER[3];
        if (/^section\s*[ef]|competency|real[\s-]*life|application/i.test(n)) return WORKSHEET_SECTION_ORDER[4];
        if (n === "Questions" && !n) return n;
        return WORKSHEET_SECTION_ORDER.includes(n) ? n : n;
      };
      const sectionsRaw = (rc.sections ?? fb.sections ?? []) as {
        sectionName?: string;
        title?: string;
        questions?: unknown[];
      }[];
      const sectionMap = new Map<string, ReturnType<typeof toQuestionArray>>();
      const addToSection = (name: string, qs: ReturnType<typeof toQuestionArray>) => {
        const key = mapSectionName(name);
        const prev = sectionMap.get(key) || [];
        sectionMap.set(key, [...prev, ...qs]);
      };
      if (Array.isArray(sectionsRaw)) {
        for (const sec of sectionsRaw) {
          addToSection(String(sec?.sectionName || sec?.title || "Section"), toQuestionArray(sec?.questions || []));
        }
      }
      const flatQs = toQuestionArray(rc.questions || fb.questions || []);
      if (flatQs.length) {
        for (const q of flatQs) {
          let sec = String((q as { section?: string }).section || "").trim();
          const qt = String(q.question || "");
          const words = qt.split(/\s+/).filter(Boolean).length;
          const competencyCue =
            /(?:real[\s-]*life|application|competency|case[\s-]*based|scenario|daily\s+life|at\s+home|in\s+school|how\s+would\s+you|what\s+would\s+you\s+do|design|plan|investigate|experiment|observe|compare)\b/i.test(
              qt,
            );
          const looksPromptLike =
            /\?/.test(qt) ||
            /^(?:imagine|suppose|consider|how would you|what would you do|design|plan|investigate|observe|compare)\b/i.test(
              qt,
            );
          if (!sec || sec === "Questions") {
            if ((q as { options?: string[] }).options?.length) sec = WORKSHEET_SECTION_ORDER[0];
            else if (/_{2,}/.test(qt)) sec = WORKSHEET_SECTION_ORDER[1];
            else if (competencyCue && looksPromptLike) sec = WORKSHEET_SECTION_ORDER[4];
            else if (/\?/.test(qt) && words <= 14) sec = WORKSHEET_SECTION_ORDER[2];
            else if (/\?/.test(qt)) sec = WORKSHEET_SECTION_ORDER[3];
            else if (words >= 10) sec = WORKSHEET_SECTION_ORDER[3];
            else sec = WORKSHEET_SECTION_ORDER[2];
          }
          addToSection(mapSectionName(sec), [q]);
        }
      }
      if (!sectionMap.size && String(fb.question || "").trim()) {
        const single = toQuestionArray([fb])[0];
        const qt = String(single?.question || "");
        let sec = String(fb.section || "").trim();
        if (!sec) {
          if (/_{2,}/.test(qt)) sec = WORKSHEET_SECTION_ORDER[1];
          else sec = WORKSHEET_SECTION_ORDER[0];
        }
        addToSection(mapSectionName(sec), [single]);
      }
      const dKey = WORKSHEET_SECTION_ORDER[3];
      const eKey = WORKSHEET_SECTION_ORDER[4];
      const dQuestions = [...(sectionMap.get(dKey) || [])];
      const eQuestions = [...(sectionMap.get(eKey) || [])];
      if (eQuestions.length === 0 && dQuestions.length > 1) {
        const preferredIdx = dQuestions.findIndex((q) =>
          /(?:competency|real[\s-]*life|application|case[\s-]*based|scenario|how would you|what would you do|daily life|at home|in school)/i.test(
            String(q?.question || ""),
          ),
        );
        if (preferredIdx >= 0) {
          const [moved] = dQuestions.splice(preferredIdx, 1);
          sectionMap.set(dKey, dQuestions);
          sectionMap.set(eKey, [...eQuestions, moved]);
        }
      }
      if (dQuestions.length === 0 && eQuestions.length > 1) {
        const moveBackIdx = eQuestions.findIndex((q) =>
          !/(?:competency|real[\s-]*life|application|case[\s-]*based|scenario|daily\s+life|at\s+home|in\s+school|how would you|what would you do|design|plan|investigate|experiment|observe|compare)\b/i.test(
            String(q?.question || ""),
          ),
        );
        const idx = moveBackIdx >= 0 ? moveBackIdx : eQuestions.length - 1;
        const [movedBack] = eQuestions.splice(idx, 1);
        if (movedBack) {
          sectionMap.set(dKey, [...dQuestions, movedBack]);
          sectionMap.set(eKey, eQuestions);
        }
      }
      const sections = WORKSHEET_SECTION_ORDER.map((sectionName, idx) => ({
        sectionName,
        displayLabel: `${4 + idx}. ${sectionName}`,
        questions: sectionMap.get(sectionName) || [],
      }));
      const wsTitle = pickStr("title", "worksheet_title", "name") || activityTitleForDisplay("Worksheet", item);
      const objectives = listFrom(rc.learningObjectives, fb.learning_objectives, fb.objectives);
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const fallbackBody = String(item.generatedContent || "").trim();
      const hasStructured = Boolean(
        objectives.length ||
          pickStr("instructions", "student_instructions") ||
          sections.some((s) => s.questions.length) ||
          pickStr("answerKey", "answer_key") ||
          pickStr("bloomLevel", "bloom_level") ||
          pickStr("difficultyTag", "difficulty_tag", "difficulty"),
      );

      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />, wsTitle)}
            <p className="text-xs text-slate-500 pl-9">Worksheet &amp; MCQ — 10-section template</p>
          </div>
          {objectives.length > 0
            ? section(
                "2. Learning Objectives",
                <ul className="text-xs sm:text-sm space-y-1">
                  {objectives.map((line, i) => (
                    <li key={`${item._id}-ws-lo-${i}`}>- {line}</li>
                  ))}
                </ul>,
              )
            : null}
          {pickStr("instructions", "student_instructions")
            ? section(
                "3. Instructions to Students",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("instructions", "student_instructions")}
                </p>,
              )
            : null}
          {sections.map((sec, sIdx) =>
            section(
              sec.displayLabel || sec.sectionName,
              sec.questions.length > 0 ? (
              <div className="space-y-3">
                {sec.questions.map((q, qIdx) => {
                  const qx = q as { question_number?: number; marks?: number; type?: string };
                  return (
                    <div
                      key={`${item._id}-ws-${sIdx}-q-${qIdx}`}
                      className="rounded-lg border border-slate-100 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs sm:text-sm font-medium flex-1">
                          Q{qx.question_number != null ? String(qx.question_number) : qIdx + 1}. {q.question}
                          {qx.type ? (
                            <span className="ml-2 text-xs font-normal text-slate-500">({qx.type})</span>
                          ) : null}
                        </p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={deletingQuestionKey === `${item._id}:${qIdx}`}
                          onClick={() => handleDeleteQuestion(item, qIdx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {q.options.length > 0 && (
                        <ul className="text-xs sm:text-sm space-y-1 text-slate-700">
                          {q.options.map((opt: string, idx: number) => (
                            <li key={`${item._id}-ws-${sIdx}-q-${qIdx}-o-${idx}`} className="flex items-start gap-2">
                              <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full border border-slate-500" />
                              <span>{opt.replace(/^[A-D][\).]\s*/i, `${String.fromCharCode(65 + idx)}) `)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {q.answer ? (
                        <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                          <CircleCheck className="h-3.5 w-3.5" />
                          <span>
                            <span className="font-medium">Answer:</span> {q.answer}
                          </span>
                        </p>
                      ) : null}
                      {qx.marks != null && !Number.isNaN(Number(qx.marks)) ? (
                        <p className="text-xs text-slate-500">Marks: {String(qx.marks)}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  No questions extracted for this section. Re-upload the worksheet PDF to capture all sections.
                </p>
              )
            )
          )}
          {pickStr("answerKey", "answer_key")
            ? section(
                "9. Answer Key",
                <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {pickStr("answerKey", "answer_key")}
                </pre>,
              )
            : null}
          {pickStr("bloomLevel", "bloom_level") || pickStr("difficultyTag", "difficulty_tag", "difficulty") ? (
            section(
              "10. Bloom's Level and Difficulty Tag",
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {[pickStr("bloomLevel", "bloom_level"), pickStr("difficultyTag", "difficulty_tag", "difficulty")]
                  .filter(Boolean)
                  .join(" — ")}
              </p>
            )
          ) : null}
          {!hasStructured && fallbackBody ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
              <p className="text-xs font-semibold text-amber-900 mb-2">Extracted content (sections not mapped)</p>
              <pre className="max-h-72 overflow-y-auto text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {fallbackBody.slice(0, 120000)}
              </pre>
            </div>
          ) : null}
        </div>
      );
    }

    if (
      kind === "questionSet" ||
      (Array.isArray(content.questions) &&
        item.toolType !== "concept-mastery-helper" &&
        item.toolType !== "homework-creator" &&
        item.toolType !== "worksheet-mcq-generator" &&
        item.toolType !== "story-passage-creator" &&
        item.toolType !== "short-notes-summaries-maker" &&
        item.toolType !== "quick-assignment-builder") ||
      (Array.isArray(fallback.questions) &&
        item.toolType !== "concept-mastery-helper" &&
        item.toolType !== "homework-creator" &&
        item.toolType !== "worksheet-mcq-generator" &&
        item.toolType !== "story-passage-creator" &&
        item.toolType !== "short-notes-summaries-maker" &&
        item.toolType !== "quick-assignment-builder")
    ) {
      const questions = toQuestionArray(content.questions || fallback.questions || []);
      if (questions.length === 0) {
        return (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Parsed questions are unavailable for this record. Reprocess this PDF to generate structured questions.
          </div>
        );
      }
      return (
        <div className="space-y-3">
          {renderSectionHeader(<ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />, item.toolType === "homework-creator" ? "Homework Questions" : "Worksheet / MCQ Questions")}
          {questions.map((q, i) => (
            <div key={`${item._id}-q-${i}`} className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs sm:text-sm font-medium leading-relaxed flex-1">Q{i + 1}. {q.question}</p>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                  disabled={deletingQuestionKey === `${item._id}:${i}`}
                  onClick={() => handleDeleteQuestion(item, i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {q.options.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-slate-700">
                  {q.options.map((opt: string, idx: number) => (
                    <li key={`${item._id}-q-${i}-opt-${idx}`} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full border border-slate-500" />
                      <span>{opt.replace(/^[A-D][\).]\s*/i, `${String.fromCharCode(65 + idx)}) `)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {q.answer && (
                <p className="mt-3 text-xs text-emerald-700 flex items-center gap-1.5">
                  <CircleCheck className="h-3.5 w-3.5" />
                  <span><span className="font-medium">Correct answer:</span> {q.answer}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (
      item.toolType === "flashcard-generator" ||
      kind === "flashcards" ||
      Array.isArray(content.cards) ||
      Array.isArray(fallback.cards)
    ) {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickCardStr = (card: Record<string, unknown>, ...keys: string[]) => {
        for (const k of keys) {
          const v = card[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const normalizeCard = (raw: unknown) => {
        const c = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        return {
          front: pickCardStr(c, "front"),
          back: pickCardStr(c, "back"),
          memoryCue: pickCardStr(c, "memoryCue", "memory_cue", "hint"),
          skillFocus: pickCardStr(c, "skillFocus", "skill_focus", "bloom_level"),
          exampleUse: pickCardStr(c, "exampleUse", "example_use", "real_life_link"),
          peerPrompt: pickCardStr(c, "peerPrompt", "peer_prompt"),
          reflection: pickCardStr(c, "reflection", "reflection_prompt", "self_check"),
        };
      };
      const rawCards = Array.isArray(rc.cards)
        ? rc.cards
        : Array.isArray(fallback.cards)
          ? (fallback.cards as unknown[])
          : pickCardStr(fb, "front") || pickCardStr(fb, "back")
            ? [fb]
            : [];
      const cards = rawCards.map(normalizeCard).filter((c) => c.front || c.back);
      const deckTitle = pickCardStr(rc, "title") || pickCardStr(fb, "deck_title", "title") || "Flashcards";
      const fieldRow = (label: string, value: string) =>
        value ? (
          <p className="text-xs sm:text-sm text-slate-800">
            <span className="font-medium text-slate-600">{label}:</span> {value}
          </p>
        ) : null;
      return (
        <div className="space-y-3">
          {renderSectionHeader(<Layers className="h-3 w-3 sm:h-4 sm:w-4" />, deckTitle)}
          <p className="text-xs text-slate-500 pl-9">Flashcard Generator — 7-field template per card</p>
          <div className="grid gap-3 md:grid-cols-2">
          {cards.map((card, idx) => (
            <div key={`${item._id}-card-${idx}`} className="rounded-xl border bg-white p-4 space-y-2 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Card {idx + 1}</p>
              {fieldRow("Front", card.front)}
              {fieldRow("Back", card.back)}
              {fieldRow("Memory Cue", card.memoryCue)}
              {fieldRow("Skill Focus", card.skillFocus)}
              {fieldRow("Example Use", card.exampleUse)}
              {fieldRow("Peer Prompt", card.peerPrompt)}
              {fieldRow("Reflection", card.reflection)}
            </div>
          ))}
          </div>
          {cards.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No flashcards extracted. Re-upload with Flashcard Generator selected.</p>
          ) : null}
        </div>
      );
    }

    if (item.toolType === "story-passage-creator" || kind === "story") {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) {
            return v.flatMap((x) => {
              if (typeof x === "string") return [String(x).trim()].filter(Boolean);
              if (x && typeof x === "object") {
                const o = x as Record<string, unknown>;
                return [String(o.text || o.hint || o.answer || o.question || "").trim()].filter(Boolean);
              }
              return [];
            });
          }
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };
      const storyTitle = pickStr("title") || "Story";
      const passage = pickStr("passage", "content");
      const questions = toQuestionArray(rc.questions || fb.questions || []);
      const objectives = listFrom(rc.learningObjectives, fb.learning_objectives, fb.objectives);
      const vocabulary = listFrom(rc.vocabularySupport, fb.vocabulary_support, fb.vocabulary);
      const answerHints = listFrom(rc.answerHints, fb.answer_hints);
      const metaClass = pickStr("classLabel", "class_label") || String(item.classLabel || "").trim();
      const metaSubject = pickStr("subject") || String(item.subject || "").trim();
      const metaSubtopic = pickStr("subtopic", "subtopic_link") || String(item.subTopic || "").trim();
      const metaBloom = pickStr("bloomLevel", "bloom_level");
      const metaDifficulty = pickStr("difficultyLevel", "difficulty_level", "difficulty_tag");
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const alignment =
        pickStr("alignmentBlock", "alignment_block") ||
        [
          pickStr("nepNcfFocus", "nep_ncf_focus") ? `NEP/NCF Focus: ${pickStr("nepNcfFocus", "nep_ncf_focus")}` : "",
          pickStr("skillFocus", "skill_focus") ? `Skill Focus: ${pickStr("skillFocus", "skill_focus")}` : "",
          pickStr("udlSupport", "udl_support", "udl") ? `UDL: ${pickStr("udlSupport", "udl_support", "udl")}` : "",
        ]
          .filter(Boolean)
          .join(" ");
      const emptyHint = (text: string) => <p className="text-xs text-slate-500 italic">{text}</p>;

      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<BookText className="h-3 w-3 sm:h-4 sm:w-4" />, storyTitle)}
            <p className="text-xs text-slate-500 pl-9">Story &amp; Passage — 9-section template</p>
          </div>
          {(metaClass || metaSubject || metaSubtopic || metaBloom || metaDifficulty) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {metaClass ? (
                <span className="rounded-full border bg-slate-50 px-2 py-1 text-slate-600">Class: {metaClass}</span>
              ) : null}
              {metaSubject ? (
                <span className="rounded-full border bg-slate-50 px-2 py-1 text-slate-600">Subject: {metaSubject}</span>
              ) : null}
              {metaSubtopic ? (
                <span className="rounded-full border bg-slate-50 px-2 py-1 text-slate-600">Subtopic: {metaSubtopic}</span>
              ) : null}
              {metaBloom ? (
                <span className="rounded-full border bg-slate-50 px-2 py-1 text-slate-600">Bloom: {metaBloom}</span>
              ) : null}
              {metaDifficulty ? (
                <span className="rounded-full border bg-slate-50 px-2 py-1 text-slate-600">Difficulty: {metaDifficulty}</span>
              ) : null}
            </div>
          )}
          {section(
            "1. Alignment Block",
            alignment ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{alignment}</p>
            ) : (
              emptyHint("Re-upload with Story & Passage Creator to extract NEP/NCF, skill focus, and UDL.")
            ),
          )}
          {section(
            "2. Learning Objectives",
            objectives.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {objectives.map((o, i) => (
                  <li key={`${item._id}-story-lo-${i}`}>- {o}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No learning objectives extracted.")
            ),
          )}
          {section(
            "3. Passage",
            passage ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{passage}</p>
            ) : (
              emptyHint("Passage text missing — re-upload the story PDF.")
            ),
          )}
          {section(
            "4. Vocabulary Support",
            vocabulary.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {vocabulary.map((v, i) => (
                  <li key={`${item._id}-story-voc-${i}`}>- {v}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No vocabulary list extracted.")
            ),
          )}
          {section(
            "5. Comprehension and Thinking Questions",
            questions.length > 0 ? (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <p key={`${item._id}-story-q-${i}`} className="text-xs sm:text-sm text-slate-800">
                    Q{i + 1}. {q.question}
                  </p>
                ))}
              </div>
            ) : (
              emptyHint("No comprehension questions extracted.")
            ),
          )}
          {section(
            "6. Answer Hints",
            answerHints.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {answerHints.map((h, i) => (
                  <li key={`${item._id}-story-hint-${i}`}>- {h}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No answer hints extracted.")
            ),
          )}
          {section(
            "7. Differentiation",
            pickStr("differentiationSupport", "differentiation_support") ||
              pickStr("differentiationExtension", "differentiation_extension") ? (
              <div className="space-y-2 text-xs sm:text-sm text-slate-800">
                {pickStr("differentiationSupport", "differentiation_support") ? (
                  <p>
                    <span className="font-medium">Support:</span>{" "}
                    {pickStr("differentiationSupport", "differentiation_support")}
                  </p>
                ) : null}
                {pickStr("differentiationExtension", "differentiation_extension") ? (
                  <p>
                    <span className="font-medium">Extension:</span>{" "}
                    {pickStr("differentiationExtension", "differentiation_extension")}
                  </p>
                ) : null}
              </div>
            ) : (
              emptyHint("No differentiation support or extension extracted.")
            ),
          )}
          {section(
            "8. Real-life Application",
            pickStr("realLifeApplication", "real_life_application", "real_life_link") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("realLifeApplication", "real_life_application", "real_life_link")}
              </p>
            ) : (
              emptyHint("No real-life application extracted.")
            ),
          )}
          {section(
            "9. Reflection / Exit Ticket",
            pickStr("reflectionPrompt", "reflection_prompt", "reflection_exit_ticket") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("reflectionPrompt", "reflection_prompt", "reflection_exit_ticket")}
              </p>
            ) : (
              emptyHint("No reflection / exit ticket extracted.")
            ),
          )}
        </div>
      );
    }

    if (item.toolType === "smart-study-guide-generator" || kind === "studyGuide") {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) {
            return v.flatMap((x) => {
              if (typeof x === "string") return [String(x).trim()].filter(Boolean);
              return [];
            });
          }
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };
      const guideTitle = pickStr("title") || "Study Guide";
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const emptyHint = (text: string) => <p className="text-xs text-slate-500 italic">{text}</p>;
      const keyConcepts = (() => {
        const raw = rc.key_concepts ?? fb.key_concepts ?? fb.concepts;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((c) => {
            if (c && typeof c === "object") {
              const row = c as Record<string, unknown>;
              return {
                name: String(row.name || row.concept || "").trim(),
                explanation: String(row.explanation || "").trim(),
              };
            }
            return { name: String(c ?? "").trim(), explanation: "" };
          })
          .filter((c) => c.name);
      })();
      const definitions = (() => {
        const raw = rc.definitions ?? fb.definitions;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((d) => {
            if (d && typeof d === "object") {
              const row = d as Record<string, unknown>;
              return {
                term: String(row.term || row.name || "").trim(),
                definition: String(row.definition || "").trim(),
              };
            }
            return { term: String(d ?? "").trim(), definition: "" };
          })
          .filter((d) => d.term);
      })();
      const formulae = (() => {
        const raw = rc.formulae ?? fb.formulae ?? fb.formulas;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((f) => {
            if (f && typeof f === "object") {
              const row = f as Record<string, unknown>;
              return {
                name: String(row.name || "").trim(),
                formula: String(row.formula || "").trim(),
                note: String(row.note || "").trim(),
              };
            }
            return { name: "", formula: String(f ?? "").trim(), note: "" };
          })
          .filter((f) => f.formula || f.name);
      })();
      const practiceQuestions = (() => {
        const raw = rc.practice_questions ?? fb.practice_questions ?? fb.questions;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((q) => {
            if (q && typeof q === "object") {
              const row = q as Record<string, unknown>;
              return {
                question: String(row.question || "").trim(),
                type: String(row.type || "subjective").trim(),
                answer: String(row.answer || "").trim(),
                options: Array.isArray(row.options)
                  ? row.options.map((o) => String(o ?? "").trim()).filter(Boolean)
                  : [],
              };
            }
            return { question: String(q ?? "").trim(), type: "subjective", answer: "", options: [] };
          })
          .filter((q) => q.question);
      })();

      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />, guideTitle)}
            <p className="text-xs text-slate-500 pl-9">Smart Study Guide — 11-section template</p>
          </div>
          {section(
            "1. Study Guide Title",
            <p className="text-xs sm:text-sm font-medium text-slate-900">{guideTitle}</p>,
          )}
          {section(
            "2. Chapter and Subtopic Overview",
            pickStr("chapter_subtopic_overview", "chapter_overview", "overview") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("chapter_subtopic_overview", "chapter_overview", "overview")}
              </p>
            ) : (
              emptyHint("No chapter/subtopic overview.")
            ),
          )}
          {section(
            "3. Learning Objectives",
            listFrom(rc.learningObjectives, fb.learning_objectives, fb.objectives).length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(rc.learningObjectives, fb.learning_objectives, fb.objectives).map((o, i) => (
                  <li key={`${item._id}-sg-lo-${i}`}>- {o}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No learning objectives.")
            ),
          )}
          {section(
            "4. Prior Knowledge Required",
            listFrom(rc.prior_knowledge_required, fb.prior_knowledge_required, fb.prior_knowledge).length >
            0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(rc.prior_knowledge_required, fb.prior_knowledge_required, fb.prior_knowledge).map(
                  (p, i) => (
                    <li key={`${item._id}-sg-pk-${i}`}>- {p}</li>
                  ),
                )}
              </ul>
            ) : (
              emptyHint("No prior knowledge listed.")
            ),
          )}
          {section(
            "5. Key Concepts Explained in Simple Language",
            keyConcepts.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-2 text-slate-800">
                {keyConcepts.map((c, i) => (
                  <li key={`${item._id}-sg-kc-${i}`}>
                    <span className="font-medium">{c.name}</span>
                    {c.explanation ? ` — ${c.explanation}` : null}
                  </li>
                ))}
              </ul>
            ) : (
              emptyHint("No key concepts.")
            ),
          )}
          {section(
            "6. Important Definitions and Formulae",
            definitions.length > 0 || formulae.length > 0 ? (
              <div className="space-y-2 text-xs sm:text-sm text-slate-800">
                {definitions.map((d, i) => (
                  <p key={`${item._id}-sg-def-${i}`}>
                    <span className="font-medium">{d.term}</span>
                    {d.definition ? ` — ${d.definition}` : null}
                  </p>
                ))}
                {formulae.map((f, i) => (
                  <p key={`${item._id}-sg-fm-${i}`}>
                    {f.name ? <span className="font-medium">{f.name}: </span> : null}
                    {f.formula}
                    {f.note ? <span className="text-slate-500"> ({f.note})</span> : null}
                  </p>
                ))}
              </div>
            ) : (
              emptyHint("No definitions or formulae.")
            ),
          )}
          {section(
            "7. Concept Flow / Mind Map Suggestion",
            pickStr("concept_flow_mind_map", "concept_flow", "mind_map") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("concept_flow_mind_map", "concept_flow", "mind_map")}
              </p>
            ) : (
              emptyHint("No concept flow or mind map suggestion.")
            ),
          )}
          {section(
            "8. Real-life Examples and Applications",
            listFrom(rc.real_life_examples, fb.real_life_examples, fb.real_life_applications, fb.examples)
              .length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.real_life_examples,
                  fb.real_life_examples,
                  fb.real_life_applications,
                  fb.examples,
                ).map((ex, i) => (
                  <li key={`${item._id}-sg-rl-${i}`}>- {ex}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No real-life examples.")
            ),
          )}
          {section(
            "9. Quick Revision Notes",
            listFrom(
              rc.quick_revision_notes,
              fb.quick_revision_notes,
              fb.revision_checklist,
              fb.quick_review,
            ).length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.quick_revision_notes,
                  fb.quick_revision_notes,
                  fb.revision_checklist,
                  fb.quick_review,
                ).map((n, i) => (
                  <li key={`${item._id}-sg-rev-${i}`}>- {n}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No quick revision notes.")
            ),
          )}
          {section(
            "10. Practice Questions (Objective + Subjective)",
            practiceQuestions.length > 0 ? (
              <div className="space-y-3 text-xs sm:text-sm text-slate-800">
                {practiceQuestions.map((q, i) => (
                  <div key={`${item._id}-sg-pq-${i}`} className="rounded-lg border border-slate-100 p-2">
                    <p className="font-medium">
                      Q{i + 1}. [{q.type}] {q.question}
                    </p>
                    {q.options.length > 0 && (
                      <ul className="mt-1 space-y-0.5 pl-3">
                        {q.options.map((opt, oi) => (
                          <li key={`${item._id}-sg-pq-${i}-o-${oi}`}>
                            {String.fromCharCode(65 + oi)}) {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.answer ? (
                      <p className="mt-1 text-emerald-700">
                        <span className="font-medium">Answer:</span> {q.answer}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              emptyHint("No practice questions.")
            ),
          )}
          {section(
            "11. Tips for Further Improvement",
            listFrom(rc.improvement_tips, fb.improvement_tips, fb.study_tips, fb.tips).length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(rc.improvement_tips, fb.improvement_tips, fb.study_tips, fb.tips).map((t, i) => (
                  <li key={`${item._id}-sg-tip-${i}`}>- {t}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No improvement tips.")
            ),
          )}
        </div>
      );
    }

    if (item.toolType === "chapter-summary-creator" || kind === "chapterSummary") {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) {
            return v.flatMap((x) => {
              if (typeof x === "string") return [String(x).trim()].filter(Boolean);
              return [];
            });
          }
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };
      const csTitle =
        pickStr("chapter_summary_title", "chapter_title", "title", "name") || "Chapter Summary";
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const emptyHint = (text: string) => <p className="text-xs text-slate-500 italic">{text}</p>;
      const importantConcepts = (() => {
        const raw = rc.important_concepts ?? fb.important_concepts ?? fb.key_concepts ?? fb.concepts;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((c) => {
            if (c && typeof c === "object") {
              const row = c as Record<string, unknown>;
              return {
                name: String(row.name || row.concept || "").trim(),
                explanation: String(row.explanation || "").trim(),
              };
            }
            return { name: String(c ?? "").trim(), explanation: "" };
          })
          .filter((c) => c.name);
      })();
      const definitions = (() => {
        const raw = rc.definitions ?? fb.definitions;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((d) => {
            if (d && typeof d === "object") {
              const row = d as Record<string, unknown>;
              return {
                term: String(row.term || row.name || "").trim(),
                definition: String(row.definition || "").trim(),
              };
            }
            return { term: String(d ?? "").trim(), definition: "" };
          })
          .filter((d) => d.term);
      })();
      const formulae = (() => {
        const raw = rc.formulae ?? fb.formulae ?? fb.formulas;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((f) => {
            if (f && typeof f === "object") {
              const row = f as Record<string, unknown>;
              return {
                name: String(row.name || "").trim(),
                formula: String(row.formula || row.rule || "").trim(),
                note: String(row.note || "").trim(),
              };
            }
            return { name: "", formula: String(f ?? "").trim(), note: "" };
          })
          .filter((f) => f.formula || f.name);
      })();

      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<BookText className="h-3 w-3 sm:h-4 sm:w-4" />, csTitle)}
            <p className="text-xs text-slate-500 pl-9">Chapter Summary Creator — 11-section template</p>
          </div>
          {section(
            "1. Chapter Summary Title",
            <p className="text-xs sm:text-sm font-medium text-slate-900">{csTitle}</p>,
          )}
          {section(
            "2. Overview of the Chapter",
            pickStr("chapter_overview", "overview", "summary", "chapter_summary") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {pickStr("chapter_overview", "overview", "summary", "chapter_summary")}
              </p>
            ) : (
              emptyHint("No chapter overview.")
            ),
          )}
          {section(
            "3. Learning Objectives",
            listFrom(rc.learningObjectives, fb.learning_objectives, fb.objectives).length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(rc.learningObjectives, fb.learning_objectives, fb.objectives).map((o, i) => (
                  <li key={`${item._id}-cs-lo-${i}`}>- {o}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No learning objectives.")
            ),
          )}
          {section(
            "4. Important Concepts and Explanations",
            importantConcepts.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-2 text-slate-800">
                {importantConcepts.map((c, i) => (
                  <li key={`${item._id}-cs-c-${i}`}>
                    <span className="font-medium">{c.name}</span>
                    {c.explanation ? ` — ${c.explanation}` : null}
                  </li>
                ))}
              </ul>
            ) : (
              emptyHint("No important concepts.")
            ),
          )}
          {section(
            "5. Key Definitions and Terms",
            definitions.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {definitions.map((d, i) => (
                  <li key={`${item._id}-cs-def-${i}`}>
                    <span className="font-medium">{d.term}</span>
                    {d.definition ? ` — ${d.definition}` : null}
                  </li>
                ))}
              </ul>
            ) : (
              emptyHint("No definitions.")
            ),
          )}
          {section(
            "6. Formulae / Rules / Important Facts",
            formulae.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {formulae.map((f, i) => (
                  <li key={`${item._id}-cs-fm-${i}`}>
                    {f.name ? <span className="font-medium">{f.name}: </span> : null}
                    {f.formula}
                    {f.note ? <span className="text-slate-500"> ({f.note})</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              emptyHint("No formulae or rules.")
            ),
          )}
          {section(
            "7. Concept Connections",
            pickStr("concept_connections", "connections") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("concept_connections", "connections")}
              </p>
            ) : (
              emptyHint("No concept connections.")
            ),
          )}
          {section(
            "8. Real-life Applications",
            listFrom(rc.real_life_applications, fb.real_life_applications, fb.applications, fb.examples)
              .length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.real_life_applications,
                  fb.real_life_applications,
                  fb.applications,
                  fb.examples,
                ).map((a, i) => (
                  <li key={`${item._id}-cs-rl-${i}`}>- {a}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No real-life applications.")
            ),
          )}
          {section(
            "9. Important Exam Points",
            listFrom(
              rc.important_exam_points,
              fb.important_exam_points,
              fb.exam_points,
              fb.key_takeaways,
            ).length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.important_exam_points,
                  fb.important_exam_points,
                  fb.exam_points,
                  fb.key_takeaways,
                ).map((p, i) => (
                  <li key={`${item._id}-cs-exam-${i}`}>- {p}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No exam points.")
            ),
          )}
          {section(
            "10. Quick Revision Notes",
            listFrom(
              rc.quick_revision_notes,
              fb.quick_revision_notes,
              fb.review_points,
              fb.quick_review,
            ).length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.quick_revision_notes,
                  fb.quick_revision_notes,
                  fb.review_points,
                  fb.quick_review,
                ).map((n, i) => (
                  <li key={`${item._id}-cs-rev-${i}`}>- {n}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No quick revision notes.")
            ),
          )}
          {section(
            "11. Practice Recall Questions",
            listFrom(
              rc.practice_recall_questions,
              fb.practice_recall_questions,
              fb.recall_questions,
            ).length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.practice_recall_questions,
                  fb.practice_recall_questions,
                  fb.recall_questions,
                ).map((q, i) => (
                  <li key={`${item._id}-cs-recall-${i}`}>- {q}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No practice recall questions.")
            ),
          )}
        </div>
      );
    }

    if (item.toolType === "key-points-formula-extractor" || kind === "keyPoints") {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) {
            return v.flatMap((x) => {
              if (typeof x === "string") return [String(x).trim()].filter(Boolean);
              return [];
            });
          }
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };
      const kpTitle = pickStr("topic_title", "title", "name") || "Key Points";
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const emptyHint = (text: string) => <p className="text-xs text-slate-500 italic">{text}</p>;
      const importantConcepts = (() => {
        const raw = rc.important_concepts ?? fb.important_concepts ?? fb.key_concepts ?? fb.concepts;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((c) => {
            if (c && typeof c === "object") {
              const row = c as Record<string, unknown>;
              return {
                name: String(row.name || row.concept || row.point || "").trim(),
                explanation: String(row.explanation || row.detail || "").trim(),
              };
            }
            return { name: String(c ?? "").trim(), explanation: "" };
          })
          .filter((c) => c.name);
      })();
      const definitions = (() => {
        const raw = rc.essential_definitions ?? fb.essential_definitions ?? fb.definitions;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((d) => {
            if (d && typeof d === "object") {
              const row = d as Record<string, unknown>;
              return {
                term: String(row.term || row.name || "").trim(),
                definition: String(row.definition || "").trim(),
              };
            }
            return { term: String(d ?? "").trim(), definition: "" };
          })
          .filter((d) => d.term);
      })();
      const formulae = (() => {
        const raw = rc.formulae ?? fb.formulae ?? fb.formulas;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((f) => {
            if (f && typeof f === "object") {
              const row = f as Record<string, unknown>;
              return {
                name: String(row.name || "").trim(),
                formula: String(row.formula || row.rule || "").trim(),
                note: String(row.note || row.when_to_use || "").trim(),
              };
            }
            return { name: "", formula: String(f ?? "").trim(), note: "" };
          })
          .filter((f) => f.formula || f.name);
      })();
      const keywords = (() => {
        const raw = rc.keywords_terminologies ?? fb.keywords_terminologies ?? fb.keywords;
        if (!Array.isArray(raw)) return [];
        return raw
          .map((k) => {
            if (k && typeof k === "object") {
              const row = k as Record<string, unknown>;
              return {
                term: String(row.term || row.keyword || row.name || "").trim(),
                meaning: String(row.meaning || row.definition || "").trim(),
              };
            }
            return { term: String(k ?? "").trim(), meaning: "" };
          })
          .filter((k) => k.term);
      })();

      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<Key className="h-3 w-3 sm:h-4 sm:w-4" />, kpTitle)}
            <p className="text-xs text-slate-500 pl-9">Key Points Extractor — 10-section template</p>
          </div>
          {section(
            "1. Topic Title",
            <p className="text-xs sm:text-sm font-medium text-slate-900">{kpTitle}</p>,
          )}
          {section(
            "2. Most Important Concepts",
            importantConcepts.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-2 text-slate-800">
                {importantConcepts.map((c, i) => (
                  <li key={`${item._id}-kp-c-${i}`}>
                    <span className="font-medium">{c.name}</span>
                    {c.explanation ? ` — ${c.explanation}` : null}
                  </li>
                ))}
              </ul>
            ) : (
              emptyHint("No important concepts.")
            ),
          )}
          {section(
            "3. Essential Definitions",
            definitions.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {definitions.map((d, i) => (
                  <li key={`${item._id}-kp-def-${i}`}>
                    <span className="font-medium">{d.term}</span>
                    {d.definition ? ` — ${d.definition}` : null}
                  </li>
                ))}
              </ul>
            ) : (
              emptyHint("No essential definitions.")
            ),
          )}
          {section(
            "4. Important Formulae / Rules",
            formulae.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {formulae.map((f, i) => (
                  <li key={`${item._id}-kp-fm-${i}`}>
                    {f.name ? <span className="font-medium">{f.name}: </span> : null}
                    {f.formula}
                    {f.note ? <span className="text-slate-500"> ({f.note})</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              emptyHint("No formulae or rules.")
            ),
          )}
          {section(
            "5. Keywords and Terminologies",
            keywords.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {keywords.map((k, i) => (
                  <li key={`${item._id}-kp-kw-${i}`}>
                    <span className="font-medium">{k.term}</span>
                    {k.meaning ? ` — ${k.meaning}` : null}
                  </li>
                ))}
              </ul>
            ) : (
              emptyHint("No keywords or terminologies.")
            ),
          )}
          {section(
            "6. Must-remember Facts",
            listFrom(rc.must_remember_facts, fb.must_remember_facts, fb.key_points, fb.key_points_to_remember)
              .length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.must_remember_facts,
                  fb.must_remember_facts,
                  fb.key_points,
                  fb.key_points_to_remember,
                ).map((p, i) => (
                  <li key={`${item._id}-kp-fact-${i}`}>- {p}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No must-remember facts.")
            ),
          )}
          {section(
            "7. Real-life Connections",
            listFrom(rc.real_life_connections, fb.real_life_connections, fb.real_life_applications).length >
            0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(rc.real_life_connections, fb.real_life_connections, fb.real_life_applications).map(
                  (a, i) => (
                    <li key={`${item._id}-kp-rl-${i}`}>- {a}</li>
                  ),
                )}
              </ul>
            ) : (
              emptyHint("No real-life connections.")
            ),
          )}
          {section(
            "8. Frequently Asked Exam Points",
            listFrom(
              rc.frequently_asked_exam_points,
              fb.frequently_asked_exam_points,
              fb.exam_points,
            ).length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(rc.frequently_asked_exam_points, fb.frequently_asked_exam_points, fb.exam_points).map(
                  (p, i) => (
                    <li key={`${item._id}-kp-exam-${i}`}>- {p}</li>
                  ),
                )}
              </ul>
            ) : (
              emptyHint("No frequently asked exam points.")
            ),
          )}
          {section(
            "9. Mnemonics / Memory Tricks",
            listFrom(rc.mnemonics_memory_tricks, fb.mnemonics_memory_tricks, fb.mnemonics, fb.memory_tricks)
              .length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.mnemonics_memory_tricks,
                  fb.mnemonics_memory_tricks,
                  fb.mnemonics,
                  fb.memory_tricks,
                ).map((m, i) => (
                  <li key={`${item._id}-kp-mn-${i}`}>- {m}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No mnemonics or memory tricks.")
            ),
          )}
          {section(
            "10. One-minute Revision Summary",
            pickStr("one_minute_revision_summary", "revision_summary", "summary", "short_note_summary") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {pickStr("one_minute_revision_summary", "revision_summary", "summary", "short_note_summary")}
              </p>
            ) : (
              emptyHint("No one-minute revision summary.")
            ),
          )}
        </div>
      );
    }

    if (item.toolType === "quick-assignment-builder" || kind === "quickAssignment") {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) {
            return v.flatMap((x) => {
              if (typeof x === "string") return [String(x).trim()].filter(Boolean);
              return [];
            });
          }
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };
      const qaTitle = pickStr("assignment_title", "title", "name") || "Assignment";
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const emptyHint = (text: string) => <p className="text-xs text-slate-500 italic">{text}</p>;
      const conceptQuestions = toQuestionArray(
        rc.concept_based_questions ||
          fb.concept_based_questions ||
          rc.questions ||
          fb.questions ||
          fb.practice_questions ||
          [],
      );
      const applicationTasks = listFrom(
        rc.application_oriented_tasks,
        fb.application_oriented_tasks,
        fb.application_tasks,
      );

      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />, qaTitle)}
            <p className="text-xs text-slate-500 pl-9">Quick Assignment Builder — 11-section template</p>
          </div>
          {section(
            "1. Assignment Title",
            <p className="text-xs sm:text-sm font-medium text-slate-900">{qaTitle}</p>,
          )}
          {section(
            "2. Learning Objectives",
            listFrom(rc.learning_objectives, rc.learningObjectives, fb.learning_objectives, fb.objectives)
              .length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.learning_objectives,
                  rc.learningObjectives,
                  fb.learning_objectives,
                  fb.objectives,
                ).map((o, i) => (
                  <li key={`${item._id}-qa-lo-${i}`}>- {o}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No learning objectives.")
            ),
          )}
          {section(
            "3. Instructions to Students",
            pickStr("instructions", "instructions_to_students", "student_instructions") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("instructions", "instructions_to_students", "student_instructions")}
              </p>
            ) : (
              emptyHint("No instructions.")
            ),
          )}
          {section(
            "4. Concept-based Questions",
            conceptQuestions.length > 0 ? (
              <div className="space-y-3">
                {conceptQuestions.map((q, i) => {
                  const qx = q as { question_number?: number; marks?: number };
                  return (
                    <div key={`${item._id}-qa-q-${i}`} className="rounded-lg border border-slate-100 p-3 space-y-2">
                      <p className="text-xs sm:text-sm font-medium">
                        Q{qx.question_number != null ? String(qx.question_number) : i + 1}. {q.question}
                      </p>
                      {q.options.length > 0 && (
                        <ul className="text-xs sm:text-sm space-y-1 text-slate-700">
                          {q.options.map((opt: string, idx: number) => (
                            <li key={`${item._id}-qa-q-${i}-o-${idx}`}>- {opt}</li>
                          ))}
                        </ul>
                      )}
                      {q.answer ? (
                        <p className="text-xs text-emerald-700">
                          <span className="font-medium">Answer:</span> {q.answer}
                        </p>
                      ) : null}
                      {qx.marks != null && !Number.isNaN(Number(qx.marks)) ? (
                        <p className="text-xs text-slate-500">Marks: {String(qx.marks)}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              emptyHint("No concept-based questions.")
            ),
          )}
          {section(
            "5. Application-oriented Tasks",
            applicationTasks.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {applicationTasks.map((t, i) => (
                  <li key={`${item._id}-qa-app-${i}`}>- {t}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No application-oriented tasks.")
            ),
          )}
          {section(
            "6. Real-life / Competency-based Activity",
            pickStr(
              "real_life_competency_activity",
              "realLifeCompetencyActivity",
              "real_life_activity",
              "real_life_observation_task",
            ) ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr(
                  "real_life_competency_activity",
                  "realLifeCompetencyActivity",
                  "real_life_activity",
                  "real_life_observation_task",
                )}
              </p>
            ) : (
              emptyHint("No real-life / competency-based activity.")
            ),
          )}
          {section(
            "7. Creative Thinking Question",
            pickStr("creative_thinking_question", "creativeThinkingQuestion", "creative_question") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("creative_thinking_question", "creativeThinkingQuestion", "creative_question")}
              </p>
            ) : (
              emptyHint("No creative thinking question.")
            ),
          )}
          {section(
            "8. Collaborative / Discussion Task (if suitable)",
            pickStr(
              "collaborative_discussion_task",
              "collaborativeDiscussionTask",
              "discussion_task",
              "collaborative_task",
            ) ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr(
                  "collaborative_discussion_task",
                  "collaborativeDiscussionTask",
                  "discussion_task",
                  "collaborative_task",
                )}
              </p>
            ) : (
              emptyHint("No collaborative / discussion task.")
            ),
          )}
          {section(
            "9. Challenge Question for Advanced Learners",
            pickStr("challenge_question_advanced", "challengeQuestionAdvanced", "challenge_question") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("challenge_question_advanced", "challengeQuestionAdvanced", "challenge_question")}
              </p>
            ) : (
              emptyHint("No challenge question.")
            ),
          )}
          {section(
            "11. Assessment Criteria / Rubric",
            pickStr(
              "assessment_criteria_rubric",
              "assessmentCriteriaRubric",
              "marking_criteria",
              "marking_scheme",
            ) ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr(
                  "assessment_criteria_rubric",
                  "assessmentCriteriaRubric",
                  "marking_criteria",
                  "marking_scheme",
                )}
              </p>
            ) : (
              emptyHint("No assessment criteria / rubric.")
            ),
          )}
          {section(
            "13. Expected Learning Outcomes",
            listFrom(rc.expected_learning_outcomes, rc.expectedLearningOutcomes, fb.expected_learning_outcomes)
              .length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {listFrom(
                  rc.expected_learning_outcomes,
                  rc.expectedLearningOutcomes,
                  fb.expected_learning_outcomes,
                  fb.learning_outcomes,
                ).map((o, i) => (
                  <li key={`${item._id}-qa-out-${i}`}>- {o}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No expected learning outcomes.")
            ),
          )}
        </div>
      );
    }

    if (item.toolType === "short-notes-summaries-maker" || kind === "shortNotes") {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) {
            return v.flatMap((x) => {
              if (typeof x === "string") return [String(x).trim()].filter(Boolean);
              return [];
            });
          }
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };
      const noteTitle = pickStr("title", "concept_name") || "Notes";
      const objectives = listFrom(rc.learningObjectives, fb.learning_objectives, fb.objectives);
      const keyPoints = listFrom(
        rc.keyPointsToRemember,
        fb.key_points_to_remember,
        fb.key_points,
        fb.keyPoints,
      );
      const quickChecks = listFrom(rc.quickCheckQuestions, fb.quick_check_questions);
      const metaClass = pickStr("classLabel", "class_label") || String(item.classLabel || "").trim();
      const metaSubject = pickStr("subject") || String(item.subject || "").trim();
      const metaSubtopic = pickStr("subtopic") || String(item.subTopic || "").trim();
      const metaBloom = pickStr("bloomLevel", "bloom_level");
      const metaSkill = pickStr("skillFocus", "skill_focus", "skill");
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const emptyHint = (text: string) => <p className="text-xs text-slate-500 italic">{text}</p>;
      const alignment =
        pickStr("alignmentBlock", "alignment_block") ||
        [
          pickStr("nepNcfFocus", "nep_ncf_focus") ? `NEP/NCF Focus: ${pickStr("nepNcfFocus", "nep_ncf_focus")}` : "",
          pickStr("udlSupport", "udl_support", "udl") ? `UDL: ${pickStr("udlSupport", "udl_support", "udl")}` : "",
        ]
          .filter(Boolean)
          .join(" ");

      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<Lightbulb className="h-3 w-3 sm:h-4 sm:w-4" />, noteTitle)}
            <p className="text-xs text-slate-500 pl-9">Short Notes &amp; Summaries — 10-section template</p>
          </div>
          {(metaClass || metaSubject || metaSubtopic || metaBloom || metaSkill) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {metaClass ? (
                <span className="rounded-full border bg-slate-50 px-2 py-1 text-slate-600">Class: {metaClass}</span>
              ) : null}
              {metaSubject ? (
                <span className="rounded-full border bg-slate-50 px-2 py-1 text-slate-600">Subject: {metaSubject}</span>
              ) : null}
              {metaSubtopic ? (
                <span className="rounded-full border bg-slate-50 px-2 py-1 text-slate-600">Subtopic: {metaSubtopic}</span>
              ) : null}
              {metaBloom ? (
                <span className="rounded-full border bg-slate-50 px-2 py-1 text-slate-600">Bloom: {metaBloom}</span>
              ) : null}
              {metaSkill ? (
                <span className="rounded-full border bg-slate-50 px-2 py-1 text-slate-600">Skill: {metaSkill}</span>
              ) : null}
            </div>
          )}
          {section(
            "1. Alignment Block",
            alignment ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{alignment}</p>
            ) : (
              emptyHint("Re-upload with Short Notes & Summaries to extract alignment.")
            ),
          )}
          {section(
            "2. Learning Objectives",
            objectives.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {objectives.map((o, i) => (
                  <li key={`${item._id}-sns-lo-${i}`}>- {o}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No learning objectives extracted.")
            ),
          )}
          {section(
            "3. Short Note / Summary",
            pickStr("shortNoteSummary", "short_note_summary", "summary") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {pickStr("shortNoteSummary", "short_note_summary", "summary")}
              </p>
            ) : (
              emptyHint("Short note summary missing — re-upload the PDF.")
            ),
          )}
          {section(
            "4. Key Points to Remember",
            keyPoints.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {keyPoints.map((p, i) => (
                  <li key={`${item._id}-sns-kp-${i}`}>- {p}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No key points extracted.")
            ),
          )}
          {section(
            "5. Example",
            pickStr("example") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{pickStr("example")}</p>
            ) : (
              emptyHint("No example extracted.")
            ),
          )}
          {section(
            "6. Common Misconception and Correction",
            pickStr("commonMisconceptionCorrection", "common_misconception_correction") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("commonMisconceptionCorrection", "common_misconception_correction")}
              </p>
            ) : (
              emptyHint("No misconception / correction extracted.")
            ),
          )}
          {section(
            "7. Quick Check Questions",
            quickChecks.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1 text-slate-800">
                {quickChecks.map((q, i) => (
                  <li key={`${item._id}-sns-qc-${i}`}>- {q}</li>
                ))}
              </ul>
            ) : (
              emptyHint("No quick check questions extracted.")
            ),
          )}
          {section(
            "8. Differentiation",
            pickStr("differentiationSupport", "differentiation_support") ||
              pickStr("differentiationExtension", "differentiation_extension") ? (
              <div className="space-y-2 text-xs sm:text-sm text-slate-800">
                {pickStr("differentiationSupport", "differentiation_support") ? (
                  <p>
                    <span className="font-medium">Support:</span>{" "}
                    {pickStr("differentiationSupport", "differentiation_support")}
                  </p>
                ) : null}
                {pickStr("differentiationExtension", "differentiation_extension") ? (
                  <p>
                    <span className="font-medium">Extension:</span>{" "}
                    {pickStr("differentiationExtension", "differentiation_extension")}
                  </p>
                ) : null}
              </div>
            ) : (
              emptyHint("No differentiation extracted.")
            ),
          )}
          {section(
            "9. Real-life Application",
            pickStr("realLifeApplication", "real_life_application", "real_life_link") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("realLifeApplication", "real_life_application", "real_life_link")}
              </p>
            ) : (
              emptyHint("No real-life application extracted.")
            ),
          )}
          {section(
            "10. Reflection / Exit Ticket",
            pickStr("reflectionExitTicket", "reflection_exit_ticket", "reflection_prompt") ? (
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {pickStr("reflectionExitTicket", "reflection_exit_ticket", "reflection_prompt")}
              </p>
            ) : (
              emptyHint("No reflection / exit ticket extracted.")
            ),
          )}
        </div>
      );
    }

    const isDailyPlanRecord =
      kind === "dailyPlan" ||
      item.toolType === "daily-class-plan-maker";

    if (isDailyPlanRecord) {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) {
            return v.flatMap((x) => {
              if (typeof x === "string") return [String(x).trim()].filter(Boolean);
              if (x && typeof x === "object") {
                const o = x as Record<string, unknown>;
                const s = String(o.text || o.step || o.objective || o.method || o.activity || "").trim();
                return s ? [s] : [];
              }
              return [];
            });
          }
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const objectives = listFrom(rc.objectives, fb.objectives, fb.period_objectives, fb.learning_objectives);
      const teachingMethods = listFrom(rc.teachingMethods, fb.teaching_methods, fb.methodology);
      const classroomActivity = listFrom(
        rc.classroomActivity,
        fb.classroom_activity,
        fb.classroom_activities,
        fb.activities,
      );
      const teachingAids = listFrom(rc.teachingAids, fb.teaching_aids, fb.materials_required, fb.materials);
      const timeSlotsRaw = (rc.timeSlots ?? fb.time_slots) as
        | { time?: string; activity?: string; type?: string }[]
        | undefined;
      const timeSlots = Array.isArray(timeSlotsRaw)
        ? timeSlotsRaw.filter((ts) => String(ts?.activity || ts?.time || "").trim())
        : [];
      let timeline = listFrom(rc.timeline, fb.timeline, fb.schedule);
      if (!timeSlots.length && timeline.length) {
        timeline.forEach((line) => {
          const m = String(line).match(/^([^:–-]+)[:–-]\s*(.+)$/);
          if (m) timeSlots.push({ time: m[1].trim(), activity: m[2].trim(), type: "" });
          else timeSlots.push({ time: "", activity: line, type: "" });
        });
      }
      const displayTitle = activityTitleForDisplay(
        pickStr("title", "dayPeriodTopicBreakup", "day_period_topic_breakup", "name") || "Daily class plan",
        item,
      );
      const fallbackBody = String(item.generatedContent || "").trim();
      const hasStructured = Boolean(
        pickStr("dayPeriodTopicBreakup", "day_period_topic_breakup") ||
          objectives.length ||
          teachingMethods.length ||
          classroomActivity.length ||
          pickStr("exitTicket", "exit_ticket", "formative_check") ||
          pickStr("differentiatedSupport", "differentiated_support", "differentiation") ||
          pickStr("homeworkFollowup", "homework_followup", "homework") ||
          teachingAids.length ||
          pickStr("teacherReflectionNotes", "teacher_reflection_notes", "reflection") ||
          timeSlots.length ||
          timeline.length,
      );

      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />, displayTitle)}
            <p className="text-xs text-slate-500 pl-9">Daily class plan — 9-section template</p>
          </div>
          {pickStr("dayPeriodTopicBreakup", "day_period_topic_breakup", "topic_breakup")
            ? section(
                "1. Day / Period-wise Topic Break-up",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("dayPeriodTopicBreakup", "day_period_topic_breakup", "topic_breakup")}
                </p>,
              )
            : null}
          {section(
            "2. Learning Objectives (per period)",
            objectives.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1">
                {objectives.map((line, i) => (
                  <li key={`${item._id}-dp-lo-${i}`}>- {line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">None listed.</p>
            ),
          )}
          {section(
            "3. Teaching Methods",
            teachingMethods.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1">
                {teachingMethods.map((line, i) => (
                  <li key={`${item._id}-dp-tm-${i}`}>- {line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">None listed.</p>
            ),
          )}
          {section(
            "4. Classroom Activity / Demonstration",
            classroomActivity.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1">
                {classroomActivity.map((line, i) => (
                  <li key={`${item._id}-dp-ca-${i}`}>- {line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">None listed.</p>
            ),
          )}
          {pickStr("exitTicket", "exit_ticket", "formative_check", "quick_assessment")
            ? section(
                "5. Quick Assessment / Exit Ticket",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("exitTicket", "exit_ticket", "formative_check", "quick_assessment")}
                </p>,
              )
            : null}
          {pickStr("differentiatedSupport", "differentiated_support", "differentiation", "udl_support")
            ? section(
                "6. Differentiated Support",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("differentiatedSupport", "differentiated_support", "differentiation", "udl_support")}
                </p>,
              )
            : null}
          {pickStr("homeworkFollowup", "homework_followup", "homework", "follow_up")
            ? section(
                "7. Homework / Follow-up",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("homeworkFollowup", "homework_followup", "homework", "follow_up")}
                </p>,
              )
            : null}
          {teachingAids.length > 0
            ? section(
                "8. Required Teaching Aids",
                <ul className="text-xs sm:text-sm space-y-1">
                  {teachingAids.map((m, i) => (
                    <li key={`${item._id}-dp-aid-${i}`}>- {m}</li>
                  ))}
                </ul>,
              )
            : null}
          {pickStr("teacherReflectionNotes", "teacher_reflection_notes", "reflection", "teacher_notes")
            ? section(
                "9. Teacher Reflection Notes",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("teacherReflectionNotes", "teacher_reflection_notes", "reflection", "teacher_notes")}
                </p>,
              )
            : null}
          {timeSlots.length > 0
            ? section(
                "Period schedule",
                <ul className="text-xs sm:text-sm space-y-2">
                  {timeSlots.map((ts, i) => {
                    const time = String(ts?.time || "").trim();
                    const activity = String(ts?.activity || "").trim();
                    const type = String(ts?.type || "").trim();
                    const label = [time, activity].filter(Boolean).join(": ") || activity || time;
                    return (
                      <li key={`${item._id}-dp-ts-${i}`} className="text-slate-800">
                        - {label}
                        {type ? <span className="text-slate-500"> ({type})</span> : null}
                      </li>
                    );
                  })}
                </ul>,
              )
            : timeline.length > 0
              ? section(
                  "Period schedule",
                  <ul className="text-xs sm:text-sm space-y-1">
                    {timeline.map((t, i) => (
                      <li key={`${item._id}-dp-tl-${i}`}>- {t}</li>
                    ))}
                  </ul>,
                )
              : null}
          {!hasStructured && fallbackBody ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
              <p className="text-xs font-semibold text-amber-900 mb-2">Extracted content (sections not mapped)</p>
              <pre className="max-h-72 overflow-y-auto text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {fallbackBody.slice(0, 120000)}
              </pre>
            </div>
          ) : null}
        </div>
      );
    }

    const isLessonPlannerRecord = kind === "lessonPlan" || item.toolType === "lesson-planner";

    if (isLessonPlannerRecord) {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;

      const listFrom = (primary: unknown, ...alts: unknown[]): string[] => {
        const pull = (v: unknown): string[] => {
          if (v == null) return [];
          if (Array.isArray(v)) {
            return v.flatMap((x) => {
              if (typeof x === "string") return [String(x).trim()].filter(Boolean);
              if (x && typeof x === "object") {
                const o = x as Record<string, unknown>;
                const s = String(
                  o.text || o.step || o.objective || o.outcome || o.description || o.activity || o.content || "",
                ).trim();
                return s ? [s] : [];
              }
              return [];
            });
          }
          if (typeof v === "string" && v.trim()) {
            return v
              .split(/\n+/)
              .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
              .filter(Boolean);
          }
          return [];
        };
        const a = pull(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = pull(x);
          if (b.length) return b;
        }
        return [];
      };

      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };

      const objectives = listFrom(
        rc.objectives,
        fb.objectives,
        fb.learning_objectives,
        fb.learningObjectives,
        fb.goals,
      );
      const ncfRaw = rc.ncfAlignment ?? fb.ncf_competency_alignment ?? fb.competencies;
      const ncfText = Array.isArray(ncfRaw)
        ? ncfRaw.map((x) => String(x ?? "").trim()).filter(Boolean).join("; ")
        : String(ncfRaw || "").trim();
      const activities = listFrom(
        rc.activities,
        fb.activities,
        fb.teaching_activities,
        fb.teaching_learning_process,
        fb.step_by_step_procedure,
        fb.steps,
      );
      const teacherTalk = listFrom(rc.teacherTalkPoints, fb.teacher_talk_points, fb.teacher_instructions);
      const studentTasks = listFrom(rc.studentTasks, fb.student_tasks, fb.student_instructions);
      const formativeQs = listFrom(
        rc.formativeAssessmentQuestions,
        fb.formative_assessment_questions,
        fb.formative_questions,
      );
      const materials = listFrom(rc.materials, fb.materials_required, fb.materials);
      const teachingAids = listFrom(rc.teachingAids, fb.teaching_aids_required, fb.teaching_aids);
      let timeline = listFrom(rc.timeline, fb.timeline, fb.schedule, fb.duration_plan);
      if (!timeline.length && Array.isArray(fb.time_slots)) {
        timeline = (fb.time_slots as { time?: string; activity?: string }[])
          .map((ts) => {
            const t = String(ts?.time || "").trim();
            const a = String(ts?.activity || "").trim();
            if (t && a) return `${t}: ${a}`;
            return a || t;
          })
          .filter(Boolean);
      }
      const assessment = pickStr("assessment", "evaluation", "summative_assessment");
      const displayLessonTitle = activityTitleForDisplay(
        pickStr("title", "lesson_name", "name") || "Lesson plan",
        item,
      );

      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );

      const fallbackBody = String(item.generatedContent || "").trim();
      const hasStructured = Boolean(
        objectives.length ||
          ncfText ||
          pickStr("priorKnowledgeDiagnostic", "prior_knowledge_diagnostic") ||
          pickStr("introductionWarmup", "introduction_warmup", "warmup") ||
          pickStr("teachingStrategy", "teaching_strategy") ||
          activities.length ||
          teacherTalk.length ||
          studentTasks.length ||
          formativeQs.length ||
          pickStr("differentiationPlan", "differentiation_plan", "differentiation") ||
          pickStr("homeworkPractice", "homework_practice", "homework") ||
          materials.length ||
          teachingAids.length ||
          pickStr("closureExitTicket", "closure_exit_ticket") ||
          timeline.length ||
          assessment,
      );

      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />, displayLessonTitle)}
            <p className="text-xs text-slate-500 pl-9">Lesson planner — 14-section template</p>
          </div>
          {section(
            "2. Learning Objectives",
            objectives.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1">
                {objectives.map((line, i) => (
                  <li key={`${item._id}-lp-lo-${i}`}>- {line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">None listed.</p>
            ),
          )}
          {ncfText
            ? section("3. NCF Competency / Learning Outcome Alignment", (
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{ncfText}</p>
              ))
            : null}
          {pickStr("priorKnowledgeDiagnostic", "prior_knowledge_diagnostic", "diagnostic_question")
            ? section(
                "4. Prior Knowledge / Diagnostic Question",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("priorKnowledgeDiagnostic", "prior_knowledge_diagnostic", "diagnostic_question")}
                </p>,
              )
            : null}
          {pickStr("introductionWarmup", "introduction_warmup", "warmup")
            ? section(
                "5. Introduction / Warm-up",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("introductionWarmup", "introduction_warmup", "warmup")}
                </p>,
              )
            : null}
          {pickStr("teachingStrategy", "teaching_strategy", "pedagogy")
            ? section(
                "6. Teaching Strategy",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("teachingStrategy", "teaching_strategy", "pedagogy")}
                </p>,
              )
            : null}
          {section(
            "7. Classroom Activities",
            activities.length > 0 ? (
              <ol className="text-xs sm:text-sm space-y-1 list-decimal list-inside">
                {activities.map((s, i) => (
                  <li key={`${item._id}-lp-a-${i}`}>{s}</li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-slate-500 italic">None listed.</p>
            ),
          )}
          {teacherTalk.length > 0
            ? section(
                "8. Teacher Talk Points",
                <ul className="text-xs sm:text-sm space-y-1">
                  {teacherTalk.map((t, i) => (
                    <li key={`${item._id}-lp-tt-${i}`}>- {t}</li>
                  ))}
                </ul>,
              )
            : null}
          {studentTasks.length > 0
            ? section(
                "9. Student Tasks",
                <ul className="text-xs sm:text-sm space-y-1">
                  {studentTasks.map((t, i) => (
                    <li key={`${item._id}-lp-st-${i}`}>- {t}</li>
                  ))}
                </ul>,
              )
            : null}
          {formativeQs.length > 0
            ? section(
                "10. Formative Assessment Questions",
                <ul className="text-xs sm:text-sm space-y-1">
                  {formativeQs.map((t, i) => (
                    <li key={`${item._id}-lp-fq-${i}`}>- {t}</li>
                  ))}
                </ul>,
              )
            : null}
          {pickStr("differentiationPlan", "differentiation_plan", "differentiation")
            ? section(
                "11. Differentiation Plan",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("differentiationPlan", "differentiation_plan", "differentiation")}
                </p>,
              )
            : null}
          {pickStr("homeworkPractice", "homework_practice", "homework")
            ? section(
                "12. Homework / Practice",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("homeworkPractice", "homework_practice", "homework")}
                </p>,
              )
            : null}
          {materials.length > 0 || teachingAids.length > 0
            ? section(
                "13. Teaching Aids Required",
                <ul className="text-xs sm:text-sm space-y-1">
                  {(teachingAids.length ? teachingAids : materials).map((m, i) => (
                    <li key={`${item._id}-lp-aid-${i}`}>- {m}</li>
                  ))}
                </ul>,
              )
            : null}
          {pickStr("closureExitTicket", "closure_exit_ticket", "exit_ticket") || timeline.length > 0
            ? section(
                "14. Closure / Exit Ticket",
                <div className="space-y-2 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("closureExitTicket", "closure_exit_ticket", "exit_ticket") ? (
                    <p>{pickStr("closureExitTicket", "closure_exit_ticket", "exit_ticket")}</p>
                  ) : null}
                  {timeline.length > 0 ? (
                    <ul className="space-y-1">
                      {timeline.map((t, i) => (
                        <li key={`${item._id}-lp-t-${i}`}>- {t}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>,
              )
            : null}
          {assessment
            ? section(
                "Assessment (general)",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{assessment}</p>,
              )
            : null}
          {!hasStructured && fallbackBody ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
              <p className="text-xs font-semibold text-amber-900 mb-2">Extracted content (sections not mapped)</p>
              <pre className="max-h-72 overflow-y-auto text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {fallbackBody.slice(0, 120000)}
              </pre>
            </div>
          ) : null}
        </div>
      );
    }

    if (
      item.toolType === "rubrics-evaluation-generator" ||
      kind === "rubric" ||
      Array.isArray((content as Record<string, unknown>).criteriaRows) ||
      (Array.isArray(fallback.criteria) && item.toolType === "rubrics-evaluation-generator")
    ) {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      const rawCriteria = (rc.criteriaRows ?? fb.criteria ?? rc.criteria ?? []) as unknown[];
      const criteriaRows: {
        name: string;
        excellent: string;
        good: string;
        satisfactory: string;
        needs_improvement: string;
      }[] = [];
      for (const entry of rawCriteria) {
        if (typeof entry === "string" && entry.trim()) {
          criteriaRows.push({
            name: entry.trim(),
            excellent: "",
            good: "",
            satisfactory: "",
            needs_improvement: "",
          });
          continue;
        }
        if (entry && typeof entry === "object") {
          const o = entry as Record<string, unknown>;
          criteriaRows.push({
            name: String(o.name || o.criterion || "").trim() || "Criterion",
            excellent: String(o.excellent || "").trim(),
            good: String(o.good || "").trim(),
            satisfactory: String(o.satisfactory || "").trim(),
            needs_improvement: String(o.needs_improvement || o.needsImprovement || "").trim(),
          });
        }
      }
      const rubricTitle = pickStr("title", "rubric_title", "name") || "Rubric & Evaluation";
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      const fallbackBody = String(item.generatedContent || "").trim();
      const hasStructured = Boolean(
        pickStr("assessmentPurpose", "assessment_purpose") ||
          pickStr("competencyAssessed", "competency_assessed") ||
          criteriaRows.length ||
          pickStr("gradingCriteria", "grading_criteria") ||
          pickStr("strengthsObserved", "strengths_observed") ||
          pickStr("areasForImprovement", "areas_for_improvement") ||
          pickStr("teacherRemarks", "teacher_remarks") ||
          pickStr("actionableSuggestions", "actionable_suggestions") ||
          pickStr("parentFriendlyFeedback", "parent_friendly_feedback") ||
          pickStr("nextStepRemedialEnrichment", "next_step_remedial_enrichment"),
      );

      return (
        <div className="space-y-3">
          {renderSectionHeader(<BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />, rubricTitle)}
          {pickStr("assessmentPurpose", "assessment_purpose")
            ? section(
                "1. Assessment Purpose",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("assessmentPurpose", "assessment_purpose")}
                </p>,
              )
            : null}
          {pickStr("competencyAssessed", "competency_assessed")
            ? section(
                "2. Competency / Learning Outcome Assessed",
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("competencyAssessed", "competency_assessed")}
                </p>,
              )
            : null}
          {criteriaRows.length > 0
            ? section(
                "3. Evaluation Rubric with 4 Performance Levels",
                <div className="space-y-4 text-xs sm:text-sm text-slate-800">
                  {criteriaRows.map((row, i) => {
                    const levels = [
                      { label: "Excellent", value: row.excellent },
                      { label: "Good", value: row.good },
                      { label: "Satisfactory", value: row.satisfactory },
                      { label: "Needs Improvement", value: row.needs_improvement },
                    ].filter((l) => String(l.value || "").trim());
                    return (
                      <div
                        key={`${item._id}-rub-row-${i}`}
                        className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1.5"
                      >
                        <p className="font-semibold text-slate-900">{row.name}</p>
                        {levels.length > 0 ? (
                          <ul className="space-y-1 pl-1">
                            {levels.map((l) => (
                              <li key={`${item._id}-rub-${i}-${l.label}`}>
                                <span className="font-medium text-slate-600">{l.label}:</span> {l.value}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No performance levels listed.</p>
                        )}
                      </div>
                    );
                  })}
                </div>,
              )
            : null}
          {pickStr("gradingCriteria", "grading_criteria")
            ? section("4. Grading Criteria", (
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("gradingCriteria", "grading_criteria")}
                </p>
              ))
            : null}
          {pickStr("strengthsObserved", "strengths_observed")
            ? section("5. Strengths Observed", (
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("strengthsObserved", "strengths_observed")}
                </p>
              ))
            : null}
          {pickStr("areasForImprovement", "areas_for_improvement")
            ? section("6. Areas for Improvement", (
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("areasForImprovement", "areas_for_improvement")}
                </p>
              ))
            : null}
          {pickStr("teacherRemarks", "teacher_remarks")
            ? section("7. Teacher Remarks", (
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("teacherRemarks", "teacher_remarks")}
                </p>
              ))
            : null}
          {pickStr("actionableSuggestions", "actionable_suggestions")
            ? section("8. Actionable Improvement Suggestions", (
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("actionableSuggestions", "actionable_suggestions")}
                </p>
              ))
            : null}
          {pickStr("parentFriendlyFeedback", "parent_friendly_feedback")
            ? section("9. Parent-friendly Feedback", (
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("parentFriendlyFeedback", "parent_friendly_feedback")}
                </p>
              ))
            : null}
          {pickStr("nextStepRemedialEnrichment", "next_step_remedial_enrichment")
            ? section("10. Next-step Remedial / Enrichment Activity", (
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                  {pickStr("nextStepRemedialEnrichment", "next_step_remedial_enrichment")}
                </p>
              ))
            : null}
          {!hasStructured && fallbackBody ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
              <p className="text-xs font-semibold text-amber-900 mb-2">Extracted content (sections not mapped)</p>
              <pre className="max-h-72 overflow-y-auto text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {fallbackBody.slice(0, 120000)}
              </pre>
            </div>
          ) : null}
        </div>
      );
    }

    if (item.toolType === "exam-question-paper-generator" || kind === "examPaper") {
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickStr = (...keys: string[]) => {
        for (const k of keys) {
          const v = rc[k] ?? fb[k];
          if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
      };
      let sections = Array.isArray(content.sections)
        ? (content.sections as { sectionName?: string; title?: string; questions?: unknown[] }[])
        : (fallback.sections as { sectionName?: string; title?: string; questions?: unknown[] }[]) || [];
      if (!sections.length) {
        const sectionSeeds: Array<{ sectionName: string; questions: unknown[] }> = [
          {
            sectionName: "Section A: MCQs",
            questions: Array.isArray(rc.section_a)
              ? (rc.section_a as unknown[])
              : Array.isArray(fb.section_a)
                ? (fb.section_a as unknown[])
                : [],
          },
          {
            sectionName: "Section B: Very Short Answer Questions",
            questions: Array.isArray(rc.section_b)
              ? (rc.section_b as unknown[])
              : Array.isArray(fb.section_b)
                ? (fb.section_b as unknown[])
                : [],
          },
          {
            sectionName: "Section C: Short Answer Questions",
            questions: Array.isArray(rc.section_c)
              ? (rc.section_c as unknown[])
              : Array.isArray(fb.section_c)
                ? (fb.section_c as unknown[])
                : [],
          },
          {
            sectionName: "Section D: Long Answer Questions",
            questions: Array.isArray(rc.section_d)
              ? (rc.section_d as unknown[])
              : Array.isArray(fb.section_d)
                ? (fb.section_d as unknown[])
                : [],
          },
          {
            sectionName: "Section E: Case-based / Competency Questions",
            questions: Array.isArray(rc.section_e)
              ? (rc.section_e as unknown[])
              : Array.isArray(fb.section_e)
                ? (fb.section_e as unknown[])
                : [],
          },
        ];
        sections = sectionSeeds.filter((s) => Array.isArray(s.questions) && s.questions.length > 0);
      }
      if (!sections.length && String(fb.question || "").trim()) {
        sections = [{ sectionName: String(fb.section || "Questions"), questions: [fb] }];
      }
      const sectionOrder = [
        "Section A: MCQs",
        "Section B: Very Short Answer Questions",
        "Section C: Short Answer Questions",
        "Section D: Long Answer Questions",
        "Section E: Case-based / Competency Questions",
      ];
      const canonicalExamSectionName = (name: string) => {
        const n = String(name || "").toLowerCase().trim();
        if (/^section\s*a|mcq|multiple\s*choice/.test(n)) return sectionOrder[0];
        if (/^section\s*b|very\s*short|vsa/.test(n)) return sectionOrder[1];
        if (/^section\s*c|short\s*answer/.test(n) && !/very\s*short|vsa/.test(n)) return sectionOrder[2];
        if (/^section\s*d|long\s*answer|essay/.test(n)) return sectionOrder[3];
        if (/^section\s*e|case|competency|competence/.test(n)) return sectionOrder[4];
        return "";
      };
      const orderedSectionMap = new Map<string, unknown[]>(
        sectionOrder.map((name) => [name, [] as unknown[]]),
      );
      for (const sec of sections) {
        const questions = Array.isArray(sec?.questions) ? sec.questions : [];
        const canonical = canonicalExamSectionName(String(sec?.sectionName || sec?.title || ""));
        if (canonical) {
          orderedSectionMap.set(canonical, [...(orderedSectionMap.get(canonical) || []), ...questions]);
          continue;
        }
        // If section label is generic (e.g. "Questions"), default to Section A.
        orderedSectionMap.set(sectionOrder[0], [...(orderedSectionMap.get(sectionOrder[0]) || []), ...questions]);
      }
      const displaySections = sectionOrder.map((name) => ({
        sectionName: name,
        questions: orderedSectionMap.get(name) || [],
      }));
      const examTitle =
        pickStr("paperTitle", "paper_title", "title") || activityTitleForDisplay("Exam Paper", item);
      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<ScrollText className="h-3 w-3 sm:h-4 sm:w-4" />, examTitle)}
            <p className="text-xs text-slate-500 pl-9">Exam question paper — 11-section template</p>
          </div>
          {pickStr("instructions", "general_instructions") ? (
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">1. Paper Title and General Instructions</p>
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap mt-2">
                {pickStr("instructions", "general_instructions")}
              </p>
            </div>
          ) : null}
          {pickStr("blueprint", "design_grid") ? (
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">2. Blueprint / Design Grid</p>
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap mt-2">{pickStr("blueprint", "design_grid")}</p>
            </div>
          ) : null}
          {displaySections.map((section: any, sIdx: number) => (
            <div key={`${item._id}-sec-${sIdx}`} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs sm:text-sm font-semibold">{String(section?.sectionName || section?.title || `Section ${sIdx + 1}`)}</p>
              {toQuestionArray(section?.questions || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic mt-2">No questions listed.</p>
              ) : null}
              {toQuestionArray(section?.questions || []).map((q, qIdx) => {
                const qx = q as { question_number?: number; marks?: number };
                return (
                <div key={`${item._id}-sec-${sIdx}-q-${qIdx}`} className="rounded-lg border border-slate-100 p-3 mt-2 space-y-2">
                  <p className="text-xs sm:text-sm font-medium">
                    Q{qx.question_number != null ? String(qx.question_number) : qIdx + 1}. {q.question}
                  </p>
                  {q.options.length > 0 && (
                    <ul className="text-xs sm:text-sm space-y-1 text-slate-700">
                      {q.options.map((opt: string, idx: number) => (
                        <li key={`${item._id}-sec-${sIdx}-q-${qIdx}-o-${idx}`}>- {opt}</li>
                      ))}
                    </ul>
                  )}
                  {q.answer ? (
                    <p className="text-xs text-emerald-700">
                      <span className="font-medium">Answer:</span> {q.answer}
                    </p>
                  ) : null}
                  {qx.marks != null && !Number.isNaN(Number(qx.marks)) ? (
                    <p className="text-xs text-slate-500">Marks: {String(qx.marks)}</p>
                  ) : null}
                </div>
              );
              })}
            </div>
          ))}
          {pickStr("internalChoices", "internal_choices") ? (
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">8. Internal Choices</p>
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap mt-2">
                {pickStr("internalChoices", "internal_choices")}
              </p>
            </div>
          ) : null}
          {pickStr("answerKey", "answer_key") ? (
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">9. Complete Answer Key</p>
              <pre className="text-xs text-slate-800 whitespace-pre-wrap mt-2 font-sans leading-relaxed">
                {pickStr("answerKey", "answer_key")}
              </pre>
            </div>
          ) : null}
          {pickStr("markingScheme", "marking_scheme") ? (
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">10. Detailed Marking Scheme</p>
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap mt-2">
                {pickStr("markingScheme", "marking_scheme")}
              </p>
            </div>
          ) : null}
          {pickStr("openEndedRubric", "open_ended_rubric") ? (
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">11. Rubric for Open-ended Questions</p>
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap mt-2">
                {pickStr("openEndedRubric", "open_ended_rubric")}
              </p>
            </div>
          ) : null}
        </div>
      );
    }

    if (
      item.toolType === "activity-project-generator" ||
      kind === "activity" ||
      fallback.steps ||
      fallback.materials ||
      fallback.student_instructions ||
      fallback.step_by_step_procedure
    ) {
      const coalesceLines = (v: unknown): string[] => {
        if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
        if (typeof v === "string" && v.trim()) {
          return v
            .split(/\n+/)
            .map((line) => line.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, "").trim())
            .filter(Boolean);
        }
        return [];
      };
      const fb = fallback as Record<string, unknown>;
      const rc = content as Record<string, unknown>;
      const pickLines = (primary: unknown, ...alts: unknown[]) => {
        const a = coalesceLines(primary);
        if (a.length) return a;
        for (const x of alts) {
          const b = coalesceLines(x);
          if (b.length) return b;
        }
        return [];
      };
      const title = String(rc.title || fb.title || "Activity").trim();
      const displayTitle = activityTitleForDisplay(title, item);
      const subtopicLink = String(rc.subtopicLink || fb.subtopic_link_prior_knowledge || "").trim();
      const ncfRaw = rc.ncfAlignment ?? fb.ncf_competency_alignment;
      const ncfAlignment = Array.isArray(ncfRaw)
        ? ncfRaw.map((x) => String(x ?? "").trim()).filter(Boolean)
        : String(ncfRaw || "").trim();
      const learningObjectives = pickLines(rc.learningObjectives, fb.learning_objectives, fb.learningObjectives);
      let materials = pickLines(rc.materials, fb.materials_required, fb.materials);
      let steps = pickLines(rc.steps, fb.step_by_step_procedure, fb.steps);
      const differentiation = String(rc.differentiation || fb.differentiation || "").trim();
      const reflectionExit = String(rc.reflectionExitTicket || fb.reflection_exit_ticket || "").trim();
      const modelPlaceholder = /No structured steps were returned from the model/i;
      if (steps.length && steps.every((s) => modelPlaceholder.test(String(s)))) {
        const fbSteps = coalesceLines(fb.steps || fb.step_by_step_procedure);
        if (fbSteps.length) steps = fbSteps;
      }
      if (!steps.length) {
        steps = coalesceLines(
          (fb as { procedure?: string }).procedure || (fb as { instructions?: string }).instructions,
        );
      }
      const stepsVisible = steps.filter((s) => !modelPlaceholder.test(String(s)));
      const teacherInstructions = pickLines(rc.teacherInstructions, fb.teacher_instructions, fb.teacherInstructions);
      const studentInstructions = pickLines(rc.studentInstructions, fb.student_instructions, fb.studentInstructions);
      const expectedOutcomes = String(
        rc.learningOutcome || fb.learningOutcome || fb.expected_learning_outcomes || fb.expectedLearningOutcomes || "",
      ).trim();
      const assessmentRubric = pickLines(rc.assessmentRubric, fb.assessment_criteria_rubric, fb.assessment);
      const realLifeApplication = trimActivityRealLifeDisplayTail(
        String(rc.realLifeApplication || fb.real_life_application || fb.realLifeApplication || ""),
      ).trim();
      const rawExcerpt =
        String(
          (fb as { content?: string }).content ||
            (fb as { description?: string }).description ||
            (fb as { overview?: string }).overview ||
            "",
        ).trim();
      const section = (label: string, children: ReactNode) => (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      );
      return (
        <div className="space-y-3">
          <div className="space-y-0.5">
            {renderSectionHeader(<FlaskConical className="h-3 w-3 sm:h-4 sm:w-4" />, displayTitle)}
            <p className="text-xs text-slate-500 pl-9">Activity &amp; Project — section 1 (title)</p>
          </div>
          {subtopicLink
            ? section("2. Subtopic Link and Prior Knowledge Required", (
                <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{subtopicLink}</p>
              ))
            : null}
          {section(
            "3. Learning Objectives",
            learningObjectives.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1">
                {learningObjectives.map((line: string, i: number) => (
                  <li key={`${item._id}-lo-${i}`}>- {line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">None listed.</p>
            ),
          )}
          {ncfAlignment
            ? section(
                "4. NCF Competency / Learning Outcome Alignment",
                Array.isArray(ncfAlignment) ? (
                  <ul className="text-xs sm:text-sm space-y-1">
                    {(ncfAlignment as string[]).map((line: string, i: number) => (
                      <li key={`${item._id}-ncf-${i}`}>- {line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{ncfAlignment as string}</p>
                ),
              )
            : null}
          {section(
            "5. Materials Required",
            materials.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1">
                {materials.map((m: string, i: number) => (
                  <li key={`${item._id}-m-${i}`}>- {m}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">None listed.</p>
            ),
          )}
          {section(
            "6. Step-by-step Procedure",
            stepsVisible.length > 0 ? (
              <ol className="text-xs sm:text-sm space-y-1 list-decimal list-inside">
                {stepsVisible.map((s: string, i: number) => (
                  <li key={`${item._id}-s-${i}`}>{s}</li>
                ))}
              </ol>
            ) : rawExcerpt ? (
              <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{rawExcerpt}</p>
            ) : (
              <p className="text-xs text-slate-500 italic">No procedure extracted. Re-upload the PDF after server update, or check that the PDF uses the template section headings.</p>
            ),
          )}
          {teacherInstructions.length > 0
            ? section(
                "7. Teacher Instructions",
                <ul className="text-xs sm:text-sm space-y-1">
                  {teacherInstructions.map((t: string, i: number) => (
                    <li key={`${item._id}-ti-${i}`}>- {t}</li>
                  ))}
                </ul>,
              )
            : null}
          {section(
            "8. Student Instructions",
            studentInstructions.length > 0 ? (
              <ul className="text-xs sm:text-sm space-y-1">
                {studentInstructions.map((t: string, i: number) => (
                  <li key={`${item._id}-si-${i}`}>- {t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">None listed.</p>
            ),
          )}
          {differentiation
            ? section("9. Differentiation", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{differentiation}</p>)
            : null}
          {assessmentRubric.length > 0
            ? section(
                "10. Assessment Rubric",
                <ul className="text-xs sm:text-sm space-y-1">
                  {assessmentRubric.map((row: string, i: number) => (
                    <li key={`${item._id}-ar-${i}`}>- {row}</li>
                  ))}
                </ul>,
              )
            : null}
          {expectedOutcomes
            ? section("11. Expected Learning Outcomes", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{expectedOutcomes}</p>)
            : null}
          {realLifeApplication
            ? section("12. Real-life Application", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{realLifeApplication}</p>)
            : null}
          {reflectionExit
            ? section("13. Reflection / Exit Ticket", <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">{reflectionExit}</p>)
            : null}
        </div>
      );
    }

    const sections = Array.isArray(content.sections) ? content.sections : [];
    const keyPoints = Array.isArray(content.keyPoints) ? content.keyPoints : fallback.keyPoints || [];
    return (
      <div className="space-y-2">
        {renderSectionHeader(<Lightbulb className="h-3 w-3 sm:h-4 sm:w-4" />, "Notes / Summary")}
        {sections.map((section: any, idx: number) => (
          <div key={`${item._id}-note-${idx}`} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs sm:text-sm font-semibold">{String(section?.heading || section?.title || `Section ${idx + 1}`)}</p>
            <p className="text-xs sm:text-sm text-slate-700 mt-1">{String(section?.explanation || section?.content || "").trim()}</p>
          </div>
        ))}
        {keyPoints.length > 0 && (
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1"><Star className="h-3.5 w-3.5" />Key Points</p>
            <ul className="text-xs sm:text-sm text-slate-700 space-y-1">{keyPoints.map((point: any, idx: number) => <li key={`${item._id}-kp-${idx}`}>- {String(point)}</li>)}</ul>
          </div>
        )}
      </div>
    );
  };
  const visiblePdfItems = useMemo(
    () =>
      items.filter(
        (item) =>
          !isDeprecatedAiToolIdentifier(item.toolType) &&
          !isDeprecatedAiToolIdentifier(item.contentType),
      ),
    [items],
  );

  const groupedHierarchy = useMemo(() => {
    const byTool = new Map<string, Map<string, { classLabel: string; board: string; subjects: Map<string, Map<string, Map<string, PdfItem[]>>> }>>();
    for (const item of visiblePdfItems) {
      const tool = getToolLabel(item.toolType) || "-";
      const classKey = String(item.classLabel || "-").trim() || "-";
      const boardKey = canonicalCurriculumBoardLabel(String(item.board || "").trim() || "-");
      const classMapKey = `${classKey}||${boardKey}`;
      const subjectKey = String(item.subject || "-").trim() || "-";
      const topicKey = String(item.topic || item.chapter || "-").trim() || "-";
      const subtopicKey = String(item.subTopic || "-").trim() || "-";
      if (!byTool.has(tool)) byTool.set(tool, new Map());
      const classMap = byTool.get(tool)!;
      if (!classMap.has(classMapKey)) classMap.set(classMapKey, { classLabel: classKey, board: boardKey, subjects: new Map() });
      const classEntry = classMap.get(classMapKey)!;
      const subjectMap = classEntry.subjects;
      if (!subjectMap.has(subjectKey)) subjectMap.set(subjectKey, new Map());
      const topicMap = subjectMap.get(subjectKey)!;
      if (!topicMap.has(topicKey)) topicMap.set(topicKey, new Map());
      const subtopicMap = topicMap.get(topicKey)!;
      if (!subtopicMap.has(subtopicKey)) subtopicMap.set(subtopicKey, []);
      subtopicMap.get(subtopicKey)!.push(item);
    }
    const countNestedRecords = (
      classes: Array<{
        subjects: Array<{
          topics: Array<{
            subtopics: Array<{ records: PdfItem[] }>;
          }>;
        }>;
      }>,
    ) =>
      classes.reduce(
        (toolSum, classNode) =>
          toolSum +
          classNode.subjects.reduce(
            (classSum, subjectNode) =>
              classSum +
              subjectNode.topics.reduce(
                (subjectSum, topicNode) =>
                  subjectSum +
                  topicNode.subtopics.reduce((topicSum, subtopicNode) => topicSum + subtopicNode.records.length, 0),
                0,
              ),
            0,
          ),
        0,
      );

    return Array.from(byTool.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tool, classMap]) => {
        const classes = Array.from(classMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, classEntry]) => ({
            classLabel: classEntry.classLabel,
            board: classEntry.board,
            subjects: Array.from(classEntry.subjects.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([subjectValue, topicMap]) => ({
                subject: subjectValue,
                topics: Array.from(topicMap.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([topicValue, subtopicMap]) => ({
                    topic: topicValue,
                    subtopics: Array.from(subtopicMap.entries())
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([subtopicValue, records]) => ({
                        subtopic: subtopicValue,
                        records: [...records].sort(
                          (a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime(),
                        ),
                      })),
                  })),
              })),
          }));
        return {
          tool,
          recordCount: countNestedRecords(classes),
          classes,
        };
      });
  }, [visiblePdfItems, toolOptions]);

  const pdfContentViewRecord = useMemo(
    () => (pdfContentViewId ? items.find((x) => x._id === pdfContentViewId) ?? null : null),
    [items, pdfContentViewId],
  );

  useEffect(() => {
    if (pdfContentViewId && !pdfContentViewRecord) setPdfContentViewId(null);
  }, [pdfContentViewId, pdfContentViewRecord]);

  const authHeaders = (): Record<string, string> => {
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("superAdminToken") ||
      localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const toNames = (data: any): string[] => {
    const rows = Array.isArray(data) ? data : [];
    return rows
      .map((row: any) => String(row?.name || row?.label || row?.title || "").trim())
      .filter(Boolean);
  };

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const qs = new URLSearchParams({ v: "3" });
      if (board) qs.set("board", board);
      const res = await fetch(`${API_BASE_URL}/api/curriculum/classes?${qs.toString()}`, { headers: authHeaders(), credentials: "include" });
      const json = await res.json();
      const names = toNames(json?.data);
      setClassOptions(names.length > 0 ? names : ["Class 6", "Class 7", "Class 8", "Class 10"]);
    } catch {
      setClassOptions(["Class 6", "Class 7", "Class 8", "Class 10"]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchSubjects = async (selectedClass: string) => {
    setLoadingSubjects(true);
    try {
      const qs = new URLSearchParams({ classId: selectedClass, syllabus: "curriculum-v3" });
      if (board) qs.set("board", board);
      const res = await fetch(`${API_BASE_URL}/api/curriculum/subjects?${qs.toString()}`, { headers: authHeaders(), credentials: "include" });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to load subjects");
      }
      setSubjectRows(toCurriculumSelectRows(json?.data));
    } catch {
      setSubjectRows([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchTopics = async (selectedClass: string, selectedSubject: string) => {
    setLoadingTopics(true);
    try {
      const qs = new URLSearchParams({ classId: selectedClass, subjectId: selectedSubject });
      if (board) qs.set("board", board);
      const res = await fetch(`${API_BASE_URL}/api/curriculum/topics?${qs.toString()}`, { headers: authHeaders(), credentials: "include" });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to load topics");
      }
      setTopicRows(toCurriculumSelectRows(json?.data));
    } catch {
      setTopicRows([]);
    } finally {
      setLoadingTopics(false);
    }
  };

  const fetchSubtopics = async (selectedClass: string, selectedSubject: string, selectedTopic: string) => {
    setLoadingSubtopics(true);
    try {
      const qs = new URLSearchParams({
        classId: selectedClass,
        subjectId: selectedSubject,
        topicId: selectedTopic,
      });
      if (board) qs.set("board", board);
      const res = await fetch(`${API_BASE_URL}/api/curriculum/subtopics?${qs.toString()}`, { headers: authHeaders(), credentials: "include" });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to load subtopics");
      }
      setSubtopicRows(toCurriculumSelectRows(json?.data));
    } catch {
      setSubtopicRows([]);
    } finally {
      setLoadingSubtopics(false);
    }
  };

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const allRows: PdfItem[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("limit", "100");
        if (recordsBoardFilter && recordsBoardFilter !== "__all__") {
          qs.set("board", recordsBoardFilter);
        }
        const res = await fetch(`${API_BASE_URL}/api/pdf/list?${qs.toString()}`, { headers: authHeaders() });
        const json = await res.json();
        if (!res.ok || json?.success === false) {
          throw new Error(json?.message || "Could not load PDF list");
        }
        const batch = Array.isArray(json?.data) ? json.data : [];
        allRows.push(...batch);
        totalPages = Math.max(1, Number(json?.pagination?.totalPages) || 1);
        page += 1;
      } while (page <= totalPages);
      setItems(allRows);
    } catch (error: unknown) {
      setItems([]);
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Could not load PDF list",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reviewAction = async (id: string, action: "approve" | "reject") => {
    setReviewingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf/${id}/review`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Review failed");
      toast({ title: "Success", description: `Record ${action}d successfully.` });
      await fetchList();
    } catch (error: any) {
      toast({ title: "Review failed", description: error?.message || "Could not complete action", variant: "destructive" });
    } finally {
      setReviewingId("");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchBoards = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/super-admin/ai-tool-topics/options`, {
          headers: authHeaders(),
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
            headers: authHeaders(),
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
    void fetchBoards();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [board]);

  useEffect(() => {
    void fetchList();
  }, [recordsBoardFilter]);

  useEffect(() => {
    if (!classLabel) {
      setSubjectRows([]);
      return;
    }
    fetchSubjects(classLabel);
  }, [classLabel, board]);

  useEffect(() => {
    if (!classLabel || !subject) {
      setTopicRows([]);
      return;
    }
    fetchTopics(classLabel, subject);
  }, [classLabel, subject, board]);

  useEffect(() => {
    if (!classLabel || !subject || !topic) {
      setSubtopicRows([]);
      return;
    }
    fetchSubtopics(classLabel, subject, topic);
  }, [classLabel, subject, topic, board]);

  useEffect(() => {
    if (toolType !== STORY_PASSAGE_TOOL_ID) return;
    const label = subjectLabelFromRows(subjectRows, subject);
    if (!subject || isStoryPassageLanguageSubject(label)) return;
    setSubject("");
    setTopic("");
    setSubTopic("");
  }, [toolType, subject, subjectRows]);

  const handleToolTypeChange = (value: string) => {
    setToolType(value);
    if (value === STORY_PASSAGE_TOOL_ID) {
      const label = subjectLabelFromRows(subjectRows, subject);
      if (subject && !isStoryPassageLanguageSubject(label)) {
        setSubject("");
        setTopic("");
        setSubTopic("");
      }
    }
  };

  const handleUpload = async () => {
    if (!pdfFile || !board || !subject || !classLabel || !topic || !toolType) {
      setUploadError("Choose a PDF file, board, class, subject, topic, and tool.");
      toast({ title: "Missing fields", description: "Choose a PDF file, board, class, subject, topic, and tool." });
      return;
    }
    const subjectLabel = subjectLabelFromRows(subjectRows, subject);
    if (toolType === STORY_PASSAGE_TOOL_ID && !isStoryPassageLanguageSubject(subjectLabel)) {
      const msg = "Story & Passage Creator works only with English or Hindi subjects.";
      setUploadError(msg);
      toast({ title: "English or Hindi only", description: msg, variant: "destructive" });
      return;
    }
    if (pdfFile.size > AI_PDF_MAX_BYTES) {
      const msg = `PDF is larger than ${AI_PDF_MAX_MB} MB. Choose a smaller file or split the document.`;
      setUploadError(msg);
      toast({ title: "File too large", description: msg, variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setUploadStep("uploading");
    setUploadError("");
    setLastUploadResult(null);
    setMismatchDetails(null);
    try {
      const form = new FormData();
      form.append("file", pdfFile);
      form.append("board", board);
      form.append("subject", subject);
      form.append("subjectLabel", subjectLabel);
      form.append("class", classLabel);
      form.append("chapter", topic);
      form.append("topic", topic);
      form.append("subTopic", String(subTopic || "").trim());
      form.append("toolType", toolType);
      setUploadStep("extracting");
      setUploadStep("validating");
      setUploadStep("parsing");
      const res = await fetch(`${API_BASE_URL}/api/pdf/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      setUploadStep("saving");
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        type UploadErrData = {
          detectedSubject?: string;
          detectedTopic?: string;
          detectedTool?: string;
          selectedSubject?: string;
          selectedTopic?: string;
          selectedTool?: string;
        };
        const data = json?.data as UploadErrData | undefined;
        const err = new Error(json?.message || "Upload failed") as Error & { data?: UploadErrData };
        err.data = data;
        throw err;
      }
      const totalSaved = Number(json?.data?.totalSaved || 1);
      const extractedFromPdf = Number(json?.data?.extractedFromPdf || 0);
      const generatedByAI = Number(json?.data?.generatedByAI || 0);
      const extraction = json?.data?.extraction as
        | {
            validationPassed?: boolean;
            retryCount?: number;
            expectedItemCount?: number;
            validationErrors?: string[];
          }
        | undefined;
      setUploadStep("done");
      setLastUploadResult({ totalSaved });
      const retryNote =
        extraction?.retryCount && extraction.retryCount > 0
          ? ` (${extraction.retryCount} validation retries)`
          : "";
      const validationNote =
        extraction?.validationPassed === false
          ? " Some fields may be incomplete — review saved records."
          : "";
      toast({
        title: `PDF Processed - ${totalSaved} records saved`,
        description: `${extractedFromPdf} extracted from PDF${retryNote}.${validationNote}`,
      });
      setUploadError("");
      setMismatchDetails(null);
      setPdfFile(null);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      fetchList();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload";
      const data = (error as Error & {
        data?: {
          detectedSubject?: string;
          detectedTopic?: string;
          detectedTool?: string;
          selectedSubject?: string;
          selectedTopic?: string;
          selectedTool?: string;
        };
      })?.data;
      setUploadError(message);
      setUploadStep("error");
      if (
        data &&
        (data.detectedSubject !== undefined ||
          data.detectedTopic !== undefined ||
          data.detectedTool !== undefined ||
          data.selectedSubject !== undefined ||
          data.selectedTopic !== undefined)
      ) {
        setMismatchDetails({
          selectedSubject: data.selectedSubject,
          detectedSubject: data.detectedSubject,
          selectedTopic: data.selectedTopic,
          detectedTopic: data.detectedTopic,
          selectedTool: data.selectedTool,
          detectedTool: data.detectedTool,
        });
      }
      toast({ title: "Generate failed", description: message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const deletePdf = async (id: string) => {
    setDeletingPdfId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Delete failed");
      toast({ title: "Deleted", description: "PDF and chunks deleted." });
      fetchList();
    } catch (error: any) {
      toast({ title: "Delete failed", description: error?.message || "Could not delete", variant: "destructive" });
    } finally {
      setDeletingPdfId("");
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-lg:space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI PDF</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2 lg:col-span-4">
            <Label className={labelClassName}>
              Upload PDF file {reqStar}
            </Label>
            <Input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className={cn(fieldClassName, "cursor-pointer")}
              disabled={isUploading}
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                if (!next) {
                  setPdfFile(null);
                  return;
                }
                const ok = next.type === "application/pdf" || /\.pdf$/i.test(next.name);
                if (!ok) {
                  toast({
                    title: "Invalid file",
                    description: "Please choose a PDF file.",
                    variant: "destructive",
                  });
                  e.target.value = "";
                  setPdfFile(null);
                  return;
                }
                if (next.size > AI_PDF_MAX_BYTES) {
                  const msg = `Maximum size is ${AI_PDF_MAX_MB} MB.`;
                  toast({ title: "File too large", description: msg, variant: "destructive" });
                  e.target.value = "";
                  setPdfFile(null);
                  setUploadError(msg);
                  return;
                }
                setPdfFile(next);
                setMismatchDetails(null);
                setUploadError("");
              }}
            />
            {pdfFile ? (
              <p className="mt-1.5 truncate text-xs text-slate-600">
                Selected: {pdfFile.name} ({(pdfFile.size / (1024 * 1024)).toFixed(2)} MB · max {AI_PDF_MAX_MB} MB)
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-500">
                Choose PDF (max {AI_PDF_MAX_MB} MB per file), fill class → subject → topic (and optional sub-topic)
                → tool, then Generate.
              </p>
            )}
          </div>

          <div>
            <Label className={labelClassName}>
              Board {reqStar}
            </Label>
            <Select
              value={board}
              onValueChange={(value) => {
                setBoard(value);
                setClassLabel("");
                setSubject("");
                setTopic("");
                setSubTopic("");
              }}
            >
              <SelectTrigger className={fieldClassName}>
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                {boardOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={labelClassName}>
              Class {reqStar}
            </Label>
            <Select
              value={classLabel}
              onValueChange={(value) => {
                setClassLabel(value);
                setSubject("");
                setTopic("");
                setSubTopic("");
              }}
              disabled={!board || (loadingClasses && classOptions.length === 0)}
            >
              <SelectTrigger className={fieldClassName}>
                <SelectValue placeholder={!board ? "Select board first" : (loadingClasses ? "Loading classes..." : "Select class")} />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={labelClassName}>
              Subject {reqStar}
            </Label>
            <Select
              value={subject}
              onValueChange={(value) => {
                setSubject(value);
                setTopic("");
                setSubTopic("");
              }}
              disabled={!board || !classLabel || loadingSubjects}
            >
              <SelectTrigger className={fieldClassName}>
                <SelectValue
                  placeholder={
                    !board
                      ? "Select board first"
                      : !classLabel
                        ? "Select class first"
                      : loadingSubjects
                        ? "Loading subjects..."
                        : "Select subject"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subjectRowsForTool.map((row) => (
                  <SelectItem key={row.value} value={row.value}>
                    {row.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={labelClassName}>
              Topic {reqStar}
            </Label>
            <Select
              value={topic}
              onValueChange={(value) => {
                setTopic(value);
                setSubTopic("");
              }}
              disabled={!board || !classLabel || !subject || loadingTopics}
            >
              <SelectTrigger className={fieldClassName}>
                <SelectValue
                  placeholder={
                    !subject
                      ? "Select subject first"
                      : loadingTopics
                        ? "Loading topics..."
                        : "Select topic"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {topicRows.map((row) => (
                  <SelectItem key={row.value} value={row.value}>
                    {row.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={labelClassName}>Sub Topic</Label>
            <Select
              value={subTopic}
              onValueChange={setSubTopic}
              disabled={!board || !classLabel || !subject || !topic || loadingSubtopics}
            >
              <SelectTrigger className={fieldClassName}>
                <SelectValue
                  placeholder={
                    !topic
                      ? "Select topic first"
                      : loadingSubtopics
                        ? "Loading sub topics..."
                        : "Optional — select sub topic"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subtopicRows.map((row) => (
                  <SelectItem key={row.value} value={row.value}>
                    {row.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <Label className={labelClassName}>
              Tool {reqStar}
            </Label>
            <Select value={toolType} onValueChange={handleToolTypeChange}>
              <SelectTrigger className={fieldClassName}>
                <SelectValue placeholder="Select tool" />
              </SelectTrigger>
              <SelectContent>
                {toolOptions.map((tool) => (
                  <SelectItem key={tool.value} value={tool.value}>
                    {tool.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {toolType === STORY_PASSAGE_TOOL_ID ? (
              <p className="mt-1.5 text-xs text-blue-800">
                English and Hindi subjects only for Story &amp; Passage Creator.
              </p>
            ) : null}
          </div>

          <div className="flex items-end md:col-span-2 lg:col-span-4">
            <Button
              type="button"
              onClick={() => void handleUpload()}
              disabled={isUploading}
              className="h-11 w-full bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? "Generating..." : "Generate"}
            </Button>
          </div>

          {uploadStep !== "idle" && uploadStep !== "done" && uploadStep !== "error" && (
            <div className="md:col-span-2 lg:col-span-4 flex items-center gap-2 text-xs sm:text-sm text-blue-700 bg-blue-50 px-4 py-2 rounded-lg">
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
              {STEP_MESSAGES[uploadStep]}
            </div>
          )}

          {uploadStep === "done" && lastUploadResult && (
            <div className="md:col-span-2 lg:col-span-4 text-xs sm:text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg">
              {`✅ ${lastUploadResult.totalSaved} record${lastUploadResult.totalSaved !== 1 ? "s" : ""} saved successfully`}
            </div>
          )}

          {mismatchDetails && (
            <div className="md:col-span-2 lg:col-span-4 rounded-md bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-900 space-y-1">
              <p className="font-semibold">PDF mismatch detected:</p>
              {mismatchDetails.selectedSubject ? (
                <p>
                  Subject — Selected: <strong>{mismatchDetails.selectedSubject}</strong>
                  {" "}
                  | Detected: <strong>{mismatchDetails.detectedSubject || "Unknown"}</strong>
                </p>
              ) : null}
              {mismatchDetails.selectedTopic ? (
                <p>
                  Topic — Selected: <strong>{mismatchDetails.selectedTopic}</strong>
                  {" "}
                  | Detected: <strong>{mismatchDetails.detectedTopic || "Unknown"}</strong>
                </p>
              ) : null}
              {mismatchDetails.selectedTool ? (
                <p>
                  Tool — Selected: <strong>{mismatchDetails.selectedTool}</strong>
                  {" "}
                  | Detected: <strong>{mismatchDetails.detectedTool || "Unknown"}</strong>
                </p>
              ) : null}
              <p>Please upload a PDF that matches your selected subject and topic.</p>
            </div>
          )}

          {uploadError && (
            <p className="md:col-span-2 lg:col-span-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              {uploadError}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-slate-800">Saved PDF records</p>
              <p className="text-xs text-slate-500">
                Showing:{" "}
                <span className="font-medium text-slate-700">
                  {recordsBoardFilter === "__all__" ? "All boards" : recordsBoardFilter}
                </span>
                {!isLoading && visiblePdfItems.length > 0 ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-medium text-slate-700">
                      {visiblePdfItems.length} record{visiblePdfItems.length !== 1 ? "s" : ""} in{" "}
                      {groupedHierarchy.length} tool{groupedHierarchy.length !== 1 ? "s" : ""}
                    </span>
                  </>
                ) : null}
              </p>
              <p className="text-xs text-slate-500">
                Expand each tool to browse class, subject, topic, and subtopic.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 sm:w-64">
              <Label className={labelClassName}>Filter by board</Label>
              <Select value={recordsBoardFilter} onValueChange={setRecordsBoardFilter}>
                <SelectTrigger className={fieldClassName}>
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
          </div>
          {isLoading ? (
            <p className="text-xs sm:text-sm text-gray-600">Loading hierarchy...</p>
          ) : groupedHierarchy.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-600">
              No saved AI content records
              {recordsBoardFilter !== "__all__"
                ? ` for board “${recordsBoardFilter}”. Try “All boards” in the filter above.`
                : " yet."}
            </p>
          ) : (
            <Accordion type="multiple" className="w-full space-y-2 max-lg:space-y-1.5">
              {groupedHierarchy.map((toolNode) => (
                <AccordionItem
                  key={toolNode.tool}
                  value={`tool:${toolNode.tool}`}
                  className="rounded-md border px-2 sm:px-2.5 lg:px-3"
                >
                  <AccordionTrigger className="py-3 no-underline hover:no-underline max-lg:py-2.5 [&>svg]:shrink-0">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <Wrench className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-orange-600" />
                      <Badge className="shrink-0 bg-orange-500 hover:bg-orange-500">Tool</Badge>
                      <span className="min-w-0 flex-1 break-words font-medium text-xs sm:text-sm">{toolNode.tool}</span>
                      <Badge className="shrink-0" variant="outline">
                        {toolNode.recordCount} generation{toolNode.recordCount !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <Accordion type="multiple" className="w-full space-y-2">
                      {toolNode.classes.map((classNode) => (
                        <AccordionItem
                          key={`${toolNode.tool}:${classNode.classLabel}:${classNode.board}`}
                          value={`class:${toolNode.tool}:${classNode.classLabel}:${classNode.board}`}
                          className="rounded-md border px-2 sm:px-2.5 lg:px-3"
                        >
                          <AccordionTrigger className="py-2.5 no-underline hover:no-underline max-lg:py-2 [&>svg]:shrink-0">
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left">
                              <School className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-slate-600" />
                              <Badge className="shrink-0" variant="secondary">
                                Class
                              </Badge>
                              <span className="min-w-0 break-words text-xs sm:text-sm">{classNode.classLabel}</span>
                              <Badge className="shrink-0" variant="outline">
                                {classNode.board || "-"}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2">
                            <Accordion type="multiple" className="w-full space-y-2">
                              {classNode.subjects.map((subjectNode) => (
                                <AccordionItem
                                  key={`${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}`}
                                  value={`subject:${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}`}
                                  className="rounded-md border px-2 sm:px-2.5 lg:px-3"
                                >
                                  <AccordionTrigger className="py-2.5 no-underline hover:no-underline max-lg:py-2 [&>svg]:shrink-0">
                                    <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                      <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-slate-600" />
                                      <Badge className="shrink-0" variant="secondary">
                                        Subject
                                      </Badge>
                                      <span className="min-w-0 break-words text-xs sm:text-sm">{subjectNode.subject}</span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="space-y-2">
                                    <Accordion type="multiple" className="w-full space-y-2">
                                      {subjectNode.topics.map((topicNode) => (
                                        <AccordionItem
                                          key={`${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}:${topicNode.topic}`}
                                          value={`topic:${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}:${topicNode.topic}`}
                                          className="rounded-md border px-2 sm:px-2.5 lg:px-3"
                                        >
                                          <AccordionTrigger className="py-2.5 no-underline hover:no-underline max-lg:py-2 [&>svg]:shrink-0">
                                            <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                              <BookText className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-slate-600" />
                                              <Badge className="shrink-0" variant="secondary">
                                                Topic
                                              </Badge>
                                              <span className="min-w-0 break-words text-xs sm:text-sm">{topicNode.topic}</span>
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent className="space-y-2">
                                            <Accordion type="multiple" className="w-full space-y-2">
                                              {topicNode.subtopics.map((subtopicNode) => (
                                                <AccordionItem
                                                  key={`${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}:${topicNode.topic}:${subtopicNode.subtopic}`}
                                                  value={`subtopic:${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}:${topicNode.topic}:${subtopicNode.subtopic}`}
                                                  className="rounded-md border px-2 sm:px-2.5 lg:px-3"
                                                >
                                                  <AccordionTrigger className="py-2.5 no-underline hover:no-underline max-lg:py-2 [&>svg]:shrink-0">
                                                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left">
                                                      <Pin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-slate-600" />
                                                      <Badge className="shrink-0" variant="secondary">
                                                        Subtopic
                                                      </Badge>
                                                      <span className="min-w-0 flex-1 break-words text-xs sm:text-sm lg:flex-initial">
                                                        {subtopicNode.subtopic}
                                                      </span>
                                                      <Badge className="shrink-0" variant="outline">
                                                        {subtopicNode.records.length} generations
                                                      </Badge>
                                                    </div>
                                                  </AccordionTrigger>
                                                  <AccordionContent className="space-y-2 max-lg:space-y-1.5 max-lg:pb-1">
                                                    {subtopicNode.records.map((record, idx) => (
                                                      <div
                                                        key={record._id}
                                                        className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow hover:shadow-md max-lg:rounded-xl"
                                                      >
                                                        <div
                                                          className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-[0.92]"
                                                          aria-hidden
                                                        />
                                                        <div className="space-y-3 p-4 pt-4 max-lg:space-y-2.5 max-lg:p-3 max-lg:pt-3">
                                                          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
                                                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                                              <div className="flex flex-wrap items-center gap-2">
                                                                <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-slate-500" />
                                                                <Badge variant="outline" className="font-medium">
                                                                  Record {idx + 1}
                                                                </Badge>
                                                                <span className="hidden text-xs text-slate-500 tabular-nums lg:inline">
                                                                  {new Date(record.uploadDate).toLocaleString()}
                                                                </span>
                                                              </div>
                                                              <span className="pl-6 text-xs text-slate-500 tabular-nums lg:hidden">
                                                                {new Date(record.uploadDate).toLocaleString()}
                                                              </span>
                                                              <p className="text-xs sm:text-sm font-medium leading-snug text-slate-800 line-clamp-2 pl-6 sm:pl-0">
                                                                {pdfRecordPreviewLine(record)}
                                                              </p>
                                                            </div>
                                                            <div className="flex w-full min-w-0 flex-col gap-2 lg:w-auto lg:shrink-0 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
                                                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                <Badge
                                                                  variant={
                                                                    record.approvalStatus === "approved" ? "default" : "secondary"
                                                                  }
                                                                  className="capitalize"
                                                                >
                                                                  {record.approvalStatus || "pending"}
                                                                </Badge>
                                                                <Badge
                                                                  variant="outline"
                                                                  className="max-w-full font-normal lg:max-w-[10rem] lg:truncate"
                                                                >
                                                                  {record.contentType || "Generated Content"}
                                                                </Badge>
                                                              </div>
                                                              <div className="flex w-full gap-2 lg:w-auto">
                                                                <Button
                                                                  type="button"
                                                                  size="sm"
                                                                  className="h-9 min-h-11 flex-1 gap-1.5 rounded-xl bg-slate-900 px-4 text-white shadow-sm hover:bg-slate-800 lg:min-h-0 lg:h-9 lg:flex-initial"
                                                                  onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setPdfContentViewId(record._id);
                                                                  }}
                                                                >
                                                                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                                                  View
                                                                </Button>
                                                                <Button
                                                                  type="button"
                                                                  variant="outline"
                                                                  size="icon"
                                                                  className="h-11 w-11 shrink-0 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 lg:h-9 lg:w-9"
                                                                  disabled={deletingPdfId === record._id}
                                                                  aria-label={`Delete record ${idx + 1}`}
                                                                  onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    void deletePdf(record._id);
                                                                  }}
                                                                >
                                                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                                </Button>
                                                              </div>
                                                            </div>
                                                          </div>
                                                          <p className="border-l-2 border-blue-100 pl-3 text-xs leading-relaxed text-slate-500 max-lg:text-[0.8125rem]">
                                                            {pdfRecordViewHint(record)}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    ))}
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

      <Dialog open={!!pdfContentViewId} onOpenChange={(open) => !open && setPdfContentViewId(null)}>
        <DialogContent className="flex max-h-[min(92vh,920px)] w-[min(100vw-1.5rem,56rem)] max-w-[56rem] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200/90 p-0 shadow-2xl">
          <DialogHeader className="shrink-0 space-y-1 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-blue-50/50 px-3 sm:px-4 lg:px-6 py-4 text-left">
            <DialogTitle className="pr-8 text-base sm:text-lg font-semibold leading-snug tracking-tight text-slate-900">
              {pdfContentViewRecord ? pdfRecordPreviewLine(pdfContentViewRecord) : "Record content"}
            </DialogTitle>
            {pdfContentViewRecord ? (
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-600">{getToolLabel(pdfContentViewRecord.toolType)}</span>
                {pdfContentViewRecord.topic ? ` · ${pdfContentViewRecord.topic}` : ""}
                {pdfContentViewRecord.subTopic ? ` · ${pdfContentViewRecord.subTopic}` : ""}
                <span className="text-slate-400"> · </span>
                {new Date(pdfContentViewRecord.uploadDate).toLocaleString()}
              </p>
            ) : null}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4 sm:px-6 sm:py-5">
            {pdfContentViewRecord ? (
              <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-6">
                {renderEducationalContent(pdfContentViewRecord)}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

