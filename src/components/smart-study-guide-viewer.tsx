import { useMemo, type ReactNode } from 'react';
import {
  BookMarked,
  BookOpen,
  Brain,
  CheckCircle2,
  FileQuestion,
  GitBranch,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Sigma,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  resolveStudyGuideFromPayload,
  studyGuideViewerPayloadFromRecord,
  type StudyGuideContent,
  type StudyGuidePracticeQuestion,
} from '@/lib/parse-smart-study-guide';
import { renderSmartStudyGuideMarkdown } from '@/lib/render-smart-study-guide-markdown';

export { studyGuideViewerPayloadFromRecord };

interface SmartStudyGuideViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
}

function GuideSectionCard({
  sectionNum,
  title,
  icon: Icon,
  stripe,
  iconWrap,
  children,
  className,
}: {
  sectionNum: string;
  title: string;
  icon: LucideIcon;
  stripe: string;
  iconWrap: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'h-fit w-full overflow-hidden rounded-xl border border-indigo-200/90 bg-white shadow-sm',
        className,
      )}
    >
      <div className={cn('flex items-center gap-2 border-l-[4px] px-2.5 py-1.5', stripe)}>
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', iconWrap)}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">{sectionNum}</p>
          <h4 className="text-xs font-bold leading-tight text-slate-900">{title}</h4>
        </div>
      </div>
      <div className="px-2.5 pb-2 pt-0.5">{children}</div>
    </section>
  );
}

function EmptyHint() {
  return (
    <p className="rounded-md border border-dashed border-indigo-200 bg-indigo-50/40 px-2 py-1 text-xs italic text-slate-400">
      Not included in this study guide.
    </p>
  );
}

function BulletList({ items, accent = 'text-indigo-500' }: { items: string[]; accent?: string }) {
  if (!items.length) return <EmptyHint />;
  return (
    <ul className="space-y-1.5">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-800">
          <span className={cn('mt-0.5 shrink-0', accent)}>•</span>
          <span className="whitespace-pre-wrap leading-relaxed">{line}</span>
        </li>
      ))}
    </ul>
  );
}

function RichTextBlock({ text }: { text: string }) {
  if (!text.trim()) return <EmptyHint />;
  const hasMarkdown =
    text.includes('|') ||
    /^\s*#{1,6}\s/m.test(text) ||
    /\*\*[^*]+\*\*/.test(text) ||
    /^\s*[-*•]\s/m.test(text);
  if (hasMarkdown) {
    return (
      <div
        className="prose prose-sm max-w-none text-slate-800 prose-li:text-sm"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      />
    );
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{text}</p>;
}

function PracticeQuestionCard({ q, index }: { q: StudyGuidePracticeQuestion; index: number }) {
  const isMcq = q.type === 'objective' && q.options.length >= 2;
  return (
    <article className="rounded-lg border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
          Q{index + 1}
        </span>
        <Badge
          variant="outline"
          className={cn(
            'border-0 text-[10px] font-semibold',
            isMcq ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800',
          )}
        >
          {isMcq ? 'MCQ' : 'Subjective'}
        </Badge>
      </div>
      <p className="text-sm font-medium leading-snug text-slate-900">{q.question}</p>
      {isMcq ? (
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {q.options.map((opt, i) => {
            const label = opt.match(/^([A-D])\)/i)?.[1]?.toUpperCase() || String.fromCharCode(65 + i);
            const text = opt.replace(/^[A-D]\)\s*/i, '').trim();
            return (
              <li
                key={`${opt}-${i}`}
                className="flex gap-2 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-sm text-slate-700"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">
                  {label}
                </span>
                <span className="min-w-0 flex-1 pt-0.5">{text}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {q.answer ? (
        <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
          <span className="font-semibold">Answer:</span> {q.answer}
        </p>
      ) : null}
    </article>
  );
}


function buildBodySections(guide: StudyGuideContent) {
  return [
    <GuideSectionCard
      key="2"
      sectionNum="Section 2"
      title="Chapter and Subtopic Overview"
      icon={BookOpen}
      stripe="border-blue-500"
      iconWrap="bg-blue-100 text-blue-800"
    >
      <RichTextBlock text={guide.chapterOverview} />
    </GuideSectionCard>,
    <GuideSectionCard
      key="3"
      sectionNum="Section 3"
      title="Learning Objectives"
      icon={Target}
      stripe="border-violet-500"
      iconWrap="bg-violet-100 text-violet-800"
    >
      <BulletList items={guide.learningObjectives} accent="text-violet-500" />
    </GuideSectionCard>,
    <GuideSectionCard
      key="4"
      sectionNum="Section 4"
      title="Prior Knowledge Required"
      icon={GraduationCap}
      stripe="border-cyan-500"
      iconWrap="bg-cyan-100 text-cyan-800"
    >
      <BulletList items={guide.priorKnowledge} accent="text-cyan-600" />
    </GuideSectionCard>,
    <GuideSectionCard
      key="5"
      sectionNum="Section 5"
      title="Key Concepts Explained"
      icon={Brain}
      stripe="border-indigo-600"
      iconWrap="bg-indigo-100 text-indigo-800"
      className="sm:col-span-2"
    >
      {guide.keyConcepts.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {guide.keyConcepts.map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              className="rounded-lg border border-indigo-100 bg-indigo-50/30 px-3 py-2"
            >
              <p className="text-sm font-semibold text-indigo-900">{c.name}</p>
              {c.explanation ? (
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{c.explanation}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyHint />
      )}
    </GuideSectionCard>,
    <GuideSectionCard
      key="6"
      sectionNum="Section 6"
      title="Definitions and Formulae"
      icon={Sigma}
      stripe="border-amber-500"
      iconWrap="bg-amber-100 text-amber-900"
      className="sm:col-span-2"
    >
      {guide.definitions.length > 0 || guide.formulae.length > 0 ? (
        <div className="space-y-3">
          {guide.definitions.length > 0 ? (
            <div className="space-y-2">
              {guide.definitions.map((d, i) => (
                <div key={`def-${i}`} className="rounded-md border border-amber-100 bg-amber-50/50 px-3 py-2">
                  <span className="text-sm font-semibold text-amber-900">{d.term}</span>
                  {d.definition ? (
                    <span className="text-sm text-slate-700"> — {d.definition}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {guide.formulae.length > 0 ? (
            <div className="space-y-2">
              {guide.formulae.map((f, i) => (
                <div
                  key={`fm-${i}`}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800"
                >
                  {f.name ? <span className="font-sans font-semibold text-slate-900">{f.name}: </span> : null}
                  {f.formula}
                  {f.note ? (
                    <p className="mt-1 font-sans text-xs text-slate-500">{f.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyHint />
      )}
    </GuideSectionCard>,
    <GuideSectionCard
      key="7"
      sectionNum="Section 7"
      title="Concept Flow / Mind Map"
      icon={GitBranch}
      stripe="border-teal-500"
      iconWrap="bg-teal-100 text-teal-800"
      className="sm:col-span-2"
    >
      <RichTextBlock text={guide.conceptFlow} />
    </GuideSectionCard>,
    <GuideSectionCard
      key="8"
      sectionNum="Section 8"
      title="Real-life Examples"
      icon={Lightbulb}
      stripe="border-lime-600"
      iconWrap="bg-lime-100 text-lime-900"
    >
      <BulletList items={guide.realLifeExamples} accent="text-lime-600" />
    </GuideSectionCard>,
    <GuideSectionCard
      key="9"
      sectionNum="Section 9"
      title="Quick Revision Notes"
      icon={ListChecks}
      stripe="border-orange-500"
      iconWrap="bg-orange-100 text-orange-800"
    >
      {guide.quickRevisionNotes.length > 0 ? (
        <ul className="space-y-1.5">
          {guide.quickRevisionNotes.map((note, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-md border border-orange-100 bg-orange-50/60 px-2 py-1.5 text-sm text-slate-800"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
              <span className="whitespace-pre-wrap">{note}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyHint />
      )}
    </GuideSectionCard>,
    <GuideSectionCard
      key="10"
      sectionNum="Section 10"
      title="Practice Questions"
      icon={FileQuestion}
      stripe="border-indigo-600"
      iconWrap="bg-indigo-100 text-indigo-900"
      className="sm:col-span-2"
    >
      {guide.practiceQuestions.length > 0 ? (
        <div className="space-y-2">
          {guide.practiceQuestions.map((q, i) => (
            <PracticeQuestionCard key={`pq-${i}`} q={q} index={i} />
          ))}
        </div>
      ) : (
        <EmptyHint />
      )}
    </GuideSectionCard>,
    <GuideSectionCard
      key="11"
      sectionNum="Section 11"
      title="Tips for Further Improvement"
      icon={Sparkles}
      stripe="border-fuchsia-500"
      iconWrap="bg-fuchsia-100 text-fuchsia-800"
      className="sm:col-span-2"
    >
      <BulletList items={guide.improvementTips} accent="text-fuchsia-500" />
    </GuideSectionCard>,
  ];
}

export function SmartStudyGuideViewer({ content, rawContent, className }: SmartStudyGuideViewerProps) {
  const payload = useMemo(() => {
    if (rawContent != null) return { content: String(content || '').trim(), rawContent };
    return studyGuideViewerPayloadFromRecord({ generatedContent: content });
  }, [content, rawContent]);

  const { guide, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(payload.content);
    return resolveStudyGuideFromPayload(text, payload.rawContent);
  }, [payload.content, payload.rawContent]);

  if (markdownFallback) {
    return (
      <div
        className={cn('w-full', className)}
        dangerouslySetInnerHTML={{ __html: renderSmartStudyGuideMarkdown(markdownFallback) }}
      />
    );
  }

  const bodySections = buildBodySections(guide);
  const mcqCount = guide.practiceQuestions.filter(
    (q) => q.type === 'objective' && q.options.length >= 2,
  ).length;

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div
        className="relative overflow-hidden rounded-3xl border border-indigo-200/80 shadow-xl shadow-indigo-200/25"
        style={{
          backgroundColor: '#eef2ff',
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.09) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-700 via-violet-600 to-cyan-600 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <BookMarked className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-100">
                Smart Study Guide
              </p>
              <h3 className="truncate text-lg font-bold">{guide.title}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                  {guide.keyConcepts.length} concepts
                </Badge>
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                  {guide.practiceQuestions.length} practice Qs
                </Badge>
                {mcqCount > 0 ? (
                  <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                    {mcqCount} MCQs
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1 p-2 sm:p-3">
          <div className="relative overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/90 via-white to-cyan-50/40" />
            <div className="relative p-2.5 sm:p-3">
              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700">
                Section 1
              </p>
              <Badge className="mb-1 border-0 bg-indigo-100 text-indigo-900 hover:bg-indigo-100 text-xs">
                Study Guide Title
              </Badge>
              <h4 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">{guide.title}</h4>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-1 sm:grid-cols-2">{bodySections}</div>
        </div>
      </div>
    </div>
  );
}
