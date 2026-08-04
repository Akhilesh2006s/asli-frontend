/**
 * Shared color layering for every teacher/student AI tool section card.
 * Inspired by Concept Mastery Helper + tariff-style colored boxes:
 * solid header accent, bold colored titles, soft pastel inner panels.
 */

export type AiToolSectionPalette = {
  id: string;
  /** Solid top bar / number badge */
  bar: string;
  /** Gradient fallback for legacy accent props */
  accentGradient: string;
  /** Soft card wash */
  cardWash: string;
  /** Colored section title */
  title: string;
  /** Near-black secondary heading under the colored title */
  subtitle: string;
  /** Colored muted label (Pedagogy / Time / Bloom style) */
  label: string;
  /** Strong accent for key numbers / emphasis */
  emphasis: string;
  /** Soft inner content box */
  inner: string;
  /** Inner box border */
  innerBorder: string;
  /** Icon tile behind lucide/3d icon */
  iconTile: string;
  /** Meta chips / badges */
  chip: string;
  /** List marker / bullet accent */
  marker: string;
};

export const AI_TOOL_SECTION_PALETTES: AiToolSectionPalette[] = [
  {
    id: 'orange',
    bar: 'bg-orange-500',
    accentGradient: 'from-orange-500 to-amber-500',
    cardWash: 'from-orange-50 via-white to-amber-50/40',
    title: 'text-orange-800',
    subtitle: 'text-slate-900',
    label: 'text-orange-700',
    emphasis: 'text-orange-600',
    inner: 'bg-orange-50/70',
    innerBorder: 'border-orange-100',
    iconTile: 'bg-orange-100 text-orange-800 border-orange-200',
    chip: 'bg-orange-100 text-orange-900 border-orange-200',
    marker: 'marker:text-orange-600',
  },
  {
    id: 'teal',
    bar: 'bg-teal-600',
    accentGradient: 'from-teal-500 to-emerald-500',
    cardWash: 'from-teal-50 via-white to-emerald-50/40',
    title: 'text-teal-800',
    subtitle: 'text-slate-900',
    label: 'text-teal-700',
    emphasis: 'text-teal-600',
    inner: 'bg-teal-50/70',
    innerBorder: 'border-teal-100',
    iconTile: 'bg-teal-100 text-teal-800 border-teal-200',
    chip: 'bg-teal-100 text-teal-900 border-teal-200',
    marker: 'marker:text-teal-600',
  },
  {
    id: 'magenta',
    bar: 'bg-pink-600',
    accentGradient: 'from-pink-500 to-rose-500',
    cardWash: 'from-pink-50 via-white to-rose-50/40',
    title: 'text-pink-800',
    subtitle: 'text-slate-900',
    label: 'text-pink-700',
    emphasis: 'text-pink-600',
    inner: 'bg-pink-50/70',
    innerBorder: 'border-pink-100',
    iconTile: 'bg-pink-100 text-pink-800 border-pink-200',
    chip: 'bg-pink-100 text-pink-900 border-pink-200',
    marker: 'marker:text-pink-600',
  },
  {
    id: 'violet',
    bar: 'bg-violet-600',
    accentGradient: 'from-violet-500 to-purple-600',
    cardWash: 'from-violet-50 via-white to-fuchsia-50/40',
    title: 'text-violet-900',
    subtitle: 'text-slate-900',
    label: 'text-violet-700',
    emphasis: 'text-violet-600',
    inner: 'bg-violet-50/70',
    innerBorder: 'border-violet-100',
    iconTile: 'bg-violet-100 text-violet-800 border-violet-200',
    chip: 'bg-violet-100 text-violet-950 border-violet-200',
    marker: 'marker:text-violet-600',
  },
  {
    id: 'blue',
    bar: 'bg-blue-600',
    accentGradient: 'from-blue-500 to-indigo-600',
    cardWash: 'from-blue-50 via-white to-sky-50/40',
    title: 'text-blue-900',
    subtitle: 'text-slate-900',
    label: 'text-blue-700',
    emphasis: 'text-blue-600',
    inner: 'bg-blue-50/70',
    innerBorder: 'border-blue-100',
    iconTile: 'bg-blue-100 text-blue-800 border-blue-200',
    chip: 'bg-blue-100 text-blue-950 border-blue-200',
    marker: 'marker:text-blue-600',
  },
  {
    id: 'emerald',
    bar: 'bg-emerald-600',
    accentGradient: 'from-emerald-500 to-green-600',
    cardWash: 'from-emerald-50 via-white to-lime-50/40',
    title: 'text-emerald-900',
    subtitle: 'text-slate-900',
    label: 'text-emerald-700',
    emphasis: 'text-emerald-600',
    inner: 'bg-emerald-50/70',
    innerBorder: 'border-emerald-100',
    iconTile: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-950 border-emerald-200',
    marker: 'marker:text-emerald-600',
  },
  {
    id: 'amber',
    bar: 'bg-amber-500',
    accentGradient: 'from-amber-500 to-orange-500',
    cardWash: 'from-amber-50 via-white to-yellow-50/40',
    title: 'text-amber-900',
    subtitle: 'text-slate-900',
    label: 'text-amber-800',
    emphasis: 'text-amber-700',
    inner: 'bg-amber-50/70',
    innerBorder: 'border-amber-100',
    iconTile: 'bg-amber-100 text-amber-900 border-amber-200',
    chip: 'bg-amber-100 text-amber-950 border-amber-200',
    marker: 'marker:text-amber-600',
  },
  {
    id: 'rose',
    bar: 'bg-rose-600',
    accentGradient: 'from-rose-500 to-red-500',
    cardWash: 'from-rose-50 via-white to-orange-50/30',
    title: 'text-rose-900',
    subtitle: 'text-slate-900',
    label: 'text-rose-700',
    emphasis: 'text-rose-600',
    inner: 'bg-rose-50/70',
    innerBorder: 'border-rose-100',
    iconTile: 'bg-rose-100 text-rose-800 border-rose-200',
    chip: 'bg-rose-100 text-rose-950 border-rose-200',
    marker: 'marker:text-rose-600',
  },
  {
    id: 'cyan',
    bar: 'bg-cyan-600',
    accentGradient: 'from-cyan-500 to-sky-500',
    cardWash: 'from-cyan-50 via-white to-sky-50/40',
    title: 'text-cyan-900',
    subtitle: 'text-slate-900',
    label: 'text-cyan-700',
    emphasis: 'text-cyan-600',
    inner: 'bg-cyan-50/70',
    innerBorder: 'border-cyan-100',
    iconTile: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    chip: 'bg-cyan-100 text-cyan-950 border-cyan-200',
    marker: 'marker:text-cyan-600',
  },
  {
    id: 'indigo',
    bar: 'bg-indigo-600',
    accentGradient: 'from-indigo-500 to-blue-600',
    cardWash: 'from-indigo-50 via-white to-violet-50/40',
    title: 'text-indigo-900',
    subtitle: 'text-slate-900',
    label: 'text-indigo-700',
    emphasis: 'text-indigo-600',
    inner: 'bg-indigo-50/70',
    innerBorder: 'border-indigo-100',
    iconTile: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    chip: 'bg-indigo-100 text-indigo-950 border-indigo-200',
    marker: 'marker:text-indigo-600',
  },
];

/** Stable palette from section title (+ optional number hint). */
export function paletteForSectionTitle(title: string, numHint = ''): AiToolSectionPalette {
  const key = `${title}|${numHint}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return AI_TOOL_SECTION_PALETTES[hash % AI_TOOL_SECTION_PALETTES.length];
}

export function paletteByIndex(index: number): AiToolSectionPalette {
  const i = ((index % AI_TOOL_SECTION_PALETTES.length) + AI_TOOL_SECTION_PALETTES.length) % AI_TOOL_SECTION_PALETTES.length;
  return AI_TOOL_SECTION_PALETTES[i];
}
