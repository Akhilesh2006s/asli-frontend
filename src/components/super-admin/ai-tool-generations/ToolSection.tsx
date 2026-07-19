import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Flag, Sparkles } from "lucide-react";
import type { BranchItem, ToolSectionGapSummary } from "./api";
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
  board,
  gapSummary,
  gapLoading,
}: {
  tool: BranchItem;
  displayName?: string;
  board?: string;
  gapSummary?: ToolSectionGapSummary | null;
  gapLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const title = displayName || humanizeToolId(tool.value);
  const gapCount = gapSummary?.incompleteCount ?? 0;
  const hasGaps = gapCount > 0;

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
        hasGaps ? "border-red-200/90 ring-1 ring-red-100/60" : "border-slate-200/90"
      }`}
    >
      <Collapsible open={open} onOpenChange={setOpen} className="w-full min-w-0">
        <CollapsibleTrigger className="flex w-full items-start gap-3 text-left px-4 py-4 md:px-5 md:py-4 hover:bg-white/60 transition-colors">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
              hasGaps
                ? "bg-red-500 shadow-red-500/25"
                : "bg-orange-500 shadow-orange-500/25"
            }`}
          >
            {hasGaps ? (
              <Flag className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            ) : (
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900 truncate">{title}</span>
              <Badge
                variant="secondary"
                className="rounded-md font-mono text-micro font-normal text-slate-600 bg-slate-100/90 border-slate-200/80 max-w-[200px] truncate"
                title={tool.value}
              >
                {tool.value}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-orange-500 transition-transform ${open ? "rotate-180" : ""}`}
              />
              {hasGaps ? (
                <span className="text-red-700 font-medium">
                  {gapCount} record{gapCount === 1 ? "" : "s"} missing sections
                  {open ? " · hide classes" : " · expand to browse flagged records"}
                </span>
              ) : gapLoading ? (
                "Checking section completeness…"
              ) : open ? (
                "Hide classes & paths"
              ) : (
                "Expand to browse class → subject → topic → records"
              )}
            </p>
          </div>
          <div className="flex shrink-0 self-start flex-col items-end gap-1.5">
            {hasGaps ? (
              <Badge className="rounded-full bg-red-100 text-red-900 hover:bg-red-100 border border-red-200/80 gap-1">
                <Flag className="h-3 w-3" aria-hidden />
                {gapCount} gap{gapCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
            <Badge className="rounded-full bg-orange-100 text-orange-900 hover:bg-orange-100 border-0">
              {tool.count} saved
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 md:px-5 md:pb-5 pt-0 border-t border-slate-100/80 bg-slate-50/40 space-y-4">
            <ClassSection toolName={tool.value} board={board} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
