import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Sparkles } from "lucide-react";
import type { BranchItem } from "./api";
import { ClassSection } from "./ClassSection";

function humanizeToolId(id: string) {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function ToolSection({
  tool,
  displayName,
}: {
  tool: BranchItem;
  displayName?: string;
}) {
  const [open, setOpen] = useState(false);
  const title = displayName || humanizeToolId(tool.value);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <Collapsible open={open} onOpenChange={setOpen} className="w-full min-w-0">
        <CollapsibleTrigger className="flex w-full items-start gap-3 text-left px-4 py-4 md:px-5 md:py-4 hover:bg-white/60 transition-colors">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-500/25">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900 truncate">{title}</span>
              <Badge
                variant="secondary"
                className="rounded-md font-mono text-[10px] font-normal text-slate-600 bg-slate-100/90 border-slate-200/80 max-w-[200px] truncate"
                title={tool.value}
              >
                {tool.value}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-orange-500 transition-transform ${open ? "rotate-180" : ""}`}
              />
              {open ? "Hide classes & paths" : "Expand to browse class → subject → topic → records"}
            </p>
          </div>
          <Badge className="shrink-0 self-start rounded-full bg-orange-100 text-orange-900 hover:bg-orange-100 border-0">
            {tool.count} saved
          </Badge>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 md:px-5 md:pb-5 pt-0 border-t border-slate-100/80 bg-slate-50/40">
            <ClassSection toolName={tool.value} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
