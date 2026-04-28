import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";

type PdfItem = {
  _id: string;
  originalName: string;
  fileUrl: string;
  subject: string;
  classLabel: string;
  chapter: string;
  processingStatus: "pending" | "processing" | "processed" | "failed";
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
  const [filterSubject, setFilterSubject] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [subtopicOptions, setSubtopicOptions] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);

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

  const authHeaders = () => {
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
      toast({ title: "Missing fields", description: "File, class, subject, topic, sub topic and tool are required." });
      return;
    }
    setIsUploading(true);
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
      if (!res.ok || !json?.success) throw new Error(json?.message || "Upload failed");
      toast({ title: "Uploaded", description: "PDF uploaded successfully. Click process to index." });
      setFile(null);
      setTopic("");
      setSubTopic("");
      fetchList();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error?.message || "Failed to upload", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const processPdf = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf/process`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePdfId: id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Process failed");
      toast({ title: "Processed", description: `Chunked successfully (${json?.data?.chunkCount || 0} chunks).` });
      fetchList();
    } catch (error: any) {
      toast({ title: "Process failed", description: error?.message || "Could not process PDF", variant: "destructive" });
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

  const filteredItems = items.filter((item) => {
    const subjectOk = !filterSubject || item.subject.toLowerCase().includes(filterSubject.toLowerCase());
    const classOk = !filterClass || item.classLabel.toLowerCase().includes(filterClass.toLowerCase());
    const statusOk = !filterStatus || item.processingStatus === filterStatus;
    return subjectOk && classOk && statusOk;
  });
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Content Engine</CardTitle>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processed Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              className={fieldClassName}
              placeholder="Filter subject"
              value={filterSubject}
              onChange={(e) => {
                setFilterSubject(e.target.value);
                setPage(1);
              }}
            />
            <Input
              className={fieldClassName}
              placeholder="Filter class"
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setPage(1);
              }}
            />
            <Input
              className={fieldClassName}
              placeholder="Filter status (processed/failed)"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            />
            <Button variant="outline" onClick={() => { setFilterSubject(""); setFilterClass(""); setFilterStatus(""); setPage(1); }}>
              Clear Filters
            </Button>
          </div>
          {isLoading ? (
            <p className="text-sm text-gray-600">Loading files...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-600">No PDFs uploaded yet.</p>
          ) : (
            pagedItems.map((item) => (
              <div key={item._id} className="border rounded-lg p-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-sm">{item.originalName}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.classLabel}</Badge>
                    <Badge variant="outline">{item.subject}</Badge>
                    <Badge>{item.processingStatus}</Badge>
                    <Badge variant="secondary">Chunks: {item.chunkCount || 0}</Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Chapter: {item.chapter}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => processPdf(item._id)}>
                    {item.processingStatus === "processed" ? "Reprocess" : "Process"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deletePdf(item._id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
          {!isLoading && filteredItems.length > PAGE_SIZE && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <span className="text-xs text-gray-600">
                Page {currentPage} / {totalPages}
              </span>
              <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

