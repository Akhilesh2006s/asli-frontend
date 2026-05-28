import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Package,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import {
  cleanReflectionProse,
  dedupePeriodTimeCues,
  resolveActivitiesFromPayload,
  type ParsedActivity,
} from '@/lib/parse-activity-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';

export type ActivityProject = ParsedActivity;

type NormalizedActivity = {
  sl: number;
  title: string;
  subtopicLink: string;
  learningObjectives: string[];
  ncfAlignment: string[];
  materials: string[];
  steps: string[];
  teacherInstructions: string[];
  studentInstructions: string[];
  safetyCareInstructions: string[];
  observationTable: string;
  creativeOutput: string;
  differentiation: string;
  selfAssessmentRubric: string[];
  assessmentRubric: string[];
  expectedOutcomes: string;
  realLife: string;
  reflection: string;
};

function stripOrderedPrefix(line: string): string {
  return String(line || '')
    .replace(/^\s*\d+[\).\s]+/i, '')
    .replace(/^\s*[-*•]\s*/, '')
    .trim();
}

function coalesceLines(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => stripOrderedPrefix(String(x ?? ''))).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v.split(/\n+/).map(stripOrderedPrefix).filter(Boolean);
  }
  return [];
}

function normalizeActivity(
  raw: ActivityProject,
  idx: number,
  mode: 'student' | 'teacher',
): NormalizedActivity {
  const a = raw || {};
  const ncfRaw = a.ncf_competency_alignment;
  const ncf = Array.isArray(ncfRaw)
    ? ncfRaw.map((x) => String(x).trim()).filter(Boolean)
    : String(ncfRaw || '')
        .split(/[;\n]+/)
        .map((x) => x.trim())
        .filter(Boolean);

  const studentSteps = coalesceLines(a.student_instructions);
  const procedureSteps = coalesceLines(a.step_by_step_procedure || a.steps || a.instructions);
  const steps =
    mode === 'teacher'
      ? procedureSteps
      : studentSteps.length
        ? studentSteps
        : procedureSteps;

  return {
    sl: Number(a.sl_no) || idx + 1,
    title: String(a.title || a.name || `Activity ${idx + 1}`).trim(),
    subtopicLink: String(a.subtopic_link_prior_knowledge || '').trim(),
    learningObjectives: coalesceLines(a.learning_objectives || a.learningObjectives),
    ncfAlignment: ncf,
    materials: coalesceLines(a.materials_required || a.materials),
    steps,
    teacherInstructions: coalesceLines(a.teacher_instructions),
    studentInstructions: studentSteps.length ? studentSteps : coalesceLines(a.student_instructions),
    safetyCareInstructions: coalesceLines(a.safety_care_instructions || a.safety_instructions),
    observationTable: String(a.observation_data_recording_table || a.observation_table || '').trim(),
    creativeOutput: String(a.creative_output_final_product || a.creative_output || '').trim(),
    differentiation: String(a.differentiation_support_extension || a.differentiation || '').trim(),
    selfAssessmentRubric: coalesceLines(a.self_assessment_rubric || a.assessment),
    assessmentRubric: coalesceLines(
      a.assessment_criteria_rubric || a.assessment || a.evaluation,
    ),
    expectedOutcomes: String(
      a.expected_learning_outcomes || a.learning_outcome || a.learning_outcomes || a.expected_outcome || '',
    ).trim(),
    realLife: String(a.real_life_application || '').trim(),
    reflection: cleanReflectionProse(String(a.reflection_exit_ticket || a.reflection || '')),
  };
}

type SectionIcon = typeof Target;

type TemplateSectionDef = {
  num: number;
  id: string;
  title: string;
  icon: SectionIcon;
  stripe: string;
  iconWrap: string;
  hasContent: (a: NormalizedActivity) => boolean;
  render: (a: NormalizedActivity) => ReactNode;
};

function EmptySectionHint({ audience = 'student' }: { audience?: 'student' | 'teacher' }) {
  return (
    <p className="text-sm text-stone-400 italic rounded-lg border border-dashed border-stone-200 bg-stone-50 px-2.5 py-1.5">
      {audience === 'teacher'
        ? 'Not included in this generation — try regenerating with more detail if you need this section.'
        : 'Not included in this activity set — ask your teacher if you need this section.'}
    </p>
  );
}

function countFilledSections(activity: NormalizedActivity, sections: TemplateSectionDef[]): number {
  return sections.filter((s) => s.hasContent(activity)).length;
}

const TEACHER_TEMPLATE_SECTIONS: TemplateSectionDef[] = [
  {
    num: 2,
    id: 'prior',
    title: 'Subtopic link and prior knowledge required',
    icon: BookOpen,
    stripe: 'border-sky-500',
    iconWrap: 'bg-sky-100 text-sky-700',
    hasContent: (a) => !!a.subtopicLink,
    render: (a) => (
      <p className="whitespace-pre-wrap rounded-xl bg-sky-50/60 px-3 py-3">{a.subtopicLink}</p>
    ),
  },
  {
    num: 3,
    id: 'goals',
    title: 'Learning objectives',
    icon: Target,
    stripe: 'border-violet-500',
    iconWrap: 'bg-violet-100 text-violet-700',
    hasContent: (a) => a.learningObjectives.length > 0,
    render: (a) => (
      <ul className="space-y-2">
        {a.learningObjectives.map((line, i) => (
          <li key={i} className="flex gap-2 rounded-lg bg-violet-50/80 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-600 mt-0.5" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: 4,
    id: 'ncf',
    title: 'NCF competency / learning outcome alignment',
    icon: GraduationCap,
    stripe: 'border-blue-500',
    iconWrap: 'bg-blue-100 text-blue-700',
    hasContent: (a) => a.ncfAlignment.length > 0,
    render: (a) => (
      <ul className="list-disc pl-4 space-y-1">
        {a.ncfAlignment.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    ),
  },
  {
    num: 5,
    id: 'materials',
    title: 'Materials required',
    icon: Package,
    stripe: 'border-amber-500',
    iconWrap: 'bg-amber-100 text-amber-800',
    hasContent: (a) => a.materials.length > 0,
    render: (a) => (
      <ul className="space-y-2">
        {a.materials.map((m, i) => (
          <li
            key={i}
            className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-200/80 text-[11px] font-bold text-amber-900">
              {i + 1}
            </span>
            {m}
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: 6,
    id: 'steps',
    title: 'Step-by-step procedure',
    icon: ListChecks,
    stripe: 'border-emerald-500',
    iconWrap: 'bg-emerald-100 text-emerald-700',
    hasContent: (a) => a.steps.length > 0,
    render: (a) => (
      <ol className="space-y-2.5 list-none pl-0 m-0">
        {a.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-stone-700">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
              aria-hidden
            >
              {i + 1}
            </span>
            <span className="pt-1 min-w-0 flex-1">{step}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    num: 7,
    id: 'teacher',
    title: 'Teacher instructions',
    icon: Users,
    stripe: 'border-indigo-500',
    iconWrap: 'bg-indigo-100 text-indigo-700',
    hasContent: (a) => a.teacherInstructions.length > 0,
    render: (a) => (
      <ul className="list-disc pl-4 space-y-1">
        {a.teacherInstructions.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    ),
  },
  {
    num: 8,
    id: 'student',
    title: 'Student instructions',
    icon: GraduationCap,
    stripe: 'border-teal-500',
    iconWrap: 'bg-teal-100 text-teal-700',
    hasContent: (a) => a.studentInstructions.length > 0,
    render: (a) => (
      <ul className="list-disc pl-4 space-y-1">
        {a.studentInstructions.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    ),
  },
  {
    num: 9,
    id: 'diff',
    title: 'Differentiation',
    icon: Users,
    stripe: 'border-pink-500',
    iconWrap: 'bg-pink-100 text-pink-700',
    hasContent: (a) => !!a.differentiation,
    render: (a) => <p className="whitespace-pre-wrap">{a.differentiation}</p>,
  },
  {
    num: 10,
    id: 'rubric',
    title: 'Assessment rubric',
    icon: ClipboardList,
    stripe: 'border-rose-500',
    iconWrap: 'bg-rose-100 text-rose-700',
    hasContent: (a) => a.assessmentRubric.length > 0,
    render: (a) => (
      <ul className="list-disc pl-4 space-y-1">
        {a.assessmentRubric.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    ),
  },
  {
    num: 11,
    id: 'outcomes',
    title: 'Expected learning outcomes',
    icon: GraduationCap,
    stripe: 'border-cyan-600',
    iconWrap: 'bg-cyan-100 text-cyan-800',
    hasContent: (a) => !!a.expectedOutcomes,
    render: (a) => (
      <p className="whitespace-pre-wrap rounded-lg bg-cyan-50 px-3 py-3">{a.expectedOutcomes}</p>
    ),
  },
  {
    num: 12,
    id: 'real',
    title: 'Real-life application',
    icon: Sparkles,
    stripe: 'border-fuchsia-500',
    iconWrap: 'bg-fuchsia-100 text-fuchsia-700',
    hasContent: (a) => !!a.realLife,
    render: (a) => <p className="whitespace-pre-wrap">{a.realLife}</p>,
  },
  {
    num: 13,
    id: 'reflect',
    title: 'Reflection / exit ticket',
    icon: Lightbulb,
    stripe: 'border-orange-500',
    iconWrap: 'bg-orange-100 text-orange-800',
    hasContent: (a) => !!a.reflection,
    render: (a) => (
      <p className="whitespace-pre-wrap rounded-lg border-l-4 border-orange-400 bg-orange-50/50 px-3 py-3 text-stone-800">
        {a.reflection}
      </p>
    ),
  },
];

const TEMPLATE_SECTIONS: TemplateSectionDef[] = [
  {
    num: 2,
    id: 'prior',
    title: 'Subtopic link and prior knowledge required',
    icon: BookOpen,
    stripe: 'border-sky-500',
    iconWrap: 'bg-sky-100 text-sky-700',
    hasContent: (a) => !!a.subtopicLink,
    render: (a) => (
      <p className="whitespace-pre-wrap rounded-xl bg-sky-50/60 px-3 py-3">{a.subtopicLink}</p>
    ),
  },
  {
    num: 3,
    id: 'goals',
    title: "Learning Objectives - Bloom's Taxonomy Aligned",
    icon: Target,
    stripe: 'border-violet-500',
    iconWrap: 'bg-violet-100 text-violet-700',
    hasContent: (a) => a.learningObjectives.length > 0,
    render: (a) => (
      <ul className="space-y-2">
        {a.learningObjectives.map((line, i) => (
          <li key={i} className="flex gap-2 rounded-lg bg-violet-50/80 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-600 mt-0.5" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: 4,
    id: 'ncf',
    title: 'NCF competency / learning outcome alignment',
    icon: GraduationCap,
    stripe: 'border-blue-500',
    iconWrap: 'bg-blue-100 text-blue-700',
    hasContent: (a) => a.ncfAlignment.length > 0,
    render: (a) => (
      <ul className="list-disc pl-4 space-y-1">
        {a.ncfAlignment.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    ),
  },
  {
    num: 5,
    id: 'materials',
    title: 'Materials required',
    icon: Package,
    stripe: 'border-amber-500',
    iconWrap: 'bg-amber-100 text-amber-800',
    hasContent: (a) => a.materials.length > 0,
    render: (a) => (
      <ul className="space-y-2">
        {a.materials.map((m, i) => (
          <li
            key={i}
            className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-200/80 text-[11px] font-bold text-amber-900">
              {i + 1}
            </span>
            {m}
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: 6,
    id: 'steps',
    title: 'Step-by-step Student Procedure',
    icon: ListChecks,
    stripe: 'border-emerald-500',
    iconWrap: 'bg-emerald-100 text-emerald-700',
    hasContent: (a) => a.steps.length > 0,
    render: (a) => (
      <ol className="space-y-2.5 list-none pl-0 m-0">
        {a.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-stone-700">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
              aria-hidden
            >
              {i + 1}
            </span>
            <span className="pt-1 min-w-0 flex-1">{step}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    num: 7,
    id: 'safety',
    title: 'Safety and Care Instructions',
    icon: GraduationCap,
    stripe: 'border-slate-500',
    iconWrap: 'bg-slate-200 text-slate-700',
    hasContent: (a) => a.safetyCareInstructions.length > 0,
    render: (a) => (
      <ul className="list-disc pl-4 space-y-1 text-stone-600">
        {a.safetyCareInstructions.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    ),
  },
  {
    num: 8,
    id: 'observation',
    title: 'Observation / Data Recording Table',
    icon: ClipboardList,
    stripe: 'border-indigo-500',
    iconWrap: 'bg-indigo-100 text-indigo-700',
    hasContent: (a) => !!a.observationTable,
    render: (a) => <p className="whitespace-pre-wrap">{a.observationTable}</p>,
  },
  {
    num: 9,
    id: 'creative',
    title: 'Creative Output / Final Product',
    icon: Sparkles,
    stripe: 'border-violet-500',
    iconWrap: 'bg-violet-100 text-violet-700',
    hasContent: (a) => !!a.creativeOutput,
    render: (a) => <p className="whitespace-pre-wrap">{a.creativeOutput}</p>,
  },
  {
    num: 10,
    id: 'diff',
    title: 'Differentiation: Support and Extension',
    icon: Users,
    stripe: 'border-pink-500',
    iconWrap: 'bg-pink-100 text-pink-700',
    hasContent: (a) => !!a.differentiation,
    render: (a) => <p className="whitespace-pre-wrap">{a.differentiation}</p>,
  },
  {
    num: 11,
    id: 'rubric',
    title: 'Self-Assessment Rubric',
    icon: ClipboardList,
    stripe: 'border-rose-500',
    iconWrap: 'bg-rose-100 text-rose-700',
    hasContent: (a) => a.selfAssessmentRubric.length > 0,
    render: (a) => (
      <ul className="list-disc pl-4 space-y-1">
        {a.selfAssessmentRubric.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    ),
  },
  {
    num: 12,
    id: 'outcomes',
    title: 'Expected Learning Outcomes',
    icon: GraduationCap,
    stripe: 'border-cyan-600',
    iconWrap: 'bg-cyan-100 text-cyan-800',
    hasContent: (a) => !!a.expectedOutcomes,
    render: (a) => (
      <p className="whitespace-pre-wrap rounded-lg bg-cyan-50 px-3 py-3">{a.expectedOutcomes}</p>
    ),
  },
  {
    num: 13,
    id: 'real',
    title: 'Real-life Application',
    icon: Sparkles,
    stripe: 'border-fuchsia-500',
    iconWrap: 'bg-fuchsia-100 text-fuchsia-700',
    hasContent: (a) => !!a.realLife,
    render: (a) => <p className="whitespace-pre-wrap">{a.realLife}</p>,
  },
  {
    num: 14,
    id: 'reflect',
    title: 'Reflection / Exit Ticket',
    icon: Lightbulb,
    stripe: 'border-orange-500',
    iconWrap: 'bg-orange-100 text-orange-800',
    hasContent: (a) => !!a.reflection,
    render: (a) => (
      <p className="whitespace-pre-wrap rounded-lg border-l-4 border-orange-400 bg-orange-50/50 px-3 py-3 text-stone-800">
        {a.reflection}
      </p>
    ),
  },
];

function JournalBlock({
  id,
  sectionNum,
  title,
  icon: Icon,
  stripe,
  iconWrap,
  children,
  className,
  bodyClassName,
}: {
  id: string;
  sectionNum: string;
  title: string;
  icon: typeof Target;
  stripe: string;
  iconWrap: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'h-fit w-full rounded-2xl bg-white border border-stone-200/90 shadow-sm shadow-stone-200/40 overflow-hidden',
        className,
      )}
    >
      <div className={cn('flex items-center gap-2.5 px-3 py-2.5 border-l-[5px]', stripe)}>
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconWrap)}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{sectionNum}</p>
          <h4 className="text-sm font-bold text-stone-900 leading-tight">{title}</h4>
        </div>
      </div>
      <div className={cn('px-3 pb-3 pt-1 text-sm leading-relaxed text-stone-700', bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

function StudentActivityCard({
  activity,
  prefix,
}: {
  activity: NormalizedActivity;
  prefix: string;
}) {
  return (
    <div className="space-y-3">
      {/* Section 1 — title (full width) */}
      <div
        id={`${prefix}-title`}
        className="relative overflow-hidden rounded-2xl bg-white border border-orange-200 shadow-lg shadow-orange-100/60"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(251,146,60,0.12),transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-300/40">
            <FlaskConical className="h-7 w-7" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-1">
              1. Project / Activity Title
            </p>
            <Badge className="mb-2 rounded-md border-0 bg-orange-100 text-orange-800 hover:bg-orange-100 font-semibold">
              Activity {activity.sl}
            </Badge>
            <h4 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug tracking-tight">
              {activity.title}
            </h4>
          </div>
        </div>
      </div>

      {/* Masonry: only a small gap between boxes; height follows content */}
      <div className="columns-1 sm:columns-2 xl:columns-3 gap-2">
        {TEMPLATE_SECTIONS.map((sec) => (
          <div key={sec.id} className="mb-2 break-inside-avoid">
            <JournalBlock
              id={`${prefix}-${sec.id}`}
              sectionNum={`Section ${sec.num}`}
              title={sec.title}
              icon={sec.icon}
              stripe={sec.stripe}
              iconWrap={sec.iconWrap}
            >
              {sec.hasContent(activity) ? sec.render(activity) : <EmptySectionHint audience="student" />}
            </JournalBlock>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeacherActivityCard({
  activity,
  prefix,
}: {
  activity: NormalizedActivity;
  prefix: string;
}) {
  const filled = countFilledSections(activity, TEACHER_TEMPLATE_SECTIONS);
  const total = TEACHER_TEMPLATE_SECTIONS.length;
  const progressPct = Math.round((filled / total) * 100);

  return (
    <div className="space-y-3">
      <div
        id={`${prefix}-title`}
        className="relative overflow-hidden rounded-2xl border border-indigo-200/90 bg-white shadow-lg shadow-indigo-100/50"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.1),transparent_55%)]" />
        <div className="relative flex flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-300/40">
            <FlaskConical className="h-7 w-7" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className="rounded-md border-0 bg-indigo-100 text-indigo-800 hover:bg-indigo-100 font-semibold">
                Activity {activity.sl}
              </Badge>
              <Badge variant="outline" className="rounded-md border-indigo-200 text-indigo-700 text-[10px]">
                {filled}/{total} sections
              </Badge>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1">
              1. Title of activity / project
            </p>
            <h4 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug tracking-tight">
              {activity.title}
            </h4>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 mb-1">
                <span>Content completeness</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-indigo-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {TEACHER_TEMPLATE_SECTIONS.filter((sec) => sec.hasContent(activity)).map((sec) => (
        <JournalBlock
          key={sec.id}
          id={`${prefix}-${sec.id}`}
          sectionNum={`Section ${sec.num}`}
          title={sec.title}
          icon={sec.icon}
          stripe={sec.stripe}
          iconWrap={sec.iconWrap}
        >
          {sec.render(activity)}
        </JournalBlock>
      ))}
    </div>
  );
}

export function ActivityProjectViewer({
  activities,
  content,
  className,
  variant = 'default',
}: {
  activities?: ActivityProject[] | null;
  content?: string;
  className?: string;
  variant?: 'default' | 'student' | 'teacher';
}) {
  const parsedContent = useMemo(
    () => stripStructuredAiToolMetadata(String(content || '')),
    [content],
  );

  const mode: 'student' | 'teacher' = variant === 'teacher' ? 'teacher' : 'student';

  const resolved = useMemo(
    () =>
      resolveActivitiesFromPayload(activities, parsedContent).map((a, i) =>
        normalizeActivity(a, i, mode),
      ),
    [activities, parsedContent, mode],
  );

  const [activeIdx, setActiveIdx] = useState(0);

  if (resolved.length === 0) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center',
          className,
        )}
      >
        <FlaskConical className="mx-auto h-10 w-10 text-gray-300 mb-3" aria-hidden />
        <p className="text-sm font-medium text-gray-700">No activity found for this selection</p>
        <p className="text-xs text-gray-500 mt-1">Try generating again or pick another topic.</p>
      </div>
    );
  }

  const safeIdx = Math.min(activeIdx, resolved.length - 1);
  const current = resolved[safeIdx];

  if (variant === 'teacher') {
    return (
      <div className={cn('w-full', className)}>
        <div
          className="relative overflow-hidden rounded-3xl border border-indigo-200/80 shadow-xl shadow-indigo-200/25"
          style={{
            backgroundColor: '#f8fafc',
            backgroundImage:
              'radial-gradient(circle, rgba(99,102,241,0.06) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        >
          <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-600 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                  <FlaskConical className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
                    Activity &amp; Project Generator
                  </p>
                  <h3 className="text-lg font-bold sm:text-xl">Teacher lesson kit</h3>
                </div>
              </div>
              {resolved.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {resolved.map((act, idx) => (
                    <button
                      key={act.sl}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-xs font-bold transition-all',
                        idx === safeIdx
                          ? 'bg-white text-indigo-700 shadow-md'
                          : 'bg-white/15 text-white hover:bg-white/25 ring-1 ring-white/20',
                      )}
                    >
                      Activity {idx + 1}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Ready to teach
                </span>
              )}
            </div>
          </div>

          <div className="p-3 sm:p-5 max-h-[min(80vh,900px)] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`teacher-act-${safeIdx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <TeacherActivityCard
                  activity={current}
                  prefix={`teacher-act-${safeIdx}`}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'student') {
    return (
      <div className={cn('w-full', className)}>
        <div
          className="relative overflow-hidden rounded-3xl border border-orange-200/80 shadow-xl shadow-orange-200/30"
          style={{
            backgroundColor: '#faf7f2',
            backgroundImage:
              'radial-gradient(circle, rgba(251,146,60,0.07) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <div className="border-b border-orange-100 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <FlaskConical className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-orange-100">
                    Lab journal
                  </p>
                  <h3 className="text-lg font-bold">Project Idea Lab</h3>
                </div>
              </div>
              {resolved.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {resolved.map((act, idx) => (
                    <button
                      key={act.sl}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-xs font-bold transition-all',
                        idx === safeIdx
                          ? 'bg-white text-orange-700 shadow-md'
                          : 'bg-white/20 text-white hover:bg-white/30',
                      )}
                    >
                      Activity {idx + 1}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                  {resolved.length} activity
                </span>
              )}
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`act-${safeIdx}`}
                className="h-fit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <StudentActivityCard activity={current} prefix={`act-${safeIdx}`} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }
}
