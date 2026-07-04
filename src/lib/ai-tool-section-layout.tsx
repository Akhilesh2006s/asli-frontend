import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * All AI tool section layouts stack full-width, one after another
 * (same pattern as Smart Study Guide / My Study Decks).
 */

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

export function AiToolMockTestSectionLayout({ children }: { children: ReactNode[] }) {
  return <div className="flex w-full flex-col gap-4">{children}</div>;
}

export function AiToolMasonrySections({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  desktopColumns?: 2 | 3;
}) {
  return <div className={cn('flex w-full flex-col gap-4', className)}>{children}</div>;
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
  return <div className={cn('flex w-full flex-col', gap, className)}>{children}</div>;
}
