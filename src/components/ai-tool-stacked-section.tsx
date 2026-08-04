import { useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Pencil, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAiToolText } from '@/lib/title-case';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';
import { aiToolSectionDomId } from '@/lib/ai-tool-section-id';
import {
  RealisticIcon,
  lucideTo3dName,
  type AiTool3dIconName,
} from '@/components/ai-tool-3d-icons';
import {
  paletteForSectionTitle,
  type AiToolSectionPalette,
} from '@/lib/ai-tool-section-palette';

/** Shared body type scale + colored nested headings for every tool section. */
export function aiToolSectionBodyClasses(palette: AiToolSectionPalette): string {
  return cn(
    'text-base sm:text-lg text-slate-800 leading-relaxed',
    '[&_strong]:font-bold [&_strong]:text-slate-900',
    '[&_p]:text-base [&_p]:sm:text-lg [&_p]:leading-relaxed',
    '[&_li]:text-base [&_li]:sm:text-lg [&_li]:leading-relaxed',
    cn('[&_li]:marker:font-semibold', palette.marker),
    cn('[&_h1]:text-xl [&_h1]:sm:text-2xl [&_h1]:font-bold', palette.title),
    cn('[&_h2]:text-lg [&_h2]:sm:text-xl [&_h2]:font-bold', palette.title),
    cn('[&_h3]:text-base [&_h3]:sm:text-lg [&_h3]:font-bold', palette.label),
    '[&_h4]:text-base [&_h4]:font-bold [&_h4]:text-slate-900',
  );
}

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
  hideActions = false,
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
  /** Hide Edit / Copy (e.g. print-only blocks) */
  hideActions?: boolean;
}) {
  const resolved = iconName || lucideTo3dName(icon);
  const numLabel = String(num).replace(/^section\s*/i, '').trim() || num;
  const palette = paletteForSectionTitle(title, numLabel);
  const LucideIcon = icon;
  const sectionDomId = aiToolSectionDomId(numLabel, title);
  const displayTitle = formatAiToolText(title);
  const displayDescription = description ? formatAiToolText(description) : undefined;
  const showNum = Boolean(numLabel) && !/^◆|•|-|$/.test(numLabel);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const text = bodyRef.current?.innerText?.trim() || displayTitle;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const onEdit = () => {
    setEditing(true);
    window.setTimeout(() => {
      bodyRef.current?.focus();
    }, 30);
  };

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
      <div className={cn('h-2 w-full', palette.bar)} aria-hidden />

      <header
        className={cn(
          'flex items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5 sm:py-4',
          'bg-gradient-to-br',
          palette.cardWash,
          palette.innerBorder,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm',
              palette.bar,
            )}
            aria-hidden
          >
            {showNum ? numLabel.slice(0, 2) : '◆'}
          </span>
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm',
                  palette.iconTile,
                )}
              >
                {LucideIcon ? (
                  <LucideIcon className="h-5 w-5" aria-hidden />
                ) : (
                  <RealisticIcon name={resolved} alt="" className="h-7 w-7" />
                )}
              </div>
              <p className="text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
                {displayTitle}
              </p>
            </div>
            {displayDescription ? (
              <p className={cn('mt-1 text-sm leading-relaxed sm:text-base', palette.subtitle)}>
                {displayDescription}
              </p>
            ) : null}
          </div>
        </div>
        {!hideActions ? (
          <div className="flex shrink-0 items-center gap-1.5 print:hidden">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </button>
            <button
              type="button"
              onClick={() => void onCopy()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        ) : (
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
        )}
      </header>

      {/* Nested soft box — Concept Mastery inner panel with colored title */}
      <div className={cn('p-3.5 sm:p-5', 'bg-gradient-to-b from-white to-slate-50/40')} data-ai-section-body>
        <div
          ref={bodyRef}
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={() => setEditing(false)}
          className={cn(
            'ai-tool-section-body rounded-xl border px-5 py-5 sm:px-6 sm:py-6 outline-none',
            editing && 'ring-2 ring-violet-300',
            palette.inner,
            palette.innerBorder,
            aiToolSectionBodyClasses(palette),
          )}
        >
          <p className={cn('mb-3 text-xl font-bold leading-snug sm:text-2xl', palette.title)}>
            {displayTitle}
          </p>
          {children}
        </div>
      </div>
    </motion.section>
  );
}

/** Two-column section grid on desktop (Concept Mastery mock). */
export function AiToolStackedList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5', className)}>
      {children}
    </div>
  );
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
    <div
      className={cn(
        'rounded-xl border px-4 py-4 sm:px-5 sm:py-5 text-base sm:text-lg text-slate-800 leading-relaxed',
        tones[tone],
        className,
      )}
    >
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
        'inline-flex items-center rounded-lg border border-violet-200 bg-violet-100 px-3 py-1.5 text-sm font-semibold text-violet-950',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Brochure-style label (colored) + value (near-black). */
export function AiToolMetaPair({
  label,
  value,
  className,
  tone = 'violet',
}: {
  label: string;
  value: ReactNode;
  className?: string;
  tone?: keyof typeof META_PAIR_TONES;
}) {
  const t = META_PAIR_TONES[tone] || META_PAIR_TONES.violet;
  return (
    <div className={cn('min-w-0', className)}>
      <p className={cn('text-sm font-bold uppercase tracking-wide', t.label)}>{label}</p>
      <p className="mt-0.5 text-base sm:text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

const META_PAIR_TONES = {
  violet: { label: 'text-violet-700' },
  blue: { label: 'text-blue-700' },
  amber: { label: 'text-amber-800' },
  emerald: { label: 'text-emerald-700' },
  rose: { label: 'text-rose-700' },
  orange: { label: 'text-orange-700' },
  teal: { label: 'text-teal-700' },
  cyan: { label: 'text-cyan-700' },
  indigo: { label: 'text-indigo-700' },
} as const;

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
        'flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3.5 text-base text-sky-950',
        className,
      )}
    >
      <span className="mt-0.5 text-lg" aria-hidden>
        ✨
      </span>
      <div className="min-w-0 leading-relaxed">{children}</div>
    </div>
  );
}
