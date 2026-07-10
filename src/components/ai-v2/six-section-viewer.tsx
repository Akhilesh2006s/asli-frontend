import type { LucideIcon } from 'lucide-react';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SixSectionViewer — one reusable, richly-styled shell for all 21 AsliLearn tools.
 * Each tool supplies its icon, accent colours, section labels, and typed content
 * blocks; the layout stays identical and vivid (coloured section cards, tinted
 * headers, numbered steps, tier cards, Bloom chips). White page, playful cards.
 */

export type SectionAccent = 'blue' | 'green' | 'amber' | 'violet' | 'teal' | 'rose';

type Accent = { text: string; badge: string; head: string; soft: string; ring: string; dot: string };

const ACCENTS: Record<SectionAccent, Accent> = {
  blue: { text: 'text-blue-600 dark:text-blue-300', badge: 'bg-gradient-to-br from-blue-500 to-indigo-500 shadow-blue-500/30', head: 'from-blue-50 dark:from-blue-950/40', soft: 'bg-blue-50 dark:bg-blue-950/40', ring: 'border-blue-100 dark:border-blue-900/60', dot: 'bg-blue-500' },
  green: { text: 'text-emerald-600 dark:text-emerald-300', badge: 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30', head: 'from-emerald-50 dark:from-emerald-950/40', soft: 'bg-emerald-50 dark:bg-emerald-950/40', ring: 'border-emerald-100 dark:border-emerald-900/60', dot: 'bg-emerald-500' },
  amber: { text: 'text-amber-600 dark:text-amber-300', badge: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30', head: 'from-amber-50 dark:from-amber-950/40', soft: 'bg-amber-50 dark:bg-amber-950/40', ring: 'border-amber-100 dark:border-amber-900/60', dot: 'bg-amber-500' },
  violet: { text: 'text-violet-600 dark:text-violet-300', badge: 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-500/30', head: 'from-violet-50 dark:from-violet-950/40', soft: 'bg-violet-50 dark:bg-violet-950/40', ring: 'border-violet-100 dark:border-violet-900/60', dot: 'bg-violet-500' },
  teal: { text: 'text-teal-600 dark:text-teal-300', badge: 'bg-gradient-to-br from-teal-500 to-cyan-500 shadow-teal-500/30', head: 'from-teal-50 dark:from-teal-950/40', soft: 'bg-teal-50 dark:bg-teal-950/40', ring: 'border-teal-100 dark:border-teal-900/60', dot: 'bg-teal-500' },
  rose: { text: 'text-rose-600 dark:text-rose-300', badge: 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-rose-500/30', head: 'from-rose-50 dark:from-rose-950/40', soft: 'bg-rose-50 dark:bg-rose-950/40', ring: 'border-rose-100 dark:border-rose-900/60', dot: 'bg-rose-500' },
};

const BLOOM_TONE = ['violet', 'blue', 'green', 'amber', 'rose'] as const;

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
  core: '📘', objectives: '🎯', differentiation: '🧩', assessment: '🔑', teacher: '🍎', reallife: '🌏',
};

function Blocks({ blocks, accent }: { blocks: ContentBlock[]; accent: Accent }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'lead':
            return <p key={i} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{b.text}</p>;
          case 'titleLine':
            return (
              <p key={i} className="flex items-center gap-2 pt-1 text-[0.95rem] font-bold text-slate-900 dark:text-slate-100">
                <span className={cn('h-4 w-1.5 rounded-full', accent.dot)} />{b.text}
              </p>
            );
          case 'bullets':
            return (
              <ul key={i} className="space-y-2">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    <span className={cn('mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full', accent.soft)}>
                      <Check className={cn('h-3 w-3', accent.text)} />
                    </span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            );
          case 'steps':
            return (
              <ol key={i} className="space-y-3">
                {b.items.map((it, j) => (
                  <li key={j} className="flex items-center gap-3.5 text-sm text-slate-700 dark:text-slate-300">
                    <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white shadow-sm', accent.badge)}>{j + 1}</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ol>
            );
          case 'keyValue':
            return (
              <div key={i} className="grid gap-2.5 sm:grid-cols-3">
                {b.rows.map((r, j) => (
                  <div key={j} className={cn('rounded-xl border p-3.5', accent.ring, accent.soft)}>
                    <div className={cn('text-xs font-extrabold uppercase tracking-wide', accent.text)}>{r.label}</div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{r.value}</div>
                  </div>
                ))}
              </div>
            );
          case 'mcq':
            return (
              <div key={i}>
                {b.questions.map((q, j) => (
                  <div key={j} className="border-t border-slate-100 py-3.5 first:border-0 first:pt-0 dark:border-slate-800">
                    <div className="flex gap-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <span className={cn('font-extrabold', accent.text)}>{q.n}.</span>
                      <span>{q.stem}</span>
                      {q.marks && <span className="ml-auto whitespace-nowrap text-xs font-bold text-slate-400">{q.marks}</span>}
                    </div>
                    <div className="ml-6 mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {q.options.map((o, k) => (
                        <div key={k} className={cn('flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm', o.correct ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40')}>
                          <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md text-[0.7rem] font-extrabold', o.correct ? 'bg-emerald-500 text-white' : 'border border-slate-200 text-slate-500 dark:border-slate-700')}>{o.label}</span>
                          <span className="text-slate-700 dark:text-slate-300">{o.text}</span>
                          {o.correct && <Check className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          case 'shortAnswer':
            return (
              <div key={i}>
                {b.questions.map((q, j) => (
                  <div key={j} className="flex gap-2.5 border-t border-slate-100 py-3 text-sm text-slate-800 first:border-0 first:pt-0 dark:border-slate-800 dark:text-slate-200">
                    <span className={cn('font-extrabold', accent.text)}>{q.n}.</span>
                    <span className="font-medium">{q.stem}</span>
                    {q.marks && <span className="ml-auto whitespace-nowrap text-xs font-bold text-slate-400">{q.marks}</span>}
                  </div>
                ))}
              </div>
            );
          case 'answerKey':
            return (
              <div key={i} className="space-y-2.5">
                {b.items.map((a, j) => (
                  <div key={j} className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                    <span className="grid h-6 min-w-6 place-items-center rounded-md bg-emerald-500 px-1.5 text-xs font-extrabold tabular-nums text-white">{a.n}</span>
                    <div className="text-sm">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{a.answer}</span>
                      {a.work && <div className="mt-0.5 text-[0.86rem] text-slate-500 dark:text-slate-400">{a.work}</div>}
                    </div>
                  </div>
                ))}
              </div>
            );
          case 'table':
            return (
              <div key={i} className={cn('overflow-x-auto rounded-xl border', accent.ring)}>
                <table className="w-full min-w-[340px] text-sm">
                  <thead>
                    <tr className={cn(accent.soft)}>
                      {b.head.map((h, j) => (
                        <th key={j} className={cn('whitespace-nowrap px-3 py-2.5 text-left text-[0.8rem] font-extrabold', accent.text)}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j} className="border-t border-slate-100 even:bg-slate-50/60 dark:border-slate-800 dark:even:bg-slate-800/30">
                        {r.map((cell, k) => (
                          <td key={k} className={cn('px-3 py-2.5', k === 0 ? 'w-px text-center tabular-nums text-slate-400' : 'text-slate-600 dark:text-slate-300')}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'bloom':
            return (
              <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {b.chips.map((c, j) => {
                  const tone = ACCENTS[BLOOM_TONE[j % BLOOM_TONE.length]];
                  return (
                    <div key={j} className={cn('rounded-2xl border p-3 text-center', tone.soft, tone.ring)}>
                      <div className={cn('mx-auto mb-2 h-1.5 w-8 rounded-full', tone.dot)} />
                      <div className={cn('text-sm font-extrabold', tone.text)}>{c.level}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.desc}</div>
                    </div>
                  );
                })}
              </div>
            );
          case 'tips':
            return (
              <div key={i} className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {b.items.map((it, j) => (
                  <div key={j} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                    <span className={cn('mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full', accent.soft)}>
                      <Check className={cn('h-3 w-3', accent.text)} />
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

export function SixSectionViewer({ tool, curriculum, chapter, sections, className }: SixSectionViewerProps) {
  const ToolIcon = tool.icon;
  const ChapterIcon = chapter?.icon;
  const chips = [
    { k: 'Board', v: curriculum?.board },
    { k: 'Class', v: curriculum?.class },
    { k: 'Subject', v: curriculum?.subject },
    { k: 'Chapter', v: curriculum?.chapter },
    { k: 'Subtopic', v: curriculum?.subtopic },
  ].filter((c) => c.v);

  return (
    <div className={cn('mx-auto w-full max-w-4xl space-y-4 text-slate-900 dark:text-slate-100', className)}>
      {/* tool header */}
      <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30">
          <ToolIcon className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{tool.name}</h2>
          {tool.subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{tool.subtitle}</p>}
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 self-start rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
          <Sparkles className="h-3.5 w-3.5" /> AI Powered
        </span>
      </div>

      {/* curriculum chips */}
      {chips.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {chips.map((c) => (
            <div key={c.k} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-slate-400 dark:text-slate-500">{c.k}:</span> {c.v}
            </div>
          ))}
        </div>
      )}

      {/* chapter hero */}
      {(chapter?.title || chapter?.subtopic) && (
        <div className="flex items-center gap-4 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white p-5 shadow-sm dark:border-slate-800 dark:from-slate-800/60 dark:via-slate-900 dark:to-slate-900">
          <div>
            {chapter.title && (
              <h3 className="flex items-center gap-2 text-lg font-extrabold">
                {ChapterIcon && <ChapterIcon className="h-5 w-5 text-blue-500 dark:text-blue-300" />}
                {chapter.title}
              </h3>
            )}
            {chapter.subtopic && <p className="mt-1 font-bold text-blue-600 dark:text-blue-300">{chapter.subtopic}</p>}
          </div>
          {chapter.emoji && <div className="ml-auto text-4xl">{chapter.emoji}</div>}
        </div>
      )}

      {/* six sections */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sections.map((s, idx) => {
          const accent = ACCENTS[s.accent];
          const Icon = s.icon;
          const emoji = s.emoji ?? DEFAULT_EMOJI[s.id];
          return (
            <section
              key={s.id}
              className={cn(
                'relative overflow-hidden rounded-3xl border bg-white shadow-sm dark:bg-slate-900',
                accent.ring,
                s.full && 'md:col-span-2',
              )}
            >
              {/* tinted header */}
              <div className={cn('flex items-center gap-3 border-b bg-gradient-to-b to-white px-5 py-4 dark:to-slate-900', accent.ring, accent.head)}>
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-md', accent.badge)}>
                  <Icon className="h-5 w-5" />
                </span>
                <h4 className={cn('text-[1.05rem] font-extrabold tracking-tight', accent.text)}>
                  <span className="mr-1.5 opacity-60">{idx + 1})</span>{s.label}
                </h4>
                {s.tag && <span className={cn('ml-auto rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold', accent.soft, accent.text)}>{s.tag}</span>}
                {emoji && !s.tag && <span className="ml-auto text-2xl opacity-90">{emoji}</span>}
              </div>
              <div className="p-5">
                <Blocks blocks={s.blocks} accent={accent} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default SixSectionViewer;
