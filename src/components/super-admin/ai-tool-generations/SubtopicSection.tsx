import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Loader2, BookMarked, ListTree } from "lucide-react";
import { fetchBranch, type BranchItem } from "./api";
import { SubtopicRecordsSection } from "./SubtopicRecordsSection";

function SubtopicLeafRow({
  toolName,
  classLabel,
  board,
  subject,
  topic,
  s,
}: {
  toolName: string;
  classLabel: string;
  board?: string;
  subject: string;
  topic: string;
  s: BranchItem;
}) {
  const [open, setOpen] = useState(false);
  const subLabel =
    s.value === "" || /^whole\s*chapter$/i.test(String(s.value))
      ? "Whole chapter"
      : s.value;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-dashed border-slate-200/90 bg-slate-50/50 overflow-hidden"
    >
      <CollapsibleTrigger className="flex w-full min-w-0 items-start gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-white/80 transition-colors">
        <ListTree className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="text-slate-500 text-[10px] font-medium uppercase tracking-wide">
            Subtopic
          </span>
          <span className="block font-medium text-slate-900 text-sm leading-snug break-words">
            {subLabel}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0 mt-0.5">
          <Badge variant="secondary" className="rounded-full text-micro tabular-nums">
            {s.count}
          </Badge>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {open ? (
          <div className="border-t border-slate-100 bg-white px-1.5 pb-2 pt-2 overflow-x-hidden sm:px-2">
            <SubtopicRecordsSection
              parents={{
                ...(board ? { board } : {}),
                toolName,
                classLabel,
                subject,
                topic,
                subtopic: s.value,
              }}
            />
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SubtopicSection({
  toolName,
  classLabel,
  board,
  subject,
  topic,
  topicLabel,
}: {
  toolName: string;
  classLabel: string;
  board?: string;
  subject: string;
  topic: string;
  topicLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<BranchItem[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchBranch({
          ...(board ? { board } : {}),
          toolName,
          classLabel,
          subject,
          topic,
        });
        if (!cancelled) setSubs(r.data.items || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, toolName, classLabel, subject, topic, board]);

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full min-w-0 items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-50/80 transition-colors rounded-t-xl">
          <BookMarked className="h-4 w-4 shrink-0 text-teal-600 mt-0.5" />
          <span className="min-w-0 flex-1 space-y-1">
            <Badge variant="outline" className="shrink-0 text-micro font-normal text-slate-500 border-slate-200">
              Topic
            </Badge>
            <span className="block font-medium text-slate-800 text-sm leading-snug break-words">
              {topicLabel}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-slate-100 px-1.5 pb-2 pt-2 space-y-2 bg-slate-50/30 overflow-x-hidden sm:px-2">
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2 justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-orange-500" /> Loading subtopics…
              </div>
            )}
            {subs &&
              subs.map((s) => (
                <SubtopicLeafRow
                  key={`${topic}:${s.value}:${s.count}`}
                  toolName={toolName}
                  classLabel={classLabel}
                  board={board}
                  subject={subject}
                  topic={topic}
                  s={s}
                />
              ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
