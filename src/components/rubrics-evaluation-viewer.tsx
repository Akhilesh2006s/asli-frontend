import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  resolveRubricFromPayload,
  type NormalizedRubric,
  type RubricCriterionRow,
} from '@/lib/parse-rubrics-evaluation';
import {
  BadgeCheck,
  ClipboardList,
  GraduationCap,
  MessageSquareText,
  Sparkles,
  Target,
  ThumbsUp,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface RubricsEvaluationViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
}

type SectionDef = {
  num: number;
  label: string;
  icon: LucideIcon;
  stripe: string;
  iconWrap: string;
  hasContent: (r: NormalizedRubric) => boolean;
  render: (r: NormalizedRubric) => ReactNode;
};

function inferredGradingCriteriaText(r: NormalizedRubric): string {
  const explicit = String(r.gradingCriteria || '').trim();
  if (explicit) return explicit;

  if (!r.criteriaRows.length) return '';
  const hasAnyLevelText = r.criteriaRows.some(
    (row) =>
      String(row.excellent || '').trim() ||
      String(row.good || '').trim() ||
      String(row.satisfactory || '').trim() ||
      String(row.needs_improvement || '').trim(),
  );
  if (!hasAnyLevelText) return '';

  return '4-level grading scale used: Excellent, Good, Satisfactory, Needs Improvement.';
}

function EmptyHint() {
  return (
    <p className="text-sm text-stone-400 italic rounded-lg border border-dashed border-stone-200 bg-stone-50 px-2.5 py-1.5">
      Not included in this generation.
    </p>
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
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-100/70 overflow-hidden">
      <div
        className={cn(
          'flex items-center gap-2.5 px-4 py-3 border-l-[5px] bg-gradient-to-r from-white via-slate-50/70 to-white',
          stripe,
        )}
      >
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 shadow-sm',
            iconWrap,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{sectionNum}</p>
          <h4 className="text-sm font-bold text-slate-900 leading-snug">{label}</h4>
        </div>
      </div>
      <div className="px-4 pb-4 pt-2">{children}</div>
    </section>
  );
}

function CriteriaTable({ rows }: { rows: RubricCriterionRow[] }) {
  if (!rows.length) return <EmptyHint />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-[760px] w-full text-xs sm:text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-3 py-2 text-left font-semibold text-slate-800 border-b border-slate-200">
              Criterion
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-800 border-b border-slate-200">
              Excellent
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-800 border-b border-slate-200">
              Good
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-800 border-b border-slate-200">
              Satisfactory
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-800 border-b border-slate-200">
              Needs improvement
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.name}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              <td className="px-3 py-2 align-top border-b border-slate-100 font-medium text-slate-900">
                {r.name}
              </td>
              <td className="px-3 py-2 align-top border-b border-slate-100 text-slate-700 whitespace-pre-wrap">
                {r.excellent || '—'}
              </td>
              <td className="px-3 py-2 align-top border-b border-slate-100 text-slate-700 whitespace-pre-wrap">
                {r.good || '—'}
              </td>
              <td className="px-3 py-2 align-top border-b border-slate-100 text-slate-700 whitespace-pre-wrap">
                {r.satisfactory || '—'}
              </td>
              <td className="px-3 py-2 align-top border-b border-slate-100 text-slate-700 whitespace-pre-wrap">
                {r.needs_improvement || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const RUBRIC_SECTIONS: SectionDef[] = [
  {
    num: 1,
    label: 'Assessment Purpose',
    icon: Target,
    stripe: 'border-indigo-500',
    iconWrap: 'bg-indigo-100 text-indigo-900',
    hasContent: (r) => !!r.assessmentPurpose,
    render: (r) => <p className="text-sm whitespace-pre-wrap text-slate-800">{r.assessmentPurpose}</p>,
  },
  {
    num: 2,
    label: 'Competency / Learning Outcome Assessed',
    icon: GraduationCap,
    stripe: 'border-sky-500',
    iconWrap: 'bg-sky-100 text-sky-900',
    hasContent: (r) => !!r.competencyAssessed,
    render: (r) => <p className="text-sm whitespace-pre-wrap text-slate-800">{r.competencyAssessed}</p>,
  },
  {
    num: 3,
    label: 'Evaluation Rubric (4 performance levels)',
    icon: ClipboardList,
    stripe: 'border-emerald-500',
    iconWrap: 'bg-emerald-100 text-emerald-900',
    hasContent: (r) => r.criteriaRows.length > 0,
    render: (r) => <CriteriaTable rows={r.criteriaRows} />,
  },
  {
    num: 4,
    label: 'Grading Criteria',
    icon: BadgeCheck,
    stripe: 'border-amber-500',
    iconWrap: 'bg-amber-100 text-amber-950',
    hasContent: (r) => !!inferredGradingCriteriaText(r),
    render: (r) => (
      <p className="text-sm whitespace-pre-wrap text-slate-800">{inferredGradingCriteriaText(r)}</p>
    ),
  },
  {
    num: 5,
    label: 'Strengths Observed',
    icon: ThumbsUp,
    stripe: 'border-teal-500',
    iconWrap: 'bg-teal-100 text-teal-900',
    hasContent: (r) => !!r.strengthsObserved,
    render: (r) => <p className="text-sm whitespace-pre-wrap text-slate-800">{r.strengthsObserved}</p>,
  },
  {
    num: 6,
    label: 'Areas for Improvement',
    icon: TrendingUp,
    stripe: 'border-rose-500',
    iconWrap: 'bg-rose-100 text-rose-900',
    hasContent: (r) => !!r.areasForImprovement,
    render: (r) => <p className="text-sm whitespace-pre-wrap text-slate-800">{r.areasForImprovement}</p>,
  },
  {
    num: 7,
    label: 'Teacher Remarks',
    icon: MessageSquareText,
    stripe: 'border-slate-500',
    iconWrap: 'bg-slate-100 text-slate-900',
    hasContent: (r) => !!r.teacherRemarks,
    render: (r) => <p className="text-sm whitespace-pre-wrap text-slate-800">{r.teacherRemarks}</p>,
  },
  {
    num: 8,
    label: 'Actionable Improvement Suggestions',
    icon: Sparkles,
    stripe: 'border-fuchsia-500',
    iconWrap: 'bg-fuchsia-100 text-fuchsia-900',
    hasContent: (r) => !!r.actionableSuggestions,
    render: (r) => <p className="text-sm whitespace-pre-wrap text-slate-800">{r.actionableSuggestions}</p>,
  },
  {
    num: 9,
    label: 'Parent-friendly Feedback',
    icon: MessageSquareText,
    stripe: 'border-cyan-600',
    iconWrap: 'bg-cyan-100 text-cyan-900',
    hasContent: (r) => !!r.parentFriendlyFeedback,
    render: (r) => <p className="text-sm whitespace-pre-wrap text-slate-800">{r.parentFriendlyFeedback}</p>,
  },
  {
    num: 10,
    label: 'Next-step Remedial / Enrichment Activity',
    icon: Sparkles,
    stripe: 'border-lime-600',
    iconWrap: 'bg-lime-100 text-lime-900',
    hasContent: (r) => !!r.nextStepRemedialEnrichment,
    render: (r) => <p className="text-sm whitespace-pre-wrap text-slate-800">{r.nextStepRemedialEnrichment}</p>,
  },
];

export function RubricsEvaluationViewer({ content, rawContent, className }: RubricsEvaluationViewerProps) {
  const parsedContent = useMemo(
    () => stripStructuredAiToolMetadata(String(content || '')),
    [content],
  );

  const resolved = useMemo(
    () => resolveRubricFromPayload(parsedContent, rawContent),
    [parsedContent, rawContent],
  );

  if (!resolved.rubric) {
    if (resolved.markdownFallback) {
      return (
        <div className={className}>
          <div
            className="prose prose-sm max-w-none rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(resolved.markdownFallback) }}
          />
        </div>
      );
    }
    return (
      <div className={cn('rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center', className)}>
        <p className="text-sm font-medium text-stone-700">No rubric content found</p>
      </div>
    );
  }

  const r = resolved.rubric;
  const filled = RUBRIC_SECTIONS.filter((s) => s.hasContent(r)).length;
  const totalCriteria = r.criteriaRows.length;
  const fillPercent = Math.max(0, Math.min(100, Math.round((filled / RUBRIC_SECTIONS.length) * 100)));

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-900 px-5 py-5 text-white shadow-2xl shadow-indigo-200/40">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-200 mb-1">
          Performance Evaluation Studio
        </p>
        <h3 className="text-2xl font-bold leading-tight">{r.title}</h3>
        <p className="mt-1.5 text-sm text-indigo-100/90">
          Comprehensive rubric profile with strengths, gaps, and next-step actions.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/15">
            {filled}/{RUBRIC_SECTIONS.length} sections filled
          </span>
          <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/15">
            {totalCriteria} rubric criteria
          </span>
          {inferredGradingCriteriaText(r) ? (
            <span className="rounded-xl bg-emerald-400/15 px-3 py-2 text-xs font-medium text-emerald-100 ring-1 ring-emerald-200/30">
              4-level grading enabled
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-indigo-200">Rubric completeness</span>
            <span className="font-semibold text-white">{fillPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-lime-300"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {RUBRIC_SECTIONS.map((sec) =>
          sec.num === 3 ? (
            <div
              key={sec.num}
              className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 p-3"
            >
              <SectionCard
                sectionNum={`Section ${sec.num}`}
                label={sec.label}
                icon={sec.icon}
                stripe={sec.stripe}
                iconWrap={sec.iconWrap}
              >
                {sec.hasContent(r) ? sec.render(r) : <EmptyHint />}
              </SectionCard>
            </div>
          ) : (
            <div key={sec.num}>
              <SectionCard
                sectionNum={`Section ${sec.num}`}
                label={sec.label}
                icon={sec.icon}
                stripe={sec.stripe}
                iconWrap={sec.iconWrap}
              >
                {sec.hasContent(r) ? sec.render(r) : <EmptyHint />}
              </SectionCard>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

