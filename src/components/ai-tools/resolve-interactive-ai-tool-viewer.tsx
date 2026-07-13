import type { ReactNode } from 'react';
import { FlashcardViewer } from '@/components/flashcard-viewer';
import { MyStudyDecksViewer, deckViewerPayloadFromRecord } from '@/components/my-study-decks-viewer';
import { WorksheetMcqViewer } from '@/components/worksheet-mcq-viewer';
import { HomeworkCreatorViewer } from '@/components/homework-creator-viewer';
import { MockTestViewer } from '@/components/mock-test-viewer';
import { ExamQuestionPaperViewer } from '@/components/exam-question-paper-viewer';
import { PracticeQaViewer } from '@/components/practice-qa-viewer';
import { QuickAssignmentViewer } from '@/components/quick-assignment-viewer';
import { SmartStudyGuideViewer } from '@/components/smart-study-guide-viewer';
import { ConceptBreakdownViewer } from '@/components/concept-breakdown-viewer';
import { ConceptMasteryViewer } from '@/components/concept-mastery-viewer';
import { ChapterSummaryViewer } from '@/components/chapter-summary-viewer';
import { KeyPointsViewer } from '@/components/key-points-viewer';
import { ShortNotesViewer } from '@/components/short-notes-viewer';
import { LessonPlannerViewer } from '@/components/lesson-planner-viewer';
import { DailyClassPlanViewer } from '@/components/daily-class-plan-viewer';
import {
  ActivityProjectViewer,
  activityViewerPayloadFromRecord,
} from '@/components/activity-project-viewer';
import { StoryPassageViewer } from '@/components/story-passage-viewer';
import { normalizeAiToolSlug } from '@/lib/normalize-ai-tool-slug';
import { viewerPayloadFromRecord } from '@/lib/resolve-ai-structured-content';
import {
  isV2SixSectionStructured,
  mapV2StructuredToLegacy,
} from '@/lib/v2-structured-to-legacy';

export type InteractiveAiToolAudience = 'teacher' | 'student';

function pickStructured(record: Record<string, unknown>): unknown {
  const direct = record.structuredContent;
  if (direct && typeof direct === 'object') return direct;
  const meta = record.metadata;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const sc = (meta as Record<string, unknown>).structuredContent;
    if (sc && typeof sc === 'object') return sc;
  }
  return null;
}

/** Content + raw payload for specialized viewers, with V2 flattened when needed. */
export function interactiveViewerPayload(
  record: Record<string, unknown>,
  slug: string,
): { content: string; rawContent: unknown } {
  const base = viewerPayloadFromRecord(record);
  const structured = pickStructured(record);
  const legacyFromV2 = isV2SixSectionStructured(structured)
    ? mapV2StructuredToLegacy(slug, structured)
    : null;

  let rawContent = base.rawContent;
  if (legacyFromV2) {
    rawContent =
      rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
        ? { ...(rawContent as Record<string, unknown>), ...legacyFromV2 }
        : legacyFromV2;
  }

  // Prefer precomputed legacy snapshot from newer backend saves.
  const meta = record.metadata;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const snap = (meta as Record<string, unknown>).legacyStructuredContent;
    if (snap && typeof snap === 'object' && !Array.isArray(snap)) {
      rawContent =
        rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
          ? { ...(rawContent as Record<string, unknown>), ...(snap as Record<string, unknown>) }
          : snap;
    }
  }

  return { content: base.content, rawContent: rawContent ?? null };
}

/**
 * Resolve an interactive specialized viewer for teacher/student dashboards.
 * Returns null when the slug has no dedicated interactive viewer (caller falls back).
 */
export function resolveInteractiveAiToolViewer(
  record: Record<string, unknown>,
  slugInput: string,
  audience: InteractiveAiToolAudience = 'teacher',
): ReactNode | null {
  const slug = normalizeAiToolSlug(slugInput || record.toolSlug || record.toolName);
  const { content, rawContent } = interactiveViewerPayload(record, slug);
  const isStudent = audience === 'student';

  switch (slug) {
    case 'flashcard-generator':
      return (
        <FlashcardViewer
          content={content}
          rawContent={rawContent}
          variant="teacher"
          embedded
        />
      );
    case 'my-study-decks': {
      const deck = deckViewerPayloadFromRecord(record);
      return (
        <MyStudyDecksViewer
          content={deck.content || content}
          rawContent={deck.rawContent ?? rawContent}
        />
      );
    }
    case 'worksheet-mcq-generator':
      return (
        <WorksheetMcqViewer
          content={content}
          rawContent={rawContent}
          variant={isStudent ? 'default' : 'teacher'}
        />
      );
    case 'homework-creator':
      return <HomeworkCreatorViewer content={content} rawContent={rawContent} />;
    case 'mock-test-builder':
      return <MockTestViewer content={content} rawContent={rawContent} />;
    case 'exam-question-paper-generator':
      return <ExamQuestionPaperViewer content={content} rawContent={rawContent} />;
    case 'smart-qa-practice-generator':
      return <PracticeQaViewer content={content} rawContent={rawContent} />;
    case 'quick-assignment-builder':
      return <QuickAssignmentViewer content={content} rawContent={rawContent} />;
    case 'smart-study-guide-generator':
      return <SmartStudyGuideViewer content={content} rawContent={rawContent} />;
    case 'concept-breakdown-explainer':
      return <ConceptBreakdownViewer content={content} rawContent={rawContent} />;
    case 'concept-mastery-helper':
      return (
        <ConceptMasteryViewer
          content={content}
          rawContent={rawContent}
          variant={isStudent ? 'student' : 'teacher'}
        />
      );
    case 'chapter-summary-creator':
      return <ChapterSummaryViewer content={content} rawContent={rawContent} />;
    case 'key-points-formula-extractor':
      return <KeyPointsViewer content={content} rawContent={rawContent} />;
    case 'short-notes-summaries-maker':
      return <ShortNotesViewer content={content} rawContent={rawContent} />;
    case 'lesson-planner':
      return (
        <LessonPlannerViewer
          content={content}
          rawContent={rawContent}
          variant="default"
          toolKind="lesson-planner"
        />
      );
    case 'study-schedule-maker':
      return (
        <LessonPlannerViewer
          content={content}
          rawContent={rawContent}
          variant="student"
          toolKind="study-schedule-maker"
        />
      );
    case 'daily-class-plan-maker':
      return <DailyClassPlanViewer content={content} rawContent={rawContent} />;
    case 'activity-project-generator':
    case 'project-idea-lab': {
      const act = activityViewerPayloadFromRecord(record);
      return (
        <ActivityProjectViewer
          content={act.content || content}
          activities={act.activities}
          variant={act.variant}
        />
      );
    }
    case 'story-passage-creator':
      return (
        <StoryPassageViewer
          content={content}
          rawData={rawContent}
          variant={isStudent ? 'student' : 'default'}
        />
      );
    case 'reading-practice-room':
      return (
        <StoryPassageViewer content={content} rawData={rawContent} variant="student" />
      );
    default:
      return null;
  }
}
