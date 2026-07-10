import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';
import { aiToolSectionDomId } from '@/lib/ai-tool-section-id';
import {
  RealisticIcon,
  lucideTo3dName,
  type AiTool3dIconName,
} from '@/components/ai-tool-3d-icons';

const V2_ACCENTS = [
  'from-indigo-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-green-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-teal-600',
  'from-fuchsia-500 to-purple-600',
  'from-lime-500 to-emerald-600',
  'from-orange-500 to-red-500',
  'from-slate-600 to-slate-800',
] as const;

const V2_BG = [
  'from-indigo-50/80 to-blue-50/50',
  'from-violet-50/80 to-purple-50/50',
  'from-emerald-50/80 to-lime-50/50',
  'from-amber-50/80 to-orange-50/50',
  'from-rose-50/80 to-pink-50/50',
  'from-cyan-50/80 to-teal-50/50',
  'from-fuchsia-50/80 to-purple-50/50',
  'from-lime-50/80 to-emerald-50/50',
  'from-orange-50/80 to-red-50/50',
  'from-slate-50/80 to-slate-100/50',
] as const;

/** Stable color theme from title (no visible section numbers). */
function themeForTitle(title: string, numHint = '') {
  const key = `${title}|${numHint}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const i = hash % V2_ACCENTS.length;
  return { accent: V2_ACCENTS[i], gradient: V2_BG[i] };
}

/**
 * Full-width V2 section card used by every AI tool viewer.
 * Backward-compatible API; visually aligned with AiToolV2Section.
 */
export function AiToolStackedSection({
  num,
  title,
  description,
  icon,
  iconName,
  accent,
  gradient,
  children,
  className,
}: {
  num: string;
  title: string;
  description?: string;
  icon?: LucideIcon | null;
  iconName?: AiTool3dIconName;
  accent?: string;
  gradient?: string;
  children: ReactNode;
  className?: string;
}) {
  const resolved = iconName || lucideTo3dName(icon);
  const numLabel = String(num).replace(/^section\s*/i, '').trim() || num;
  const theme = themeForTitle(title, numLabel);
  const accentClass = accent || `bg-gradient-to-br ${theme.accent}`;
  const gradientClass = gradient || `bg-gradient-to-br ${theme.gradient}`;
  const LucideIcon = icon;
  const sectionDomId = aiToolSectionDomId(numLabel, title);

  return (
    <motion.section
      id={sectionDomId}
      data-ai-section-id={sectionDomId}
      data-ai-section-title={title}
      data-ai-section-num=""
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
      className={cn(
        'group relative w-full overflow-hidden border border-white/90 print:break-inside-avoid',
        AI_V2.radius.cardLg,
        AI_V2.shadow.card,
        'transition-shadow duration-200 hover:shadow-[0_12px_40px_-14px_rgba(15,23,42,0.22)]',
        gradientClass,
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/80 bg-white/70 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm',
              accentClass,
            )}
            aria-hidden
          >
            ◆
          </span>
          <div className="min-w-0">
            <p className={AI_V2.typography.sectionTitle}>{title}</p>
            {description ? (
              <p className={cn('mt-0.5', AI_V2.typography.sectionDesc)}>{description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/90 bg-white/90 shadow-sm">
          {LucideIcon ? (
            <LucideIcon className="h-4 w-4 text-slate-600" aria-hidden />
          ) : (
            <RealisticIcon name={resolved} alt="" className="h-8 w-8" />
          )}
        </div>
      </header>
      <div className={cn('bg-white/60 ai-tool-section-body', AI_V2.spacing.cardPadding)} data-ai-section-body>
        {children}
      </div>
    </motion.section>
  );
}

/** V2 vertical stack — one section after another. */
export function AiToolStackedList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(AI_V2.spacing.section, className)}>{children}</div>;
}
