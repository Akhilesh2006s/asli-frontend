import type { ReactNode } from 'react';
import { GeneratedRecordBody } from '@/components/super-admin/generated-record-body';
import { AiToolViewerHost } from '@/components/ai-v2/ai-tool-viewer-host';
import { ActivityProjectViewer, activityViewerPayloadFromRecord } from '@/components/activity-project-viewer';
import { isActivityToolSlug, normalizeAiToolSlug } from '@/lib/normalize-ai-tool-slug';
import { FlashcardViewer } from '@/components/flashcard-viewer';
import { MyStudyDecksViewer, deckViewerPayloadFromRecord } from '@/components/my-study-decks-viewer';
import { MockTestViewer, mockTestViewerPayloadFromRecord } from '@/components/mock-test-viewer';
import { ExamQuestionPaperViewer, examViewerPayloadFromRecord } from '@/components/exam-question-paper-viewer';
import { SmartStudyGuideViewer, studyGuideViewerPayloadFromRecord } from '@/components/smart-study-guide-viewer';
import { ConceptBreakdownViewer, conceptBreakdownViewerPayloadFromRecord } from '@/components/concept-breakdown-viewer';
import { PracticeQaViewer, practiceQaViewerPayloadFromRecord } from '@/components/practice-qa-viewer';
import { KeyPointsViewer, keyPointsViewerPayloadFromRecord } from '@/components/key-points-viewer';
import { HomeworkCreatorViewer } from '@/components/homework-creator-viewer';
import { LessonPlannerViewer } from '@/components/lesson-planner-viewer';
import { DailyClassPlanViewer } from '@/components/daily-class-plan-viewer';
import { StoryPassageViewer } from '@/components/story-passage-viewer';
import { ShortNotesViewer } from '@/components/short-notes-viewer';
import { WorksheetMcqViewer } from '@/components/worksheet-mcq-viewer';
import {
  ConceptMasteryViewer,
  conceptMasteryViewerPayloadFromRecord,
} from '@/components/concept-mastery-viewer';
import {
  ChapterSummaryViewer,
  chapterSummaryViewerPayloadFromRecord,
} from '@/components/chapter-summary-viewer';
import {
  QuickAssignmentViewer,
  quickAssignmentViewerPayloadFromRecord,
} from '@/components/quick-assignment-viewer';

export type AiToolViewerAudience = 'teacher' | 'student';

function isWorksheetToolValue(v: unknown): boolean {
  const t = String(v || '').trim().toLowerCase();
  return t === 'worksheet-mcq-generator' || (t.includes('worksheet') && t.includes('mcq'));
}

function recordStructuredRaw(record: Record<string, unknown>): unknown {
  const meta = record.metadata as { structuredContent?: unknown } | undefined;
  return record.structuredContent ?? meta?.structuredContent ?? record;
}

export function resolveViewerForRecord(
  record: Record<string, unknown>,
  slug: string,
  audience: AiToolViewerAudience = 'teacher',
): ReactNode {
  const generatedContent = String(record.generatedContent || record.content || '');
  const isStudent = audience === 'student';

  if (slug === 'my-study-decks') {
    return <MyStudyDecksViewer {...deckViewerPayloadFromRecord(record)} />;
  }
  if (slug === 'flashcard-generator') {
    const deckPayload = deckViewerPayloadFromRecord(record);
    return (
      <FlashcardViewer
        content={deckPayload.content}
        rawContent={deckPayload.rawContent}
        variant={isStudent ? 'student' : 'teacher'}
      />
    );
  }
  if (isWorksheetToolValue(slug)) {
    return (
      <WorksheetMcqViewer
        content={generatedContent}
        rawContent={record}
        variant={isStudent ? 'student' : 'teacher'}
      />
    );
  }
  if (slug === 'lesson-planner') {
    return (
      <LessonPlannerViewer
        content={generatedContent}
        rawContent={record}
        variant="teacher"
        toolKind="lesson-planner"
      />
    );
  }
  if (slug === 'study-schedule-maker') {
    return (
      <LessonPlannerViewer
        content={generatedContent}
        rawContent={record}
        variant="student"
        toolKind="study-schedule-maker"
      />
    );
  }
  if (slug === 'daily-class-plan-maker') {
    return (
      <DailyClassPlanViewer
        content={generatedContent}
        rawContent={recordStructuredRaw(record)}
        variant="teacher"
      />
    );
  }
  if (slug === 'homework-creator') {
    return <HomeworkCreatorViewer content={generatedContent} rawContent={record} />;
  }
  if (slug === 'mock-test-builder') {
    return <MockTestViewer {...mockTestViewerPayloadFromRecord(record)} />;
  }
  if (slug === 'exam-question-paper-generator') {
    return (
      <ExamQuestionPaperViewer
        {...examViewerPayloadFromRecord(record)}
        variant={isStudent ? 'student' : 'teacher'}
      />
    );
  }
  if (slug === 'smart-study-guide-generator') {
    return <SmartStudyGuideViewer {...studyGuideViewerPayloadFromRecord(record)} />;
  }
  if (slug === 'concept-breakdown-explainer') {
    return <ConceptBreakdownViewer {...conceptBreakdownViewerPayloadFromRecord(record)} />;
  }
  if (slug === 'smart-qa-practice-generator') {
    return <PracticeQaViewer {...practiceQaViewerPayloadFromRecord(record)} />;
  }
  if (slug === 'key-points-formula-extractor') {
    return <KeyPointsViewer {...keyPointsViewerPayloadFromRecord(record)} />;
  }
  if (slug === 'chapter-summary-creator') {
    return <ChapterSummaryViewer {...chapterSummaryViewerPayloadFromRecord(record)} />;
  }
  if (slug === 'quick-assignment-builder') {
    return <QuickAssignmentViewer {...quickAssignmentViewerPayloadFromRecord(record)} />;
  }
  if (slug === 'short-notes-summaries-maker') {
    return (
      <ShortNotesViewer
        content={generatedContent}
        rawContent={
          (record as { metadata?: { structuredContent?: unknown } }).metadata?.structuredContent ||
          record
        }
      />
    );
  }
  if (isActivityToolSlug(slug)) {
    return <ActivityProjectViewer {...activityViewerPayloadFromRecord(record)} />;
  }
  if (slug === 'concept-mastery-helper') {
    return (
      <ConceptMasteryViewer
        {...conceptMasteryViewerPayloadFromRecord(record)}
        variant={isStudent ? 'student' : 'teacher'}
      />
    );
  }
  if (slug === 'story-passage-creator' || slug === 'reading-practice-room') {
    return (
      <StoryPassageViewer
        content={generatedContent}
        rawData={record}
        variant={slug === 'reading-practice-room' || isStudent ? 'student' : 'default'}
      />
    );
  }
  return <GeneratedRecordBody content={generatedContent} toolType={slug} />;
}

export function GeneratorRecordViewer({
  record,
  audience = 'teacher',
  wrapHost = true,
}: {
  record: Record<string, unknown> | null;
  audience?: AiToolViewerAudience;
  /** When false, only the tool viewer is returned (host already applied upstream). */
  wrapHost?: boolean;
}) {
  if (!record) return null;
  const slug = normalizeAiToolSlug(record.toolSlug || record.toolName);
  const viewer = resolveViewerForRecord(record, slug, audience);
  if (!wrapHost) return viewer;
  return (
    <AiToolViewerHost toolSlug={slug} rawContent={record} audience={audience}>
      {viewer}
    </AiToolViewerHost>
  );
}
