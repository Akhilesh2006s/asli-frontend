import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, BookOpen, Loader2 } from "lucide-react";
import { fetchBranch, scopeParams, type BranchItem } from "./api";
import { SubtopicSection } from "./SubtopicSection";

function SubjectRow({
  toolName,
  classLabel,
  board,
  productCategory,
  subject,
  label,
}: {
  toolName: string;
  classLabel: string;
  board?: string;
  productCategory?: string;
  subject: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<BranchItem[] | null>(null);

  useEffect(() => {
    setTopics(null);
  }, [board, productCategory, toolName, classLabel, subject]);

  useEffect(() => {
    if (!open || topics !== null) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchBranch({
          ...scopeParams(board, productCategory),
          toolName,
          classLabel,
          subject,
        });
        setTopics(r.data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, topics, toolName, classLabel, subject, board, productCategory]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <CollapsibleTrigger className="flex w-full min-w-0 items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-50/90 transition-colors">
        <BookOpen className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="shrink-0 text-micro font-normal text-slate-500 border-slate-200">
              Subject
            </Badge>
          </span>
          <span className="block font-medium text-slate-800 text-sm leading-snug break-words">
            {label}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-slate-100 bg-slate-50/40 px-1.5 py-2 space-y-2 overflow-x-hidden sm:px-2">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-3 justify-center">
              <Loader2 className="w-3 h-3 animate-spin text-orange-500" /> Loading topics…
            </div>
          )}
          {topics &&
            topics.map((t) => (
              <SubtopicSection
                key={`${subject}:${t.value}:${t.count}`}
                toolName={toolName}
                classLabel={classLabel}
                board={board}
                productCategory={productCategory}
                subject={subject}
                topic={t.value}
                topicLabel={t.value === "" ? "(None)" : t.value}
              />
            ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SubjectSection({
  toolName,
  classLabel,
  board,
  productCategory,
}: {
  toolName: string;
  classLabel: string;
  board?: string;
  productCategory?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<BranchItem[] | null>(null);

  useEffect(() => {
    setSubjects(null);
  }, [board, productCategory, toolName, classLabel]);

  useEffect(() => {
    if (!open || subjects !== null) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchBranch({
          ...scopeParams(board, productCategory),
          toolName,
          classLabel,
        });
        setSubjects(r.data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, subjects, toolName, classLabel, board, productCategory]);

  const classTitle = classLabel === "" ? "(No class label)" : classLabel;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-2xl border border-orange-200/60 bg-gradient-to-br from-white to-orange-50/20 shadow-sm overflow-hidden"
    >
      <CollapsibleTrigger className="flex w-full min-w-0 items-start gap-2 px-3 sm:px-4 py-3 text-left hover:bg-orange-50/50 transition-colors">
        <span className="min-w-0 flex-1 space-y-1">
          <Badge className="rounded-md bg-slate-800 hover:bg-slate-800 text-micro font-semibold uppercase tracking-wide shrink-0">
            Class
          </Badge>
          <span className="block font-semibold text-slate-900 text-sm sm:text-base leading-snug break-words">
            {classTitle}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-orange-100/80 px-1.5 sm:px-3 pb-3 pt-1 space-y-2 bg-white/50 overflow-x-hidden">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-3 justify-center rounded-lg bg-slate-50 border border-dashed border-slate-200">
              <Loader2 className="w-3 h-3 animate-spin text-orange-500" /> Loading subjects…
            </div>
          )}
          {subjects &&
            subjects.map((s) => (
              <SubjectRow
                key={`${s.value}:${s.count}`}
                toolName={toolName}
                classLabel={classLabel}
                board={board}
                productCategory={productCategory}
                subject={s.value}
                label={s.value === "" ? "(None)" : s.value}
              />
            ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
