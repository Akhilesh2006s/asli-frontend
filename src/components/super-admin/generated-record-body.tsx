import { stripStructuredAiToolMetadata } from "@/lib/strip-ai-tool-metadata";
import { MockTestViewer } from "@/components/mock-test-viewer";
import { ExamQuestionPaperViewer } from "@/components/exam-question-paper-viewer";
import { looksLikeExamPaperContent } from "@/lib/parse-exam-question-paper";
import { SmartStudyGuideViewer } from "@/components/smart-study-guide-viewer";
import { ConceptBreakdownViewer } from "@/components/concept-breakdown-viewer";
import { PracticeQaViewer } from "@/components/practice-qa-viewer";
import { ChapterSummaryViewer } from "@/components/chapter-summary-viewer";
import { KeyPointsViewer } from "@/components/key-points-viewer";
import { QuickAssignmentViewer } from "@/components/quick-assignment-viewer";
import { looksLikeMockTestContent } from "@/lib/render-mock-test-markdown";
import { looksLikeStudyGuideContent } from "@/lib/parse-smart-study-guide";
import { looksLikeConceptBreakdownContent } from "@/lib/parse-concept-breakdown";
import { looksLikePracticeQaContent } from "@/lib/parse-practice-qa";
import { looksLikeChapterSummaryContent } from "@/lib/parse-chapter-summary";
import { looksLikeKeyPointsContent } from "@/lib/parse-key-points";
import { looksLikeQuickAssignmentContent } from "@/lib/parse-quick-assignment";
import { looksLikeConceptMasteryContent } from "@/lib/parse-concept-mastery";
import { looksLikeDailyClassPlanContent } from "@/lib/parse-daily-class-plan";
import { ConceptMasteryViewer } from "@/components/concept-mastery-viewer";
import { DailyClassPlanViewer } from "@/components/daily-class-plan-viewer";
import {
  legacyActivitySectionNumFromTitle,
  looksLikeActivityProjectContent,
} from "@/lib/parse-activity-markdown";
import { ActivityProjectViewer } from "@/components/activity-project-viewer";
import {
  isActivityProjectGeneratorSlug,
  isProjectIdeaLabSlug,
} from "@/lib/normalize-ai-tool-slug";

import { stripMarkdownSyntax } from '@/lib/strip-markdown-syntax';

export function normalizeGeneratedPlainText(content: string): string {
  return stripMarkdownSyntax(content);
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

/** Activity / Project Generator 13-point template: "2. Learning Objectives" … "13. Reflection". */
const ACTIVITY_TEMPLATE_SECTION_HINT =
  /subtopic|prior\s+knowledge|learning\s+objectives?|ncf|competency|materials?\s+required|step[-\s]?by[-\s]?step|procedure|teacher\s+instructions?|student\s+instructions?|differentiation|assessment|rubric|expected\s+learning|real[-\s]?life|reflection|exit\s+ticket|safety|observation|creative\s+output|self[-\s]?assessment/i;

function isActivityTemplateMajorSection(line: string): boolean {
  const m = line.match(MAJOR_DOT_SHORT_RE);
  if (!m) return false;
  const num = Number(m[1]);
  const title = String(m[2] || "").trim();
  if (num < 2 || num > 13) return false;
  if (line.length > 96) return false;
  if (/^\d{1,2}\.\s+\d/.test(line)) return false;
  if (ACTIVITY_TEMPLATE_SECTION_HINT.test(title)) return true;
  return num >= 6 && num <= 13 && title.length > 0 && title.length < 72;
}

const LESSON_TEMPLATE_SECTION_HINT =
  /learning\s+objectives?|ncf|competency|prior\s+knowledge|diagnostic|introduction|warm[-\s]?up|teaching\s+strategy|classroom\s+activit|teacher\s+talk|student\s+tasks?|formative|assessment\s+questions?|differentiation|homework|practice|teaching\s+aids|materials?\s+required|closure|exit\s+ticket|timeline|period\s*\/\s*time/i;

/** True for "7. Classroom Activities", not for "1. Brainstorming session…". */
function isLessonTemplateMajorSection(line: string): boolean {
  const m = line.match(MAJOR_DOT_SHORT_RE);
  if (!m) return false;
  const num = Number(m[1]);
  const title = String(m[2] || "").trim();
  if (num < 2 || num > 14) return false;
  if (line.length > 72) return false;
  if (/^\d{1,2}\.\s+\d/.test(line)) return false;
  return LESSON_TEMPLATE_SECTION_HINT.test(title);
}

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

    if (isActivityTemplateMajorSection(t)) {
      flushBullets();
      flushPara();
      const m = t.match(MAJOR_DOT_SHORT_RE);
      currentMainTitle = m?.[2]?.trim() || t;
      segments.push({ kind: "h1", title: t });
      continue;
    }

    if (isLessonTemplateMajorSection(t)) {
      flushBullets();
      flushPara();
      const m = t.match(MAJOR_DOT_SHORT_RE);
      currentMainTitle = m?.[2]?.trim() || t;
      segments.push({ kind: "h1", title: t });
      continue;
    }

    const legacySection = legacyActivitySectionNumFromTitle(t);
    if (legacySection != null && t.length < 96) {
      flushBullets();
      flushPara();
      segments.push({ kind: "h1", title: t });
      continue;
    }

    const numberedStep = t.match(MAJOR_DOT_SHORT_RE);
    if (numberedStep && Number(numberedStep[1]) >= 1 && Number(numberedStep[1]) <= 20) {
      flushPara();
      bufBullets.push(String(numberedStep[2] || t).trim());
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
      const bulletText = t.replace(/^[-*•]\s+/, "").trim();
      if (legacyActivitySectionNumFromTitle(bulletText) != null && bulletText.length < 80) {
        flushBullets();
        flushPara();
        segments.push({ kind: "h1", title: bulletText });
        continue;
      }
      flushPara();
      bufBullets.push(bulletText);
      continue;
    }

    flushBullets();
    bufPara.push(t);
  }

  flushBullets();
  flushPara();
  return segments;
}

/** Section accent themes cycled across grouped section cards (matches the AI_V2 look). */
const SECTION_ACCENTS = [
  { bar: 'from-violet-500 to-fuchsia-500', bg: 'from-violet-50/70', ring: 'border-violet-100', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
  { bar: 'from-emerald-500 to-teal-500', bg: 'from-emerald-50/70', ring: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  { bar: 'from-sky-500 to-blue-500', bg: 'from-sky-50/70', ring: 'border-sky-100', badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-400' },
  { bar: 'from-amber-500 to-orange-500', bg: 'from-amber-50/70', ring: 'border-amber-100', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  { bar: 'from-rose-500 to-pink-500', bg: 'from-rose-50/70', ring: 'border-rose-100', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400' },
  { bar: 'from-indigo-500 to-violet-500', bg: 'from-indigo-50/70', ring: 'border-indigo-100', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
] as const;

type SectionAccent = (typeof SECTION_ACCENTS)[number];
type SectionGroup = { title: string | null; num: string | null; body: Segment[] };

function splitLeadingNumber(title: string): { num: string | null; text: string } {
  const m = String(title || '').match(/^(\d{1,2})[\)\.]\s*(.+)$/);
  if (m) return { num: m[1], text: m[2].trim() };
  return { num: null, text: String(title || '').trim() };
}

/** Group flat segments into section cards — everything after an h1 belongs to that section. */
function groupIntoSections(segments: Segment[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  let current: SectionGroup | null = null;
  for (const seg of segments) {
    if (seg.kind === 'h1') {
      if (current) groups.push(current);
      const { num, text } = splitLeadingNumber(seg.title);
      current = { title: text, num, body: [] };
    } else {
      if (!current) current = { title: null, num: null, body: [] };
      current.body.push(seg);
    }
  }
  if (current) groups.push(current);
  return groups;
}

function renderSegmentBody(seg: Segment, idx: number, accent: SectionAccent) {
  if (seg.kind === 'h2') {
    return (
      <h3
        key={`h2-${idx}`}
        className="text-sm sm:text-[0.95rem] font-semibold text-slate-800 flex items-center gap-2 pt-1"
      >
        <span className={`h-3.5 w-1 rounded-full bg-gradient-to-b ${accent.bar}`} />
        {seg.title}
      </h3>
    );
  }
  if (seg.kind === 'bullets') {
    return (
      <ul key={`ul-${idx}`} className="space-y-2">
        {seg.items.map((it, j) => (
          <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
            <span className={`mt-[0.5rem] h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (seg.kind === 'materialsTable') {
    return (
      <div key={`tbl-${idx}`} className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
              <th className="px-3 py-2.5 text-left font-semibold text-slate-700 w-12 border-b border-slate-200">#</th>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">Item</th>
            </tr>
          </thead>
          <tbody>
            {seg.items.map((row, r) => (
              <tr key={r} className="transition-colors hover:bg-slate-50">
                <td className="px-3 py-2 border-b border-slate-100 text-slate-400 tabular-nums align-top">{r + 1}</td>
                <td className="px-3 py-2 border-b border-slate-100 text-slate-700 align-top leading-relaxed">{row}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (seg.kind === "paragraphs") {
    return (
      <div key={`p-${idx}`} className="space-y-2 text-sm leading-relaxed text-slate-700">
        {seg.lines.map((ln, j) => (
          <p key={j}>{ln}</p>
        ))}
      </div>
    );
  }
  return null;
}

type GeneratedRecordBodyProps = {
  content: string;
  /** When true, strips NAME OF THE TOOL … CONTENT header first. Default true. */
  stripMetadata?: boolean;
  className?: string;
  toolType?: string;
};

export function GeneratedRecordBody({
  content,
  stripMetadata = true,
  className = "",
  toolType,
}: GeneratedRecordBodyProps) {
  const raw = stripMetadata ? stripStructuredAiToolMetadata(String(content || "")) : String(content || "");
  if (
    isActivityProjectGeneratorSlug(toolType) ||
    isProjectIdeaLabSlug(toolType) ||
    looksLikeActivityProjectContent(raw)
  ) {
    const variant = isProjectIdeaLabSlug(toolType) ? "student" : "teacher";
    return <ActivityProjectViewer content={raw} variant={variant} className={className} />;
  }
  if (toolType === "chapter-summary-creator") {
    return <ChapterSummaryViewer content={String(content || "")} className={className} />;
  }
  if (toolType === "key-points-formula-extractor") {
    return <KeyPointsViewer content={String(content || "")} className={className} />;
  }
  if (toolType === "quick-assignment-builder") {
    return <QuickAssignmentViewer content={String(content || "")} className={className} />;
  }
  if (toolType === "exam-question-paper-generator" || looksLikeExamPaperContent(raw)) {
    return (
      <ExamQuestionPaperViewer
        content={String(content || "")}
        rawContent={undefined}
        className={className}
        variant="teacher"
      />
    );
  }
  if (toolType === "mock-test-builder" || looksLikeMockTestContent(raw)) {
    return (
      <MockTestViewer
        content={String(content || "")}
        rawContent={undefined}
        className={className}
      />
    );
  }
  if (looksLikeChapterSummaryContent(raw)) {
    return <ChapterSummaryViewer content={String(content || "")} className={className} />;
  }
  if (looksLikeKeyPointsContent(raw)) {
    return <KeyPointsViewer content={String(content || "")} className={className} />;
  }
  if (looksLikeQuickAssignmentContent(raw)) {
    return <QuickAssignmentViewer content={String(content || "")} className={className} />;
  }
  if (looksLikeStudyGuideContent(raw)) {
    return <SmartStudyGuideViewer content={String(content || "")} className={className} />;
  }
  if (looksLikeConceptBreakdownContent(raw)) {
    return <ConceptBreakdownViewer content={String(content || "")} className={className} />;
  }
  if (toolType === "concept-mastery-helper" || looksLikeConceptMasteryContent(raw)) {
    return (
      <ConceptMasteryViewer
        content={String(content || "")}
        variant="teacher"
        className={className}
      />
    );
  }
  if (toolType === "daily-class-plan-maker" || looksLikeDailyClassPlanContent(raw)) {
    return (
      <DailyClassPlanViewer
        content={String(content || "")}
        variant="teacher"
        className={className}
      />
    );
  }
  if (looksLikePracticeQaContent(raw)) {
    return <PracticeQaViewer content={String(content || "")} className={className} />;
  }
  const normalized = normalizeGeneratedPlainText(raw);
  const lines = normalized
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return <p className="text-xs sm:text-sm text-slate-500 italic">No content to display.</p>;
  }

  const segments = parseSegments(lines);

  if (segments.length === 0) {
    return (
      <div className={`space-y-2 text-xs sm:text-sm leading-relaxed text-slate-800 ${className}`}>
        {lines.map((ln, j) => (
          <p key={j}>{ln}</p>
        ))}
      </div>
    );
  }

  const groups = groupIntoSections(segments);

  return (
    <div className={`space-y-4 ${className}`}>
      {groups.map((group, gi) => {
        const accent = SECTION_ACCENTS[gi % SECTION_ACCENTS.length];
        const hasHeader = Boolean(group.title);
        return (
          <section
            key={`sec-${gi}`}
            className={`overflow-hidden rounded-2xl border ${accent.ring} bg-gradient-to-b ${accent.bg} to-white shadow-sm`}
          >
            {hasHeader && (
              <header className="flex items-center gap-3 border-b border-slate-100/80 px-4 py-3 sm:px-5">
                <span className={`h-8 w-1.5 shrink-0 rounded-full bg-gradient-to-b ${accent.bar}`} />
                {group.num && (
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums ${accent.badge}`}
                  >
                    {group.num}
                  </span>
                )}
                <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">{group.title}</h2>
              </header>
            )}
            <div className="space-y-4 px-4 py-4 sm:px-5">
              {group.body.map((seg, idx) => renderSegmentBody(seg, idx, accent))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
