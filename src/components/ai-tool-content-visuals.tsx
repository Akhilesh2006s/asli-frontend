import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatAiToolText } from '@/lib/title-case';
import {
  RealisticIcon,
  focusIconsForTool,
  type AiTool3dIconName,
} from '@/components/ai-tool-3d-icons';

export type ContentVisualMeta = {
  subject?: string;
  chapter?: string;
  subtopic?: string;
  toolType?: string;
  title?: string;
};

type SymbolTheme = {
  key: string;
  label: string;
  icons: AiTool3dIconName[];
  soft: string;
  ring: string;
  accentText: string;
};

function subjectTheme(subject?: string, toolType?: string): SymbolTheme {
  const s = String(subject || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  const toolIcons = focusIconsForTool(toolType);

  if (s.includes('bio') || s.includes('life')) {
    return {
      key: 'biology',
      label: 'Biology',
      icons: ['microscope', 'testTube', 'brain', 'rocket'],
      soft: 'from-emerald-50 to-teal-50',
      ring: 'border-emerald-200/80',
      accentText: 'text-emerald-700',
    };
  }
  if (s.includes('phys') || s.includes('phy')) {
    return {
      key: 'physics',
      label: 'Physics',
      icons: ['physics', 'target', 'brain', 'rocket'],
      soft: 'from-indigo-50 to-violet-50',
      ring: 'border-indigo-200/80',
      accentText: 'text-indigo-700',
    };
  }
  if (s.includes('chem')) {
    return {
      key: 'chemistry',
      label: 'Chemistry',
      icons: ['testTube', 'molecule', 'microscope', 'rocket'],
      soft: 'from-rose-50 to-orange-50',
      ring: 'border-rose-200/80',
      accentText: 'text-rose-700',
    };
  }
  if (s.includes('math') || s.includes('mat')) {
    return {
      key: 'maths',
      label: 'Maths',
      icons: ['formula', 'target', 'brain', 'calculator'],
      soft: 'from-blue-50 to-cyan-50',
      ring: 'border-blue-200/80',
      accentText: 'text-blue-700',
    };
  }
  if (s.includes('eng') || s.includes('hind') || s.includes('lang')) {
    return {
      key: 'language',
      label: 'Language',
      icons: ['books', 'notebook', 'graduation', 'student'],
      soft: 'from-violet-50 to-fuchsia-50',
      ring: 'border-violet-200/80',
      accentText: 'text-violet-700',
    };
  }
  if (s.includes('geo')) {
    return {
      key: 'geography',
      label: 'Geography',
      icons: ['globe', 'target', 'compass', 'rocket'],
      soft: 'from-teal-50 to-cyan-50',
      ring: 'border-teal-200/80',
      accentText: 'text-teal-700',
    };
  }
  if (s.includes('comp') || s.includes('cs') || s.includes('it')) {
    return {
      key: 'computer',
      label: 'Computer',
      icons: ['monitor', 'brain', 'rocket', 'target'],
      soft: 'from-sky-50 to-indigo-50',
      ring: 'border-sky-200/80',
      accentText: 'text-sky-700',
    };
  }
  if (s.includes('sci')) {
    return {
      key: 'science',
      label: 'Science',
      icons: ['testTube', 'molecule', 'microscope', 'rocket'],
      soft: 'from-cyan-50 to-sky-50',
      ring: 'border-cyan-200/80',
      accentText: 'text-cyan-700',
    };
  }
  return {
    key: 'learning',
    label: 'Learning',
    icons: toolIcons,
    soft: 'from-slate-50 to-indigo-50',
    ring: 'border-slate-200/80',
    accentText: 'text-slate-700',
  };
}

const FOCUS_LABELS = ['Explore', 'Understand', 'Practice', 'Apply'];

/**
 * Interactive 3D icon strip (Icons8 3D Fluency) for every AI tool result.
 */
export function AiToolContentVisuals({
  meta,
  className,
}: {
  meta: ContentVisualMeta;
  className?: string;
}) {
  const theme = subjectTheme(meta.subject, meta.toolType);
  const topicLine =
    formatAiToolText(
      [meta.chapter, meta.subtopic].filter(Boolean).join(' · ') ||
        meta.title ||
        theme.label,
    );

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-gradient-to-br p-3 sm:p-4 shadow-sm',
        theme.ring,
        theme.soft,
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className={cn('text-[10px] font-bold uppercase tracking-wider', theme.accentText)}>
            {formatAiToolText(`${theme.label} Focus`)}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-900 sm:text-base">
            {topicLine}
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 sm:gap-2">
        {FOCUS_LABELS.map((label, i) => {
          const icon = theme.icons[i] || theme.icons[0];
          return (
            <motion.div
              key={label}
              whileHover={{ y: -3, scale: 1.03 }}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/80 bg-white/90 px-1 py-2 text-center shadow-sm"
            >
              <RealisticIcon name={icon} alt="" className="h-8 w-8" />
              <span className="text-[9px] font-semibold text-slate-600 sm:text-[10px]">{label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
