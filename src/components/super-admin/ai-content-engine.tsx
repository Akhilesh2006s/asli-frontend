import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  const [chapter, setChapter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  });

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
    fetchList();
  }, []);

  const handleUpload = async () => {
    if (!file || !subject || !classLabel || !chapter) {
      toast({ title: "Missing fields", description: "File, subject, class and chapter are required." });
      return;
    }
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("subject", subject);
      form.append("class", classLabel);
      form.append("chapter", chapter);
      const res = await fetch(`${API_BASE_URL}/api/pdf/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Upload failed");
      toast({ title: "Uploaded", description: "PDF uploaded successfully. Click process to index." });
      setFile(null);
      setChapter("");
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
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label>PDF</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Physics" />
          </div>
          <div>
            <Label>Class</Label>
            <Input value={classLabel} onChange={(e) => setClassLabel(e.target.value)} placeholder="Class 7" />
          </div>
          <div>
            <Label>Chapter</Label>
            <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Motion" />
          </div>
          <div className="flex items-end">
            <Button onClick={handleUpload} disabled={isUploading} className="w-full">
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
            <Input placeholder="Filter subject" value={filterSubject} onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }} />
            <Input placeholder="Filter class" value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setPage(1); }} />
            <Input placeholder="Filter status (processed/failed)" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} />
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

