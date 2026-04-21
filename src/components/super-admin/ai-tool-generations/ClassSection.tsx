import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, GraduationCap, Loader2 } from "lucide-react";
import { fetchBranch, type BranchItem } from "./api";
import { SubjectSection } from "./SubjectSection";

export function ClassSection({ toolName }: { toolName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<BranchItem[] | null>(null);

  useEffect(() => {
    if (!open || classes !== null) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchBranch({ toolName });
        setClasses(r.data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, classes, toolName]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="pt-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm hover:bg-orange-50/40 hover:border-orange-200/60 transition-colors">
        <span className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <GraduationCap className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">Classes in this tool</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-4 justify-center rounded-xl bg-white border border-dashed border-slate-200">
            <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> Loading classes…
          </div>
        )}
        {classes &&
          classes.map((c) => (
            <SubjectSection key={`${c.value}:${c.count}`} toolName={toolName} classLabel={c.value} />
          ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
