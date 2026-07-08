/**
 * ASLILEARN AI V2 — shared design tokens for all AI tool surfaces.
 * Use across viewers, result shells, super-admin preview, and PDF export.
 */

export const AI_V2 = {
  radius: {
    card: 'rounded-2xl',
    cardLg: 'rounded-[1.25rem]',
    pill: 'rounded-full',
    button: 'rounded-xl',
  },
  shadow: {
    card: 'shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)]',
    cardHover: 'hover:shadow-[0_12px_40px_-14px_rgba(15,23,42,0.22)]',
    shell: 'shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)]',
  },
  spacing: {
    section: 'space-y-4',
    cardPadding: 'p-4 sm:p-5',
    grid: 'gap-3 sm:gap-4',
  },
  typography: {
    sectionTitle: 'text-sm sm:text-base font-bold text-slate-900',
    sectionDesc: 'text-xs text-slate-500 leading-relaxed',
    body: 'text-sm text-slate-800 leading-relaxed',
    label: 'text-[10px] font-semibold uppercase tracking-wide text-slate-500',
    meta: 'text-xs sm:text-sm font-medium text-slate-700',
  },
  badge: {
    ai: 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
  },
} as const;

export const BLOOM_LEVEL_STYLES: Record<
  string,
  { bg: string; border: string; text: string; icon: string }
> = {
  Remember: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-900',
    icon: 'text-violet-600',
  },
  Understand: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    icon: 'text-blue-600',
  },
  Apply: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    icon: 'text-emerald-600',
  },
  Analyze: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    icon: 'text-amber-600',
  },
  Evaluate: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-900',
    icon: 'text-rose-600',
  },
  Create: {
    bg: 'bg-fuchsia-50',
    border: 'border-fuchsia-200',
    text: 'text-fuchsia-900',
    icon: 'text-fuchsia-600',
  },
};

export const COMPETENCY_DEFAULTS = [
  { id: 'observation', label: 'Observation', description: 'Students notice and record scientific phenomena accurately.' },
  { id: 'explanation', label: 'Explanation', description: 'Students describe concepts using correct scientific vocabulary.' },
  { id: 'reasoning', label: 'Reasoning', description: 'Students connect evidence to conclusions logically.' },
  { id: 'application', label: 'Everyday Science Connections', description: 'Students relate classroom ideas to daily life contexts.' },
] as const;

export const NEP_ALIGNMENT_DEFAULTS = [
  { id: 'competency', label: 'Competency-Based Assessment' },
  { id: 'conceptual', label: 'Conceptual Understanding' },
  { id: 'inquiry', label: 'Inquiry & Scientific Temper' },
  { id: 'holistic', label: 'Holistic & Experiential Learning' },
] as const;
