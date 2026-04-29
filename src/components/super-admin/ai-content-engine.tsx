import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
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

type PdfItem = {
  _id: string;
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
  const [classLabel, setClassLabel] = useState("");
  const [topic, setTopic] = useState("");
  const [subTopic, setSubTopic] = useState("");
  const [toolType, setToolType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [subtopicOptions, setSubtopicOptions] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const [deletingQuestionKey, setDeletingQuestionKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

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

  const availableTopics = topicOptions;
  const availableSubtopics = subtopicOptions;
  const fieldClassName =
    "h-11 border-slate-300 bg-slate-50 text-slate-800 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0";
  const fileFieldClassName =
    "h-11 border-slate-200 bg-blue-50/40 text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-200";
  const labelClassName = "text-slate-700";
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
      const title = String(content.title || fallback.title || "Activity").trim();
      const materials = Array.isArray(content.materials) ? content.materials : fallback.materials || [];
      const steps = Array.isArray(content.steps) ? content.steps : fallback.steps || [];
      const learningOutcome = String(content.learningOutcome || fallback.learningOutcome || "").trim();
      return (
        <div className="space-y-3">
          {renderSectionHeader(<FlaskConical className="h-4 w-4" />, title)}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-3"><p className="text-xs font-semibold text-slate-500">Materials</p><ul className="mt-2 text-sm space-y-1">{materials.map((m: any, i: number) => <li key={`${item._id}-m-${i}`}>- {String(m)}</li>)}</ul></div>
            <div className="rounded-xl border bg-white p-3 md:col-span-2"><p className="text-xs font-semibold text-slate-500">Steps</p><ol className="mt-2 text-sm space-y-1 list-decimal list-inside">{steps.map((s: any, i: number) => <li key={`${item._id}-s-${i}`}>{String(s)}</li>)}</ol></div>
          </div>
          {learningOutcome && <p className="rounded-xl border bg-emerald-50 p-3 text-sm text-emerald-800"><span className="font-medium">Learning outcome:</span> {learningOutcome}</p>}
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
    const byTool = new Map<string, Map<string, Map<string, Map<string, Map<string, PdfItem[]>>>>>();
    for (const item of items) {
      const tool = getToolLabel(item.toolType) || "-";
      const classKey = String(item.classLabel || "-").trim() || "-";
      const subjectKey = String(item.subject || "-").trim() || "-";
      const topicKey = String(item.topic || item.chapter || "-").trim() || "-";
      const subtopicKey = String(item.subTopic || "-").trim() || "-";
      if (!byTool.has(tool)) byTool.set(tool, new Map());
      const classMap = byTool.get(tool)!;
      if (!classMap.has(classKey)) classMap.set(classKey, new Map());
      const subjectMap = classMap.get(classKey)!;
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
          .map(([classLabelValue, subjectMap]) => ({
            classLabel: classLabelValue,
            subjects: Array.from(subjectMap.entries())
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
      .map((row: any) => String(row?.name || row?.label || row?.id || "").trim())
      .filter(Boolean);
  };

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/curriculum/classes?v=3`, { headers: authHeaders(), credentials: "include" });
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
      const res = await fetch(`${API_BASE_URL}/api/curriculum/subjects?${qs.toString()}`, { headers: authHeaders(), credentials: "include" });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to load subjects");
      }
      setSubjectOptions(toNames(json?.data));
    } catch {
      setSubjectOptions([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchTopics = async (selectedClass: string, selectedSubject: string) => {
    setLoadingTopics(true);
    try {
      const qs = new URLSearchParams({ classId: selectedClass, subjectId: selectedSubject });
      const res = await fetch(`${API_BASE_URL}/api/curriculum/topics?${qs.toString()}`, { headers: authHeaders(), credentials: "include" });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to load topics");
      }
      setTopicOptions(toNames(json?.data));
    } catch {
      setTopicOptions([]);
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
      const res = await fetch(`${API_BASE_URL}/api/curriculum/subtopics?${qs.toString()}`, { headers: authHeaders(), credentials: "include" });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to load subtopics");
      }
      setSubtopicOptions(toNames(json?.data));
    } catch {
      setSubtopicOptions([]);
    } finally {
      setLoadingSubtopics(false);
    }
  };

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf/list`, { headers: authHeaders() });
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
    fetchClasses();
    fetchList();
  }, []);

  useEffect(() => {
    if (!classLabel) {
      setSubjectOptions([]);
      return;
    }
    fetchSubjects(classLabel);
  }, [classLabel]);

  useEffect(() => {
    if (!classLabel || !subject) {
      setTopicOptions([]);
      return;
    }
    fetchTopics(classLabel, subject);
  }, [classLabel, subject]);

  useEffect(() => {
    if (!classLabel || !subject || !topic) {
      setSubtopicOptions([]);
      return;
    }
    fetchSubtopics(classLabel, subject, topic);
  }, [classLabel, subject, topic]);

  const handleUpload = async () => {
    if (!file || !subject || !classLabel || !topic || !subTopic || !toolType) {
      setUploadError("File, class, subject, topic, sub topic and tool are required.");
      toast({ title: "Missing fields", description: "File, class, subject, topic, sub topic and tool are required." });
      return;
    }
    setIsUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("subject", subject);
      form.append("class", classLabel);
      form.append("chapter", topic);
      form.append("topic", topic);
      form.append("subTopic", subTopic);
      form.append("toolType", toolType);
      const res = await fetch(`${API_BASE_URL}/api/pdf/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        const selectedTool = json?.data?.selectedTool ? `Selected: ${json.data.selectedTool}` : "";
        const detectedTool = json?.data?.detectedTool ? `Detected: ${json.data.detectedTool}` : "";
        const detail = [selectedTool, detectedTool].filter(Boolean).join(" | ");
        throw new Error(
          detail ? `${json?.message || "Upload failed"} (${detail})` : (json?.message || "Upload failed"),
        );
      }
      toast({ title: "Uploaded", description: "PDF uploaded successfully. Click process to index." });
      setUploadError("");
      setFile(null);
      setTopic("");
      setSubTopic("");
      fetchList();
    } catch (error: any) {
      setUploadError(error?.message || "Failed to upload");
      toast({ title: "Upload failed", description: error?.message || "Failed to upload", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const deletePdf = async (id: string) => {
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
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI PDF</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label className={labelClassName}>PDF</Label>
            <Input
              className={fileFieldClassName}
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <Label className={labelClassName}>Class</Label>
            <Select
              value={classLabel}
              onValueChange={(value) => {
                setClassLabel(value);
                setSubject("");
                setTopic("");
                setSubTopic("");
              }}
              disabled={loadingClasses}
            >
              <SelectTrigger className={fieldClassName}>
                <SelectValue placeholder={loadingClasses ? "Loading classes..." : "Select class"} />
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
            <Label className={labelClassName}>Subject</Label>
            <Select
              value={subject}
              onValueChange={(value) => {
                setSubject(value);
                setTopic("");
                setSubTopic("");
              }}
              disabled={!classLabel || loadingSubjects}
            >
              <SelectTrigger className={fieldClassName}>
                <SelectValue
                  placeholder={
                    !classLabel ? "Select class first" : loadingSubjects ? "Loading subjects..." : "Select subject"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={labelClassName}>Topic</Label>
            <Select
              value={topic}
              onValueChange={(value) => {
                setTopic(value);
                setSubTopic("");
              }}
              disabled={!classLabel || !subject || loadingTopics}
            >
              <SelectTrigger className={fieldClassName}>
                <SelectValue
                  placeholder={
                    !classLabel || !subject
                      ? "Select class & subject first"
                      : loadingTopics
                        ? "Loading topics..."
                        : "Select topic"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableTopics.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
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
              disabled={!classLabel || !subject || !topic || loadingSubtopics}
            >
              <SelectTrigger className={fieldClassName}>
                <SelectValue
                  placeholder={
                    !topic ? "Select topic first" : loadingSubtopics ? "Loading sub topics..." : "Select sub topic"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableSubtopics.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={labelClassName}>Tool</Label>
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
          <div className="flex items-end">
            <Button onClick={handleUpload} disabled={isUploading} className="w-full bg-blue-600 hover:bg-blue-700">
              {isUploading ? "Uploading..." : "Upload PDF"}
            </Button>
          </div>
          {uploadError && (
            <p className="md:col-span-2 lg:col-span-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              {uploadError}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
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
                          key={`${toolNode.tool}:${classNode.classLabel}`}
                          value={`class:${toolNode.tool}:${classNode.classLabel}`}
                          className="rounded-md border px-3"
                        >
                          <AccordionTrigger className="py-2.5 no-underline hover:no-underline">
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4 text-slate-600" />
                              <Badge variant="secondary">Class</Badge>
                              <span className="text-sm">{classNode.classLabel}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2">
                            <Accordion type="multiple" className="w-full space-y-2">
                              {classNode.subjects.map((subjectNode) => (
                                <AccordionItem
                                  key={`${toolNode.tool}:${classNode.classLabel}:${subjectNode.subject}`}
                                  value={`subject:${toolNode.tool}:${classNode.classLabel}:${subjectNode.subject}`}
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
                                          key={`${toolNode.tool}:${classNode.classLabel}:${subjectNode.subject}:${topicNode.topic}`}
                                          value={`topic:${toolNode.tool}:${classNode.classLabel}:${subjectNode.subject}:${topicNode.topic}`}
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
                                                  key={`${toolNode.tool}:${classNode.classLabel}:${subjectNode.subject}:${topicNode.topic}:${subtopicNode.subtopic}`}
                                                  value={`subtopic:${toolNode.tool}:${classNode.classLabel}:${subjectNode.subject}:${topicNode.topic}:${subtopicNode.subtopic}`}
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

