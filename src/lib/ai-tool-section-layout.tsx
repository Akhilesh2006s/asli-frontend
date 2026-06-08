import type { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

/** Web mobile (<768px): one section per row. Desktop: two balanced columns. */
export function AiToolPairedSectionColumns({
  children,
  className,
  gap = 'gap-0.5',
}: {
  children: ReactNode[];
  className?: string;
  gap?: string;
}) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <div className={cn('flex flex-col', gap, className)}>{children}</div>;
  }
  const left = children.filter((_, i) => i % 2 === 0);
  const right = children.filter((_, i) => i % 2 === 1);
  return (
    <div className={cn('grid grid-cols-2 items-start', gap, className)}>
      <div className={cn('flex min-w-0 flex-col', gap)}>{left}</div>
      <div className={cn('flex min-w-0 flex-col', gap)}>{right}</div>
    </div>
  );
}

/** Web mobile: stacked sections. Desktop: 2-column grid of section cards. */
export function AiToolSectionGrid({
  children,
  className,
  gap = 'gap-1',
}: {
  children: ReactNode;
  className?: string;
  gap?: string;
}) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <div className={cn('flex flex-col', gap, className)}>{children}</div>;
  }
  return (
    <div className={cn('grid grid-cols-2 items-start', gap, className)}>
      {children}
    </div>
  );
}

/** Mock test: full-width question paper on desktop; all sections in order on mobile. */
export function AiToolMockTestSectionLayout({ children }: { children: ReactNode[] }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <div className="flex flex-col gap-1">{children}</div>;
  }
  const beforePaper = children.slice(0, 4);
  const paper = children[4];
  const afterPaper = children.slice(5);
  const leftOf = (list: ReactNode[]) => list.filter((_, i) => i % 2 === 0);
  const rightOf = (list: ReactNode[]) => list.filter((_, i) => i % 2 === 1);
  const columnPair = (list: ReactNode[]) => (
    <div className="grid grid-cols-2 items-start gap-1">
      <div className="flex min-w-0 flex-col gap-1">{leftOf(list)}</div>
      <div className="flex min-w-0 flex-col gap-1">{rightOf(list)}</div>
    </div>
  );
  return (
    <div className="flex flex-col gap-1">
      {beforePaper.length > 0 && columnPair(beforePaper)}
      <div className="w-full min-w-0">{paper}</div>
      {afterPaper.length > 0 && columnPair(afterPaper)}
    </div>
  );
}

/** CSS columns on desktop; single ordered stack on web mobile. */
export function AiToolMasonrySections({
  children,
  className,
  desktopColumns = 2,
}: {
  children: ReactNode;
  className?: string;
  desktopColumns?: 2 | 3;
}) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <div className={cn('flex flex-col gap-2', className)}>{children}</div>;
  }
  const colClass =
    desktopColumns === 3 ? 'columns-1 md:columns-2 xl:columns-3' : 'columns-1 md:columns-2';
  return <div className={cn(colClass, 'gap-2', className)}>{children}</div>;
}

/** Info / metadata panels: single column on web mobile. */
export function AiToolInfoPanelGrid({
  children,
  columns = 2,
  className,
  gap = 'gap-3',
}: {
  children: ReactNode;
  columns?: 2 | 3;
  className?: string;
  gap?: string;
}) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <div className={cn('flex flex-col', gap, className)}>{children}</div>;
  }
  const gridClass = columns === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return <div className={cn('grid', gridClass, gap, className)}>{children}</div>;
}
