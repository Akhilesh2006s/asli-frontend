import { GeneratedRecordBody } from "@/components/super-admin/generated-record-body";
import { FlashcardViewer } from "@/components/flashcard-viewer";
import { MyStudyDecksViewer, deckViewerPayloadFromRecord } from "@/components/my-study-decks-viewer";
import { MockTestViewer, mockTestViewerPayloadFromRecord } from "@/components/mock-test-viewer";
import { ExamQuestionPaperViewer } from "@/components/exam-question-paper-viewer";
import { SmartStudyGuideViewer, studyGuideViewerPayloadFromRecord } from "@/components/smart-study-guide-viewer";
import { ConceptBreakdownViewer, conceptBreakdownViewerPayloadFromRecord } from "@/components/concept-breakdown-viewer";
import { PracticeQaViewer, practiceQaViewerPayloadFromRecord } from "@/components/practice-qa-viewer";
import { KeyPointsViewer, keyPointsViewerPayloadFromRecord } from "@/components/key-points-viewer";
import { HomeworkCreatorViewer } from "@/components/homework-creator-viewer";
import { LessonPlannerViewer } from "@/components/lesson-planner-viewer";
import { ShortNotesViewer } from "@/components/short-notes-viewer";
import { WorksheetMcqViewer } from "@/components/worksheet-mcq-viewer";

function isWorksheetToolValue(v: unknown): boolean {
  const t = String(v || "").trim().toLowerCase();
  return t === "worksheet-mcq-generator" || (t.includes("worksheet") && t.includes("mcq"));
}

export function GeneratorRecordViewer({ record }: { record: Record<string, unknown> | null }) {
  if (!record) return null;
  const slug = String(record.toolSlug || record.toolName || "").trim();
  const generatedContent = String(record.generatedContent || record.content || "");

  if (slug === "my-study-decks") {
    return <MyStudyDecksViewer {...deckViewerPayloadFromRecord(record)} />;
  }
  if (slug === "flashcard-generator") {
    const deckPayload = deckViewerPayloadFromRecord(record);
    return <FlashcardViewer content={deckPayload.content} rawContent={deckPayload.rawContent} variant="teacher" />;
  }
  if (isWorksheetToolValue(slug)) {
    return <WorksheetMcqViewer content={generatedContent} rawContent={record} variant="teacher" />;
  }
  if (slug === "lesson-planner") {
    return (
      <LessonPlannerViewer content={generatedContent} rawContent={record} variant="teacher" toolKind="lesson-planner" />
    );
  }
  if (slug === "homework-creator") {
    return <HomeworkCreatorViewer content={generatedContent} rawContent={record} />;
  }
  if (slug === "mock-test-builder") {
    return <MockTestViewer {...mockTestViewerPayloadFromRecord(record)} />;
  }
  if (slug === "exam-question-paper-generator") {
    return (
      <ExamQuestionPaperViewer
        content={generatedContent}
        rawContent={
          (record as { metadata?: { structuredContent?: unknown } }).metadata?.structuredContent || record
        }
        variant="teacher"
      />
    );
  }
  if (slug === "smart-study-guide-generator") {
    return <SmartStudyGuideViewer {...studyGuideViewerPayloadFromRecord(record)} />;
  }
  if (slug === "concept-breakdown-explainer") {
    return <ConceptBreakdownViewer {...conceptBreakdownViewerPayloadFromRecord(record)} />;
  }
  if (slug === "smart-qa-practice-generator") {
    return <PracticeQaViewer {...practiceQaViewerPayloadFromRecord(record)} />;
  }
  if (slug === "key-points-formula-extractor") {
    return <KeyPointsViewer {...keyPointsViewerPayloadFromRecord(record)} />;
  }
  if (slug === "short-notes-summaries-maker") {
    return (
      <ShortNotesViewer
        content={generatedContent}
        rawContent={(record as { metadata?: { structuredContent?: unknown } }).metadata?.structuredContent || record}
      />
    );
  }
  return <GeneratedRecordBody content={generatedContent} />;
}
