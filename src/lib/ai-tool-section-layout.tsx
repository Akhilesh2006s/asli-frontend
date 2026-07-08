import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';
import { AiToolV2SectionStack } from '@/components/ai-v2/ai-tool-v2-section';

/** @deprecated Use AiToolV2SectionStack — kept for backward compatibility. */
export function AiToolPairedSectionColumns({
  children,
  className,
  gap = 'gap-4',
}: {
  children: ReactNode[];
  className?: string;
  gap?: string;
}) {
  return <div className={cn('flex w-full flex-col', gap, className)}>{children}</div>;
}

/** @deprecated Use AiToolV2SectionStack */
export function AiToolSectionGrid({
  children,
  className,
  gap = 'gap-4',
}: {
  children: ReactNode;
  className?: string;
  gap?: string;
}) {
  return <div className={cn('flex w-full flex-col', gap, className)}>{children}</div>;
}

/** V2-compatible mock test / exam section stack */
export function AiToolMockTestSectionLayout({ children }: { children: ReactNode[] }) {
  return <AiToolV2SectionStack>{children}</AiToolV2SectionStack>;
}

/** V2-compatible masonry — full-width stacked sections */
export function AiToolMasonrySections({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  desktopColumns?: 2 | 3;
}) {
  return <AiToolV2SectionStack className={className}>{children}</AiToolV2SectionStack>;
}

export function AiToolInfoPanelGrid({
  children,
  className,
  gap = 'gap-4',
}: {
  children: ReactNode;
  columns?: 2 | 3;
  className?: string;
  gap?: string;
}) {
  return <div className={cn('flex w-full flex-col', AI_V2.spacing.section, gap, className)}>{children}</div>;
}
