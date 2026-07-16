import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiToolContentVisuals } from '@/components/ai-tool-content-visuals';
import {
  RealisticIcon,
  heroIconForTool,
  type AiTool3dIconName,
} from '@/components/ai-tool-3d-icons';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';

export type AiToolResultMeta = {
  board?: string;
  classLabel?: string;
  subject?: string;
  chapter?: string;
  subtopic?: string;
};

type Theme = {
  iconBg: string;
  badge: string;
  chip: string;
  pageBg: string;
  accentBar: string;
};

const TOOL_THEMES: Record<string, Theme> = {
  'flashcard-generator': {
    iconBg: 'bg-sky-50 border-sky-200',
    badge: 'bg-sky-50 text-sky-800 border-sky-100',
    chip: 'border-sky-200 bg-white text-sky-900',
    pageBg: 'from-sky-50/90 via-white to-teal-50/50',
    accentBar: 'from-sky-500 to-teal-500',
  },
  'my-study-decks': {
    iconBg: 'bg-sky-50 border-sky-200',
    badge: 'bg-sky-50 text-sky-800 border-sky-100',
    chip: 'border-sky-200 bg-white text-sky-900',
    pageBg: 'from-sky-50/90 via-white to-teal-50/50',
    accentBar: 'from-sky-500 to-teal-500',
  },
  'concept-breakdown-explainer': {
    iconBg: 'bg-cyan-50 border-cyan-200',
    badge: 'bg-cyan-50 text-cyan-800 border-cyan-100',
    chip: 'border-cyan-200 bg-white text-cyan-900',
    pageBg: 'from-cyan-50/80 via-white to-sky-50/40',
    accentBar: 'from-cyan-500 to-sky-500',
  },
  'lesson-planner': {
    iconBg: 'bg-teal-50 border-teal-200',
    badge: 'bg-teal-50 text-teal-800 border-teal-100',
    chip: 'border-teal-200 bg-white text-teal-900',
    pageBg: 'from-teal-50/80 via-white to-emerald-50/40',
    accentBar: 'from-teal-500 to-emerald-500',
  },
  'study-schedule-maker': {
    iconBg: 'bg-teal-50 border-teal-200',
    badge: 'bg-teal-50 text-teal-800 border-teal-100',
    chip: 'border-teal-200 bg-white text-teal-900',
    pageBg: 'from-teal-50/80 via-white to-emerald-50/40',
    accentBar: 'from-teal-500 to-emerald-500',
  },
  'smart-study-guide-generator': {
    iconBg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-50 text-amber-900 border-amber-100',
    chip: 'border-amber-200 bg-white text-amber-950',
    pageBg: 'from-amber-50/80 via-white to-orange-50/40',
    accentBar: 'from-amber-500 to-orange-500',
  },
  'worksheet-mcq-generator': {
    iconBg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    chip: 'border-emerald-200 bg-white text-emerald-900',
    pageBg: 'from-emerald-50/80 via-white to-teal-50/40',
    accentBar: 'from-emerald-500 to-teal-500',
  },
  'homework-creator': {
    iconBg: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-50 text-orange-900 border-orange-100',
    chip: 'border-orange-200 bg-white text-orange-950',
    pageBg: 'from-orange-50/80 via-white to-amber-50/40',
    accentBar: 'from-orange-500 to-amber-500',
  },
  'concept-mastery-helper': {
    iconBg: 'bg-sky-50 border-sky-200',
    badge: 'bg-sky-50 text-sky-800 border-sky-100',
    chip: 'border-sky-200 bg-white text-sky-900',
    pageBg: 'from-sky-50/80 via-white to-cyan-50/40',
    accentBar: 'from-sky-500 to-cyan-500',
  },
  'story-passage-creator': {
    iconBg: 'bg-teal-50 border-teal-200',
    badge: 'bg-teal-50 text-teal-800 border-teal-100',
    chip: 'border-teal-200 bg-white text-teal-900',
    pageBg: 'from-teal-50/80 via-white to-cyan-50/40',
    accentBar: 'from-teal-500 to-cyan-500',
  },
  'reading-practice-room': {
    iconBg: 'bg-teal-50 border-teal-200',
    badge: 'bg-teal-50 text-teal-800 border-teal-100',
    chip: 'border-teal-200 bg-white text-teal-900',
    pageBg: 'from-teal-50/80 via-white to-cyan-50/40',
    accentBar: 'from-teal-500 to-cyan-500',
  },
  'mock-test-builder': {
    iconBg: 'bg-rose-50 border-rose-200',
    badge: 'bg-rose-50 text-rose-800 border-rose-100',
    chip: 'border-rose-200 bg-white text-rose-900',
    pageBg: 'from-rose-50/80 via-white to-orange-50/40',
    accentBar: 'from-rose-500 to-orange-500',
  },
  'exam-question-paper-generator': {
    iconBg: 'bg-slate-50 border-slate-200',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    chip: 'border-slate-200 bg-white text-slate-900',
    pageBg: 'from-slate-50 via-white to-sky-50/40',
    accentBar: 'from-slate-600 to-sky-600',
  },
  'short-notes-summaries-maker': {
    iconBg: 'bg-cyan-50 border-cyan-200',
    badge: 'bg-cyan-50 text-cyan-800 border-cyan-100',
    chip: 'border-cyan-200 bg-white text-cyan-900',
    pageBg: 'from-cyan-50/80 via-white to-sky-50/40',
    accentBar: 'from-cyan-500 to-sky-500',
  },
  'daily-class-plan-maker': {
    iconBg: 'bg-teal-50 border-teal-200',
    badge: 'bg-teal-50 text-teal-800 border-teal-100',
    chip: 'border-teal-200 bg-white text-teal-900',
    pageBg: 'from-teal-50/80 via-white to-sky-50/40',
    accentBar: 'from-teal-500 to-sky-500',
  },
  'activity-project-generator': {
    iconBg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    chip: 'border-emerald-200 bg-white text-emerald-900',
    pageBg: 'from-emerald-50/80 via-white to-teal-50/40',
    accentBar: 'from-emerald-500 to-teal-500',
  },
  'smart-qa-practice-generator': {
    iconBg: 'bg-sky-50 border-sky-200',
    badge: 'bg-sky-50 text-sky-800 border-sky-100',
    chip: 'border-sky-200 bg-white text-sky-900',
    pageBg: 'from-sky-50/80 via-white to-indigo-50/30',
    accentBar: 'from-sky-500 to-blue-600',
  },
  'chapter-summary-creator': {
    iconBg: 'bg-sky-50 border-sky-200',
    badge: 'bg-sky-50 text-sky-800 border-sky-100',
    chip: 'border-sky-200 bg-white text-sky-900',
    pageBg: 'from-sky-50/80 via-white to-cyan-50/40',
    accentBar: 'from-sky-500 to-cyan-500',
  },
  'key-points-formula-extractor': {
    iconBg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-50 text-amber-900 border-amber-100',
    chip: 'border-amber-200 bg-white text-amber-950',
    pageBg: 'from-amber-50/80 via-white to-yellow-50/40',
    accentBar: 'from-amber-500 to-yellow-500',
  },
  'quick-assignment-builder': {
    iconBg: 'bg-lime-50 border-lime-200',
    badge: 'bg-lime-50 text-lime-900 border-lime-100',
    chip: 'border-lime-200 bg-white text-lime-950',
    pageBg: 'from-lime-50/80 via-white to-emerald-50/40',
    accentBar: 'from-lime-500 to-emerald-500',
  },
  'project-idea-lab': {
    iconBg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    chip: 'border-emerald-200 bg-white text-emerald-900',
    pageBg: 'from-emerald-50/80 via-white to-teal-50/40',
    accentBar: 'from-emerald-500 to-teal-500',
  },
};

const DEFAULT_THEME: Theme = {
  iconBg: 'bg-sky-50 border-sky-200',
  badge: 'bg-sky-50 text-sky-800 border-sky-100',
  chip: 'border-sky-200 bg-white text-sky-900',
  pageBg: 'from-sky-50/90 via-white to-teal-50/40',
  accentBar: 'from-sky-500 to-teal-500',
};

const META_ICONS: { key: keyof AiToolResultMeta; label: string; icon: AiTool3dIconName }[] = [
  { key: 'board', label: 'Board', icon: 'school' },
  { key: 'classLabel', label: 'Class', icon: 'users' },
  { key: 'subject', label: 'Subject', icon: 'books' },
  { key: 'chapter', label: 'Chapter', icon: 'openBook' },
  { key: 'subtopic', label: 'Subtopic', icon: 'tag' },
];

function MetaChip({
  icon,
  label,
  value,
  className,
}: {
  icon: AiTool3dIconName;
  label: string;
  value: string;
  className?: string;
}) {
  if (!value.trim()) return null;
  return (
    <div
      className={cn(
        'inline-flex min-h-9 max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-[0.9375rem] font-medium shadow-sm',
        className,
      )}
    >
      <RealisticIcon name={icon} alt="" className="h-4 w-4 shrink-0" />
      <span className="font-semibold opacity-70">{label}</span>
      <span className="truncate font-semibold max-w-[8rem] sm:max-w-[11rem]">{value}</span>
    </div>
  );
}

export function AiToolResultShell({
  toolType = '',
  toolName,
  toolDescription,
  meta,
  actions,
  citations,
  inputSummary,
  footer,
  isLoading,
  empty,
  children,
  className,
}: {
  toolType?: string;
  toolName: string;
  toolDescription?: string;
  meta?: AiToolResultMeta;
  actions?: ReactNode;
  citations?: ReactNode;
  inputSummary?: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  empty?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const theme = TOOL_THEMES[toolType] || DEFAULT_THEME;
  const board = String(meta?.board || '').trim();
  const classLabel = String(meta?.classLabel || '').trim();
  const subject = String(meta?.subject || '').trim();
  const chapter = String(meta?.chapter || '').trim();
  const subtopic = String(meta?.subtopic || '').trim();
  const hasMeta = Boolean(board || classLabel || subject || chapter || subtopic);
  const heroIcon = heroIconForTool(toolType);
  const metaValues: AiToolResultMeta = { board, classLabel, subject, chapter, subtopic };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={cn(
        AI_V2.radius.cardLg,
        'w-full overflow-hidden border border-white/90 bg-gradient-to-b shadow-[0_18px_50px_-28px_rgba(15,23,42,0.28)]',
        theme.pageBg,
        className,
      )}
    >
      <div className={cn('h-1.5 w-full bg-gradient-to-r', theme.accentBar)} />
      <div className="bg-white/95">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className={cn(
                'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border shadow-sm sm:h-20 sm:w-20',
                theme.iconBg,
              )}
            >
              <RealisticIcon name={heroIcon} alt="" className="h-12 w-12 sm:h-14 sm:w-14" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-ink lg:text-3xl">
                  {toolName}
                </h2>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.9375rem] font-semibold',
                    theme.badge,
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  Interactive
                </span>
              </div>
              {toolDescription ? (
                <p className="text-lg leading-relaxed text-muted-foreground">{toolDescription}</p>
              ) : null}
              {citations}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {hasMeta ? (
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap gap-2">
              {META_ICONS.map((item) => (
                <MetaChip
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  value={String(metaValues[item.key] || '')}
                  className={theme.chip}
                />
              ))}
            </div>
          </div>
        ) : null}

        {inputSummary ? (
          <div className="border-b border-slate-100 bg-white px-4 py-3 sm:px-5">{inputSummary}</div>
        ) : null}

        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-16">
              <div className="relative">
                <RealisticIcon name={heroIcon} alt="" className="h-16 w-16" />
                <span className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-lg font-bold text-slate-900">Preparing your content…</p>
                <p className="text-base text-slate-500">Interactive sections will appear in a few seconds</p>
              </div>
            </div>
          ) : children ? (
            <>
              <AiToolContentVisuals
                meta={{
                  subject,
                  chapter,
                  subtopic,
                  toolType,
                  title: toolName,
                }}
              />
              <div className="rounded-2xl bg-slate-50/40 p-1 sm:p-2">{children}</div>
            </>
          ) : (
            empty || (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
                <RealisticIcon name={heroIcon} alt="" className="mx-auto mb-3 h-12 w-12 opacity-70" />
                <p className="text-lg font-bold text-slate-700">Ready when you are</p>
                <p className="mt-2 text-base text-slate-500">
                  Choose curriculum filters above, then Generate to open interactive results.
                </p>
              </div>
            )
          )}
        </div>

        {footer ? (
          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-5">{footer}</div>
        ) : null}
      </div>
    </motion.div>
  );
}
