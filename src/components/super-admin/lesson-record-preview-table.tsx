import { stripStructuredAiToolMetadata } from "@/lib/strip-ai-tool-metadata";

/**
 * Compact list preview for lesson-plan markdown (## / ### / bullets) used in AI Tool Data.
 * Strips common **Field:** metadata lines so the table focuses on teaching sections.
 */

function stripLessonListMetaMarkdown(text: string): string {
  return String(text || "")
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^\*\*(Subject|Class|Chapter\s*\/\s*topic|Duration|Teaching method|Tool|Board):\*\*/i.test(t)) {
        return false;
      }
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseMarkdownLessonSections(markdown: string): { label: string; items: string[] }[] {
  const text = String(markdown || "").replace(/\r\n/g, "\n");
  if (!text.trim()) return [];
  const lines = text.split("\n");
  const sections: { label: string; items: string[] }[] = [];
  let current: { label: string; items: string[] } | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    const h3 = line.match(/^###\s+(.+)/);
    if (h3) {
      if (current && current.items.length) sections.push(current);
      current = { label: h3[1].trim(), items: [] };
      continue;
    }
    if (!current) continue;
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      current.items.push(bullet[1].trim());
      continue;
    }
    if (line && !line.startsWith("**") && !line.startsWith("|") && !line.startsWith("#")) {
      if (line.length < 280) current.items.push(line.trim());
    }
  }
  if (current && current.items.length) sections.push(current);
  return sections;
}

export function lessonTitleFromMarkdown(markdown: string): string {
  const cleaned = stripLessonListMetaMarkdown(markdown);
  const m = cleaned.match(/^##\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

type LessonRecordPreviewTableProps = {
  raw: string;
  /** When true, strip **Subject:** etc. before parsing */
  stripMeta?: boolean;
  className?: string;
};

export function LessonRecordPreviewTable({
  raw,
  stripMeta = true,
  className = "",
}: LessonRecordPreviewTableProps) {
  const source = stripMeta ? stripLessonListMetaMarkdown(raw) : String(raw || "");
  const title = lessonTitleFromMarkdown(source) || "Lesson";
  const rows = parseMarkdownLessonSections(source);

  if (rows.length === 0) {
    return (
      <p className={`text-sm text-slate-600 leading-relaxed line-clamp-3 ${className}`}>
        {stripMeta ? stripLessonListMetaMarkdown(toPlainOneLine(raw)) : toPlainOneLine(raw)}
      </p>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm font-semibold text-slate-900 leading-snug">{title}</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[280px] text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-b border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700 w-[32%]">
                Section
              </th>
              <th className="border-b border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={`${row.label}-${ri}`} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/90"}>
                <td className="border-b border-slate-100 px-2 py-1.5 align-top font-medium text-slate-800">
                  {row.label}
                </td>
                <td className="border-b border-slate-100 px-2 py-1.5 align-top text-slate-700">
                  <ul className="list-disc space-y-0.5 pl-3.5 m-0">
                    {row.items.slice(0, 6).map((it, ii) => (
                      <li key={ii} className="leading-snug">
                        {it}
                      </li>
                    ))}
                  </ul>
                  {row.items.length > 6 ? (
                    <p className="mt-1 text-[10px] text-slate-500">+{row.items.length - 6} more…</p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function toPlainOneLine(s: string): string {
  return String(s || "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
