import type { ReactNode } from 'react';
import { Brain, Clock, GraduationCap } from 'lucide-react';
import { useMemo } from 'react';
import { extractAiToolV2Context } from '@/lib/extract-ai-tool-v2-context';
import {
  AiToolV2BestPractices,
  AiToolV2NepAlignment,
} from './ai-tool-v2-insights';
import { AiToolV2Section } from './ai-tool-v2-section';

/**
 * Optional closing sections for tools that don't define their own NEP / teacher notes.
 * Pass sectionStartNum so numbering continues after tool-specific sections.
 */
export function AiToolV2StandardInsights({
  rawContent,
  sectionStartNum,
  includeBloom = true,
  includeNep = true,
  includeBestPractices = true,
  bestPracticesText,
}: {
  rawContent?: unknown;
  sectionStartNum: number;
  includeBloom?: boolean;
  includeNep?: boolean;
  includeBestPractices?: boolean;
  bestPracticesText?: string;
}) {
  const ctx = useMemo(() => extractAiToolV2Context(rawContent), [rawContent]);
  let num = sectionStartNum;
  const blocks: ReactNode[] = [];

  if (includeBloom && ctx.bloomLevel) {
    blocks.push(
      <AiToolV2Section
        key="bloom"
        num={num++}
        title="Bloom's Cognitive Target"
        description="Primary thinking level for this generation"
        icon={Brain}
        accent="violet"
      >
        <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-sm text-violet-900">
          {ctx.bloomLevel}
        </div>
      </AiToolV2Section>,
    );
  }

  if (includeNep) {
    blocks.push(
      <AiToolV2Section
        key="nep"
        num={num++}
        title="NEP / NCF Alignment"
        description="Curriculum framework alignment"
        icon={GraduationCap}
        accent="cyan"
      >
        <AiToolV2NepAlignment focusText={ctx.nepNcfFocus} />
      </AiToolV2Section>,
    );
  }

  if (includeBestPractices) {
    blocks.push(
      <AiToolV2Section
        key="practices"
        num={num}
        title="Best Practices"
        description="How to use this in your classroom"
        icon={Clock}
        accent="amber"
      >
        <AiToolV2BestPractices text={bestPracticesText} />
      </AiToolV2Section>,
    );
  }

  if (!blocks.length) return null;
  return <>{blocks}</>;
}
