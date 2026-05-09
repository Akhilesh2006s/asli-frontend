import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { toCurriculumSelectRows, type CurriculumSelectRow } from "@/lib/vidya-subjects";
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
  Clock3,
  BarChart3,
  ScrollText,
  Star,
  Layers,
  CalendarDays,
  Trash2,
} from "lucide-react";

/** Keep in sync with ASLI-STUD-BACK/routes/pdf-rag.js AI_PDF_MAX_FILE_BYTES */
const AI_PDF_MAX_MB = 100;
const AI_PDF_MAX_BYTES = AI_PDF_MAX_MB * 1024 * 1024;

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
};

export default function AIContentEngine() {
  const { toast } = useToast();
  const [items, setItems] = useState<PdfItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [subject, setSubject] = useState("");
  const [board, setBoard] = useState("CBSC");
  /** PDF records list is filtered only by board; independent of upload/curriculum form. */
  const [recordsBoardFilter, setRecordsBoardFilter] = useState("CBSC");
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
    ],
    [],
  );

  const fieldClassName =
    "h-11 border-slate-300 bg-slate-50 text-slate-800 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0";
  const labelClassName = "text-slate-700";
  const reqStar = <span className="text-red-600">*</span>;
  const getToolLabel = (toolValue?: string) =>
    toolOptions.find((tool) => tool.value === String(toolValue || "").trim())?.label || toolValue || "-";

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
    <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
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

  const renderEducationalContent = (item: PdfItem) => {
    const content = (item.renderContent && typeof item.renderContent === "object" ? item.renderContent : null) || {};
    const fallback = (item.structuredContent && typeof item.structuredContent === "object" ? item.structuredContent : null) || {};
    const kind = String(content.kind || "").trim();

    if (
      item.toolType === "worksheet-mcq-generator" ||
      item.toolType === "homework-creator" ||
      kind === "questionSet" ||
      Array.isArray(content.questions) ||
      Array.isArray(fallback.questions)
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
          {renderSectionHeader(<ClipboardList className="h-4 w-4" />, item.toolType === "homework-creator" ? "Homework Questions" : "Worksheet / MCQ Questions")}
          {questions.map((q, i) => (
            <div key={`${item._id}-q-${i}`} className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-relaxed flex-1">Q{i + 1}. {q.question}</p>
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
                <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
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

    if (kind === "flashcards" || Array.isArray(content.cards) || Array.isArray(fallback.cards)) {
      const cards = Array.isArray(content.cards) ? content.cards : fallback.cards || [];
      return (
        <div className="space-y-3">
          {renderSectionHeader(<Layers className="h-4 w-4" />, "Flashcards")}
          <div className="grid gap-3 md:grid-cols-2">
          {cards.map((card: any, idx: number) => (
            <div key={`${item._id}-card-${idx}`} className="rounded-xl border bg-white p-4 space-y-2 shadow-sm">
              <p className="text-xs text-slate-500">Card {idx + 1}</p>
              <p className="text-sm"><span className="font-medium">Front:</span> {String(card?.front || "").trim()}</p>
              <p className="text-sm text-slate-700"><span className="font-medium">Back:</span> {String(card?.back || "").trim()}</p>
            </div>
          ))}
          </div>
        </div>
      );
    }

    if (kind === "story" || fallback.content || fallback.passage) {
      const title = String(content.title || fallback.title || "Story").trim();
      const passage = String(content.passage || fallback.content || fallback.passage || "").trim();
      const questions = toQuestionArray(content.questions || fallback.questions || []);
      return (
        <div className="space-y-3">
          {renderSectionHeader(<BookText className="h-4 w-4" />, title || "Story")}
          {passage && <p className="rounded-xl border bg-white p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{passage}</p>}
          {questions.length > 0 && (
            <div className="space-y-2 rounded-xl border bg-white p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Questions</p>
              {questions.map((q, i) => <p key={`${item._id}-story-q-${i}`} className="text-sm">Q{i + 1}. {q.question}</p>)}
            </div>
          )}
        </div>
      );
    }

    if (kind === "lessonPlan" || fallback.objectives || fallback.timeline || fallback.activities) {
      const objectives = Array.isArray(content.objectives) ? content.objectives : fallback.objectives || [];
      const activities = Array.isArray(content.activities) ? content.activities : fallback.activities || [];
      const timeline = Array.isArray(content.timeline) ? content.timeline : fallback.timeline || [];
      return (
        <div className="space-y-3">
          {renderSectionHeader(<CalendarDays className="h-4 w-4" />, "Lesson / Daily Plan")}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3"><p className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Target className="h-3.5 w-3.5" />Objectives</p><ul className="mt-2 text-sm space-y-1">{objectives.map((v: any, i: number) => <li key={`${item._id}-o-${i}`}>- {String(v)}</li>)}</ul></div>
            <div className="rounded-xl border bg-white p-3"><p className="text-xs font-semibold text-slate-500 flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />Activities</p><ul className="mt-2 text-sm space-y-1">{activities.map((v: any, i: number) => <li key={`${item._id}-a-${i}`}>- {String(v)}</li>)}</ul></div>
            <div className="rounded-xl border bg-white p-3"><p className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Timeline</p><ul className="mt-2 text-sm space-y-1">{timeline.map((v: any, i: number) => <li key={`${item._id}-t-${i}`}>- {String(v)}</li>)}</ul></div>
          </div>
        </div>
      );
    }

    if (kind === "rubric" || fallback.criteria || fallback.gradingScale) {
      const criteria = Array.isArray(content.criteria) ? content.criteria : fallback.criteria || [];
      const scale = Array.isArray(content.gradingScale) ? content.gradingScale : fallback.gradingScale || [];
      return (
        <div className="space-y-3">
          {renderSectionHeader(<BarChart3 className="h-4 w-4" />, "Rubric & Evaluation")}
          <table className="w-full text-sm border-collapse rounded-xl overflow-hidden">
            <thead><tr className="bg-slate-100"><th className="border p-2 text-left">Criteria</th><th className="border p-2 text-left">Grading scale</th></tr></thead>
            <tbody>
              {Array.from({ length: Math.max(criteria.length, scale.length) }).map((_, i) => (
                <tr key={`${item._id}-rubric-${i}`} className="bg-white"><td className="border p-2">{String(criteria[i] || "-")}</td><td className="border p-2">{String(scale[i] || "-")}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (kind === "examPaper" || Array.isArray(fallback.sections)) {
      const sections = Array.isArray(content.sections) ? content.sections : fallback.sections || [];
      return (
        <div className="space-y-3">
          {renderSectionHeader(<ScrollText className="h-4 w-4" />, "Exam Paper")}
          {sections.map((section: any, sIdx: number) => (
            <div key={`${item._id}-sec-${sIdx}`} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold">{String(section?.sectionName || section?.title || `Section ${sIdx + 1}`)}</p>
              {toQuestionArray(section?.questions || []).map((q, qIdx) => (
                <p key={`${item._id}-sec-${sIdx}-q-${qIdx}`} className="text-sm mt-1">Q{qIdx + 1}. {q.question}</p>
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (item.toolType === "activity-project-generator" || kind === "activity" || fallback.steps || fallback.materials) {
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
      const title = String(content.title || fallback.title || "Activity").trim();
      let materials = coalesceLines(
        Array.isArray(content.materials) && content.materials.length ? content.materials : fallback.materials,
      );
      let steps = coalesceLines(Array.isArray(content.steps) && content.steps.length ? content.steps : fallback.steps);
      if (!steps.length) {
        steps = coalesceLines(
          (fallback as { procedure?: string; procedures?: string; instructions?: string }).procedure ||
            (fallback as { instructions?: string }).instructions,
        );
      }
      const learningOutcome = String(content.learningOutcome || fallback.learningOutcome || "").trim();
      const rawExcerpt =
        String(
          (fallback as { content?: string }).content ||
            (fallback as { description?: string }).description ||
            (fallback as { overview?: string }).overview ||
            "",
        ).trim();
      return (
        <div className="space-y-3">
          {renderSectionHeader(<FlaskConical className="h-4 w-4" />, title)}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">Materials</p>
              {materials.length > 0 ? (
                <ul className="mt-2 text-sm space-y-1">
                  {materials.map((m: string, i: number) => (
                    <li key={`${item._id}-m-${i}`}>- {m}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-500 italic">None listed.</p>
              )}
            </div>
            <div className="rounded-xl border bg-white p-3 md:col-span-2">
              <p className="text-xs font-semibold text-slate-500">Steps</p>
              {steps.length > 0 ? (
                <ol className="mt-2 text-sm space-y-1 list-decimal list-inside">
                  {steps.map((s: string, i: number) => (
                    <li key={`${item._id}-s-${i}`}>{s}</li>
                  ))}
                </ol>
              ) : rawExcerpt ? (
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{rawExcerpt}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500 italic">No steps stored. Regenerate from a new PDF upload to fill this activity.</p>
              )}
            </div>
          </div>
          {learningOutcome && (
            <p className="rounded-xl border bg-emerald-50 p-3 text-sm text-emerald-800">
              <span className="font-medium">Learning outcome:</span> {learningOutcome}
            </p>
          )}
        </div>
      );
    }

    const sections = Array.isArray(content.sections) ? content.sections : [];
    const keyPoints = Array.isArray(content.keyPoints) ? content.keyPoints : fallback.keyPoints || [];
    return (
      <div className="space-y-2">
        {renderSectionHeader(<Lightbulb className="h-4 w-4" />, "Notes / Summary")}
        {sections.map((section: any, idx: number) => (
          <div key={`${item._id}-note-${idx}`} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">{String(section?.heading || section?.title || `Section ${idx + 1}`)}</p>
            <p className="text-sm text-slate-700 mt-1">{String(section?.explanation || section?.content || "").trim()}</p>
          </div>
        ))}
        {keyPoints.length > 0 && (
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1"><Star className="h-3.5 w-3.5" />Key Points</p>
            <ul className="text-sm text-slate-700 space-y-1">{keyPoints.map((point: any, idx: number) => <li key={`${item._id}-kp-${idx}`}>- {String(point)}</li>)}</ul>
          </div>
        )}
      </div>
    );
  };
  const groupedHierarchy = useMemo(() => {
    const byTool = new Map<string, Map<string, { classLabel: string; board: string; subjects: Map<string, Map<string, Map<string, PdfItem[]>>> }>>();
    for (const item of items) {
      const tool = getToolLabel(item.toolType) || "-";
      const classKey = String(item.classLabel || "-").trim() || "-";
      const boardKey = String(item.board || "").trim() || "-";
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
    return Array.from(byTool.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tool, classMap]) => ({
        tool,
        classes: Array.from(classMap.entries())
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
          })),
      }));
  }, [items, toolOptions]);

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
      const qs = new URLSearchParams();
      if (recordsBoardFilter && recordsBoardFilter !== "__all__") {
        qs.set("board", recordsBoardFilter);
      }
      const res = await fetch(`${API_BASE_URL}/api/pdf/list?${qs.toString()}`, { headers: authHeaders() });
      const json = await res.json();
      setItems(json?.data || []);
    } catch {
      toast({
        title: "Failed",
        description: "Could not load PDF list",
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

  const handleUpload = async () => {
    if (!pdfFile || !board || !subject || !classLabel || !topic || !toolType) {
      setUploadError("Choose a PDF file, board, class, subject, topic, and tool.");
      toast({ title: "Missing fields", description: "Choose a PDF file, board, class, subject, topic, and tool." });
      return;
    }
    if (pdfFile.size > AI_PDF_MAX_BYTES) {
      const msg = `PDF is larger than ${AI_PDF_MAX_MB} MB. Choose a smaller file or split the document.`;
      setUploadError(msg);
      toast({ title: "File too large", description: msg, variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setUploadError("");
    setMismatchDetails(null);
    try {
      const form = new FormData();
      form.append("file", pdfFile);
      form.append("board", board);
      form.append("subject", subject);
      form.append("class", classLabel);
      form.append("chapter", topic);
      form.append("topic", topic);
      form.append("subTopic", String(subTopic || "").trim());
      form.append("toolType", toolType);
      const res = await fetch(`${API_BASE_URL}/api/pdf/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
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
      toast({ title: "Generated ✓", description: "Content saved successfully." });
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
    <div className="space-y-6">
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
                {subjectRows.map((row) => (
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
            <Select value={toolType} onValueChange={setToolType}>
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
              <p className="text-sm font-semibold text-slate-800">Saved PDF records</p>
              <p className="text-xs text-slate-500">
                Showing:{" "}
                <span className="font-medium text-slate-700">
                  {recordsBoardFilter === "__all__" ? "All boards" : recordsBoardFilter}
                </span>
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
            <p className="text-sm text-gray-600">Loading hierarchy...</p>
          ) : groupedHierarchy.length === 0 ? (
            <p className="text-sm text-gray-600">No saved AI content records yet.</p>
          ) : (
            <Accordion type="multiple" className="w-full space-y-2">
              {groupedHierarchy.map((toolNode) => (
                <AccordionItem key={toolNode.tool} value={`tool:${toolNode.tool}`} className="rounded-md border px-3">
                  <AccordionTrigger className="py-3 no-underline hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-orange-600" />
                      <Badge className="bg-orange-500 hover:bg-orange-500">Tool</Badge>
                      <span className="font-medium text-sm">{toolNode.tool}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <Accordion type="multiple" className="w-full space-y-2">
                      {toolNode.classes.map((classNode) => (
                        <AccordionItem
                          key={`${toolNode.tool}:${classNode.classLabel}:${classNode.board}`}
                          value={`class:${toolNode.tool}:${classNode.classLabel}:${classNode.board}`}
                          className="rounded-md border px-3"
                        >
                          <AccordionTrigger className="py-2.5 no-underline hover:no-underline">
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4 text-slate-600" />
                              <Badge variant="secondary">Class</Badge>
                              <span className="text-sm">{classNode.classLabel}</span>
                              <Badge variant="outline">{classNode.board || "-"}</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2">
                            <Accordion type="multiple" className="w-full space-y-2">
                              {classNode.subjects.map((subjectNode) => (
                                <AccordionItem
                                  key={`${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}`}
                                  value={`subject:${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}`}
                                  className="rounded-md border px-3"
                                >
                                  <AccordionTrigger className="py-2.5 no-underline hover:no-underline">
                                    <div className="flex items-center gap-2">
                                      <BookOpen className="h-4 w-4 text-slate-600" />
                                      <Badge variant="secondary">Subject</Badge>
                                      <span className="text-sm">{subjectNode.subject}</span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="space-y-2">
                                    <Accordion type="multiple" className="w-full space-y-2">
                                      {subjectNode.topics.map((topicNode) => (
                                        <AccordionItem
                                          key={`${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}:${topicNode.topic}`}
                                          value={`topic:${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}:${topicNode.topic}`}
                                          className="rounded-md border px-3"
                                        >
                                          <AccordionTrigger className="py-2.5 no-underline hover:no-underline">
                                            <div className="flex items-center gap-2">
                                              <BookText className="h-4 w-4 text-slate-600" />
                                              <Badge variant="secondary">Topic</Badge>
                                              <span className="text-sm">{topicNode.topic}</span>
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent className="space-y-2">
                                            <Accordion type="multiple" className="w-full space-y-2">
                                              {topicNode.subtopics.map((subtopicNode) => (
                                                <AccordionItem
                                                  key={`${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}:${topicNode.topic}:${subtopicNode.subtopic}`}
                                                  value={`subtopic:${toolNode.tool}:${classNode.classLabel}:${classNode.board}:${subjectNode.subject}:${topicNode.topic}:${subtopicNode.subtopic}`}
                                                  className="rounded-md border px-3"
                                                >
                                                  <AccordionTrigger className="py-2.5 no-underline hover:no-underline">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <Pin className="h-4 w-4 text-slate-600" />
                                                      <Badge variant="secondary">Subtopic</Badge>
                                                      <span className="text-sm">{subtopicNode.subtopic}</span>
                                                      <Badge variant="outline">{subtopicNode.records.length} generations</Badge>
                                                    </div>
                                                  </AccordionTrigger>
                                                  <AccordionContent className="space-y-2">
                                                    {subtopicNode.records.map((record, idx) => (
                                                      <div key={record._id} className="rounded-xl border bg-slate-50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                                                          <div className="flex items-center gap-2">
                                                            <FolderOpen className="h-4 w-4 text-slate-600" />
                                                            <Badge variant="outline">Record {idx + 1}</Badge>
                                                            <span className="text-xs text-slate-600">
                                                              {new Date(record.uploadDate).toLocaleString()}
                                                            </span>
                                                          </div>
                  <div className="flex items-center gap-2">
                                                            <Badge>{record.approvalStatus || "pending"}</Badge>
                                                            <Badge variant="secondary">{record.contentType || "Generated Content"}</Badge>
                                                            <Button
                                                              type="button"
                                                              variant="outline"
                                                              size="icon"
                                                              className="h-8 w-8 shrink-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                              disabled={deletingPdfId === record._id}
                                                              aria-label={`Delete record ${idx + 1}`}
                                                              onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                void deletePdf(record._id);
                                                              }}
                                                            >
                                                              <Trash2 className="h-4 w-4" />
                                                            </Button>
                  </div>
                </div>
                                                        {renderEducationalContent(record)}
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

    </div>
  );
}

