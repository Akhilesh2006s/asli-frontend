import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatAiToolText } from '@/lib/title-case';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';
import {
  AI_TOOL_SECTION_PALETTES,
  paletteForSectionTitle,
  type AiToolSectionPalette,
} from '@/lib/ai-tool-section-palette';
import { aiToolSectionBodyClasses } from '@/components/ai-tool-stacked-section';

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

const ACCENT_TO_PALETTE_ID: Record<NonNullable<AiToolV2SectionProps['accent']>, string> = {
  indigo: 'indigo',
  violet: 'violet',
  emerald: 'emerald',
  amber: 'amber',
  rose: 'rose',
  cyan: 'cyan',
  slate: 'blue',
};

function paletteForAccent(
  accent: NonNullable<AiToolV2SectionProps['accent']>,
  title: string,
  num: string,
): AiToolSectionPalette {
  const want = ACCENT_TO_PALETTE_ID[accent];
  return AI_TOOL_SECTION_PALETTES.find((p) => p.id === want) || paletteForSectionTitle(title, num);
}

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
  const displayTitle = formatAiToolText(title);
  const displayDescription = description ? formatAiToolText(description) : undefined;
  const numLabel = String(num);
  const palette = paletteForAccent(accent, title, numLabel);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'overflow-hidden border border-slate-200/80 bg-white',
        AI_V2.radius.cardLg,
        AI_V2.shadow.card,
        AI_V2.shadow.cardHover,
        'transition-shadow duration-200',
        printSafe && 'print:break-inside-avoid',
        className,
      )}
    >
      <div className={cn('h-2 w-full', palette.bar)} aria-hidden />
      <header
        className={cn(
          'flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-6 sm:py-5',
          'bg-gradient-to-br',
          palette.cardWash,
          palette.innerBorder,
        )}
      >
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm',
              palette.bar,
            )}
            aria-hidden
          >
            {numLabel}
          </span>
          <div className="min-w-0 pt-0.5">
            <h3
              className={cn(
                'text-xl sm:text-2xl font-bold leading-snug tracking-tight',
                palette.title,
              )}
            >
              {displayTitle}
            </h3>
            {displayDescription ? (
              <p className={cn('mt-1.5 text-base leading-relaxed', palette.subtitle)}>
                {displayDescription}
              </p>
            ) : null}
          </div>
        </div>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm',
            palette.iconTile,
          )}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      </header>
      <div className={cn('p-3.5 sm:p-5 bg-gradient-to-b from-white to-slate-50/40')}>
        <div
          className={cn(
            'rounded-xl border px-5 py-5 sm:px-6 sm:py-6',
            palette.inner,
            palette.innerBorder,
            aiToolSectionBodyClasses(palette),
          )}
        >
          {children}
        </div>
      </div>
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
