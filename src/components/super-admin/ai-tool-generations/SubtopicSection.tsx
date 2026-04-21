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
  subject,
  topic,
  s,
}: {
  toolName: string;
  classLabel: string;
  subject: string;
  topic: string;
  s: BranchItem;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-dashed border-slate-200/90 bg-slate-50/50 overflow-hidden"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-white/80 transition-colors">
        <span className="flex items-center gap-2 min-w-0">
          <ListTree className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Subtopic</span>
          <span className="font-medium text-slate-900 truncate">
            {s.value === "" ? "(None)" : s.value}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="rounded-full text-[10px] tabular-nums">
            {s.count}
          </Badge>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {open ? (
          <div className="border-t border-slate-100 bg-white px-2 pb-2 pt-2">
            <SubtopicRecordsSection
              parents={{
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
  subject,
  topic,
  topicLabel,
}: {
  toolName: string;
  classLabel: string;
  subject: string;
  topic: string;
  topicLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<BranchItem[] | null>(null);

  useEffect(() => {
    if (!open || subs !== null) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchBranch({
          toolName,
          classLabel,
          subject,
          topic,
        });
        setSubs(r.data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, subs, toolName, classLabel, subject, topic]);

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/80 transition-colors rounded-t-xl">
          <span className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 shrink-0 text-teal-600" />
            <span className="font-medium text-slate-800 truncate">{topicLabel}</span>
            <Badge variant="outline" className="text-[10px] font-normal text-slate-500 border-slate-200">
              Topic
            </Badge>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-slate-100 px-2 pb-2 pt-2 space-y-2 bg-slate-50/30">
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
