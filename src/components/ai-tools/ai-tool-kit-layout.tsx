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
  icon: AiTool3dIconName;
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
    const icon = (el.getAttribute('data-ai-section-icon') || 'sparkle') as AiTool3dIconName;
    if (!id || !title || seen.has(id)) return;
    seen.add(id);
    out.push({ id, title, num, icon });
  });
  return out;
}

function anchorsFingerprint(anchors: AiToolKitSectionAnchor[]): string {
  return anchors.map((a) => `${a.id}:${a.num}:${a.title}:${a.icon}`).join('|');
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
  title,
  fallbackLabel,
  children,
  className,
  tip,
}: {
  /** Specific generated title (paper title, deck title, concept name…) — shown only when present. */
  title?: string;
  /** Generic tool label used only for the error-boundary fallback text, never rendered. */
  fallbackLabel?: string;
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

  const glanceItems = [
    { label: 'Sections', value: String(total || '—') },
    { label: 'Status', value: total ? 'Ready' : '—' },
    ...(displayTitle
      ? [{ label: 'Focus', value: displayTitle.length > 36 ? `${displayTitle.slice(0, 36)}…` : displayTitle }]
      : []),
  ];

  return (
    <div className={cn('w-full space-y-4 sm:space-y-5', className)} id={exportRootId} data-ai-kit-layout>
      {displayTitle ? (
        <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-teal-50/70 px-4 py-4 sm:px-5 sm:py-5">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-200/30" />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">Generated result</p>
          <h3 className="mt-1 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{displayTitle}</h3>
        </div>
      ) : null}

      {total > 0 ? (
        <div className="space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:px-4">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800 sm:text-base">
              <CheckCircle2 className="h-4 w-4 text-teal-600" aria-hidden />
              {formatAiToolText('All sections ready')}
            </span>
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-sky-800 ring-1 ring-sky-100">
              {filled}/{total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sky-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-3">
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Jump to section
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible md:grid-cols-5 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
              {sections.map((sec, i) => {
                const pal = paletteForSectionTitle(sec.title);
                const active = sec.id === activeId;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => jumpTo(sec.id)}
                    className={cn(
                      'flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 rounded-xl px-1.5 py-2 text-center transition sm:w-auto',
                      active
                        ? 'bg-sky-50 ring-1 ring-sky-200 shadow-sm'
                        : 'hover:bg-slate-50',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[11px] font-bold tabular-nums',
                        active ? 'text-sky-700' : 'text-slate-400',
                      )}
                    >
                      {sec.num || i + 1}
                    </span>
                    <span
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl border',
                        active ? 'border-sky-300 bg-sky-100' : pal.iconTile,
                      )}
                    >
                      <RealisticIcon name={sec.icon} alt="" float={false} className="h-6 w-6" />
                    </span>
                    <span
                      className={cn(
                        'line-clamp-2 text-[11px] font-semibold leading-tight sm:text-xs',
                        active ? 'text-sky-900' : 'text-slate-600',
                      )}
                    >
                      {formatAiToolText(sec.title)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={bodyRef}
        className="min-w-0 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/40 p-2 sm:space-y-5 sm:p-3"
      >
        <AiToolViewerErrorBoundary fallbackTitle={fallbackLabel ? formatAiToolText(fallbackLabel) : 'Tool result'}>
          {children}
        </AiToolViewerErrorBoundary>
      </div>

      {total > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-700" aria-hidden />
            <p className="text-sm font-bold text-slate-900 sm:text-base">{formatAiToolText('At a glance')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {glanceItems.map((item, i) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-sky-50/50 px-3 py-2.5 shadow-sm"
              >
                <RealisticIcon name={GLANCE_ICONS[i % GLANCE_ICONS.length]} alt="" float={false} className="h-9 w-9" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="truncate text-sm font-bold text-slate-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tip != null ? (
        tip
      ) : (
        <AiToolTipBanner>
          Tip: jump between sections above, then Regenerate anytime for a fresh version with the same settings.
        </AiToolTipBanner>
      )}
    </div>
  );
}
