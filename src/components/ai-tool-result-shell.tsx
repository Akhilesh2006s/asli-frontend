import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiToolContentVisuals } from '@/components/ai-tool-content-visuals';
import {
  RealisticIcon,
  heroIconForTool,
  type AiTool3dIconName,
} from '@/components/ai-tool-3d-icons';

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
};

const TOOL_THEMES: Record<string, Theme> = {
  'flashcard-generator': {
    iconBg: 'bg-violet-50 border-violet-200',
    badge: 'bg-violet-50 text-violet-700 border-violet-100',
    chip: 'border-violet-200 bg-white text-violet-800',
    pageBg: 'from-violet-50/80 via-white to-fuchsia-50/40',
  },
  'my-study-decks': {
    iconBg: 'bg-violet-50 border-violet-200',
    badge: 'bg-violet-50 text-violet-700 border-violet-100',
    chip: 'border-violet-200 bg-white text-violet-800',
    pageBg: 'from-violet-50/80 via-white to-fuchsia-50/40',
  },
  'concept-breakdown-explainer': {
    iconBg: 'bg-sky-50 border-sky-200',
    badge: 'bg-sky-50 text-sky-700 border-sky-100',
    chip: 'border-sky-200 bg-white text-sky-800',
    pageBg: 'from-sky-50/80 via-white to-cyan-50/40',
  },
  'lesson-planner': {
    iconBg: 'bg-indigo-50 border-indigo-200',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    chip: 'border-indigo-200 bg-white text-indigo-800',
    pageBg: 'from-indigo-50/70 via-white to-violet-50/40',
  },
  'study-schedule-maker': {
    iconBg: 'bg-indigo-50 border-indigo-200',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    chip: 'border-indigo-200 bg-white text-indigo-800',
    pageBg: 'from-indigo-50/70 via-white to-violet-50/40',
  },
  'smart-study-guide-generator': {
    iconBg: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-50 text-orange-700 border-orange-100',
    chip: 'border-orange-200 bg-white text-orange-800',
    pageBg: 'from-orange-50/70 via-white to-amber-50/40',
  },
  'worksheet-mcq-generator': {
    iconBg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    chip: 'border-emerald-200 bg-white text-emerald-800',
    pageBg: 'from-emerald-50/70 via-white to-teal-50/40',
  },
  'homework-creator': {
    iconBg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-50 text-amber-800 border-amber-100',
    chip: 'border-amber-200 bg-white text-amber-900',
    pageBg: 'from-amber-50/70 via-white to-orange-50/40',
  },
  'concept-mastery-helper': {
    iconBg: 'bg-fuchsia-50 border-fuchsia-200',
    badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
    chip: 'border-fuchsia-200 bg-white text-fuchsia-800',
    pageBg: 'from-fuchsia-50/70 via-white to-violet-50/40',
  },
  'story-passage-creator': {
    iconBg: 'bg-teal-50 border-teal-200',
    badge: 'bg-teal-50 text-teal-700 border-teal-100',
    chip: 'border-teal-200 bg-white text-teal-800',
    pageBg: 'from-teal-50/70 via-white to-cyan-50/40',
  },
  'reading-practice-room': {
    iconBg: 'bg-teal-50 border-teal-200',
    badge: 'bg-teal-50 text-teal-700 border-teal-100',
    chip: 'border-teal-200 bg-white text-teal-800',
    pageBg: 'from-teal-50/70 via-white to-cyan-50/40',
  },
  'mock-test-builder': {
    iconBg: 'bg-rose-50 border-rose-200',
    badge: 'bg-rose-50 text-rose-700 border-rose-100',
    chip: 'border-rose-200 bg-white text-rose-800',
    pageBg: 'from-rose-50/70 via-white to-orange-50/40',
  },
  'exam-question-paper-generator': {
    iconBg: 'bg-slate-50 border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    chip: 'border-slate-200 bg-white text-slate-800',
    pageBg: 'from-slate-50 via-white to-indigo-50/40',
  },
  'short-notes-summaries-maker': {
    iconBg: 'bg-cyan-50 border-cyan-200',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    chip: 'border-cyan-200 bg-white text-cyan-800',
    pageBg: 'from-cyan-50/70 via-white to-sky-50/40',
  },
  'daily-class-plan-maker': {
    iconBg: 'bg-indigo-50 border-indigo-200',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    chip: 'border-indigo-200 bg-white text-indigo-800',
    pageBg: 'from-indigo-50/70 via-white to-violet-50/40',
  },
  'activity-project-generator': {
    iconBg: 'bg-pink-50 border-pink-200',
    badge: 'bg-pink-50 text-pink-700 border-pink-100',
    chip: 'border-pink-200 bg-white text-pink-800',
    pageBg: 'from-pink-50/70 via-white to-rose-50/40',
  },
  'smart-qa-practice-generator': {
    iconBg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
    chip: 'border-blue-200 bg-white text-blue-800',
    pageBg: 'from-blue-50/70 via-white to-indigo-50/40',
  },
  'chapter-summary-creator': {
    iconBg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
    chip: 'border-blue-200 bg-white text-blue-800',
    pageBg: 'from-blue-50/70 via-white to-sky-50/40',
  },
  'key-points-formula-extractor': {
    iconBg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-50 text-amber-800 border-amber-100',
    chip: 'border-amber-200 bg-white text-amber-900',
    pageBg: 'from-amber-50/70 via-white to-yellow-50/40',
  },
  'quick-assignment-builder': {
    iconBg: 'bg-lime-50 border-lime-200',
    badge: 'bg-lime-50 text-lime-800 border-lime-100',
    chip: 'border-lime-200 bg-white text-lime-900',
    pageBg: 'from-lime-50/70 via-white to-emerald-50/40',
  },
  'project-idea-lab': {
    iconBg: 'bg-pink-50 border-pink-200',
    badge: 'bg-pink-50 text-pink-700 border-pink-100',
    chip: 'border-pink-200 bg-white text-pink-800',
    pageBg: 'from-pink-50/70 via-white to-rose-50/40',
  },
};

const DEFAULT_THEME: Theme = {
  iconBg: 'bg-blue-50 border-blue-200',
  badge: 'bg-blue-50 text-blue-700 border-blue-100',
  chip: 'border-blue-200 bg-white text-blue-800',
  pageBg: 'from-sky-50/80 via-white to-indigo-50/40',
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
        'inline-flex items-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-[11px] sm:text-xs font-medium shadow-sm',
        className,
      )}
    >
      <RealisticIcon name={icon} alt="" className="h-5 w-5" />
      <span className="opacity-70">{label}:</span>
      <span className="font-semibold truncate max-w-[9rem] sm:max-w-[12rem]">{value}</span>
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
  /** V2: generation context strip between meta chips and content */
  inputSummary?: ReactNode;
  /** V2: footer actions (download, regenerate, save) */
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
    <div
      className={cn(
        'w-full rounded-[1.5rem] sm:rounded-[1.75rem] border border-white/80 bg-gradient-to-b p-3 sm:p-4 lg:p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)]',
        theme.pageBg,
        className,
      )}
    >
      <div className="rounded-[1.25rem] border border-white/90 bg-white/95 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                'h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-2xl flex items-center justify-center border shadow-sm',
                theme.iconBg,
              )}
            >
              <RealisticIcon name={heroIcon} alt="" className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  {toolName}
                </h2>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    theme.badge,
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  AI Powered
                </span>
              </div>
              {toolDescription ? (
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {toolDescription}
                </p>
              ) : null}
              {citations}
            </div>
          </div>
          {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
        </div>

        {hasMeta ? (
          <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60">
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
          <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-white">{inputSummary}</div>
        ) : null}

        <div className="p-3 sm:p-4 lg:p-5 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <RealisticIcon name={heroIcon} alt="" className="h-16 w-16" />
              <div className="text-center space-y-1">
                <p className="text-base font-semibold text-slate-900">Preparing your content…</p>
                <p className="text-xs text-slate-500">This usually takes a few seconds</p>
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
              <div className="rounded-2xl bg-slate-50/50 p-1 sm:p-2">{children}</div>
            </>
          ) : (
            empty || (
              <div className="text-center py-12 text-slate-500 text-sm">
                Generate content to see your result here.
              </div>
            )
          )}
        </div>

        {footer ? (
          <div className="border-t border-slate-100 bg-slate-50/80 px-4 sm:px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
