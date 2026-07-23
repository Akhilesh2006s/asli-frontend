import { AiToolStackedSection } from '@/components/ai-tool-stacked-section';
import { QuestionFigure } from '@/components/ai-tools/QuestionFigure';
import { MatchFollowingCard } from '@/components/ai-tools/MatchFollowingCard';
import { ToolSectionIcon } from '@/components/ai-tool-3d-icons';
import { useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
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
import { isMatchQuestionType } from '@/lib/match-following';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { GeneratedRecordBody } from '@/components/super-admin/generated-record-body';
import { stripStructuredAiToolMetadata, stripAiGeneratorLeakage } from '@/lib/strip-ai-tool-metadata';
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
        const isMatch =
          isMatchQuestionType(q.type) ||
          (Array.isArray(q.matchPairs) && q.matchPairs.length >= 2);
        if (isMatch && q.matchPairs && q.matchPairs.length >= 2) {
          return (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-orange-600 text-xs font-bold text-white">
                  {num}
                </span>
                {q.marks != null ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-mini font-medium text-slate-700">
                    {q.marks} marks
                  </span>
                ) : null}
              </div>
              <MatchFollowingCard question={q.question} matchPairs={q.matchPairs} showAnswer />
            </div>
          );
        }
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
            <QuestionFigure imageUrl={q.imageUrl} alt={`Figure for question ${num}`} className="ml-8" />
            {(q.type || q.marks != null) ? (
              <div className="pl-8 flex flex-wrap gap-2">
                {q.type ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-mini font-medium text-amber-900">
                    {q.type}
                  </span>
                ) : null}
                {q.marks != null ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-mini font-medium text-slate-700">
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
  children,
}: {
  sectionNum: string;
  label: string;
  icon: LucideIcon;
  stripe?: string;
  iconWrap?: string;
  children: ReactNode;
}) {
  return (
    <AiToolStackedSection num={sectionNum} title={label} icon={Icon}>
      {children}
    </AiToolStackedSection>
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

  const visibleSections = HOMEWORK_SECTIONS.filter((s) => s.hasContent(homework));
  const filled = visibleSections.length;

  return (
    <div className={cn('space-y-5', className)}>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        data-ai-focus-hide
        className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-orange-50 via-white to-amber-50/60 p-5 shadow-[0_20px_50px_-28px_rgba(249,115,22,0.35)] sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-mini font-semibold text-orange-800">
              <Sparkles className="h-3.5 w-3.5" />
              Homework Creator · AI V2
            </div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {stripAiGeneratorLeakage(stripMarkdownSyntax(homework.title))}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {filled} section{filled === 1 ? '' : 's'} ready · {homework.practiceQuestions.length} practice
              questions
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg">
            <ClipboardList className="h-7 w-7" aria-hidden />
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
            style={{ width: `${Math.round((filled / Math.max(HOMEWORK_SECTIONS.length, 1)) * 100)}%` }}
          />
        </div>
      </motion.section>

      <div className="space-y-3">
        {visibleSections.map((sec, i) => (
          <div key={sec.num}>
            <SectionCard
              sectionNum={`${i + 1}`}
              label={sec.label}
              icon={sec.icon}
              stripe={sec.stripe}
              iconWrap={sec.iconWrap}
            >
              {sec.render(homework)}
            </SectionCard>
          </div>
        ))}
      </div>

    </div>
  );
}
