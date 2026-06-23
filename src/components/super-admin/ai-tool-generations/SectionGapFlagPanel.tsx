import { Badge } from "@/components/ui/badge";
import { Flag } from "lucide-react";
import type { RecordRow, RecordSectionGap } from "./api";

export type SectionGapPathRow = {
  toolName?: string;
  toolDisplayName?: string;
  classLabel?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  sectionGap?: RecordSectionGap;
};

function humanizeToolId(id: string) {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function recordToolLabel(row: SectionGapPathRow, defaultToolName = "") {
  const slug = row.toolName || defaultToolName;
  return row.toolDisplayName || humanizeToolId(slug || "Tool");
}

export function recordHasSectionGap(row: SectionGapPathRow): boolean {
  return Boolean(row.sectionGap && !row.sectionGap.complete);
}

function labelEmpty(v?: string) {
  return !v || v.trim() === "" ? "(None)" : v;
}

export function formatRecordPath(row: SectionGapPathRow) {
  return [
    { label: "Class", value: labelEmpty(row.classLabel) },
    { label: "Subject", value: labelEmpty(row.subject) },
    { label: "Topic", value: labelEmpty(row.topic) },
    { label: "Subtopic", value: labelEmpty(row.subtopic) },
  ];
}

export function SectionGapFlagPanel({
  row,
  defaultToolName = "",
  className = "",
}: {
  row: SectionGapPathRow | RecordRow;
  defaultToolName?: string;
  className?: string;
}) {
  if (!recordHasSectionGap(row)) return null;
  const missing = row.sectionGap?.missingSections || [];
  const optional = row.sectionGap?.optionalMissingSections || [];

  return (
    <div
      className={`rounded-lg border border-red-200/80 bg-red-50/50 px-3 py-2.5 space-y-1.5 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-red-800">
        <Flag className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Section gap
      </div>
      <p className="text-xs text-slate-700 leading-relaxed break-words">
        <span className="font-medium text-slate-500">Tool: </span>
        {recordToolLabel(row, defaultToolName)}
      </p>
      {formatRecordPath(row).map(({ label, value }) => (
        <p key={label} className="text-xs text-slate-700 leading-relaxed break-words">
          <span className="font-medium text-slate-500">{label}: </span>
          {value}
        </p>
      ))}
      {(missing.length > 0 || optional.length > 0) && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {missing.map((section) => (
            <Badge key={section} variant="destructive" className="font-normal text-[10px]">
              Missing: {section}
            </Badge>
          ))}
          {optional.map((section) => (
            <Badge key={`opt-${section}`} variant="secondary" className="font-normal text-[10px]">
              Optional: {section}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
