import { useCallback, useEffect, useRef } from 'react';
import { BookOpen, Eye, EyeOff, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAiToolV2Viewer, type AiToolSectionAnchor } from './ai-tool-v2-viewer-context';

function collectSectionAnchors(root: HTMLElement | null): AiToolSectionAnchor[] {
  if (!root) return [];
  const nodes = root.querySelectorAll<HTMLElement>('[data-ai-section-id]');
  const out: AiToolSectionAnchor[] = [];
  nodes.forEach((el) => {
    const id = el.getAttribute('data-ai-section-id') || '';
    const title = el.getAttribute('data-ai-section-title') || '';
    const num = el.getAttribute('data-ai-section-num') || '';
    if (!id || !title) return;
    out.push({ id, title, num });
  });
  return out;
}

export function AiToolV2ViewerChrome({ exportRootId }: { exportRootId: string }) {
  const ctx = useAiToolV2Viewer();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const refreshSections = useCallback(() => {
    if (!ctx) return;
    const root = document.getElementById(exportRootId);
    const anchors = collectSectionAnchors(root);
    ctx.setSections(anchors);
    if (!ctx.activeSectionId && anchors[0]) {
      ctx.setActiveSectionId(anchors[0].id);
    }
  }, [ctx, exportRootId]);

  useEffect(() => {
    refreshSections();
    const root = document.getElementById(exportRootId);
    if (!root || !ctx) return undefined;

    const mo = new MutationObserver(() => refreshSections());
    mo.observe(root, { childList: true, subtree: true });

    const t1 = window.setTimeout(refreshSections, 120);
    const t2 = window.setTimeout(refreshSections, 600);

    return () => {
      mo.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [ctx, exportRootId, refreshSections]);

  useEffect(() => {
    if (!ctx || ctx.sections.length === 0) return undefined;
    const root = document.getElementById(exportRootId);
    if (!root) return undefined;

    observerRef.current?.disconnect();
    const visible = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).getAttribute('data-ai-section-id');
          if (!id) continue;
          visible.set(id, entry.intersectionRatio);
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visible.entries()) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) ctx.setActiveSectionId(bestId);
      },
      { root: null, rootMargin: '-12% 0px -55% 0px', threshold: [0, 0.15, 0.4, 0.7, 1] },
    );

    for (const sec of ctx.sections) {
      const el = root.querySelector(`[data-ai-section-id="${sec.id}"]`);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [ctx, ctx?.sections, exportRootId]);

  if (!ctx) return null;

  const { sections, activeSectionId, focusMode, toggleFocusMode, audience } = ctx;

  const jumpTo = (id: string) => {
    const root = document.getElementById(exportRootId);
    const el = root?.querySelector(`[data-ai-section-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      ctx.setActiveSectionId(id);
    }
  };

  if (sections.length < 2 && !focusMode) {
    return (
      <div
        data-ai-chrome
        className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200/70 bg-white/90 px-3 py-2 shadow-sm print:hidden"
      >
        <ChromeActions
          focusMode={focusMode}
          toggleFocusMode={toggleFocusMode}
          audience={audience}
        />
      </div>
    );
  }

  return (
    <div
      data-ai-chrome
      className={cn(
        'sticky top-2 z-30 flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-md backdrop-blur-md print:hidden',
        focusMode && 'border-indigo-200 bg-indigo-50/95',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-600">
          <List className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
          <span className="hidden sm:inline">Jump to section</span>
          <span className="sm:hidden">Sections</span>
        </div>
        <ChromeActions
          focusMode={focusMode}
          toggleFocusMode={toggleFocusMode}
          audience={audience}
        />
      </div>

      {sections.length >= 2 ? (
        <>
          <div className="hidden md:flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => jumpTo(sec.id)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-left text-[11px] font-medium transition-colors',
                  activeSectionId === sec.id
                    ? 'border-indigo-300 bg-indigo-600 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50',
                )}
              >
                <span className="opacity-80">{sec.num}</span>
                <span className="ml-1">{sec.title}</span>
              </button>
            ))}
          </div>
          <div className="md:hidden">
            <Select value={activeSectionId || undefined} onValueChange={jumpTo}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Choose a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id} className="text-xs">
                    {sec.num}. {sec.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ChromeActions({
  focusMode,
  toggleFocusMode,
  audience,
}: {
  focusMode: boolean;
  toggleFocusMode: () => void;
  audience: 'teacher' | 'student';
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        variant={focusMode ? 'default' : 'outline'}
        size="sm"
        className={cn(
          'h-8 gap-1.5 text-xs',
          focusMode && 'bg-indigo-600 hover:bg-indigo-700',
        )}
        onClick={toggleFocusMode}
        title={focusMode ? 'Exit focus mode' : 'Focus mode — hide extras'}
      >
        {focusMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{focusMode ? 'Exit focus' : 'Focus'}</span>
      </Button>
      {audience === 'student' ? (
        <span className="hidden lg:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 border border-emerald-100">
          <BookOpen className="h-3 w-3" />
          Study view
        </span>
      ) : null}
    </div>
  );
}
