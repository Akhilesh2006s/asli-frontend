import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SixSectionViewer — one reusable, premium card shell for all 21 AsliLearn tools.
 * Each tool supplies its icon, accent colours, section labels, and typed content
 * blocks; the layout stays identical and polished (accent-barred cards, layered
 * depth, refined MCQ / answer-key / Bloom / tier rendering). White page, vivid cards.
 */

export type SectionAccent = 'blue' | 'green' | 'amber' | 'violet' | 'teal' | 'rose';

type Accent = {
  text: string;
  badge: string;
  bar: string;
  head: string;
  soft: string;
  ring: string;
  dot: string;
  glow: string;
};

const ACCENTS: Record<SectionAccent, Accent> = {
  blue: {
    text: 'text-blue-600 dark:text-blue-300',
    badge: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    bar: 'from-blue-500 to-indigo-500',
    head: 'from-blue-50/80 dark:from-blue-950/40',
    soft: 'bg-blue-50 dark:bg-blue-950/40',
    ring: 'border-blue-100 dark:border-blue-900/60',
    dot: 'bg-blue-500',
    glow: 'shadow-blue-500/25',
  },
  green: {
    text: 'text-emerald-600 dark:text-emerald-300',
    badge: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    bar: 'from-emerald-500 to-teal-500',
    head: 'from-emerald-50/80 dark:from-emerald-950/40',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40',
    ring: 'border-emerald-100 dark:border-emerald-900/60',
    dot: 'bg-emerald-500',
    glow: 'shadow-emerald-500/25',
  },
  amber: {
    text: 'text-amber-600 dark:text-amber-300',
    badge: 'bg-gradient-to-br from-amber-400 to-orange-600',
    bar: 'from-amber-400 to-orange-500',
    head: 'from-amber-50/80 dark:from-amber-950/40',
    soft: 'bg-amber-50 dark:bg-amber-950/40',
    ring: 'border-amber-100 dark:border-amber-900/60',
    dot: 'bg-amber-500',
    glow: 'shadow-amber-500/25',
  },
  violet: {
    text: 'text-violet-600 dark:text-violet-300',
    badge: 'bg-gradient-to-br from-violet-500 to-fuchsia-600',
    bar: 'from-violet-500 to-fuchsia-500',
    head: 'from-violet-50/80 dark:from-violet-950/40',
    soft: 'bg-violet-50 dark:bg-violet-950/40',
    ring: 'border-violet-100 dark:border-violet-900/60',
    dot: 'bg-violet-500',
    glow: 'shadow-violet-500/25',
  },
  teal: {
    text: 'text-teal-600 dark:text-teal-300',
    badge: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    bar: 'from-teal-500 to-cyan-500',
    head: 'from-teal-50/80 dark:from-teal-950/40',
    soft: 'bg-teal-50 dark:bg-teal-950/40',
    ring: 'border-teal-100 dark:border-teal-900/60',
    dot: 'bg-teal-500',
    glow: 'shadow-teal-500/25',
  },
  rose: {
    text: 'text-rose-600 dark:text-rose-300',
    badge: 'bg-gradient-to-br from-rose-500 to-pink-600',
    bar: 'from-rose-500 to-pink-500',
    head: 'from-rose-50/80 dark:from-rose-950/40',
    soft: 'bg-rose-50 dark:bg-rose-950/40',
    ring: 'border-rose-100 dark:border-rose-900/60',
    dot: 'bg-rose-500',
    glow: 'shadow-rose-500/25',
  },
};

const BLOOM_TONE = ['violet', 'blue', 'green', 'amber', 'rose'] as const;
const TIER_TONE: Record<string, SectionAccent> = { support: 'green', core: 'blue', stretch: 'violet' };

export type McqQuestion = {
  n: string;
  stem: string;
  marks?: string;
  options: { label: string; text: string; correct?: boolean }[];
};

export type ContentBlock =
  | { kind: 'lead'; text: string }
  | { kind: 'titleLine'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'steps'; items: string[] }
  | { kind: 'keyValue'; rows: { label: string; value: string }[] }
  | { kind: 'mcq'; questions: McqQuestion[] }
  | { kind: 'shortAnswer'; questions: { n: string; stem: string; marks?: string }[] }
  | { kind: 'answerKey'; items: { n: string; answer: string; work?: string }[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'bloom'; chips: { level: string; desc: string }[] }
  | { kind: 'tips'; items: string[] };

export type SixSection = {
  id: string;
  label: string;
  accent: SectionAccent;
  icon: LucideIcon;
  emoji?: string;
  tag?: string;
  full?: boolean;
  blocks: ContentBlock[];
};

export type SixSectionViewerProps = {
  tool: { name: string; subtitle?: string; icon: LucideIcon };
  curriculum?: { board?: string; class?: string; subject?: string; chapter?: string; subtopic?: string };
  chapter?: { title?: string; subtopic?: string; icon?: LucideIcon; emoji?: string };
  sections: SixSection[];
  className?: string;
};

const DEFAULT_EMOJI: Record<string, string> = {
  core: '📝', objectives: '🎯', differentiation: '🧩', assessment: '🔑', teacher: '👩‍🏫', reallife: '🌍',
};

function Blocks({ blocks, accent }: { blocks: ContentBlock[]; accent: Accent }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'lead':
            return (
              <p key={i} className="text-[0.92rem] leading-relaxed text-slate-600 dark:text-slate-300">
                {b.text}
              </p>
            );
          case 'titleLine':
            return (
              <p
                key={i}
                className="flex items-center gap-2 pt-1 text-[0.95rem] font-bold tracking-tight text-slate-900 dark:text-slate-100"
              >
                <span className={cn('h-4 w-1.5 rounded-full bg-gradient-to-b', accent.bar)} />
                {b.text}
              </p>
            );
          case 'bullets':
            return (
              <ul key={i} className="space-y-2.5">
                {b.items.map((it, j) => (
                  <li
                    key={j}
                    className="flex gap-3 text-[0.92rem] leading-relaxed text-slate-700 dark:text-slate-300"
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ring-1 ring-inset',
                        accent.soft,
                        accent.ring,
                      )}
                    >
                      <Check className={cn('h-3 w-3', accent.text)} strokeWidth={3} />
                    </span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            );
          case 'steps':
            return (
              <ol key={i} className="relative space-y-4 before:absolute before:left-[15px] before:top-4 before:bottom-4 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
                {b.items.map((it, j) => (
                  <li key={j} className="relative flex items-start gap-4 text-[0.92rem] leading-relaxed text-slate-700 dark:text-slate-300">
                    <span
                      className={cn(
                        'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.8rem] font-extrabold text-white shadow-md ring-4 ring-white dark:ring-slate-900',
                        accent.badge,
                        accent.glow,
                      )}
                    >
                      {j + 1}
                    </span>
                    <span className="pt-1">{it}</span>
                  </li>
                ))}
              </ol>
            );
          case 'keyValue':
            return (
              <div key={i} className="grid gap-3 sm:grid-cols-3">
                {b.rows.map((r, j) => {
                  const tone = ACCENTS[TIER_TONE[String(r.label || '').trim().toLowerCase()] || accentKey(accent)];
                  return (
                    <div
                      key={j}
                      className={cn(
                        'relative overflow-hidden rounded-2xl border p-4 transition-shadow hover:shadow-md',
                        tone.ring,
                        tone.soft,
                      )}
                    >
                      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', tone.bar)} />
                      <div className={cn('text-[0.7rem] font-black uppercase tracking-widest', tone.text)}>
                        {r.label}
                      </div>
                      <div className="mt-1.5 text-[0.86rem] leading-relaxed text-slate-700 dark:text-slate-300">
                        {r.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          case 'mcq':
            return (
              <div key={i} className="space-y-4">
                {b.questions.map((q, j) => (
                  <div
                    key={j}
                    className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30"
                  >
                    <div className="flex gap-2.5 text-[0.92rem] font-semibold leading-snug text-slate-800 dark:text-slate-200">
                      <span className={cn('font-extrabold', accent.text)}>{q.n}.</span>
                      <span className="flex-1">{q.stem}</span>
                      {q.marks && (
                        <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-bold text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                          {q.marks}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {q.options.map((o, k) => (
                        <div
                          key={k}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[0.86rem] transition-colors',
                            o.correct
                              ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-700'
                              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900',
                          )}
                        >
                          <span
                            className={cn(
                              'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.72rem] font-extrabold',
                              o.correct
                                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                            )}
                          >
                            {o.label}
                          </span>
                          <span className="flex-1 text-slate-700 dark:text-slate-300">{o.text}</span>
                          {o.correct && <Check className="ml-auto h-4 w-4 shrink-0 text-emerald-500" strokeWidth={3} />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          case 'shortAnswer':
            return (
              <div key={i} className="divide-y divide-slate-100 dark:divide-slate-800">
                {b.questions.map((q, j) => (
                  <div
                    key={j}
                    className="flex gap-3 py-3 text-[0.92rem] leading-snug text-slate-800 first:pt-0 last:pb-0 dark:text-slate-200"
                  >
                    <span className={cn('font-extrabold', accent.text)}>{q.n}.</span>
                    <span className="flex-1 font-medium">{q.stem}</span>
                    {q.marks && (
                      <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-slate-50 px-2 py-0.5 text-[0.68rem] font-bold text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                        {q.marks}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          case 'answerKey':
            return (
              <div key={i} className="space-y-2.5">
                {b.items.map((a, j) => (
                  <div
                    key={j}
                    className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-3.5 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:to-teal-950/20"
                  >
                    <span className="grid h-7 min-w-7 place-items-center self-start rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 px-1.5 text-[0.72rem] font-extrabold tabular-nums text-white shadow-sm shadow-emerald-500/30">
                      {a.n}
                    </span>
                    <div className="text-[0.9rem]">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{a.answer}</span>
                      {a.work && (
                        <div className="mt-1 text-[0.84rem] leading-relaxed text-slate-500 dark:text-slate-400">
                          {a.work}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          case 'table':
            return (
              <div key={i} className={cn('overflow-x-auto rounded-2xl border', accent.ring)}>
                <table className="w-full min-w-[340px] text-[0.86rem]">
                  <thead>
                    <tr className={cn(accent.soft)}>
                      {b.head.map((h, j) => (
                        <th
                          key={j}
                          className={cn(
                            'whitespace-nowrap px-3.5 py-3 text-left text-[0.72rem] font-black uppercase tracking-wider',
                            accent.text,
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr
                        key={j}
                        className="border-t border-slate-100 even:bg-slate-50/60 dark:border-slate-800 dark:even:bg-slate-800/30"
                      >
                        {r.map((cell, k) => (
                          <td
                            key={k}
                            className={cn(
                              'px-3.5 py-2.5',
                              k === 0
                                ? 'w-px text-center font-bold tabular-nums text-slate-400'
                                : 'text-slate-600 dark:text-slate-300',
                            )}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'bloom':
            // 2-up grid: the Bloom block lives in the narrow half-width "Objectives"
            // section, so wide balanced cards avoid clipping ("Understan…").
            return (
              <div key={i} className="grid grid-cols-2 gap-3">
                {b.chips.map((c, j) => {
                  const tone = ACCENTS[BLOOM_TONE[j % BLOOM_TONE.length]];
                  return (
                    <div
                      key={j}
                      className={cn(
                        'relative overflow-hidden rounded-2xl border p-3.5 text-center transition-shadow hover:shadow-md',
                        tone.soft,
                        tone.ring,
                      )}
                    >
                      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', tone.bar)} />
                      <div className={cn('mt-1 text-[0.92rem] font-black leading-tight tracking-tight', tone.text)}>
                        {c.level}
                      </div>
                      <div className="mt-1 text-[0.76rem] leading-snug text-slate-500 dark:text-slate-400">
                        {c.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          case 'tips':
            return (
              <div key={i} className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {b.items.map((it, j) => (
                  <div
                    key={j}
                    className="flex items-start gap-3 text-[0.9rem] leading-relaxed text-slate-700 dark:text-slate-300"
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ring-1 ring-inset',
                        accent.soft,
                        accent.ring,
                      )}
                    >
                      <Check className={cn('h-3 w-3', accent.text)} strokeWidth={3} />
                    </span>
                    <span>{it}</span>
                  </div>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

/** Reverse-lookup an accent's key so tier cards can fall back to the section accent. */
function accentKey(accent: Accent): SectionAccent {
  const found = (Object.keys(ACCENTS) as SectionAccent[]).find((k) => ACCENTS[k] === accent);
  return found || 'blue';
}

export function SixSectionViewer({ tool, curriculum, chapter, sections, className }: SixSectionViewerProps) {
  const ToolIcon = tool.icon;
  const ChapterIcon = chapter?.icon;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleSection = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const chips = [
    { k: 'Board', v: curriculum?.board },
    { k: 'Class', v: curriculum?.class },
    { k: 'Subject', v: curriculum?.subject },
    { k: 'Chapter', v: curriculum?.chapter },
    { k: 'Subtopic', v: curriculum?.subtopic },
  ].filter((c) => c.v);

  return (
    <div className={cn('mx-auto w-full max-w-4xl space-y-5 text-slate-900 dark:text-slate-100', className)}>
      {/* tool header — hero */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-white to-indigo-50/40 p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-amber-300/20 to-orange-400/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 ring-1 ring-white/40">
            <ToolIcon className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black tracking-tight sm:text-2xl">{tool.name}</h2>
            {tool.subtitle && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{tool.subtitle}</p>
            )}
          </div>
          <span className="ml-auto hidden shrink-0 items-center gap-1.5 self-start rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-500/30 sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5" /> AI Powered
          </span>
        </div>
      </div>

      {/* curriculum chips */}
      {chips.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {chips.map((c) => (
            <div
              key={c.k}
              className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="text-[0.68rem] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {c.k}
              </span>
              <span className="truncate">{c.v}</span>
            </div>
          ))}
        </div>
      )}

      {/* chapter hero */}
      {(chapter?.title || chapter?.subtopic) && (
        <div className="flex items-center gap-4 overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-white p-5 shadow-sm dark:border-slate-800 dark:from-slate-800/60 dark:via-slate-900 dark:to-slate-900">
          <div className="min-w-0">
            {chapter.title && (
              <h3 className="flex items-center gap-2 text-lg font-black tracking-tight">
                {ChapterIcon && <ChapterIcon className="h-5 w-5 shrink-0 text-blue-500 dark:text-blue-300" />}
                <span className="truncate">{chapter.title}</span>
              </h3>
            )}
            {chapter.subtopic && (
              <p className="mt-1 font-bold text-blue-600 dark:text-blue-300">{chapter.subtopic}</p>
            )}
          </div>
          {chapter.emoji && <div className="ml-auto shrink-0 text-4xl drop-shadow-sm">{chapter.emoji}</div>}
        </div>
      )}

      {/* six sections — the primary (worksheet/core) dominates; all collapsible */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {sections.map((s, idx) => {
          const accent = ACCENTS[s.accent];
          const Icon = s.icon;
          const emoji = s.emoji ?? DEFAULT_EMOJI[s.id];
          const isPrimary = s.id === 'core';
          const isCollapsed = !!collapsed[s.id];
          return (
            <section
              key={s.id}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-[1.5rem] border bg-white transition-all duration-300 dark:bg-slate-900',
                accent.ring,
                (s.full || isPrimary) && 'md:col-span-2',
                isPrimary
                  ? 'shadow-[0_8px_30px_-8px_rgba(0,0,0,0.16)] ring-1 ring-slate-900/5 dark:ring-white/10'
                  : 'shadow-[0_2px_10px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.14)]',
              )}
            >
              {/* top accent bar — thicker on the primary section */}
              <div className={cn('w-full bg-gradient-to-r', accent.bar, isPrimary ? 'h-2' : 'h-1.5')} />
              {/* tinted header — click to collapse/expand */}
              <button
                type="button"
                onClick={() => toggleSection(s.id)}
                aria-expanded={!isCollapsed}
                className={cn(
                  'flex w-full items-center gap-3 border-b bg-gradient-to-b to-white px-5 text-left transition-colors hover:brightness-[0.99] dark:to-slate-900',
                  accent.ring,
                  accent.head,
                  isPrimary ? 'py-5' : 'py-4',
                )}
              >
                <span
                  className={cn(
                    'grid shrink-0 place-items-center rounded-2xl text-white shadow-md ring-1 ring-white/30',
                    accent.badge,
                    accent.glow,
                    isPrimary ? 'h-12 w-12' : 'h-11 w-11',
                  )}
                >
                  <Icon className={isPrimary ? 'h-6 w-6' : 'h-5 w-5'} />
                </span>
                <div className="min-w-0 flex-1">
                  <h4
                    className={cn(
                      'font-black leading-tight tracking-tight',
                      accent.text,
                      isPrimary ? 'text-[1.2rem]' : 'text-[1.05rem]',
                    )}
                  >
                    <span className="mr-1.5 tabular-nums opacity-50">{idx + 1}.</span>
                    {s.label}
                  </h4>
                </div>
                {isPrimary && (
                  <span className="hidden shrink-0 rounded-full bg-white/70 px-2.5 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-slate-500 ring-1 ring-slate-200 sm:inline-block dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                    Main
                  </span>
                )}
                {s.tag && (
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ring-1 ring-inset',
                      accent.soft,
                      accent.text,
                      accent.ring,
                    )}
                  >
                    {s.tag}
                  </span>
                )}
                {emoji && !s.tag && !isPrimary && (
                  <span className="shrink-0 text-2xl opacity-90">{emoji}</span>
                )}
                <ChevronDown
                  className={cn(
                    'h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300',
                    isCollapsed && '-rotate-90',
                  )}
                />
              </button>
              {!isCollapsed && (
                <div className={cn('flex-1', isPrimary ? 'p-6' : 'p-5')}>
                  <Blocks blocks={s.blocks} accent={accent} />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default SixSectionViewer;
