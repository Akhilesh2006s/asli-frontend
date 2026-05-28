import { useMemo, type ReactNode } from 'react';
import {
  BookOpen,
  CircleCheck,
  ClipboardList,
  FileQuestion,
  HelpCircle,
  KeyRound,
  ListChecks,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  countPracticeQaQuestions,
  practiceQaViewerPayloadFromRecord,
  PRACTICE_QA_REAL_LIFE_SECTION,
  resolvePracticeQaFromPayload,
  type NormalizedPracticeQa,
  type PracticeQaQuestion,
  type PracticeQaSection,
} from '@/lib/parse-practice-qa';
import { renderPracticeQaMarkdown } from '@/lib/render-practice-qa-markdown';

export { practiceQaViewerPayloadFromRecord };

interface PracticeQaViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
}

const SECTION_VISUAL: Record<
  string,
  { icon: LucideIcon; stripe: string; iconWrap: string; badge: string }
> = {
  'Section A: MCQs': {
    icon: ListChecks,
    stripe: 'border-emerald-500',
    iconWrap: 'bg-emerald-100 text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  'Section B: Fill in the Blanks': {
    icon: ClipboardList,
    stripe: 'border-teal-500',
    iconWrap: 'bg-teal-100 text-teal-800',
    badge: 'bg-teal-100 text-teal-800',
  },
  'Section C: Match the Following': {
    icon: Target,
    stripe: 'border-cyan-500',
    iconWrap: 'bg-cyan-100 text-cyan-800',
    badge: 'bg-cyan-100 text-cyan-800',
  },
  'Section D: Very Short Answer Questions': {
    icon: FileQuestion,
    stripe: 'border-sky-500',
    iconWrap: 'bg-sky-100 text-sky-800',
    badge: 'bg-sky-100 text-sky-800',
  },
  'Section E: Short Answer Questions': {
    icon: BookOpen,
    stripe: 'border-blue-500',
    iconWrap: 'bg-blue-100 text-blue-800',
    badge: 'bg-blue-100 text-blue-800',
  },
  'Section F: Application / Case-based Questions': {
    icon: Sparkles,
    stripe: 'border-orange-500',
    iconWrap: 'bg-orange-100 text-orange-800',
    badge: 'bg-orange-100 text-orange-800',
  },
  'Section G: HOTS / Analytical Questions': {
    icon: Zap,
    stripe: 'border-fuchsia-500',
    iconWrap: 'bg-fuchsia-100 text-fuchsia-800',
    badge: 'bg-fuchsia-100 text-fuchsia-800',
  },
  [PRACTICE_QA_REAL_LIFE_SECTION]: {
    icon: Sparkles,
    stripe: 'border-green-600',
    iconWrap: 'bg-green-100 text-green-900',
    badge: 'bg-green-100 text-green-900',
  },
};

function SectionCard({
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
        'h-fit w-full overflow-hidden rounded-xl border border-emerald-200/90 bg-white shadow-sm',
        className,
      )}
    >
      <div className={cn('flex items-center gap-2 border-l-[4px] px-2.5 py-1.5', stripe)}>
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', iconWrap)}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">{sectionNum}</p>
          <h4 className="text-xs font-bold leading-tight text-slate-900">{title}</h4>
        </div>
      </div>
      <div className="px-2.5 pb-2 pt-0.5">{children}</div>
    </section>
  );
}

function EmptyHint({ label = 'No items in this section.' }: { label?: string }) {
  return (
    <p className="rounded-md border border-dashed border-emerald-200 bg-emerald-50/40 px-2 py-1 text-xs italic text-slate-400">
      {label}
    </p>
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

function QuestionCard({ q, index }: { q: PracticeQaQuestion; index: number }) {
  const num = q.questionNumber ?? index + 1;
  const isMcq = q.options.length >= 2;
  const visual = q.section ? SECTION_VISUAL[q.section] : null;

  return (
    <article className="rounded-lg border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
          Q{num}
        </span>
        {q.type ? (
          <Badge variant="outline" className="border-0 text-[10px] font-semibold bg-slate-100 text-slate-700">
            {q.type}
          </Badge>
        ) : isMcq ? (
          <Badge className={cn('border-0 text-[10px] font-semibold', visual?.badge || 'bg-emerald-100 text-emerald-800')}>
            MCQ
          </Badge>
        ) : null}
        {q.marks != null ? (
          <Badge className="border-0 bg-amber-100 text-amber-900 text-[10px] hover:bg-amber-100">
            {q.marks} mark{q.marks === 1 ? '' : 's'}
          </Badge>
        ) : null}
        {q.bloomLevel ? (
          <Badge variant="outline" className="text-[10px] border-violet-200 text-violet-700">
            {q.bloomLevel}
          </Badge>
        ) : null}
        {q.difficultyTag ? (
          <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600">
            {q.difficultyTag}
          </Badge>
        ) : null}
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
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                  {label}
                </span>
                <span className="min-w-0 flex-1 pt-0.5">{text}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {q.answer ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800 border border-emerald-100">
          <CircleCheck className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>
            <span className="font-semibold">Answer:</span> {q.answer}
          </span>
        </p>
      ) : null}
      {q.explanation ? (
        <p className="mt-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600 border border-slate-100">
          <span className="font-semibold text-slate-700">Explanation:</span> {q.explanation}
        </p>
      ) : null}
    </article>
  );
}

function SectionQuestionsBlock({ sec }: { sec: PracticeQaSection }) {
  const visual = SECTION_VISUAL[sec.label] || SECTION_VISUAL['Section A: MCQs'];
  const Icon = visual.icon;
  const shortTitle = sec.label.replace(/^Section [A-G]:\s*/i, '');

  const sectionNum = sec.displayLabel.match(/^(\d+)\./)?.[1]
    ? `Section ${sec.displayLabel.match(/^(\d+)\./)?.[1]}`
    : 'Section';

  if (!sec.questions.length) {
    return (
      <SectionCard
        sectionNum={sectionNum}
        title={shortTitle}
        icon={Icon}
        stripe={visual.stripe}
        iconWrap={visual.iconWrap}
      >
        <EmptyHint label="No Match-the-Following question was generated for this set. Click Generate again — the tool now requires at least one question in Section C." />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      sectionNum={sectionNum}
      title={shortTitle}
      icon={Icon}
      stripe={visual.stripe}
      iconWrap={visual.iconWrap}
      className="sm:col-span-2"
    >
      <div className="space-y-2">
        {sec.questions.map((q, i) => (
          <QuestionCard key={`${sec.id}-q-${i}`} q={q} index={i} />
        ))}
      </div>
    </SectionCard>
  );
}

function CompactSectionColumns({ children }: { children: ReactNode[] }) {
  const left = children.filter((_, i) => i % 2 === 0);
  const right = children.filter((_, i) => i % 2 === 1);
  return (
    <div className="grid grid-cols-1 items-start gap-0.5 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-0.5">{left}</div>
      <div className="flex min-w-0 flex-col gap-0.5">{right}</div>
    </div>
  );
}

function PracticeQaBody({ practice }: { practice: NormalizedPracticeQa }) {
  const setupSections = [
    practice.learningObjectives.length > 0 ? (
      <SectionCard
        key="lo"
        sectionNum="Section 2"
        title="Learning Objectives"
        icon={Target}
        stripe="border-teal-500"
        iconWrap="bg-teal-100 text-teal-800"
      >
        <ul className="space-y-1.5">
          {practice.learningObjectives.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-800">
              <span className="mt-0.5 shrink-0 text-teal-500">•</span>
              <span className="leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    ) : null,
    practice.instructions ? (
      <SectionCard
        key="inst"
        sectionNum="Section 3"
        title="Instructions to Students"
        icon={BookOpen}
        stripe="border-green-500"
        iconWrap="bg-green-100 text-green-800"
      >
        <RichTextBlock text={practice.instructions} />
      </SectionCard>
    ) : null,
  ].filter(Boolean) as ReactNode[];

  const questionSections = practice.sections.map((sec) => (
    <SectionQuestionsBlock key={sec.id} sec={sec} />
  ));

  const realLifeBlock =
    practice.realLifeQuestions.length > 0 ? (
      <SectionCard
        sectionNum="Real-life"
        title="Problem-solving Questions"
        icon={Sparkles}
        stripe="border-green-600"
        iconWrap="bg-green-100 text-green-900"
        className="sm:col-span-2"
      >
        <div className="space-y-2">
          {practice.realLifeQuestions.map((q, i) => (
            <QuestionCard key={`rl-${i}`} q={q} index={i} />
          ))}
        </div>
      </SectionCard>
    ) : null;

  return (
    <div className="mt-0.5 flex flex-col gap-0.5">
      {setupSections.length > 0 ? <CompactSectionColumns>{setupSections}</CompactSectionColumns> : null}
      <div className="grid grid-cols-1 gap-0.5">{questionSections}</div>
      {realLifeBlock}
      {practice.answerKey ? (
        <SectionCard
          sectionNum="Section 11"
          title="Answer Key with Explanations"
          icon={KeyRound}
          stripe="border-emerald-600"
          iconWrap="bg-emerald-100 text-emerald-900"
          className="sm:col-span-2"
        >
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-2.5 py-2">
            <RichTextBlock text={practice.answerKey} />
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

export function PracticeQaViewer({ content, rawContent, className }: PracticeQaViewerProps) {
  const payload = useMemo(() => {
    if (rawContent != null) return { content: String(content || '').trim(), rawContent };
    return practiceQaViewerPayloadFromRecord({ generatedContent: content });
  }, [content, rawContent]);

  const { practice, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(payload.content);
    return resolvePracticeQaFromPayload(text, payload.rawContent);
  }, [payload.content, payload.rawContent]);

  if (markdownFallback) {
    return (
      <div
        className={cn('w-full', className)}
        dangerouslySetInnerHTML={{ __html: renderPracticeQaMarkdown(markdownFallback) }}
      />
    );
  }

  if (!practice) {
    return (
      <p className={cn('text-sm italic text-slate-500', className)}>No practice content to display.</p>
    );
  }

  const totalQs = countPracticeQaQuestions(practice);
  const mcqCount = practice.sections
    .find((s) => s.label.includes('MCQ'))
    ?.questions.filter((q) => q.options.length >= 2).length ?? 0;

  return (
    <div className={cn('w-full space-y-1', className)}>
      <div
        className="relative overflow-hidden rounded-3xl border border-emerald-200/80 shadow-xl shadow-emerald-200/25"
        style={{
          backgroundColor: '#ecfdf5',
          backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.09) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-700 via-green-600 to-teal-600 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <HelpCircle className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">
                Smart Q&amp;A Practice Generator
              </p>
              <h3 className="truncate text-lg font-bold">{practice.title}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                  {totalQs} question{totalQs !== 1 ? 's' : ''}
                </Badge>
                {mcqCount > 0 ? (
                  <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                    {mcqCount} MCQs
                  </Badge>
                ) : null}
                {practice.sections.filter((s) => s.questions.length > 0).length > 0 ? (
                  <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                    {practice.sections.filter((s) => s.questions.length > 0).length} sections
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-0.5 p-1.5 sm:p-2">
          <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40" />
            <div className="relative p-2.5 sm:p-3">
              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                Section 1
              </p>
              <Badge className="mb-1 border-0 bg-emerald-100 text-emerald-900 hover:bg-emerald-100 text-xs">
                Practice Set Title
              </Badge>
              <h4 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">{practice.title}</h4>
            </div>
          </div>

          <PracticeQaBody practice={practice} />
        </div>
      </div>
    </div>
  );
}
