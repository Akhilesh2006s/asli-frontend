import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AiToolStackedSection, AiToolStackedList } from '@/components/ai-tool-stacked-section';

export type AiToolV2SectionProps = {
  num: number | string;
  title: string;
  description?: string;
  icon: LucideIcon;
  accent?: 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate';
  children: ReactNode;
  className?: string;
  /** Print-friendly: avoid breaking inside section */
  printSafe?: boolean;
};

/** V2 section card — same Concept Mastery kit card as every other tool. */
export function AiToolV2Section({
  num,
  title,
  description,
  icon,
  children,
  className,
}: AiToolV2SectionProps) {
  return (
    <AiToolStackedSection
      num={String(num)}
      title={title}
      description={description}
      icon={icon}
      className={className}
    >
      {children}
    </AiToolStackedSection>
  );
}

export function AiToolV2SectionStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <AiToolStackedList className={className}>{children}</AiToolStackedList>;
}
