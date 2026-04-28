import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileDown, Calendar, Eye, FileStack, Pencil, Trash2 } from "lucide-react";
import { fetchRecords, fetchDocument, fetchExportBundle, updateDocument, deleteDocument } from "./api";
import type { RecordRow } from "./api";
import { downloadGenerationsPdf } from "./pdf-utils";
import { renderMarkdown } from "@/lib/render-teacher-markdown";
import { useToast } from "@/hooks/use-toast";

function labelEmpty(v: string) {
  return v === "" || v == null ? "(None)" : v;
}

function toEditablePlainText(content: string) {
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

export function SubtopicRecordsSection({
  parents,
}: {
  parents: Record<string, string>;
}) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<RecordRow[]>([]);
  const [view, setView] = useState<RecordRow | null>(null);
  const [fullText, setFullText] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<RecordRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchRecords(parents, page, 20);
      setTotal(r.data.total);
      setItems(r.data.items);
    } finally {
      setLoading(false);
    }
  }, [parents, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openDoc = async (row: RecordRow) => {
    setView(row);
    setFullText(null);
    try {
      const r = await fetchDocument(row._id);
      setFullText(r.data.content || "");
    } catch {
      setFullText("(Failed to load content)");
    }
  };

  const openEdit = async (row: RecordRow) => {
    setEditRow(row);
    setEditContent("");
    try {
      const r = await fetchDocument(row._id);
      setEditContent(toEditablePlainText(r.data.content || ""));
    } catch {
      setEditContent("");
      toast({
        title: "Failed",
        description: "Could not load content for editing.",
        variant: "destructive",
      });
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    if (!editContent.trim()) {
      toast({
        title: "Missing content",
        description: "Content cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    setSavingEdit(true);
    try {
      await updateDocument(editRow._id, editContent);
      toast({ title: "Updated", description: "Record updated successfully." });
      setEditRow(null);
      await load();
      if (view && view._id === editRow._id) {
        setFullText(editContent);
      }
    } catch {
      toast({
        title: "Update failed",
        description: "Could not update record.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const removeRow = async (row: RecordRow) => {
    const ok = window.confirm("Delete this record permanently?");
    if (!ok) return;
    setDeletingId(row._id);
    try {
      await deleteDocument(row._id);
      toast({ title: "Deleted", description: "Record deleted successfully." });
      if (view && view._id === row._id) {
        setView(null);
        setFullText(null);
      }
      await load();
    } catch {
      toast({
        title: "Delete failed",
        description: "Could not delete record.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const pdfThisSubtopic = async () => {
    const r = await fetchExportBundle(parents, 500);
    const recs = r.data.records.map((x) => ({
      toolDisplayName: x.toolDisplayName,
      toolName: x.toolName,
      classLabel: x.classLabel,
      subject: x.subject,
      topic: x.topic,
      subtopic: x.subtopic,
      content: x.content,
      createdAt: x.createdAt,
    }));
    await downloadGenerationsPdf(
      `${parents.toolName || "tool"}_${parents.subtopic || "sub"}`,
      recs,
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/30 to-orange-50/20 shadow-sm overflow-hidden">
      <div className="border-b border-slate-100/80 bg-white/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
            <FileStack className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Records</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {total} generation{total !== 1 ? "s" : ""}
              <span className="text-slate-300 mx-1.5">·</span>
              <span className="font-medium text-slate-700">{labelEmpty(parents.subtopic || "")}</span>
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm shrink-0"
          onClick={pdfThisSubtopic}
        >
          <FileDown className="w-4 h-4 mr-2" />
          PDF
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-sm">Loading records…</p>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-center text-slate-500 py-8 rounded-xl border border-dashed border-slate-200 bg-white/60">
            No records for this path.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((row) => (
              <li
                key={row._id}
                className="group rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:border-orange-200/80 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs rounded-lg text-orange-700 hover:text-orange-800 hover:bg-orange-50"
                      onClick={() => openDoc(row)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View full
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs rounded-lg text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={deletingId === row._id}
                      className="h-8 text-xs rounded-lg text-red-700 hover:text-red-800 hover:bg-red-50"
                      onClick={() => removeRow(row)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      {deletingId === row._id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-slate-700 line-clamp-4 leading-relaxed border-l-2 border-orange-200 pl-3">
                  {row.preview}
                </p>
              </li>
            ))}
          </ul>
        )}

        {total > 20 && (
          <div className="flex gap-2 justify-center pt-2 border-t border-slate-100/80">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Badge variant="secondary" className="self-center rounded-lg px-3 tabular-nums">
              Page {page} · {total} total
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}

        <Dialog open={!!view} onOpenChange={() => setView(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900">Generated content</DialogTitle>
            </DialogHeader>
            {fullText == null ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin w-8 h-8 text-orange-500" />
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-h-[min(70vh,600px)] overflow-y-auto">
                <div
                  className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-gray-800 prose-img:rounded-lg prose-img:shadow-md prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2 prose-td:border prose-td:border-gray-300 prose-td:p-2"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(fullText) }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
          <DialogContent className="max-w-3xl rounded-2xl border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900">Edit content</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[320px]"
                placeholder="Update content..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditRow(null)}>
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
