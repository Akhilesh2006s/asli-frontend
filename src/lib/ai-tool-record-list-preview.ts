import { stripMarkdownSyntax } from "@/lib/strip-markdown-syntax";
import { normalizeAiToolSlug } from "@/lib/normalize-ai-tool-slug";
import { deckViewerPayloadFromRecord } from "@/components/my-study-decks-viewer";
import { mockTestViewerPayloadFromRecord } from "@/components/mock-test-viewer";
import {
  examPaperRecordListPreview,
  mockTestRecordListPreview,
  worksheetRecordListPreview,
} from "@/lib/mcq-record-utils";
import { practiceQaViewerPayloadFromRecord } from "@/components/practice-qa-viewer";
import {
  countPracticeQaQuestions,
  resolvePracticeQaFromPayload,
} from "@/lib/parse-practice-qa";
import { conceptMasteryViewerPayloadFromRecord } from "@/components/concept-mastery-viewer";
import { resolveConceptsFromPayload } from "@/lib/parse-concept-mastery";
import { studyGuideViewerPayloadFromRecord } from "@/components/smart-study-guide-viewer";
import { resolveStudyGuideFromPayload } from "@/lib/parse-smart-study-guide";
import { conceptBreakdownViewerPayloadFromRecord } from "@/components/concept-breakdown-viewer";
import { resolveConceptBreakdownFromPayload } from "@/lib/parse-concept-breakdown";
import { chapterSummaryViewerPayloadFromRecord } from "@/components/chapter-summary-viewer";
import { resolveChapterSummaryFromPayload } from "@/lib/parse-chapter-summary";
import { keyPointsViewerPayloadFromRecord } from "@/components/key-points-viewer";
import { resolveKeyPointsFromPayload } from "@/lib/parse-key-points";
import { quickAssignmentViewerPayloadFromRecord } from "@/components/quick-assignment-viewer";
import { resolveQuickAssignmentFromPayload } from "@/lib/parse-quick-assignment";
import { activityViewerPayloadFromRecord } from "@/components/activity-project-viewer";
import { resolveActivitiesFromPayload } from "@/lib/parse-activity-markdown";
import { resolveHomeworkFromPayload } from "@/lib/parse-homework-creator";
import { resolveLessonsFromPayload } from "@/lib/parse-lesson-planner";
import { resolveDailyPlansFromPayload } from "@/lib/parse-daily-class-plan";
import { resolveShortNotesFromPayload } from "@/lib/parse-short-notes";
import { resolveStoryFromPayload } from "@/lib/parse-story-content";

export type AiToolRecordPreviewInput = {
  toolName?: string;
  toolSlug?: string;
  content?: string;
  generatedContent?: string;
  preview?: string;
  metadata?: {
    listPreview?: string;
    structuredContent?: unknown;
    generationVariant?: number;
    variantAngle?: string;
    extraParams?: { generationVariant?: number; variantAngle?: string };
    [key: string]: unknown;
  };
  generationVariant?: number | null;
  variantAngle?: string;
};

export function recordGenerationVariant(record?: AiToolRecordPreviewInput | null): number | null {
  if (!record) return null;
  const v =
    record.generationVariant ??
    record.metadata?.generationVariant ??
    record.metadata?.extraParams?.generationVariant;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export function recordVariantAngle(record?: AiToolRecordPreviewInput | null): string {
  if (!record) return "";
  return String(
    record.variantAngle ??
      record.metadata?.variantAngle ??
      record.metadata?.extraParams?.variantAngle ??
      "",
  ).trim();
}

function previewRow(record?: AiToolRecordPreviewInput) {
  const text = String(
    record?.generatedContent ?? record?.content ?? record?.preview ?? "",
  ).trim();
  return {
    content: text,
    generatedContent: text,
    preview: record?.preview,
    metadata: record?.metadata,
  };
}

function firstLinePreview(text: string, max = 240): string {
  const plain = stripMarkdownSyntax(text);
  const line = plain
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return (line || plain).slice(0, max);
}

function previewFromStructured(structured: Record<string, unknown>): string {
  const title = String(
    structured.reading_practice_title ||
      structured.title ||
      structured.lesson_name ||
      structured.mock_test_title ||
      structured.paper_title ||
      structured.activity_title ||
      structured.project_title ||
      "",
  ).trim();
  const passage = String(
    structured.passage || structured.content || structured.story_passage_content || "",
  ).trim();
  if (passage) return passage.slice(0, 320);
  if (title) return title.slice(0, 200);
  const firstQuestion = [
    ...(Array.isArray(structured.read_and_recall_questions)
      ? structured.read_and_recall_questions
      : []),
    ...(Array.isArray(structured.questions) ? structured.questions : []),
    ...(Array.isArray(structured.sections)
      ? structured.sections.flatMap((s) =>
          s && typeof s === "object" ? (s as { questions?: unknown[] }).questions || [] : [],
        )
      : []),
  ]
    .map((q) =>
      typeof q === "string" ? q : String((q as { question?: string; text?: string })?.question || (q as { text?: string })?.text || "").trim(),
    )
    .find(Boolean);
  if (firstQuestion) return firstQuestion.slice(0, 280);
  return title;
}

/** One-line list preview for any AI tool record (all 21 tools). */
export function aiToolRecordListPreview(
  toolSlugOrName: string,
  record?: AiToolRecordPreviewInput | null,
): string {
  if (!record) return "";
  const slug = normalizeAiToolSlug(toolSlugOrName || record.toolSlug || record.toolName);
  const row = previewRow(record);

  const listPreview = String(record.metadata?.listPreview || "").trim();
  if (listPreview) return stripMarkdownSyntax(listPreview);

  if (slug === "my-study-decks" || slug === "flashcard-generator") {
    const { content } = deckViewerPayloadFromRecord({
      generatedContent: row.generatedContent,
      metadata: record.metadata,
    });
    return firstLinePreview(content);
  }

  if (slug === "mock-test-builder") {
    return mockTestRecordListPreview(row);
  }

  if (slug === "exam-question-paper-generator") {
    return examPaperRecordListPreview(row);
  }

  if (slug === "worksheet-mcq-generator") {
    return worksheetRecordListPreview(row);
  }

  if (slug === "smart-qa-practice-generator") {
    const payload = practiceQaViewerPayloadFromRecord(row);
    const { practice, markdownFallback } = resolvePracticeQaFromPayload(
      payload.content,
      payload.rawContent,
    );
    if (practice) {
      const title = String(practice.title || "").trim();
      const firstQ = practice.sections
        .flatMap((section) => section.questions)
        .find((question) => String(question.question || "").trim());
      if (firstQ) {
        const line = `Q${firstQ.questionNumber || 1}. ${String(firstQ.question).trim()}`;
        return title ? `${title} — ${line}` : line;
      }
      if (title) {
        const count = countPracticeQaQuestions(practice);
        return count ? `${title} · ${count} questions` : title;
      }
    }
    if (markdownFallback) return firstLinePreview(markdownFallback);
  }

  if (slug === "concept-mastery-helper") {
    const payload = conceptMasteryViewerPayloadFromRecord(row);
    const { concepts } = resolveConceptsFromPayload(payload.content, payload.rawContent);
    const first = concepts.find((c) => String(c.conceptName || "").trim());
    if (first?.conceptName) return String(first.conceptName).trim();
  }

  if (slug === "smart-study-guide-generator") {
    const payload = studyGuideViewerPayloadFromRecord(row);
    const { guide } = resolveStudyGuideFromPayload(payload.content, payload.rawContent);
    const title = String(guide.title || "").trim();
    const overview = String(guide.chapterOverview || "").trim();
    if (title && overview) return `${title} — ${overview.slice(0, 120)}`;
    if (title) return title;
    if (overview) return overview.slice(0, 200);
  }

  if (slug === "concept-breakdown-explainer") {
    const payload = conceptBreakdownViewerPayloadFromRecord(row);
    const { concepts } = resolveConceptBreakdownFromPayload(payload.content, payload.rawContent);
    const first = concepts.find((c) => String(c.conceptTitle || "").trim());
    if (first?.conceptTitle) return String(first.conceptTitle).trim();
  }

  if (slug === "chapter-summary-creator") {
    const payload = chapterSummaryViewerPayloadFromRecord(row);
    const { summary } = resolveChapterSummaryFromPayload(payload.content, payload.rawContent);
    const title = String(summary?.title || "").trim();
    const overview = String(summary?.chapterOverview || "").trim();
    if (title && overview) return `${title} — ${overview.slice(0, 120)}`;
    if (title) return title;
    if (overview) return overview.slice(0, 200);
  }

  if (slug === "key-points-formula-extractor") {
    const payload = keyPointsViewerPayloadFromRecord(row);
    const { keyPoints } = resolveKeyPointsFromPayload(payload.content, payload.rawContent);
    const title = String(keyPoints?.title || "").trim();
    if (title) return title;
  }

  if (slug === "quick-assignment-builder") {
    const payload = quickAssignmentViewerPayloadFromRecord(row);
    const { assignment } = resolveQuickAssignmentFromPayload(payload.content, payload.rawContent);
    const title = String(assignment?.title || "").trim();
    if (title) return title;
  }

  if (
    slug === "activity-project-generator" ||
    slug === "project-idea-lab"
  ) {
    const payload = activityViewerPayloadFromRecord({
      ...row,
      toolSlug: slug,
      generatedContent: row.generatedContent,
    });
    const activities = resolveActivitiesFromPayload(
      payload.activities,
      payload.content,
    );
    const first = activities.find((a) => String(a.title || a.name || "").trim());
    if (first) return String(first.title || first.name).trim();
  }

  if (slug === "homework-creator") {
    const { homework } = resolveHomeworkFromPayload(
      row.generatedContent,
      record.metadata?.structuredContent ?? record.metadata,
    );
    const title = String(homework?.title || "").trim();
    if (title) return title;
  }

  if (slug === "lesson-planner" || slug === "study-schedule-maker") {
    const { lessons } = resolveLessonsFromPayload(
      row.generatedContent,
      record.metadata?.structuredContent ?? record.metadata,
    );
    const first = lessons.find((l) => String(l.lessonName || "").trim());
    if (first?.lessonName) return String(first.lessonName).trim();
  }

  if (slug === "daily-class-plan-maker") {
    const { plans } = resolveDailyPlansFromPayload(
      row.generatedContent,
      record.metadata?.structuredContent ?? record.metadata,
    );
    const first = plans.find((p) => String(p.title || "").trim());
    if (first?.title) return String(first.title).trim();
  }

  if (slug === "short-notes-summaries-maker") {
    const resolved = resolveShortNotesFromPayload(
      row.generatedContent,
      record.metadata?.structuredContent ?? record.metadata,
    );
    if (resolved?.mode === "template") {
      const title = String(resolved.items[0]?.title || "").trim();
      if (title) return title;
    }
    if (resolved?.mode === "legacy") {
      const name = String(resolved.notes[0]?.concept_name || "").trim();
      if (name) return name;
    }
  }

  if (slug === "story-passage-creator" || slug === "reading-practice-room") {
    const resolved = resolveStoryFromPayload(
      row.generatedContent,
      record.metadata?.structuredContent ?? record.metadata,
    );
    if (resolved.mode === "stories" && resolved.stories.length > 0) {
      const story = resolved.stories[0];
      const title = String(story.title || "").trim();
      const passage = String(story.passage || "").trim();
      if (title && passage) return `${title} — ${passage.slice(0, 120)}`;
      if (passage) return passage.slice(0, 200);
      if (title) return title;
    }
    if (resolved.mode === "passages") {
      const title = String(resolved.bundle.title || "").trim();
      const passage = String(resolved.bundle.passages[0]?.paragraph || "").trim();
      if (title && passage) return `${title} — ${passage.slice(0, 120)}`;
      if (passage) return passage.slice(0, 200);
      if (title) return title;
    }
  }

  const structured = record.metadata?.structuredContent;
  if (structured && typeof structured === "object" && !Array.isArray(structured)) {
    const fromStructured = previewFromStructured(structured as Record<string, unknown>);
    if (fromStructured) return stripMarkdownSyntax(fromStructured);
  }

  if (record.preview) return stripMarkdownSyntax(String(record.preview));
  return firstLinePreview(row.generatedContent || row.content || "");
}
