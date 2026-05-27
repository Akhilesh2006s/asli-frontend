import { useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Package,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import {
  lessonHasVisibleContent,
  resolveLessonsFromPayload,
  type NormalizedLesson,
} from '@/lib/parse-lesson-planner';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';

interface LessonPlannerViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
  variant?: 'default' | 'student' | 'teacher';
}

/* ——— Shared lesson sections ——— */

function EmptySectionHint({ audience = 'student' }: { audience?: 'student' | 'teacher' }) {
  return (
    <p className="text-sm text-stone-400 italic rounded-lg border border-dashed border-stone-200 bg-stone-50 px-2.5 py-1.5">
      {audience === 'teacher'
        ? 'Not included in this generation — try regenerating with more detail if you need this section.'
        : 'Not included in this lesson plan.'}
    </p>
  );
}

function BulletList({ items, icon: Icon, iconClass }: { items: string[]; icon: LucideIcon; iconClass: string }) {
  return (
    <ul className="space-y-2">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-800">
          <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', iconClass)} aria-hidden />
          <span className="whitespace-pre-wrap">{line}</span>
        </li>
      ))}
    </ul>
  );
}

type LessonSectionDef = {
  num: number;
  title: string;
  icon: LucideIcon;
  stripe: string;
  iconWrap: string;
  hasContent: (l: NormalizedLesson) => boolean;
  render: (l: NormalizedLesson) => ReactNode;
};

const LESSON_TEMPLATE_SECTIONS: LessonSectionDef[] = [
  {
    num: 2,
    title: 'Learning objectives',
    icon: Target,
    stripe: 'border-cyan-500',
    iconWrap: 'bg-cyan-100 text-cyan-800',
    hasContent: (l) => l.learningObjectives.length > 0,
    render: (l) => <BulletList items={l.learningObjectives} icon={Target} iconClass="text-cyan-600" />,
  },
  {
    num: 3,
    title: 'NCF competency / learning outcome alignment',
    icon: GraduationCap,
    stripe: 'border-blue-500',
    iconWrap: 'bg-blue-100 text-blue-800',
    hasContent: (l) => l.ncfAlignment.length > 0,
    render: (l) => <BulletList items={l.ncfAlignment} icon={GraduationCap} iconClass="text-blue-600" />,
  },
  {
    num: 4,
    title: 'Prior knowledge / diagnostic question',
    icon: HelpCircle,
    stripe: 'border-violet-500',
    iconWrap: 'bg-violet-100 text-violet-800',
    hasContent: (l) => !!l.priorKnowledge,
    render: (l) => <p className="text-sm whitespace-pre-wrap text-slate-800">{l.priorKnowledge}</p>,
  },
  {
    num: 5,
    title: 'Introduction / warm-up',
    icon: Lightbulb,
    stripe: 'border-amber-500',
    iconWrap: 'bg-amber-100 text-amber-900',
    hasContent: (l) => !!l.introductionWarmup,
    render: (l) => <p className="text-sm whitespace-pre-wrap text-slate-800">{l.introductionWarmup}</p>,
  },
  {
    num: 6,
    title: 'Teaching strategy',
    icon: BookOpen,
    stripe: 'border-teal-500',
    iconWrap: 'bg-teal-100 text-teal-800',
    hasContent: (l) => !!l.teachingStrategy || l.keyVocabulary.length > 0,
    render: (l) => (
      <div className="space-y-2">
        {l.teachingStrategy ? (
          <p className="text-sm whitespace-pre-wrap text-slate-800">{l.teachingStrategy}</p>
        ) : null}
        {l.keyVocabulary.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {l.keyVocabulary.map((w, i) => (
              <span
                key={i}
                className="rounded-xl border border-teal-100 bg-teal-50 px-2.5 py-1 text-xs text-teal-900"
              >
                {w}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    ),
  },
  {
    num: 7,
    title: 'Classroom activities',
    icon: ListChecks,
    stripe: 'border-emerald-500',
    iconWrap: 'bg-emerald-100 text-emerald-800',
    hasContent: (l) => l.classroomActivities.length > 0,
    render: (l) => (
      <ol className="space-y-2">
        {l.classroomActivities.map((step, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    num: 8,
    title: 'Teacher talk points',
    icon: MessageCircle,
    stripe: 'border-indigo-500',
    iconWrap: 'bg-indigo-100 text-indigo-700',
    hasContent: (l) => l.teacherTalkPoints.length > 0,
    render: (l) => <BulletList items={l.teacherTalkPoints} icon={MessageCircle} iconClass="text-indigo-600" />,
  },
  {
    num: 9,
    title: 'Student tasks',
    icon: Users,
    stripe: 'border-sky-500',
    iconWrap: 'bg-sky-100 text-sky-800',
    hasContent: (l) => l.studentTasks.length > 0,
    render: (l) => <BulletList items={l.studentTasks} icon={Users} iconClass="text-sky-600" />,
  },
  {
    num: 10,
    title: 'Formative assessment questions',
    icon: ClipboardList,
    stripe: 'border-rose-500',
    iconWrap: 'bg-rose-100 text-rose-800',
    hasContent: (l) => l.formativeQuestions.length > 0,
    render: (l) => (
      <div className="space-y-2">
        {l.formativeQuestions.map((q, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-xs font-bold text-white">
              {i + 1}
            </span>
            <p className="text-sm text-slate-800 pt-0.5">{q}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: 11,
    title: 'Differentiation plan',
    icon: Sparkles,
    stripe: 'border-pink-500',
    iconWrap: 'bg-pink-100 text-pink-800',
    hasContent: (l) => !!l.differentiationPlan || l.valuesAndMoral.length > 0,
    render: (l) => (
      <div className="space-y-2 text-sm text-slate-800">
        {l.differentiationPlan ? <p className="whitespace-pre-wrap">{l.differentiationPlan}</p> : null}
        {l.valuesAndMoral.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {l.valuesAndMoral.map((v, i) => (
              <span
                key={i}
                className="rounded-full border border-pink-100 bg-pink-50 px-2.5 py-1 text-xs text-pink-900"
              >
                {v}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    ),
  },
  {
    num: 12,
    title: 'Homework / practice',
    icon: FileText,
    stripe: 'border-orange-500',
    iconWrap: 'bg-orange-100 text-orange-900',
    hasContent: (l) => !!l.homeworkPractice,
    render: (l) => <p className="text-sm whitespace-pre-wrap text-slate-800">{l.homeworkPractice}</p>,
  },
  {
    num: 13,
    title: 'Teaching aids required',
    icon: Package,
    stripe: 'border-lime-600',
    iconWrap: 'bg-lime-100 text-lime-900',
    hasContent: (l) => l.teachingAids.length > 0,
    render: (l) => (
      <ul className="flex flex-wrap gap-2">
        {l.teachingAids.map((m, i) => (
          <li
            key={i}
            className="rounded-xl border border-lime-100 bg-lime-50 px-2.5 py-1.5 text-sm text-lime-950 list-none"
          >
            {m}
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: 14,
    title: 'Closure / exit ticket',
    icon: CheckCircle2,
    stripe: 'border-cyan-600',
    iconWrap: 'bg-cyan-100 text-cyan-900',
    hasContent: (l) => !!l.closureExitTicket || l.timeline.length > 0,
    render: (l) => (
      <div className="space-y-3 text-sm text-slate-800">
        {l.closureExitTicket ? (
          <p className="whitespace-pre-wrap rounded-lg border-l-4 border-cyan-400 bg-cyan-50/50 px-3 py-2.5">
            {l.closureExitTicket}
          </p>
        ) : null}
        {l.timeline.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">Period / time cues</p>
            <BulletList items={l.timeline} icon={Clock} iconClass="text-cyan-600" />
          </div>
        ) : null}
      </div>
    ),
  },
];

function countFilledLessonSections(lesson: NormalizedLesson): number {
  return LESSON_TEMPLATE_SECTIONS.filter((s) => s.hasContent(lesson)).length;
}

function PlanSectionCard({
  sectionNum,
  title,
  icon: Icon,
  stripe,
  iconWrap,
  children,
}: {
  sectionNum: string;
  title: string;
  icon: LucideIcon;
  stripe: string;
  iconWrap: string;
  children: ReactNode;
}) {
  return (
    <section className="h-fit w-full rounded-2xl bg-white border border-stone-200/90 shadow-sm overflow-hidden">
      <div className={cn('flex items-center gap-2.5 px-3 py-2.5 border-l-[5px]', stripe)}>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconWrap)}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{sectionNum}</p>
          <h4 className="text-xs font-bold text-stone-900 leading-snug">{title}</h4>
        </div>
      </div>
      <div className="px-3 pb-3 pt-1">{children}</div>
    </section>
  );
}

/** Teacher-only: lesson flow grouped by class phase (distinct from activity “kit” cards). */
const LESSON_FLOW_PHASES = [
  {
    id: 'prepare',
    label: 'Before class',
    hint: 'Objectives, prior knowledge & warm-up',
    dotClass: 'bg-sky-600 ring-sky-200',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  {
    id: 'teach',
    label: 'During class',
    hint: 'Teaching, activities & student work',
    dotClass: 'bg-teal-600 ring-teal-200',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-200',
  },
  {
    id: 'wrap',
    label: 'Wrap-up',
    hint: 'Assessment, homework & closure',
    dotClass: 'bg-amber-600 ring-amber-200',
    badgeClass: 'bg-amber-100 text-amber-950 border-amber-200',
  },
] as const;

const SECTION_PHASE: Record<number, (typeof LESSON_FLOW_PHASES)[number]['id']> = {
  2: 'prepare',
  3: 'prepare',
  4: 'prepare',
  5: 'prepare',
  6: 'teach',
  7: 'teach',
  8: 'teach',
  9: 'teach',
  10: 'wrap',
  11: 'wrap',
  12: 'wrap',
  13: 'wrap',
  14: 'wrap',
};

function PlannerTimelineStep({
  sectionNum,
  title,
  icon: Icon,
  dotClass,
  isLast,
  children,
}: {
  sectionNum: number;
  title: string;
  icon: LucideIcon;
  dotClass: string;
  isLast: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative flex gap-3 sm:gap-4">
      <div className="flex flex-col items-center pt-0.5">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ring-4',
            dotClass,
          )}
        >
          {sectionNum}
        </div>
        {!isLast ? (
          <div
            className="w-px flex-1 min-h-[20px] mt-2 bg-gradient-to-b from-slate-300 via-slate-200 to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
      <article className="mb-5 min-w-0 flex-1 rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-sm last:mb-0">
        <header className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <h4 className="text-sm font-semibold text-slate-900 leading-snug">{title}</h4>
        </header>
        <div className="text-sm leading-relaxed text-slate-800">{children}</div>
      </article>
    </div>
  );
}

function TeacherLessonCard({ lesson }: { lesson: NormalizedLesson }) {
  const filled = countFilledLessonSections(lesson);
  const total = LESSON_TEMPLATE_SECTIONS.length;
  const progressPct = Math.round((filled / total) * 100);

  return (
    <div className="space-y-5">
      {/* Planner page header — notebook style, not “kit” hero */}
      <div className="rounded-xl border-2 border-dashed border-amber-300/70 bg-gradient-to-br from-amber-50/90 via-white to-sky-50/40 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800/80 mb-1">
              Lesson · Period plan
            </p>
            <h4 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight font-serif">
              {lesson.lessonName}
            </h4>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="rounded border-amber-200 bg-amber-100/80 text-amber-950 hover:bg-amber-100/80 font-medium">
                Lesson {lesson.sl}
              </Badge>
              {lesson.subjectArea ? (
                <span className="text-xs text-slate-600">{lesson.subjectArea}</span>
              ) : null}
              {lesson.durationLabel ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-800">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {lesson.durationLabel}
                </span>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-36">
            <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Flow ready</p>
            <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-teal-500 to-amber-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 text-right">
              {filled}/{total} blocks
            </p>
          </div>
        </div>
      </div>

      {LESSON_FLOW_PHASES.map((phase) => {
        const phaseSections = LESSON_TEMPLATE_SECTIONS.filter(
          (sec) => SECTION_PHASE[sec.num] === phase.id,
        );

        return (
          <section key={phase.id} aria-label={phase.label}>
            <div
              className={cn(
                'mb-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2',
                phase.badgeClass,
              )}
            >
              <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', phase.dotClass.split(' ')[0])} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide">{phase.label}</p>
                <p className="text-[11px] opacity-80">{phase.hint}</p>
              </div>
            </div>
            <div className="pl-1 sm:pl-2">
              {phaseSections.map((sec, idx) => (
                <PlannerTimelineStep
                  key={sec.num}
                  sectionNum={sec.num}
                  title={sec.title}
                  icon={sec.icon}
                  dotClass={phase.dotClass}
                  isLast={idx === phaseSections.length - 1}
                >
                  {sec.hasContent(lesson) ? (
                    sec.render(lesson)
                  ) : (
                    <EmptySectionHint audience="teacher" />
                  )}
                </PlannerTimelineStep>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TeacherLessonShell({
  lessonCount,
  bookName,
  classLabel,
  children,
}: {
  lessonCount: number;
  bookName: string;
  classLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200/80 shadow-lg shadow-amber-900/5">
        {/* Ruled planner paper */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.35) 1px, transparent 1px)',
            backgroundSize: '100% 28px',
            backgroundPosition: '0 72px',
          }}
          aria-hidden
        />
        <div className="relative border-b border-slate-700/20 bg-gradient-to-br from-slate-800 via-teal-900 to-sky-900 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-400/90 text-slate-900 shadow-md rotate-[-2deg]">
                <Calendar className="h-6 w-6" aria-hidden />
              </div>
              <div className="text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-200/90">
                  Lesson Planner
                </p>
                <h3 className="text-lg font-bold sm:text-xl font-serif">Classroom day flow</h3>
                {(classLabel || bookName) && (
                  <p className="text-xs text-sky-100/85 mt-0.5">
                    {[classLabel && `Class ${classLabel}`, bookName].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
            {lessonCount > 1 ? (
              <span className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-amber-100 ring-1 ring-white/20">
                {lessonCount} periods
              </span>
            ) : lessonCount === 1 ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-100 ring-1 ring-amber-300/30">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                One lesson block
              </span>
            ) : null}
          </div>
        </div>
        <div className="relative bg-[#fffdf8]/95 p-3 sm:p-5 max-h-[min(80vh,900px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function TeacherMarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div
      className="prose prose-sm max-w-none rounded-xl border border-slate-200 bg-white/90 p-4 sm:p-5 shadow-sm prose-headings:font-serif prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
    />
  );
}

/* ——— Student UI ——— */

function StudentLessonCard({ lesson }: { lesson: NormalizedLesson }) {
  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl bg-white border border-cyan-200 shadow-md">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/90 via-white to-sky-50/50" />
        <div className="relative p-3 sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 mb-1">
            1. Lesson title
          </p>
          <Badge className="mb-1.5 border-0 bg-cyan-100 text-cyan-900 hover:bg-cyan-100">
            Lesson {lesson.sl}
          </Badge>
          <h4 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">{lesson.lessonName}</h4>
          {(lesson.subjectArea || lesson.durationLabel) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
              {lesson.subjectArea ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5">{lesson.subjectArea}</span>
              ) : null}
              {lesson.durationLabel ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-0.5 text-cyan-900">
                  <Clock className="h-3 w-3" aria-hidden />
                  {lesson.durationLabel}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="columns-1 sm:columns-2 gap-2">
        {LESSON_TEMPLATE_SECTIONS.map((sec) => (
          <div key={sec.num} className="mb-2 break-inside-avoid">
            <PlanSectionCard
              sectionNum={`Section ${sec.num}`}
              title={sec.title}
              icon={sec.icon}
              stripe={sec.stripe}
              iconWrap={sec.iconWrap}
            >
              {sec.hasContent(lesson) ? sec.render(lesson) : <EmptySectionHint audience="student" />}
            </PlanSectionCard>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentMarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div
      className="prose prose-sm max-w-none rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
    />
  );
}

function StudentLessonShell({
  lessonCount,
  bookName,
  classLabel,
  children,
}: {
  lessonCount: number;
  bookName: string;
  classLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full">
      <div
        className="relative overflow-hidden rounded-3xl border border-cyan-200/80 shadow-xl shadow-cyan-200/30"
        style={{
          backgroundColor: '#ecfeff',
          backgroundImage: 'radial-gradient(circle, rgba(6,182,212,0.1) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="border-b border-cyan-100 bg-gradient-to-r from-cyan-600 via-sky-600 to-teal-500 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Calendar className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-100">Lesson studio</p>
                <h3 className="text-lg font-bold">Lesson Planner</h3>
                {(classLabel || bookName) && (
                  <p className="text-xs text-cyan-100/90 mt-0.5">
                    {[classLabel && `Class ${classLabel}`, bookName].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
            {lessonCount > 0 ? (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
        </div>
        <div className="p-3 sm:p-4">{children}</div>
      </div>
    </div>
  );
}

export function LessonPlannerViewer({
  content,
  rawContent,
  className,
  variant = 'default',
}: LessonPlannerViewerProps) {
  const parsedContent = useMemo(
    () => stripStructuredAiToolMetadata(String(content || '')),
    [content],
  );

  const resolved = useMemo(
    () => resolveLessonsFromPayload(parsedContent, rawContent),
    [parsedContent, rawContent],
  );

  const [lessonIdx, setLessonIdx] = useState(0);

  if (variant === 'student') {
    const lessons = resolved.lessons;
    const useMarkdown =
      !!resolved.markdownFallback &&
      (!lessons.length || !lessons.some(lessonHasVisibleContent));

    if (useMarkdown && resolved.markdownFallback) {
      return (
        <div className={className}>
          <StudentLessonShell
            lessonCount={0}
            bookName={resolved.book}
            classLabel={resolved.className}
          >
            <StudentMarkdownBody markdown={resolved.markdownFallback} />
          </StudentLessonShell>
        </div>
      );
    }

    if (!lessons.length) {
      return (
        <div className={cn('text-center py-12 text-gray-500', className)}>
          <p>No lesson plans found in the generated content.</p>
        </div>
      );
    }

    const safeIdx = Math.min(lessonIdx, lessons.length - 1);
    const current = lessons[safeIdx];

    return (
      <div className={className}>
        <StudentLessonShell
          lessonCount={lessons.length}
          bookName={resolved.book}
          classLabel={resolved.className}
        >
          {lessons.length > 1 ? (
            <div className="flex flex-wrap gap-2 mb-2">
              {lessons.map((l, i) => (
                <button
                  key={`${l.lessonName}-${i}`}
                  type="button"
                  onClick={() => setLessonIdx(i)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-bold transition-all max-w-full truncate',
                    i === safeIdx
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-white text-cyan-800 border border-cyan-100',
                  )}
                >
                  {l.lessonName}
                </button>
              ))}
            </div>
          ) : null}
          <AnimatePresence mode="wait">
            <motion.div
              key={safeIdx}
              className="h-fit"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <StudentLessonCard lesson={current} />
            </motion.div>
          </AnimatePresence>
        </StudentLessonShell>
      </div>
    );
  }

  const lessons = resolved.lessons;
  const useMarkdown =
    !!resolved.markdownFallback && (!lessons.length || !lessons.some(lessonHasVisibleContent));

  if (useMarkdown && resolved.markdownFallback) {
    return (
      <div className={className}>
        <TeacherLessonShell
          lessonCount={0}
          bookName={resolved.book}
          classLabel={resolved.className}
        >
          <TeacherMarkdownBody markdown={resolved.markdownFallback} />
        </TeacherLessonShell>
      </div>
    );
  }

  if (!lessons.length) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 px-6 py-14 text-center',
          className,
        )}
      >
        <Calendar className="mx-auto h-10 w-10 text-amber-500/70 mb-3" aria-hidden />
        <p className="text-sm font-medium text-stone-700">No lesson plan found for this selection</p>
        <p className="text-xs text-stone-500 mt-1">Try generating again or pick another topic.</p>
      </div>
    );
  }

  const safeIdx = Math.min(lessonIdx, lessons.length - 1);
  const current = lessons[safeIdx];

  return (
    <div className={className}>
      <TeacherLessonShell
        lessonCount={lessons.length}
        bookName={resolved.book}
        classLabel={resolved.className}
      >
        {lessons.length > 1 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {lessons.map((l, i) => (
              <button
                key={`${l.lessonName}-${i}`}
                type="button"
                onClick={() => setLessonIdx(i)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-bold transition-all max-w-full truncate',
                  i === safeIdx
                    ? 'bg-teal-800 text-amber-50 shadow-md ring-2 ring-amber-300/50'
                    : 'bg-white text-slate-800 border border-amber-200 hover:bg-amber-50/80',
                )}
              >
                Lesson {i + 1}: {l.lessonName}
              </button>
            ))}
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          <motion.div
            key={safeIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <TeacherLessonCard lesson={current} />
          </motion.div>
        </AnimatePresence>
      </TeacherLessonShell>
    </div>
  );
}
