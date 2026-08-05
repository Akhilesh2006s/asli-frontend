import {
  Component,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
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

function anchorsFingerprint(anchors: AiToolKitSectionAnchor[]): string {
  return anchors.map((a) => `${a.id}:${a.num}:${a.title}`).join('|');
}

/**
 * Promote a common parent of section cards into a 2-column grid.
 * Idempotent — safe to call repeatedly without thrashing React.
 */
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
    if (parent.classList.contains('ai-tool-kit-section-grid')) return;
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

/** Catches a single tool viewer crash so the rest of the dashboard stays usable. */
export class AiToolViewerErrorBoundary extends Component<
  { children: ReactNode; fallbackTitle?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AiToolViewerErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-5 py-8 text-center">
          <p className="text-base font-semibold text-rose-900">
            {this.props.fallbackTitle || 'This tool result could not be displayed'}
          </p>
          <p className="mt-2 text-sm text-rose-700/90">
            Try Generate again. If it keeps failing, regenerate from Super Admin for this topic.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Concept Mastery–style kit chrome for every teacher/student AI tool:
 * progress → section icon tabs → content → At a Glance → tip.
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
  const fpRef = useRef('');
  const [sections, setSections] = useState<AiToolKitSectionAnchor[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  const refresh = useCallback(() => {
    const root = bodyRef.current;
    if (!root) return;
    applyTwoColumnGrids(root);
    const anchors = collectSectionAnchors(root);
    const fp = anchorsFingerprint(anchors);
    if (fp !== fpRef.current) {
      fpRef.current = fp;
      setSections(anchors);
      setActiveId((prev) => {
        if (prev && anchors.some((a) => a.id === prev)) return prev;
        return anchors[0]?.id || '';
      });
    }
  }, []);

  useEffect(() => {
    refresh();
    const root = bodyRef.current;
    if (!root) return undefined;

    let debounceTimer = 0;
    const mo = new MutationObserver(() => {
      // Debounce: React re-renders fire many childList mutations; don't setState each time.
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(refresh, 120);
    });
    // childList only — never observe attributes (classList tweaks must not re-enter)
    mo.observe(root, { childList: true, subtree: true });
    const t1 = window.setTimeout(refresh, 80);
    const t2 = window.setTimeout(refresh, 450);
    return () => {
      mo.disconnect();
      window.clearTimeout(debounceTimer);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [refresh, children]);

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
      const safeId = sec.id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const el = root.querySelector(`[data-ai-section-id="${safeId}"]`);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [sections]);

  const jumpTo = (id: string) => {
    const root = bodyRef.current;
    const safeId = id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const el = root?.querySelector(`[data-ai-section-id="${safeId}"]`);
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
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.map((sec) => {
              const pal = paletteForSectionTitle(sec.title);
              const active = sec.id === activeId;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => jumpTo(sec.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition sm:text-sm',
                    active
                      ? 'border-violet-400 bg-violet-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                      active ? 'bg-white/20 text-white' : cn(pal.iconWrap, pal.icon),
                    )}
                  >
                    {sec.num || '•'}
                  </span>
                  <span className="max-w-[10rem] truncate sm:max-w-[14rem]">{formatAiToolText(sec.title)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div ref={bodyRef} className="min-w-0 space-y-4">
        <AiToolViewerErrorBoundary fallbackTitle={displayLabel || 'Tool result'}>
          {children}
        </AiToolViewerErrorBoundary>
      </div>

      {total > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-700" aria-hidden />
            <p className="text-sm font-bold text-slate-900 sm:text-base">{formatAiToolText('At a Glance')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {glanceItems.map((item, i) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-xl border border-white bg-white px-3 py-2.5 shadow-sm"
              >
                <RealisticIcon name={GLANCE_ICONS[i % GLANCE_ICONS.length]} size={36} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="truncate text-sm font-bold text-slate-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tip != null ? tip : <AiToolTipBanner />}
    </div>
  );
}
