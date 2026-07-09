import type { ReactNode } from 'react';
import { AiToolV2ViewerFrame } from './ai-tool-v2-viewer-frame';
import { AiToolV2InsightTail } from './ai-tool-v2-assessment-insights';
import type { AiToolViewerAudience } from './ai-tool-v2-viewer-context';
import {
  getToolInsightConfig,
  toolHasBuiltinInsights,
} from '@/lib/ai-tool-v2-insights-config';

/** Tools that render their own hero banner — hide duplicate "Generated Content" strip. */
const CUSTOM_HERO_TOOLS = new Set([
  'exam-question-paper-generator',
  'mock-test-builder',
  'smart-study-guide-generator',
  'homework-creator',
  'flashcard-generator',
  'activity-project-generator',
  'project-idea-lab',
  'chapter-summary-creator',
  'concept-breakdown-explainer',
  'quick-assignment-builder',
  'daily-class-plan-maker',
  'key-points-formula-extractor',
  'concept-mastery-helper',
  'short-notes-summaries-maker',
  'lesson-planner',
  'worksheet-mcq-generator',
  'smart-qa-practice-generator',
  'story-passage-creator',
  'reading-practice-room',
]);

export function AiToolViewerHost({
  toolSlug,
  children,
  showGeneratedLabel,
  rawContent,
  suppressAutoInsights,
  insightStartNum,
  overviewStats,
  difficultyTags,
  audience = 'teacher',
}: {
  toolSlug?: string;
  children: ReactNode;
  showGeneratedLabel?: boolean;
  rawContent?: unknown;
  suppressAutoInsights?: boolean;
  insightStartNum?: number;
  overviewStats?: Array<{ label: string; value: string }>;
  difficultyTags?: string[];
  audience?: AiToolViewerAudience;
}) {
  const slug = String(toolSlug || '').trim();
  const showLabel =
    showGeneratedLabel ??
    (slug ? !CUSTOM_HERO_TOOLS.has(slug) : true);

  const showAutoInsights =
    !suppressAutoInsights &&
    slug &&
    !toolHasBuiltinInsights(slug);

  const insightConfig = slug ? getToolInsightConfig(slug) : null;

  return (
    <AiToolV2ViewerFrame toolSlug={slug || undefined} showGeneratedLabel={showLabel} audience={audience}>
      {children}
      {showAutoInsights && insightConfig ? (
        <AiToolV2InsightTail
          rawContent={rawContent}
          startNum={insightStartNum ?? insightConfig.sectionStartNum}
          includeOverview
          overviewStats={overviewStats}
          difficultyTags={difficultyTags}
          bestPracticesText={insightConfig.bestPracticesText}
        />
      ) : null}
    </AiToolV2ViewerFrame>
  );
}
