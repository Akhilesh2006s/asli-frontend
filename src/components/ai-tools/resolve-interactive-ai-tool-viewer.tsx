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
import {
  AiToolDocumentShell,
  accentForToolSlug,
} from '@/components/ai-tool-document-shell';
import { normalizeAiToolSlug } from '@/lib/normalize-ai-tool-slug';
import { viewerPayloadFromRecord } from '@/lib/resolve-ai-structured-content';
import {
  isV2SixSectionStructured,
  mapV2StructuredToLegacy,
} from '@/lib/v2-structured-to-legacy';

export type InteractiveAiToolAudience = 'teacher' | 'student';

const TOOL_DOC_META: Record<string, { label: string; title: string; subtitle?: string }> = {
  'flashcard-generator': {
    label: 'Flashcard Generator',
    title: 'Study cards',
    subtitle: 'Flip through key terms and answers',
  },
  'my-study-decks': {
    label: 'My Study Decks',
    title: 'Your decks',
    subtitle: 'Organised cards for quick revision',
  },
  'worksheet-mcq-generator': {
    label: 'Worksheet & MCQ',
    title: 'Practice worksheet',
    subtitle: 'Questions ready for class or homework',
  },
  'homework-creator': {
    label: 'Homework Creator',
    title: 'Homework pack',
    subtitle: 'Clear tasks students can finish at home',
  },
  'mock-test-builder': {
    label: 'Mock Test Builder',
    title: 'Mock test paper',
    subtitle: 'Timed practice with full sections',
  },
  'exam-question-paper-generator': {
    label: 'Exam Question Paper',
    title: 'Exam paper',
    subtitle: 'Board-style sections and blueprint',
  },
  'smart-qa-practice-generator': {
    label: 'Smart Q&A Practice',
    title: 'Practice set',
    subtitle: 'Questions with guided answers',
  },
  'quick-assignment-builder': {
    label: 'Quick Assignment',
    title: 'Assignment sheet',
    subtitle: 'Short tasks for the period',
  },
  'smart-study-guide-generator': {
    label: 'Smart Study Guide',
    title: 'Study guide',
    subtitle: 'Notes, checks, and revision paths',
  },
  'concept-breakdown-explainer': {
    label: 'Concept Breakdown',
    title: 'Concept explain',
    subtitle: 'Layered explanation for deeper understanding',
  },
  'concept-mastery-helper': {
    label: 'Concept Mastery Helper',
    title: 'Concept teaching flow',
    subtitle: '12-part breakdown for your class',
  },
  'chapter-summary-creator': {
    label: 'Chapter Summary',
    title: 'Chapter overview',
    subtitle: 'Key ideas in one place',
  },
  'key-points-formula-extractor': {
    label: 'Key Points & Formulas',
    title: 'Key points',
    subtitle: 'Formulas and must-remember facts',
  },
  'short-notes-summaries-maker': {
    label: 'Short Notes & Summaries',
    title: 'Short notes',
    subtitle: 'Compact revision blocks',
  },
  'lesson-planner': {
    label: 'Lesson Planner',
    title: 'Lesson plan',
    subtitle: 'Objectives, flow, and checks',
  },
  'study-schedule-maker': {
    label: 'Study Schedule Maker',
    title: 'Study schedule',
    subtitle: 'Plan your revision window',
  },
  'daily-class-plan-maker': {
    label: 'Daily Class Plan',
    title: 'Class day board',
    subtitle: 'Period-ready teaching steps',
  },
  'activity-project-generator': {
    label: 'Activity & Project',
    title: 'Activity plan',
    subtitle: 'Hands-on classroom projects',
  },
  'project-idea-lab': {
    label: 'Project Idea Lab',
    title: 'Project ideas',
    subtitle: 'Student-ready project briefs',
  },
  'story-passage-creator': {
    label: 'Story & Passage',
    title: 'Reading passage',
    subtitle: 'Story plus comprehension checks',
  },
  'reading-practice-room': {
    label: 'Reading Practice Room',
    title: 'Reading practice',
    subtitle: 'Passages with guided questions',
  },
};

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

function wrapViewer(slug: string, node: ReactNode, badge?: ReactNode): ReactNode {
  const meta = TOOL_DOC_META[slug] || {
    label: String(slug || 'AI Tool').replace(/-/g, ' '),
    title: 'Generated content',
  };
  return (
    <AiToolDocumentShell
      toolLabel={meta.label}
      title={meta.title}
      subtitle={meta.subtitle}
      accent={accentForToolSlug(slug)}
      badge={badge}
    >
      {node}
    </AiToolDocumentShell>
  );
}

/**
 * Resolve an interactive specialized viewer for teacher/student dashboards.
 * Every tool is wrapped in the same AiToolDocumentShell format.
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
      return wrapViewer(
        slug,
        <FlashcardViewer
          content={content}
          rawContent={rawContent}
          variant="teacher"
          embedded
        />,
      );
    case 'my-study-decks': {
      const deck = deckViewerPayloadFromRecord(record);
      return wrapViewer(
        slug,
        <MyStudyDecksViewer
          content={deck.content || content}
          rawContent={deck.rawContent ?? rawContent}
        />,
      );
    }
    case 'worksheet-mcq-generator':
      return wrapViewer(
        slug,
        <WorksheetMcqViewer
          content={content}
          rawContent={rawContent}
          variant={isStudent ? 'default' : 'teacher'}
        />,
      );
    case 'homework-creator':
      return wrapViewer(slug, <HomeworkCreatorViewer content={content} rawContent={rawContent} />);
    case 'mock-test-builder':
      return wrapViewer(slug, <MockTestViewer content={content} rawContent={rawContent} />);
    case 'exam-question-paper-generator':
      return wrapViewer(slug, <ExamQuestionPaperViewer content={content} rawContent={rawContent} />);
    case 'smart-qa-practice-generator':
      return wrapViewer(slug, <PracticeQaViewer content={content} rawContent={rawContent} />);
    case 'quick-assignment-builder':
      return wrapViewer(slug, <QuickAssignmentViewer content={content} rawContent={rawContent} />);
    case 'smart-study-guide-generator':
      return wrapViewer(slug, <SmartStudyGuideViewer content={content} rawContent={rawContent} />);
    case 'concept-breakdown-explainer':
      return wrapViewer(slug, <ConceptBreakdownViewer content={content} rawContent={rawContent} />);
    case 'concept-mastery-helper':
      return wrapViewer(
        slug,
        <ConceptMasteryViewer
          content={content}
          rawContent={rawContent}
          variant={isStudent ? 'student' : 'teacher'}
        />,
      );
    case 'chapter-summary-creator':
      return wrapViewer(slug, <ChapterSummaryViewer content={content} rawContent={rawContent} />);
    case 'key-points-formula-extractor':
      return wrapViewer(slug, <KeyPointsViewer content={content} rawContent={rawContent} />);
    case 'short-notes-summaries-maker':
      return wrapViewer(slug, <ShortNotesViewer content={content} rawContent={rawContent} />);
    case 'lesson-planner':
      return wrapViewer(
        slug,
        <LessonPlannerViewer
          content={content}
          rawContent={rawContent}
          variant="default"
          toolKind="lesson-planner"
        />,
      );
    case 'study-schedule-maker':
      return wrapViewer(
        slug,
        <LessonPlannerViewer
          content={content}
          rawContent={rawContent}
          variant="student"
          toolKind="study-schedule-maker"
        />,
      );
    case 'daily-class-plan-maker':
      return wrapViewer(slug, <DailyClassPlanViewer content={content} rawContent={rawContent} />);
    case 'activity-project-generator':
    case 'project-idea-lab': {
      const act = activityViewerPayloadFromRecord(record);
      return wrapViewer(
        slug,
        <ActivityProjectViewer
          content={act.content || content}
          activities={act.activities}
          variant={act.variant}
        />,
      );
    }
    case 'story-passage-creator':
      return wrapViewer(
        slug,
        <StoryPassageViewer
          content={content}
          rawData={rawContent}
          variant={isStudent ? 'student' : 'default'}
        />,
      );
    case 'reading-practice-room':
      return wrapViewer(
        slug,
        <StoryPassageViewer content={content} rawData={rawContent} variant="student" />,
      );
    default:
      return null;
  }
}
