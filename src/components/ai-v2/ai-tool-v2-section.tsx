import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';

export type AiToolV2SectionProps = {
  num: number | string;
  title: string;
  description?: string;
  icon: LucideIcon;
  accent?: 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate';
  children: ReactNode;
  className?: string;
  /** Print-friendly: avoid breaking inside section */
  printSafe?: boolean;
};

const ACCENT_STYLES: Record<NonNullable<AiToolV2SectionProps['accent']>, string> = {
  indigo: 'from-indigo-500 to-blue-600',
  violet: 'from-violet-500 to-purple-600',
  emerald: 'from-emerald-500 to-green-600',
  amber: 'from-amber-500 to-orange-500',
  rose: 'from-rose-500 to-pink-600',
  cyan: 'from-cyan-500 to-teal-600',
  slate: 'from-slate-600 to-slate-800',
};

const ACCENT_BG: Record<NonNullable<AiToolV2SectionProps['accent']>, string> = {
  indigo: 'from-indigo-50/80 to-blue-50/50',
  violet: 'from-violet-50/80 to-purple-50/50',
  emerald: 'from-emerald-50/80 to-lime-50/50',
  amber: 'from-amber-50/80 to-orange-50/50',
  rose: 'from-rose-50/80 to-pink-50/50',
  cyan: 'from-cyan-50/80 to-teal-50/50',
  slate: 'from-slate-50/80 to-slate-100/50',
};

export function AiToolV2Section({
  num,
  title,
  description,
  icon: Icon,
  accent = 'indigo',
  children,
  className,
  printSafe = true,
}: AiToolV2SectionProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'overflow-hidden border border-white/90 bg-gradient-to-br',
        AI_V2.radius.cardLg,
        AI_V2.shadow.card,
        AI_V2.shadow.cardHover,
        'transition-shadow duration-200',
        ACCENT_BG[accent],
        printSafe && 'print:break-inside-avoid',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/80 bg-white/70 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-bold text-white shadow-sm',
              ACCENT_STYLES[accent],
            )}
            aria-hidden
          >
            ◆
          </span>
          <div className="min-w-0">
            <h3 className={AI_V2.typography.sectionTitle}>{title}</h3>
            {description ? (
              <p className={cn('mt-0.5', AI_V2.typography.sectionDesc)}>{description}</p>
            ) : null}
          </div>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/90 bg-white/90 shadow-sm',
          )}
        >
          <Icon className="h-4 w-4 text-slate-600" aria-hidden />
        </div>
      </header>
      <div className={cn('bg-white/60', AI_V2.spacing.cardPadding)}>{children}</div>
    </motion.article>
  );
}

export function AiToolV2SectionStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(AI_V2.spacing.section, className)}>{children}</div>;
}
