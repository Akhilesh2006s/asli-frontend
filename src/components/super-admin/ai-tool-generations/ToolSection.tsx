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
  productCategory,
  gapSummary,
  gapLoading,
}: {
  tool: BranchItem;
  displayName?: string;
  board?: string;
  productCategory?: string;
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
        <CollapsibleTrigger className="flex w-full min-w-0 items-start gap-3 text-left px-3 py-3.5 sm:px-5 sm:py-4 hover:bg-white/60 transition-colors">
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
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
              <span className="font-semibold text-slate-900 text-[15px] sm:text-base leading-snug break-words">
                {title}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {hasGaps ? (
                  <Badge className="rounded-full bg-red-100 text-red-900 hover:bg-red-100 border border-red-200/80 gap-1 shrink-0">
                    <Flag className="h-3 w-3" aria-hidden />
                    {gapCount} gap{gapCount === 1 ? "" : "s"}
                  </Badge>
                ) : null}
                <Badge className="rounded-full bg-orange-100 text-orange-900 hover:bg-orange-100 border-0 shrink-0">
                  {tool.count} saved
                </Badge>
              </div>
            </div>
            <p
              className="text-[11px] sm:text-xs text-slate-500 font-mono break-all leading-relaxed"
              title={tool.value}
            >
              {tool.value}
            </p>
            <p className="text-xs text-slate-500 flex items-start gap-1.5 flex-wrap leading-relaxed">
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 mt-0.5 text-orange-500 transition-transform ${open ? "rotate-180" : ""}`}
              />
              {hasGaps ? (
                <span className="text-red-700 font-medium break-words">
                  {gapCount} record{gapCount === 1 ? "" : "s"} missing sections
                  {open ? " · hide classes" : " · expand to browse flagged records"}
                </span>
              ) : gapLoading ? (
                <span>Checking section completeness…</span>
              ) : open ? (
                <span>Hide classes & paths</span>
              ) : (
                <span>Expand to browse class → subject → topic → records</span>
              )}
            </p>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 sm:px-5 sm:pb-5 pt-0 border-t border-slate-100/80 bg-slate-50/40 space-y-4 overflow-x-hidden">
            <ClassSection
              key={`${tool.value}:${board || "all"}:${productCategory ?? "all"}`}
              toolName={tool.value}
              board={board}
              productCategory={productCategory}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
