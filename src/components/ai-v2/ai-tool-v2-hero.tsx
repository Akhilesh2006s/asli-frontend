import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAiToolText } from '@/lib/title-case';

export type AiToolV2HeroChip = { label: string; value: string };

export function AiToolV2Hero({
  toolLabel,
  title,
  subtitle,
  icon: Icon,
  className,
  gradientClass = 'from-indigo-50 via-white to-violet-50',
  accentClass = 'from-indigo-500 to-violet-600',
  borderClass = 'border-indigo-100/80',
  progressPct,
  chips = [],
}: {
  toolLabel: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  className?: string;
  gradientClass?: string;
  accentClass?: string;
  borderClass?: string;
  progressPct?: number;
  chips?: AiToolV2HeroChip[];
}) {
  const safeTitle = formatAiToolText(title.trim() || 'Generated Content');
  const displayToolLabel = formatAiToolText(toolLabel);
  const displaySubtitle = subtitle ? formatAiToolText(subtitle) : undefined;
  const pct =
    progressPct != null && Number.isFinite(progressPct)
      ? Math.max(0, Math.min(100, Math.round(progressPct)))
      : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      data-ai-focus-hide
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] border p-5 shadow-[0_20px_50px_-28px_rgba(99,102,241,0.28)] sm:p-6',
        `bg-gradient-to-br ${gradientClass}`,
        borderClass,
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-white/70 px-3 py-1 text-mini font-semibold text-indigo-800">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {displayToolLabel} · AI V2
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl leading-snug">
            {safeTitle}
          </h2>
          {displaySubtitle ? (
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{displaySubtitle}</p>
          ) : null}
          {chips.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={`${chip.label}-${chip.value}`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-mini font-medium text-slate-700 shadow-sm"
                >
                  <span className="font-semibold text-slate-500">{formatAiToolText(chip.label)}</span>
                  {formatAiToolText(chip.value)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg sm:h-14 sm:w-14',
            `bg-gradient-to-br ${accentClass}`,
          )}
        >
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
        </div>
      </div>
      {pct != null ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-mini font-medium text-slate-500">
            <span>{formatAiToolText('Content Ready')}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className={cn('h-full rounded-full transition-all duration-500', `bg-gradient-to-r ${accentClass}`)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}
