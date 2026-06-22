import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileDown, FileStack } from "lucide-react";
import { fetchRecords, fetchExportBundle } from "./api";
import type { RecordRow } from "./api";
import { downloadGenerationsPdf } from "./pdf-utils";
import { GenerationRecordsList } from "./GenerationRecordsList";

function labelEmpty(v: string) {
  return v === "" || v == null ? "(None)" : v;
}

export function SubtopicRecordsSection({
  parents,
}: {
  parents: Record<string, string>;
}) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<RecordRow[]>([]);

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
            <FileStack className="h-3 w-3 sm:h-4 sm:w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-slate-900">Records</p>
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
          <FileDown className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
          PDF
        </Button>
      </div>

      <div className="p-4 space-y-3">
        <GenerationRecordsList
          items={items}
          defaultToolName={parents.toolName}
          onRefresh={load}
          loading={loading}
          emptyMessage="No records for this path."
        />

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
      </div>
    </div>
  );
}
