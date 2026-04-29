import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, FileDown, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { useCurriculumCascade } from "@/hooks/use-curriculum-cascade";
import { extractMcqQuestionsFromRecord, isMcqTool } from "@/lib/mcq-record-utils";

type ToolId =
  | "activity-project-generator"
  | "worksheet-mcq-generator"
  | "concept-mastery-helper"
  | "lesson-planner"
  | "homework-creator"
  | "rubrics-evaluation-generator"
  | "story-passage-creator"
  | "short-notes-summaries-maker"
  | "flashcard-generator"
  | "daily-class-plan-maker"
  | "exam-question-paper-generator";

const TOOLS: Array<{ id: ToolId; name: string; description: string }> = [
  { id: "activity-project-generator", name: "Activity & Project Generator", description: "Create engaging activities and projects." },
  { id: "worksheet-mcq-generator", name: "Worksheet & MCQ Generator", description: "Design worksheets and exam-quality MCQs." },
  { id: "concept-mastery-helper", name: "Concept Mastery Helper", description: "Generate concept explanations and mastery notes." },
  { id: "lesson-planner", name: "Lesson Planner", description: "Build structured lesson plans." },
  { id: "homework-creator", name: "Homework Creator", description: "Generate homework tasks and practice sets." },
  { id: "rubrics-evaluation-generator", name: "Rubrics, Evaluation & Report Card", description: "Create rubric and evaluation criteria." },
  { id: "story-passage-creator", name: "Story & Passage Creator", description: "Generate stories and comprehension passages." },
  { id: "short-notes-summaries-maker", name: "Short Notes & Summaries", description: "Create concise revision notes." },
  { id: "flashcard-generator", name: "Flashcard Generator", description: "Generate question-answer flashcards." },
  { id: "daily-class-plan-maker", name: "Daily Class Plan", description: "Create day-wise classroom plans." },
  { id: "exam-question-paper-generator", name: "Exam Question Paper", description: "Generate section-wise exam papers." },
];

type GeneratorRecord = {
  _id: string;
  generatedContent: string;
  createdAt?: string;
};

type GroupedSubtopic = { subtopicName: string; records: GeneratorRecord[] };
type GroupedTopic = { topicName: string; subtopics: GroupedSubtopic[] };
type GroupedSubject = { subjectName: string; topics: GroupedTopic[] };
type GroupedClass = { className: string; subjects: GroupedSubject[] };
type GroupedTool = { toolName: string; toolSlug: string; classes: GroupedClass[] };

function toDisplayPlainText(content: string) {
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
  const lines = toDisplayPlainText(content)
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

export default function SuperAdminAiGenerator() {
  const { toast } = useToast();
  const [selectedTool, setSelectedTool] = useState<ToolId | "">("");
  const [classNumber, setClassNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [subTopic, setSubTopic] = useState("");
  const [questionType, setQuestionType] = useState("All Types");
  const [questionCount, setQuestionCount] = useState("10");
  const [difficulty, setDifficulty] = useState("medium");
  const [duration, setDuration] = useState("30");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recordsTree, setRecordsTree] = useState<GroupedTool[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    classOptions,
    subjects,
    topics,
    subtopics,
    loadingClasses,
    loadingSubjects,
    loadingTopics,
    loadingSubtopics,
  } = useCurriculumCascade(classNumber || undefined, subject || undefined, topic || undefined);

  const currentTool = useMemo(() => TOOLS.find((t) => t.id === selectedTool), [selectedTool]);
  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("superAdminToken") || localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const buildExtraParams = () => {
    const payload: Record<string, any> = {};
    if (selectedTool === "worksheet-mcq-generator") {
      payload.questionType = questionType;
      payload.questionCount = Number(questionCount) || 10;
      payload.difficulty = difficulty;
    }
    if (selectedTool === "homework-creator" || selectedTool === "exam-question-paper-generator") {
      payload.duration = Number(duration) || 30;
    }
    return payload;
  };

  const loadRecords = async () => {
    setRecordsLoading(true);
    try {
      // Records should show full history without applying current generate-form filters.
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/records`, {
        headers: { ...authHeaders() },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to load records");
      setRecordsTree(Array.isArray(json?.data?.grouped) ? json.data.grouped : []);
    } catch (error: any) {
      setRecordsTree([]);
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
  }, [selectedTool, classNumber, subject, topic, subTopic]);

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

  const generate = async () => {
    if (!selectedTool || !classNumber || !subject || !subTopic) {
      toast({ title: "Missing fields", description: "Tool, class, subject and sub topic are required.", variant: "destructive" });
      return;
    }
    if (!topic && !["lesson-planner", "activity-project-generator", "story-passage-creator"].includes(selectedTool)) {
      toast({ title: "Missing topic", description: "Topic is required for this tool.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/generate`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          toolSlug: selectedTool,
          toolName: currentTool?.name || selectedTool,
          className: classNumber,
          subjectName: subject,
          topicName: topic,
          subtopicName: subTopic,
          extraParams: buildExtraParams(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Generation failed");
      }
      toast({ title: "Generated", description: "Content generated and saved in AI Generator records." });
      await loadRecords();
    } catch (error: any) {
      toast({ title: "Generation failed", description: error?.message || "Could not generate", variant: "destructive" });
    } finally {
      setIsGenerating(false);
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

  const openPdf = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-generator/pdf/${id}`, {
        headers: { ...authHeaders() },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Failed to open PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error: any) {
      toast({
        title: "PDF failed",
        description: error?.message || "Could not generate PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Tools</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`rounded-xl border p-4 text-left transition ${selectedTool === tool.id ? "border-orange-400 bg-orange-50" : "bg-white hover:bg-slate-50"}`}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-sm">{tool.name}</p>
                  <p className="text-xs text-slate-600 mt-1">{tool.description}</p>
                </div>
              </div>
            </button>
          ))}
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
          </div>
          <div>
            <Label>Class</Label>
            <Select value={classNumber} onValueChange={handleClassChange} disabled={loadingClasses}>
              <SelectTrigger><SelectValue placeholder={loadingClasses ? "Loading classes..." : "Select class"} /></SelectTrigger>
              <SelectContent>{classOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={subject} onValueChange={handleSubjectChange} disabled={!classNumber || loadingSubjects}>
              <SelectTrigger>
                <SelectValue placeholder={!classNumber ? "Select class first" : (loadingSubjects ? "Loading subjects..." : "Select subject")} />
              </SelectTrigger>
              <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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

          {selectedTool === "worksheet-mcq-generator" && (
            <>
              <div>
                <Label>Question Type</Label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Single Option", "Multiple Option", "Integer Type", "All Types"].map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
          )}

          {(selectedTool === "homework-creator" || selectedTool === "exam-question-paper-generator") && (
            <div>
              <Label>Duration (minutes)</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          )}

          <div className="lg:col-span-3 flex justify-end">
            <Button onClick={generate} disabled={isGenerating || !selectedTool} className="bg-blue-600 hover:bg-blue-700">
              {isGenerating ? "Generating..." : "Generate with Gemini"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Records</CardTitle>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading records...
            </div>
          ) : recordsTree.length === 0 ? (
            <p className="text-sm text-slate-600">No records found for the selected Tool/Class/Subject/Topic/Subtopic.</p>
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
                              <p className="font-medium">{classNode.className}</p>
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
                                              {topicNode.subtopics.map((subtopicNode) => (
                                                <AccordionItem key={`${topicNode.topicName}-${subtopicNode.subtopicName}`} value={`subtopic-${topicNode.topicName}-${subtopicNode.subtopicName}`} className="border rounded-lg px-3 mb-2">
                                                  <AccordionTrigger className="hover:no-underline">
                                                    <div className="text-left">
                                                      <p className="text-xs text-slate-500">SUBTOPIC</p>
                                                      <p className="font-medium">{subtopicNode.subtopicName}</p>
                                                    </div>
                                                  </AccordionTrigger>
                                                  <AccordionContent>
                                                    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/30 to-orange-50/20 shadow-sm overflow-hidden">
                                                      <div className="border-b border-slate-100/80 bg-white/80 px-4 py-3 flex items-center justify-between">
                                                        <div>
                                                          <p className="text-xs text-slate-500">RECORDS</p>
                                                          <p className="text-sm font-semibold text-slate-900">
                                                            {subtopicNode.records.length} generation{subtopicNode.records.length === 1 ? "" : "s"}
                                                          </p>
                                                        </div>
                                                      </div>
                                                      <div className="p-4">
                                                      <div className="space-y-3">
                                                        {subtopicNode.records.map((row) => (
                                                          <div key={row._id} className="group rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:border-orange-200/80 hover:shadow-md">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                              <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                                                {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
                                                              </p>
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
                                                                    {parsedMcqs.map((q, i) => (
                                                                  <div key={`${row._id}-mcq-${i}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                                                    <p className="text-sm font-medium text-slate-900 leading-relaxed">
                                                                      Q{i + 1}. {q.question}
                                                                    </p>
                                                                    <ul className="mt-3 space-y-2.5 pl-0.5">
                                                                      {q.options.map((opt, j) => (
                                                                        <li key={j} className="flex items-start gap-2.5 text-sm text-slate-700">
                                                                          <span className="mt-1.5 h-3.5 w-3.5 rounded-full border border-slate-400 shrink-0 bg-white" />
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
                                                                );
                                                              }
                                                              return (
                                                              <p className="text-sm text-slate-700 line-clamp-4 leading-relaxed border-l-2 border-orange-200 pl-3">
                                                                {toDisplayPlainText(String(row.generatedContent || ""))}
                                                              </p>
                                                              );
                                                            })()}
                                                          </div>
                                                        ))}
                                                      </div>
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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle>Generated Record</DialogTitle>
          </DialogHeader>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="space-y-1.5 text-slate-900">
              <p className="text-base font-semibold">{String(activeRecord?.toolName || activeRecord?.toolSlug || "-")}</p>
            </div>
            <div className="mt-4 space-y-1 text-sm leading-relaxed text-slate-900">
              <p><span className="font-semibold">Class:</span> {String(activeRecord?.className || "-")}</p>
              <p><span className="font-semibold">Subject:</span> {String(activeRecord?.subjectName || "-")}</p>
              <p><span className="font-semibold">Topic:</span> {String(activeRecord?.topicName || "-")}</p>
              <p><span className="font-semibold">Subtopic:</span> {String(activeRecord?.subtopicName || "-")}</p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-200">
              {renderSimpleContent(String(activeRecord?.generatedContent || ""))}
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

