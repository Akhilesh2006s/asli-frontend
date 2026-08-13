/** Soft pastels for Vidya AI tool cards — unique color per tool (not column-repeating). */
export type VidyaPastelTone = {
  card: string;
  iconBg: string;
  iconColor: string;
  titleHover: string;
  cta: string;
};

export const VIDYA_PASTEL_TONES: readonly VidyaPastelTone[] = [
  {
    card: 'border-sky-100 bg-sky-50 hover:border-sky-300',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-700',
    titleHover: 'group-hover:text-sky-700',
    cta: 'text-sky-700',
  },
  {
    card: 'border-teal-100 bg-teal-50 hover:border-teal-300',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
    titleHover: 'group-hover:text-teal-700',
    cta: 'text-teal-700',
  },
  {
    card: 'border-amber-100 bg-amber-50 hover:border-amber-300',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    titleHover: 'group-hover:text-amber-800',
    cta: 'text-amber-800',
  },
  {
    card: 'border-rose-100 bg-rose-50 hover:border-rose-300',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
    titleHover: 'group-hover:text-rose-700',
    cta: 'text-rose-700',
  },
  {
    card: 'border-emerald-100 bg-emerald-50 hover:border-emerald-300',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    titleHover: 'group-hover:text-emerald-700',
    cta: 'text-emerald-700',
  },
  {
    card: 'border-orange-100 bg-orange-50 hover:border-orange-300',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-700',
    titleHover: 'group-hover:text-orange-700',
    cta: 'text-orange-700',
  },
  {
    card: 'border-cyan-100 bg-cyan-50 hover:border-cyan-300',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-700',
    titleHover: 'group-hover:text-cyan-700',
    cta: 'text-cyan-700',
  },
  {
    card: 'border-lime-100 bg-lime-50 hover:border-lime-300',
    iconBg: 'bg-lime-100',
    iconColor: 'text-lime-800',
    titleHover: 'group-hover:text-lime-800',
    cta: 'text-lime-800',
  },
  {
    card: 'border-fuchsia-100 bg-fuchsia-50 hover:border-fuchsia-300',
    iconBg: 'bg-fuchsia-100',
    iconColor: 'text-fuchsia-700',
    titleHover: 'group-hover:text-fuchsia-700',
    cta: 'text-fuchsia-700',
  },
  {
    card: 'border-indigo-100 bg-indigo-50 hover:border-indigo-300',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-700',
    titleHover: 'group-hover:text-indigo-700',
    cta: 'text-indigo-700',
  },
  {
    card: 'border-yellow-100 bg-yellow-50 hover:border-yellow-300',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-800',
    titleHover: 'group-hover:text-yellow-800',
    cta: 'text-yellow-800',
  },
  {
    card: 'border-slate-200 bg-slate-50 hover:border-slate-300',
    iconBg: 'bg-slate-200',
    iconColor: 'text-slate-700',
    titleHover: 'group-hover:text-slate-800',
    cta: 'text-slate-700',
  },
] as const;

/** Stable palette pick by tool id so each card keeps its own color. */
const TOOL_TONE_BY_ID: Record<string, number> = {
  'ai-chat': 0,
  'smart-study-guide-generator': 1,
  'concept-breakdown-explainer': 2,
  'smart-qa-practice-generator': 3,
  'chapter-summary-creator': 4,
  'my-study-decks': 5,
  'mock-test-builder': 6,
  'project-idea-lab': 7,
  'reading-practice-room': 8,
  'study-schedule-maker': 9,
  'activity-project-generator': 0,
  'worksheet-mcq-generator': 1,
  'concept-mastery-helper': 2,
  'lesson-planner': 3,
  'exam-question-paper-generator': 4,
  'daily-class-plan-maker': 5,
  'homework-creator': 6,
  'story-passage-creator': 7,
  'short-notes-summaries-maker': 8,
  'flashcard-generator': 9,
};

function hashToneIndex(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % VIDYA_PASTEL_TONES.length;
}

export function vidyaPastelTone(index: number): VidyaPastelTone {
  return VIDYA_PASTEL_TONES[index % VIDYA_PASTEL_TONES.length];
}

/** Prefer this for tool grids so colors don't repeat by column. */
export function vidyaPastelToneForTool(toolId: string, fallbackIndex = 0): VidyaPastelTone {
  const mapped = TOOL_TONE_BY_ID[toolId];
  if (typeof mapped === 'number') return VIDYA_PASTEL_TONES[mapped % VIDYA_PASTEL_TONES.length];
  if (toolId) return VIDYA_PASTEL_TONES[hashToneIndex(toolId)];
  return vidyaPastelTone(fallbackIndex);
}
