import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAiToolText } from '@/lib/title-case';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';
import { aiToolSectionDomId } from '@/lib/ai-tool-section-id';
import {
  RealisticIcon,
  lucideTo3dName,
  type AiTool3dIconName,
} from '@/components/ai-tool-3d-icons';
import { paletteForSectionTitle } from '@/lib/ai-tool-section-palette';

/**
 * Full-width section card used by every AI tool viewer (teacher + student).
 * Format: colored accent bar → bold colored title → soft nested content box
 * (Concept Mastery / tariff-brochure layering).
 */
export function AiToolStackedSection({
  num,
  title,
  description,
  icon,
  iconName,
  accent: _accent,
  gradient: _gradient,
  children,
  className,
}: {
  num: string;
  title: string;
  description?: string;
  icon?: LucideIcon | null;
  iconName?: AiTool3dIconName;
  /** @deprecated kept for call-site compatibility — palette is derived from title */
  accent?: string;
  /** @deprecated kept for call-site compatibility */
  gradient?: string;
  children: ReactNode;
  className?: string;
}) {
  const resolved = iconName || lucideTo3dName(icon);
  const numLabel = String(num).replace(/^section\s*/i, '').trim() || num;
  const palette = paletteForSectionTitle(title, numLabel);
  const LucideIcon = icon;
  const sectionDomId = aiToolSectionDomId(numLabel, title);
  const displayTitle = formatAiToolText(title);
  const displayDescription = description ? formatAiToolText(description) : undefined;
  const showNum = Boolean(numLabel) && !/^◆|•|-|$/.test(numLabel);

  return (
    <motion.section
      id={sectionDomId}
      data-ai-section-id={sectionDomId}
      data-ai-section-title={displayTitle}
      data-ai-section-num={showNum ? numLabel : ''}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
      className={cn(
        'group relative w-full overflow-hidden border border-slate-200/80 bg-white print:break-inside-avoid',
        AI_V2.radius.cardLg,
        AI_V2.shadow.card,
        'transition-shadow duration-200 hover:shadow-[0_12px_40px_-14px_rgba(15,23,42,0.22)]',
        className,
      )}
    >
      {/* Solid color bar — brochure-style section signal */}
      <div className={cn('h-1.5 w-full', palette.bar)} aria-hidden />

      <header
        className={cn(
          'flex items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5',
          'bg-gradient-to-br',
          palette.cardWash,
          palette.innerBorder,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm',
              palette.bar,
            )}
            aria-hidden
          >
            {showNum ? numLabel.slice(0, 2) : '◆'}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={cn('text-lg sm:text-xl font-bold leading-snug tracking-tight', palette.title)}>
              {displayTitle}
            </p>
            {displayDescription ? (
              <p className={cn('mt-1 text-sm sm:text-[0.9375rem] leading-relaxed text-slate-600')}>
                {displayDescription}
              </p>
            ) : null}
          </div>
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm',
            palette.iconTile,
          )}
        >
          {LucideIcon ? (
            <LucideIcon className="h-5 w-5" aria-hidden />
          ) : (
            <RealisticIcon name={resolved} alt="" className="h-8 w-8" />
          )}
        </div>
      </header>

      {/* Nested soft box — layered content like Concept Mastery inner panels */}
      <div className={cn('p-3 sm:p-4', 'bg-gradient-to-b from-white to-slate-50/40')} data-ai-section-body>
        <div
          className={cn(
            'ai-tool-section-body rounded-xl border px-4 py-4 sm:px-5 sm:py-5',
            palette.inner,
            palette.innerBorder,
            'text-base text-slate-800 leading-relaxed',
            '[&_strong]:font-bold [&_strong]:text-slate-900',
            '[&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-slate-900',
            '[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900',
            '[&_li]:marker:font-semibold',
          )}
        >
          {children}
        </div>
      </div>
    </motion.section>
  );
}

/** Vertical stack — one section after another. */
export function AiToolStackedList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(AI_V2.spacing.section, className)}>{children}</div>;
}

/** Soft nested content panel for use inside custom viewers. */
export function AiToolInnerBox({
  children,
  className,
  tone = 'violet',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'violet' | 'blue' | 'amber' | 'emerald' | 'rose' | 'slate';
}) {
  const tones: Record<string, string> = {
    violet: 'border-violet-100 bg-violet-50/80',
    blue: 'border-blue-100 bg-blue-50/80',
    amber: 'border-amber-100 bg-amber-50/80',
    emerald: 'border-emerald-100 bg-emerald-50/80',
    rose: 'border-rose-100 bg-rose-50/80',
    slate: 'border-slate-200 bg-slate-50/80',
  };
  return (
    <div className={cn('rounded-xl border px-4 py-3.5 sm:px-5 sm:py-4', tones[tone], className)}>
      {children}
    </div>
  );
}

/** Colored meta chip (Class / Subject / Board). */
export function AiToolFormatChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border border-violet-200 bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-950',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Tip / callout banner used under tool results. */
export function AiToolTipBanner({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950',
        className,
      )}
    >
      <span className="mt-0.5 text-base" aria-hidden>
        ✨
      </span>
      <div className="min-w-0 leading-relaxed">{children}</div>
    </div>
  );
}
