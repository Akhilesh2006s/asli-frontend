import { useId, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';
import { AiToolV2ViewerProvider, useAiToolV2Viewer, type AiToolViewerAudience } from './ai-tool-v2-viewer-context';
import { AiToolV2ViewerChrome } from './ai-tool-v2-viewer-chrome';
import { AiToolV2PrintStyles } from './ai-tool-v2-print-styles';

function AiToolV2ViewerFrameInner({
  children,
  className,
  toolSlug,
  showGeneratedLabel = true,
  exportRootId,
}: {
  children: ReactNode;
  className?: string;
  toolSlug?: string;
  showGeneratedLabel?: boolean;
  exportRootId: string;
}) {
  const ctx = useAiToolV2Viewer();
  const focusMode = ctx?.focusMode ?? false;
  const audience = ctx?.audience ?? 'teacher';

  return (
    <div
      id={exportRootId}
      className={cn('w-full', AI_V2.spacing.section, className)}
      data-ai-tool-export
      data-ai-tool-slug={toolSlug || undefined}
      data-focus-mode={focusMode ? 'true' : 'false'}
      data-audience={audience}
    >
      <AiToolV2PrintStyles />
      {showGeneratedLabel && !focusMode ? (
        <div
          data-ai-focus-hide
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 px-3 py-2.5 shadow-sm print:hidden"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 sm:text-sm">
                {audience === 'student' ? 'Your study material' : 'Your generated lesson content'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {audience === 'student'
                  ? 'Use Focus mode to read without distractions'
                  : 'Jump sections, print, or export below'}
              </p>
            </div>
          </div>
          <span className={cn(AI_V2.badge.ai, 'shrink-0 border-indigo-100 bg-indigo-50 text-indigo-700')}>
            AI V2
          </span>
        </div>
      ) : null}

      <AiToolV2ViewerChrome exportRootId={exportRootId} />

      {children}
    </div>
  );
}

export function AiToolV2ViewerFrame({
  children,
  className,
  toolSlug,
  showGeneratedLabel = true,
  audience = 'teacher',
}: {
  children: ReactNode;
  className?: string;
  toolSlug?: string;
  showGeneratedLabel?: boolean;
  audience?: AiToolViewerAudience;
}) {
  const reactId = useId();
  const exportRootId = `ai-tool-export-${reactId.replace(/:/g, '')}`;

  return (
    <AiToolV2ViewerProvider audience={audience}>
      <AiToolV2ViewerFrameInner
        exportRootId={exportRootId}
        className={className}
        toolSlug={toolSlug}
        showGeneratedLabel={showGeneratedLabel}
      >
        {children}
      </AiToolV2ViewerFrameInner>
    </AiToolV2ViewerProvider>
  );
}
