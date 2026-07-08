import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';

export function AiToolV2ViewerFrame({
  children,
  className,
  toolSlug,
  showGeneratedLabel = true,
}: {
  children: ReactNode;
  className?: string;
  toolSlug?: string;
  showGeneratedLabel?: boolean;
}) {
  return (
    <div
      className={cn('w-full', AI_V2.spacing.section, className)}
      data-ai-tool-export
      data-ai-tool-slug={toolSlug || undefined}
    >
      {showGeneratedLabel ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" aria-hidden />
            <p className="text-xs font-semibold text-slate-800 sm:text-sm">Generated Content</p>
          </div>
          <span className={cn(AI_V2.badge.ai, 'border-indigo-100 bg-indigo-50 text-indigo-700')}>
            AI V2
          </span>
        </div>
      ) : null}
      {children}
    </div>
  );
}
