import { stripStructuredAiToolMetadata } from "@/lib/strip-ai-tool-metadata";

export function normalizeGeneratedPlainText(content: string): string {
  return String(content || "")
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}/g, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/!\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Segment =
  | { kind: "h1"; title: string }
  | { kind: "h2"; title: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "materialsTable"; items: string[] }
  | { kind: "paragraphs"; lines: string[] };

/** Main sections from AI plain-text templates use "1) Title" (digit + closing paren). */
const MAJOR_SECTION_RE = /^(\d{1,2})\)\s*(.+)$/;

/** Short "1. Title" lines (models sometimes use a dot instead of ')'). */
const MAJOR_DOT_SHORT_RE = /^(\d{1,2})\.\s+(.+)$/;

/** Subsections: "a. Title" or "a) Title" */
const SUBSECTION_RE = /^([a-zA-Z])[\.\)]\s+(.+)$/;

function parseSegments(lines: string[]): Segment[] {
  const segments: Segment[] = [];
  let bufPara: string[] = [];
  let bufBullets: string[] = [];
  let currentMainTitle = "";

  const flushBullets = () => {
    if (bufBullets.length === 0) return;
    segments.push({ kind: "bullets", items: [...bufBullets] });
    bufBullets = [];
  };

  const flushPara = () => {
    if (bufPara.length === 0) return;
    const joined = bufPara.map((x) => x.trim()).filter(Boolean);
    if (joined.length === 0) {
      bufPara = [];
      return;
    }
    const mainKey = currentMainTitle.replace(/^\d+\)\s*/, "").trim();
    const isMaterials = /^materials?\b/i.test(mainKey);
    const allPlain = joined.every(
      (l) =>
        !/^[-*•]\s+/.test(l) &&
        !MAJOR_SECTION_RE.test(l) &&
        !MAJOR_DOT_SHORT_RE.test(l) &&
        !SUBSECTION_RE.test(l),
    );
    if (isMaterials && allPlain) {
      segments.push({ kind: "materialsTable", items: [...joined] });
    } else {
      segments.push({ kind: "paragraphs", lines: [...joined] });
    }
    bufPara = [];
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;

    const major = t.match(MAJOR_SECTION_RE);
    if (major) {
      flushBullets();
      flushPara();
      currentMainTitle = major[2]?.trim() || t;
      segments.push({ kind: "h1", title: t });
      continue;
    }

    const dotShort = t.match(MAJOR_DOT_SHORT_RE);
    if (dotShort && t.length <= 72 && !/^\d{1,2}\.\s+\d/.test(t)) {
      flushBullets();
      flushPara();
      currentMainTitle = dotShort[2]?.trim() || t;
      segments.push({ kind: "h1", title: t });
      continue;
    }

    const sub = t.match(SUBSECTION_RE);
    if (sub && sub[1].length === 1) {
      flushBullets();
      flushPara();
      segments.push({ kind: "h2", title: t });
      continue;
    }

    if (/^[-*•]\s+/.test(t)) {
      flushPara();
      bufBullets.push(t.replace(/^[-*•]\s+/, "").trim());
      continue;
    }

    flushBullets();
    bufPara.push(t);
  }

  flushBullets();
  flushPara();
  return segments;
}

type GeneratedRecordBodyProps = {
  content: string;
  /** When true, strips NAME OF THE TOOL … CONTENT header first. Default true. */
  stripMetadata?: boolean;
  className?: string;
};

export function GeneratedRecordBody({
  content,
  stripMetadata = true,
  className = "",
}: GeneratedRecordBodyProps) {
  const raw = stripMetadata ? stripStructuredAiToolMetadata(String(content || "")) : String(content || "");
  const normalized = normalizeGeneratedPlainText(raw);
  const lines = normalized
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return <p className="text-sm text-slate-500 italic">No content to display.</p>;
  }

  const segments = parseSegments(lines);

  if (segments.length === 0) {
    return (
      <div className={`space-y-2 text-sm leading-relaxed text-slate-800 ${className}`}>
        {lines.map((ln, j) => (
          <p key={j}>{ln}</p>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-5 text-slate-800 ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.kind === "h1") {
          return (
            <h2
              key={`h1-${idx}`}
              className="text-lg font-bold tracking-tight text-slate-900 border-b border-slate-200 pb-2 scroll-mt-4"
            >
              {seg.title}
            </h2>
          );
        }
        if (seg.kind === "h2") {
          return (
            <h3 key={`h2-${idx}`} className="text-base font-semibold text-slate-800 mt-1 -mb-1">
              {seg.title}
            </h3>
          );
        }
        if (seg.kind === "bullets") {
          return (
            <ul key={`ul-${idx}`} className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
              {seg.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          );
        }
        if (seg.kind === "materialsTable") {
          return (
            <div key={`tbl-${idx}`} className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-800 w-12 border-b border-slate-200">
                      #
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-800 border-b border-slate-200">
                      Item
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {seg.items.map((row, r) => (
                    <tr key={r} className={r % 2 === 0 ? "bg-white" : "bg-slate-50/80"}>
                      <td className="px-3 py-2 border-b border-slate-100 text-slate-500 tabular-nums align-top">
                        {r + 1}
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100 text-slate-800 align-top leading-relaxed">
                        {row}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <div key={`p-${idx}`} className="space-y-2 text-sm leading-relaxed text-slate-800">
            {seg.lines.map((ln, j) => (
              <p key={j}>{ln}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
