import { useMemo, type ReactNode } from 'react';
import {
  BookOpen,
  Brain,
  ClipboardList,
  Eye,
  FileText,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { displayQuestionSerial } from '@/lib/renumber-questions';
import { stripMarkdownSyntax } from '@/lib/strip-markdown-syntax';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { GeneratedRecordBody } from '@/components/super-admin/generated-record-body';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  homeworkHasVisibleContent,
  resolveHomeworkFromPayload,
  type NormalizedHomework,
  type HomeworkPracticeQuestion,
} from '@/lib/parse-homework-creator';
import { StructuredContentRequired } from '@/components/structured-content-required';

export interface HomeworkCreatorViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
}

function PlainField({ text }: { text: string }) {
  return (
    <p className="text-sm whitespace-pre-wrap text-slate-800">{stripMarkdownSyntax(text)}</p>
  );
}

type SectionDef = {
  num: number;
  label: string;
  icon: LucideIcon;
  stripe: string;
  iconWrap: string;
  hasContent: (h: NormalizedHomework) => boolean;
  render: (h: NormalizedHomework) => ReactNode;
};

const HOMEWORK_SECTIONS: SectionDef[] = [
  {
    num: 2,
    label: 'Clear Student Instructions',
    icon: BookOpen,
    stripe: 'border-orange-500',
    iconWrap: 'bg-orange-100 text-orange-900',
    hasContent: (h) => !!h.instructions,
    render: (h) => <PlainField text={h.instructions} />,
  },
  {
    num: 3,
    label: 'Practice Questions',
    icon: ListChecks,
    stripe: 'border-amber-500',
    iconWrap: 'bg-amber-100 text-amber-900',
    hasContent: (h) => h.practiceQuestions.length > 0,
    render: (h) => <PracticeQuestionList questions={h.practiceQuestions} />,
  },
  {
    num: 4,
    label: 'Application-based Tasks',
    icon: Lightbulb,
    stripe: 'border-yellow-500',
    iconWrap: 'bg-yellow-100 text-yellow-900',
    hasContent: (h) => h.applicationTasks.length > 0,
    render: (h) => <BulletList items={h.applicationTasks} />,
  },
  {
    num: 5,
    label: 'One Creative / Thinking Question',
    icon: Brain,
    stripe: 'border-violet-500',
    iconWrap: 'bg-violet-100 text-violet-900',
    hasContent: (h) => !!h.creativeThinkingQuestion,
    render: (h) => <PlainField text={h.creativeThinkingQuestion} />,
  },
  {
    num: 6,
    label: 'One Real-life Observation Task',
    icon: Eye,
    stripe: 'border-cyan-500',
    iconWrap: 'bg-cyan-100 text-cyan-900',
    hasContent: (h) => !!h.realLifeObservationTask,
    render: (h) => <PlainField text={h.realLifeObservationTask} />,
  },
  {
    num: 7,
    label: 'Challenge Question',
    icon: Sparkles,
    stripe: 'border-rose-500',
    iconWrap: 'bg-rose-100 text-rose-900',
    hasContent: (h) => !!h.challengeQuestion,
    render: (h) => <PlainField text={h.challengeQuestion} />,
  },
  {
    num: 8,
    label: 'Support Hint for Struggling Learners',
    icon: HelpCircle,
    stripe: 'border-teal-500',
    iconWrap: 'bg-teal-100 text-teal-900',
    hasContent: (h) => !!h.supportHint,
    render: (h) => <PlainField text={h.supportHint} />,
  },
  {
    num: 9,
    label: 'Answer Hints / Key Points',
    icon: ClipboardList,
    stripe: 'border-emerald-500',
    iconWrap: 'bg-emerald-100 text-emerald-900',
    hasContent: (h) => !!h.answerHints,
    render: (h) => <PlainField text={h.answerHints} />,
  },
  {
    num: 10,
    label: 'Parent Note',
    icon: Users,
    stripe: 'border-indigo-500',
    iconWrap: 'bg-indigo-100 text-indigo-900',
    hasContent: (h) => !!h.parentNote,
    render: (h) => <PlainField text={h.parentNote} />,
  },
];

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-800">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
          <span className="whitespace-pre-wrap">{stripMarkdownSyntax(line)}</span>
        </li>
      ))}
    </ul>
  );
}

function PracticeQuestionList({ questions }: { questions: HomeworkPracticeQuestion[] }) {
  return (
    <div className="space-y-3">
      {questions.map((q, i) => {
        const num = displayQuestionSerial(i);
        return (
          <div
            key={i}
            className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm space-y-2"
          >
            <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap leading-relaxed">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-orange-600 text-xs font-bold text-white mr-2">
                {num}
              </span>
              {stripMarkdownSyntax(q.question)}
            </p>
            {(q.type || q.marks != null) ? (
              <div className="pl-8 flex flex-wrap gap-2">
                {q.type ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                    {q.type}
                  </span>
                ) : null}
                {q.marks != null ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {q.marks} marks
                  </span>
                ) : null}
              </div>
            ) : null}
            {q.options.length > 0 ? (
              <ul className="grid gap-2 sm:grid-cols-2 pl-8">
                {q.options.map((opt, j) => (
                  <li key={j} className="text-sm text-slate-700 rounded-lg bg-slate-50 px-2 py-1.5 whitespace-pre-wrap">
                    {opt}
                  </li>
                ))}
              </ul>
            ) : null}
            {q.answer ? (
              <p className="text-xs text-emerald-800 pl-8">
                <span className="font-semibold">Answer:</span> {q.answer}
              </p>
            ) : null}
            {q.explanation ? (
              <p className="text-xs text-indigo-800 pl-8 whitespace-pre-wrap">
                <span className="font-semibold">Explanation:</span> {q.explanation}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({
  sectionNum,
  label,
  icon: Icon,
  stripe,
  iconWrap,
  children,
}: {
  sectionNum: string;
  label: string;
  icon: LucideIcon;
  stripe: string;
  iconWrap: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200/90 bg-white shadow-sm overflow-hidden">
      <div className={cn('flex items-center gap-2.5 px-3 py-2.5 border-l-[5px]', stripe)}>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconWrap)}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{sectionNum}</p>
          <h4 className="text-xs font-bold text-stone-900 leading-snug">{label}</h4>
        </div>
      </div>
      <div className="px-3 pb-3 pt-1">{children}</div>
    </section>
  );
}

export function HomeworkCreatorViewer({ content, rawContent, className }: HomeworkCreatorViewerProps) {
  const parsedContent = useMemo(
    () => stripStructuredAiToolMetadata(String(content || '')),
    [content],
  );

  const resolved = useMemo(
    () => resolveHomeworkFromPayload(parsedContent, rawContent),
    [parsedContent, rawContent],
  );

  const homework = resolved.homework;

  if (!homework || !homeworkHasVisibleContent(homework)) {
    return <StructuredContentRequired className={className} toolLabel="Homework Creator" />;
  }

  const filled = HOMEWORK_SECTIONS.filter((s) => s.hasContent(homework)).length;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-xl border-2 border-dashed border-orange-300/70 bg-gradient-to-br from-orange-50/90 via-white to-amber-50/40 px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-800/80 mb-1">
          1. Homework Title
        </p>
        <h3 className="text-xl font-bold text-slate-900 leading-tight">{stripMarkdownSyntax(homework.title)}</h3>
        <p className="text-[11px] text-slate-500 mt-2">
          {filled}/{HOMEWORK_SECTIONS.length} sections filled
        </p>
      </div>

      <div className="space-y-3">
        {HOMEWORK_SECTIONS.map((sec) => (
          <div key={sec.num}>
            <SectionCard
              sectionNum={`Section ${sec.num}`}
              label={sec.label}
              icon={sec.icon}
              stripe={sec.stripe}
              iconWrap={sec.iconWrap}
            >
              {sec.hasContent(homework) ? (
                sec.render(homework)
              ) : (
                <p className="text-sm text-stone-400 italic">Not included in this generation.</p>
              )}
            </SectionCard>
          </div>
        ))}
      </div>
    </div>
  );
}
