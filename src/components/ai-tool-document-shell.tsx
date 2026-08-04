import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAiToolText } from '@/lib/title-case';
import {
  AI_TOOL_SECTION_PALETTES,
  type AiToolSectionPalette,
} from '@/lib/ai-tool-section-palette';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';

export type AiToolDocumentAccent =
  | 'orange'
  | 'teal'
  | 'magenta'
  | 'violet'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'indigo';

const ACCENT_HEADER: Record<
  AiToolDocumentAccent,
  { header: string; iconBg: string; label: string; ring: string }
> = {
  orange: {
    header: 'from-orange-700 via-amber-700 to-orange-900',
    iconBg: 'bg-orange-300/90 text-orange-950',
    label: 'text-orange-100/90',
    ring: 'border-orange-200/80 shadow-orange-900/10',
  },
  teal: {
    header: 'from-teal-800 via-emerald-800 to-teal-950',
    iconBg: 'bg-teal-300/90 text-teal-950',
    label: 'text-teal-100/90',
    ring: 'border-teal-200/80 shadow-teal-900/10',
  },
  magenta: {
    header: 'from-pink-800 via-rose-800 to-fuchsia-950',
    iconBg: 'bg-pink-300/90 text-pink-950',
    label: 'text-pink-100/90',
    ring: 'border-pink-200/80 shadow-pink-900/10',
  },
  violet: {
    header: 'from-slate-800 via-violet-900 to-fuchsia-900',
    iconBg: 'bg-fuchsia-400/90 text-slate-900',
    label: 'text-fuchsia-200/90',
    ring: 'border-fuchsia-200/80 shadow-fuchsia-900/10',
  },
  blue: {
    header: 'from-blue-800 via-indigo-800 to-slate-900',
    iconBg: 'bg-sky-300/90 text-blue-950',
    label: 'text-sky-100/90',
    ring: 'border-blue-200/80 shadow-blue-900/10',
  },
  emerald: {
    header: 'from-emerald-800 via-green-800 to-teal-950',
    iconBg: 'bg-emerald-300/90 text-emerald-950',
    label: 'text-emerald-100/90',
    ring: 'border-emerald-200/80 shadow-emerald-900/10',
  },
  amber: {
    header: 'from-amber-700 via-orange-700 to-amber-950',
    iconBg: 'bg-amber-300/90 text-amber-950',
    label: 'text-amber-100/90',
    ring: 'border-amber-200/80 shadow-amber-900/10',
  },
  rose: {
    header: 'from-rose-800 via-red-800 to-rose-950',
    iconBg: 'bg-rose-300/90 text-rose-950',
    label: 'text-rose-100/90',
    ring: 'border-rose-200/80 shadow-rose-900/10',
  },
  cyan: {
    header: 'from-cyan-800 via-sky-800 to-teal-950',
    iconBg: 'bg-cyan-300/90 text-cyan-950',
    label: 'text-cyan-100/90',
    ring: 'border-cyan-200/80 shadow-cyan-900/10',
  },
  indigo: {
    header: 'from-indigo-800 via-violet-900 to-slate-900',
    iconBg: 'bg-indigo-300/90 text-indigo-950',
    label: 'text-indigo-100/90',
    ring: 'border-indigo-200/80 shadow-indigo-900/10',
  },
};

/** Map tool slug → document accent so teacher + student stay aligned. */
export function accentForToolSlug(slug: string): AiToolDocumentAccent {
  const s = String(slug || '').toLowerCase();
  const map: Record<string, AiToolDocumentAccent> = {
    'concept-mastery-helper': 'violet',
    'concept-breakdown-explainer': 'violet',
    'lesson-planner': 'amber',
    'study-schedule-maker': 'cyan',
    'daily-class-plan-maker': 'indigo',
    'worksheet-mcq-generator': 'emerald',
    'homework-creator': 'orange',
    'exam-question-paper-generator': 'indigo',
    'mock-test-builder': 'rose',
    'smart-qa-practice-generator': 'emerald',
    'quick-assignment-builder': 'rose',
    'smart-study-guide-generator': 'violet',
    'chapter-summary-creator': 'blue',
    'key-points-formula-extractor': 'amber',
    'short-notes-summaries-maker': 'violet',
    'flashcard-generator': 'indigo',
    'my-study-decks': 'violet',
    'activity-project-generator': 'orange',
    'project-idea-lab': 'indigo',
    'story-passage-creator': 'teal',
    'reading-practice-room': 'teal',
  };
  return map[s] || 'violet';
}

function paletteForAccent(accent: AiToolDocumentAccent): AiToolSectionPalette {
  return AI_TOOL_SECTION_PALETTES.find((p) => p.id === accent) || AI_TOOL_SECTION_PALETTES[3];
}

/**
 * One document frame for every teacher/student AI tool.
 * Same structure as Concept Mastery: accent bar → dark header → scrollable pastel body → stacked sections.
 */
export function AiToolDocumentShell({
  toolLabel,
  title,
  subtitle,
  badge,
  accent = 'violet',
  icon: Icon = Sparkles,
  children,
  className,
  bodyClassName,
}: {
  toolLabel: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  accent?: AiToolDocumentAccent;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const theme = ACCENT_HEADER[accent];
  const palette = paletteForAccent(accent);
  const displayLabel = formatAiToolText(toolLabel);
  const displayTitle = formatAiToolText(title);
  const displaySubtitle = subtitle ? formatAiToolText(subtitle) : undefined;

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative overflow-hidden border-2 bg-white shadow-lg',
          AI_V2.radius.cardLg,
          theme.ring,
        )}
      >
        <div className={cn('h-1.5 w-full', palette.bar)} aria-hidden />

        <div
          className={cn(
            'relative border-b border-white/10 bg-gradient-to-br px-4 py-4 sm:px-6',
            theme.header,
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-md rotate-[-2deg]',
                  theme.iconBg,
                )}
              >
                <Icon className="h-7 w-7" aria-hidden />
              </div>
              <div className="min-w-0 text-white">
                <p
                  className={cn(
                    'text-xs font-bold uppercase tracking-[0.2em]',
                    theme.label,
                  )}
                >
                  {displayLabel}
                </p>
                <h3 className="truncate text-2xl font-bold sm:text-3xl leading-tight">{displayTitle}</h3>
                {displaySubtitle ? (
                  <p className="mt-1 text-sm sm:text-base text-white/85">{displaySubtitle}</p>
                ) : null}
              </div>
            </div>
            {badge ? (
              <div className="shrink-0 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20">
                {badge}
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            'relative max-h-[min(80vh,920px)] overflow-y-auto p-3 sm:p-5',
            'bg-gradient-to-b from-white via-slate-50/40 to-white',
            AI_V2.spacing.section,
            bodyClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
