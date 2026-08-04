import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAiToolText } from '@/lib/title-case';
import { AiToolTipBanner } from '@/components/ai-tool-stacked-section';
import { RealisticIcon, type AiTool3dIconName } from '@/components/ai-tool-3d-icons';
import { paletteForSectionTitle } from '@/lib/ai-tool-section-palette';

export type AiToolKitSectionAnchor = {
  id: string;
  title: string;
  num: string;
};

function collectSectionAnchors(root: HTMLElement | null): AiToolKitSectionAnchor[] {
  if (!root) return [];
  const nodes = root.querySelectorAll<HTMLElement>('[data-ai-section-id]');
  const out: AiToolKitSectionAnchor[] = [];
  const seen = new Set<string>();
  nodes.forEach((el) => {
    const id = el.getAttribute('data-ai-section-id') || '';
    const title = el.getAttribute('data-ai-section-title') || '';
    const num = el.getAttribute('data-ai-section-num') || '';
    if (!id || !title || seen.has(id)) return;
    seen.add(id);
    out.push({ id, title, num });
  });
  return out;
}

/** Promote a common parent of section cards into a 2-column grid (Concept Mastery mock). */
function applyTwoColumnGrids(root: HTMLElement) {
  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-ai-section-id]'));
  if (sections.length < 2) return;

  const parents = new Map<HTMLElement, HTMLElement[]>();
  for (const sec of sections) {
    const parent = sec.parentElement;
    if (!parent || parent === root) continue;
    const list = parents.get(parent) || [];
    list.push(sec);
    parents.set(parent, list);
  }

  Array.from(parents.entries()).forEach(([parent, kids]) => {
    if (kids.length < 2) return;
    parent.classList.add(
      'ai-tool-kit-section-grid',
      'grid',
      'grid-cols-1',
      'gap-4',
      'md:grid-cols-2',
      'md:gap-5',
    );
    parent.classList.remove('flex', 'flex-col', 'space-y-1', 'space-y-2', 'space-y-4', 'space-y-5');
  });
}

const GLANCE_ICONS: AiTool3dIconName[] = [
  'books',
  'target',
  'brain',
  'lightbulb',
  'graduation',
  'notebook',
];

/**
 * Concept Mastery–style kit chrome for every teacher/student AI tool:
 * progress → section icon tabs → content → At a Glance → tip.
 * Section cards themselves stay in AiToolStackedSection.
 */
export function AiToolKitLayout({
  toolLabel,
  title,
  subtitle,
  children,
  className,
  tip,
}: {
  toolLabel?: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  tip?: ReactNode;
}) {
  const reactId = useId().replace(/:/g, '');
  const exportRootId = `ai-kit-root-${reactId}`;
  const bodyRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<AiToolKitSectionAnchor[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  const refresh = useCallback(() => {
    const root = bodyRef.current;
    const anchors = collectSectionAnchors(root);
    setSections(anchors);
    if (root) applyTwoColumnGrids(root);
    setActiveId((prev) => {
      if (prev && anchors.some((a) => a.id === prev)) return prev;
      return anchors[0]?.id || '';
    });
  }, []);

  useEffect(() => {
    refresh();
    const root = bodyRef.current;
    if (!root) return undefined;
    const mo = new MutationObserver(() => refresh());
    mo.observe(root, { childList: true, subtree: true });
    const t1 = window.setTimeout(refresh, 80);
    const t2 = window.setTimeout(refresh, 400);
    return () => {
      mo.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [refresh]);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root || sections.length === 0) return undefined;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).getAttribute('data-ai-section-id');
          if (!id) continue;
          visible.set(id, entry.intersectionRatio);
        }
        let bestId = '';
        let best = 0;
        Array.from(visible.entries()).forEach(([id, ratio]) => {
          if (ratio > best) {
            best = ratio;
            bestId = id;
          }
        });
        if (bestId) setActiveId(bestId);
      },
      { root: null, rootMargin: '-10% 0px -55% 0px', threshold: [0, 0.2, 0.45, 0.7, 1] },
    );
    for (const sec of sections) {
      const el = root.querySelector(`[data-ai-section-id="${sec.id}"]`);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [sections]);

  const jumpTo = (id: string) => {
    const root = bodyRef.current;
    const el = root?.querySelector(`[data-ai-section-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  const total = sections.length;
  const filled = total;
  const progressPct = total > 0 ? 100 : 0;
  const displayTitle = title ? formatAiToolText(title) : '';
  const displaySubtitle = subtitle ? formatAiToolText(subtitle) : '';
  const displayLabel = toolLabel ? formatAiToolText(toolLabel) : '';

  const glanceItems = [
    { label: 'Total Sections', value: String(total || '—') },
    { label: 'Ready', value: total ? `${filled}/${total}` : '—' },
    ...(displayTitle
      ? [{ label: 'Focus', value: displayTitle.length > 36 ? `${displayTitle.slice(0, 36)}…` : displayTitle }]
      : []),
  ];

  return (
    <div className={cn('w-full space-y-5', className)} id={exportRootId} data-ai-kit-layout>
      {(displayLabel || displayTitle) && (
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/90 via-white to-sky-50/60 px-4 py-3.5 sm:px-5">
          {displayLabel ? (
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">{displayLabel}</p>
          ) : null}
          {displayTitle ? (
            <h3 className="mt-0.5 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{displayTitle}</h3>
          ) : null}
          {displaySubtitle ? (
            <p className="mt-1 text-base text-slate-600 sm:text-lg">{displaySubtitle}</p>
          ) : null}
        </div>
      )}

      {total > 0 ? (
        <div className="space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-violet-800 sm:text-base">
              {formatAiToolText('All Sections Generated')}{' '}
              <span className="font-bold text-violet-950">
                {filled}/{total}
              </span>
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {formatAiToolText('Complete')}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-violet-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-1">
            {sections.map((sec, i) => {
              const palette = paletteForSectionTitle(sec.title, sec.num || String(i + 1));
              const active = sec.id === activeId;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => jumpTo(sec.id)}
                  className={cn(
                    'flex min-w-[5.5rem] max-w-[7.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center transition-all',
                    active
                      ? 'border-violet-400 bg-violet-50 shadow-md shadow-violet-200/50 ring-2 ring-violet-300/60'
                      : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm',
                      palette.bar,
                    )}
                  >
                    {sec.num?.slice(0, 2) || i + 1}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-700 sm:text-xs">
                    {sec.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        ref={bodyRef}
        data-ai-kit-body
        className="w-full min-w-0 space-y-4 break-words [&_pre]:overflow-x-auto [&_table]:block [&_table]:w-max [&_table]:min-w-full [&_table]:overflow-x-auto"
      >
        {children}
      </div>

      {total > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3.5 sm:px-5">
          <div className="mb-2.5 flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-600" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {formatAiToolText('At a Glance')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {glanceItems.map((item, i) => (
              <div key={item.label} className="flex min-w-[7rem] items-center gap-2.5">
                <RealisticIcon name={GLANCE_ICONS[i % GLANCE_ICONS.length]} alt="" className="h-8 w-8" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="truncate text-base font-bold text-slate-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <AiToolTipBanner>
        {tip ||
          formatAiToolText(
            'Tip: Click A Section Tab To Jump. Use Edit Or Copy On Any Card To Tweak Or Share That Block.',
          )}
      </AiToolTipBanner>
    </div>
  );
}
