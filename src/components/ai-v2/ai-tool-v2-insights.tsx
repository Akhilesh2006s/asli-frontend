import { Brain, CheckCircle2, Eye, Lightbulb, MessageCircle, Sparkles, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAiToolText } from '@/lib/title-case';
import {
  AI_V2,
  BLOOM_LEVEL_STYLES,
  COMPETENCY_DEFAULTS,
  NEP_ALIGNMENT_DEFAULTS,
} from '@/lib/ai-tool-design-tokens';
import type { BloomDistributionRow } from '@/lib/parse-exam-question-paper';

const BLOOM_ICONS: Record<string, typeof Brain> = {
  Remember: Brain,
  Understand: Lightbulb,
  Apply: Target,
  Analyze: Eye,
  Evaluate: MessageCircle,
  Create: Sparkles,
};

export function AiToolV2BloomDistribution({
  rows,
  totalMarks,
}: {
  rows: BloomDistributionRow[];
  totalMarks: number;
}) {
  const active = rows.filter((r) => r.marks > 0 || r.percent > 0);
  if (!active.length) {
    return (
      <p className="rounded-lg border border-dashed border-violet-200 bg-violet-50/40 px-3 py-2 text-xs italic text-slate-500">
        Bloom distribution will appear when question sections include marks.
      </p>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {active.map((row) => {
        const style = BLOOM_LEVEL_STYLES[row.level] || BLOOM_LEVEL_STYLES.Understand;
        const Icon = BLOOM_ICONS[row.level] || Brain;
        return (
          <div
            key={row.level}
            className={cn(
              'rounded-xl border p-3 transition-transform hover:-translate-y-0.5',
              style.bg,
              style.border,
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon className={cn('h-4 w-4', style.icon)} aria-hidden />
              <span className={cn('text-xs font-bold', style.text)}>{row.level}</span>
            </div>
            <p className={cn('text-lg font-bold', style.text)}>{row.percent}%</p>
            <p className="text-[11px] text-slate-600">
              {row.marks} mark{row.marks === 1 ? '' : 's'}
              {totalMarks > 0 ? ` of ${totalMarks}` : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function AiToolV2CompetencyFocus({ items }: { items?: string[] }) {
  const rows =
    items && items.length
      ? items.map((text, i) => ({
          id: `c-${i}`,
          label: text.split(':')[0]?.trim() || text,
          description: text.includes(':') ? text.split(':').slice(1).join(':').trim() : text,
        }))
      : COMPETENCY_DEFAULTS;

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-emerald-900">{formatAiToolText(row.label)}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{row.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AiToolV2NepAlignment({ focusText }: { focusText?: string }) {
  if (focusText?.trim()) {
    return <p className={cn(AI_V2.typography.body, 'whitespace-pre-wrap')}>{focusText}</p>;
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {NEP_ALIGNMENT_DEFAULTS.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50/50 px-3 py-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-700" aria-hidden />
          <span className="text-xs font-medium text-cyan-900">{formatAiToolText(item.label)}</span>
        </div>
      ))}
    </div>
  );
}

export function AiToolV2BestPractices({ text }: { text?: string }) {
  const body =
    text?.trim() ||
    'Use this paper for formative review before unit tests. Pair Section A for quick recall, Sections B–C for written practice, and reserve case-based items for competency checks. Review the answer key with students using think-pair-share for misconceptions.';
  return (
    <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-4">
      <p className={cn(AI_V2.typography.body, 'whitespace-pre-wrap')}>{body}</p>
    </div>
  );
}
