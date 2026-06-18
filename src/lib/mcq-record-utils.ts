/**
 * Parse MCQ / worksheet question data from AI tool generation records
 * (structured metadata, JSON content, or merged text blobs — e.g. Gemini fallback).
 */

import { normalizeAiToolSlug } from "@/lib/normalize-ai-tool-slug";
import { resolveWorksheetFromPayload } from "@/lib/parse-worksheet-mcq";

export type McqQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
  questionNumber?: number;
};

const MCQ_TOOLS = new Set([
  "worksheet-mcq-generator",
  "homework-creator",
  "exam-question-paper-generator",
  "smart-qa-practice-generator",
  "quick-assignment-builder",
]);

function resolveMcqToolSlug(toolName?: string): string {
  return normalizeAiToolSlug(toolName);
}

export function isMcqTool(toolName?: string): boolean {
  return MCQ_TOOLS.has(resolveMcqToolSlug(toolName));
}

export function isWorksheetMcqTool(toolName?: string): boolean {
  return resolveMcqToolSlug(toolName) === "worksheet-mcq-generator";
}

/** One-line preview for a whole worksheet record (list view — not per-question). */
export function worksheetRecordListPreview(row: {
  content?: string;
  generatedContent?: string;
  preview?: string;
  metadata?: unknown;
}): string {
  const rawText = recordRawText(row);
  const meta = row.metadata as Record<string, unknown> | undefined;
  const { worksheet } = resolveWorksheetFromPayload(rawText, meta?.structuredContent ?? meta);
  if (worksheet) {
    const title = String(worksheet.title || "").trim();
    const first = worksheet.sections
      .flatMap((s) => s.questions)
      .find((q) => String(q.question || "").trim());
    if (first) {
      const label = first.questionNumber ? `Q${first.questionNumber}. ` : "";
      const line = `${label}${first.question}`.trim();
      return title ? `${title} — ${line}` : line;
    }
    if (title) return title;
  }
  if (row.preview) return String(row.preview).trim();
  const plain = stripInlineMarkdown(stripMarkdownLeader(rawText));
  const firstLine = plain
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return (firstLine || plain).slice(0, 240);
}

function stripInlineMarkdown(text: string): string {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .trim();
}

function parseQuestionSegment(segment: string, questionNumber?: number): McqQuestion | null {
  const cleaned = stripInlineMarkdown(segment);
  if (!cleaned) return null;

  const explanationMatch = cleaned.match(/Explanation\s*:\s*([^]+)$/i);
  const explanationRaw = explanationMatch ? explanationMatch[1].trim() : "";
  const beforeExplanation = explanationMatch ? cleaned.slice(0, explanationMatch.index).trim() : cleaned;
  const answerMatch = beforeExplanation.match(/Answer\s*:\s*([^]+)$/i);
  const answerRaw = answerMatch ? answerMatch[1].trim() : "";
  const withoutAnswer = answerMatch ? beforeExplanation.slice(0, answerMatch.index).trim() : beforeExplanation;
  const optionMatches = Array.from(
    withoutAnswer.matchAll(/([A-D])[\).]\s*([^]+?)(?=(?:\s+[A-D][\).]\s*)|$)/gi),
  );
  const options = optionMatches
    .map((m) => `${m[1].toUpperCase()}) ${String(m[2] || "").trim()}`)
    .filter(Boolean);
  const questionText =
    optionMatches.length > 0
      ? withoutAnswer.slice(0, optionMatches[0].index).trim()
      : withoutAnswer.trim();
  const question = questionText.replace(/^\W+/, "").trim();
  if (!question) return null;
  return {
    question,
    options,
    answer: answerRaw,
    explanation: explanationRaw,
    questionNumber,
  };
}

function parseQuestionBlob(blob: string): McqQuestion[] {
  const cleaned = String(blob || "")
    .replace(/\*\*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/Correct Answer\s*:/gi, "Answer:")
    .trim();
  if (!cleaned) return [];

  const segments = cleaned
    .split(/\s*(?:Q(?:uestion)?\s*\d+[\.\):]|(?:^|\s)\d+[\.\)])\s*/gi)
    .map((part) => part.trim())
    .filter(Boolean);

  return segments
    .map((segment) => parseQuestionSegment(segment))
    .filter((entry): entry is McqQuestion => Boolean(entry?.question));
}

function parseMultilineQuestionBlob(blob: string): McqQuestion[] {
  const body = String(blob || "")
    .replace(/\r\n/g, "\n")
    .replace(/\*\*/g, "")
    .trim();
  if (!body) return [];

  const segments = body
    .split(/(?=^Q(?:uestion)?\s*\d+[\.\):])/gim)
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length <= 1 && !/^Q(?:uestion)?\s*\d+[\.\):]/im.test(body)) {
    return [];
  }

  return segments
    .map((segment) => {
      const head = segment.match(/^Q(?:uestion)?\s*(\d+)[\.\):]\s*/i);
      const questionNumber = head ? Number(head[1]) : undefined;
      const rest = head ? segment.slice(head[0].length).trim() : segment;
      return parseQuestionSegment(rest, questionNumber);
    })
    .filter((entry): entry is McqQuestion => Boolean(entry?.question));
}

function normalizeOptions(entry: Record<string, unknown>): string[] {
  if (!Array.isArray(entry?.options)) return [];
  return (entry.options as unknown[])
    .map((opt: unknown, idx: number) => {
      const text = String(opt || "").trim();
      if (!text) return "";
      if (/^[A-D][\).]/i.test(text)) return text.replace(/^([A-D])\./i, "$1)");
      return `${String.fromCharCode(65 + idx)}) ${text}`;
    })
    .filter(Boolean);
}

function toQuestionArray(value: unknown): McqQuestion[] {
  const baseRows = (Array.isArray(value) ? value : [])
    .flatMap((entry: Record<string, unknown>) => {
      const questionRaw = String(entry?.question || entry?.prompt || entry?.text || "").trim();
      const answerRaw = String(entry?.answer || entry?.correctAnswer || "").trim();
      const explanationRaw = String(entry?.explanation || entry?.solution || entry?.reason || "").trim();
      const options = normalizeOptions(entry);
      const questionNumberRaw = entry?.question_number ?? entry?.questionNumber ?? entry?.sl_no;
      const questionNumber =
        questionNumberRaw != null && !Number.isNaN(Number(questionNumberRaw))
          ? Number(questionNumberRaw)
          : undefined;
      const looksMergedBlob =
        questionRaw.length > 240 ||
        /\bQ(?:uestion)?\s*\d+[\.\):]/i.test(questionRaw) ||
        (/A[\).]/i.test(questionRaw) && /B[\).]/i.test(questionRaw) && /C[\).]/i.test(questionRaw));
      if (looksMergedBlob) {
        return parseQuestionBlob(questionRaw);
      }
      return [
        {
          question: questionRaw,
          options,
          answer: answerRaw,
          explanation: explanationRaw,
          questionNumber,
        },
      ];
    })
    .filter((entry) => entry.question);

  return baseRows.filter(
    (entry, idx, arr) => arr.findIndex((q) => q.question.toLowerCase() === entry.question.toLowerCase()) === idx,
  );
}

function questionsFromSectionArrays(structured: Record<string, unknown>): McqQuestion[] {
  if (!Array.isArray(structured.sections)) return [];
  const rows: unknown[] = [];
  for (const sec of structured.sections) {
    if (!sec || typeof sec !== "object") continue;
    const questions = (sec as Record<string, unknown>).questions;
    if (Array.isArray(questions)) rows.push(...questions);
  }
  return toQuestionArray(rows);
}

function worksheetQuestionsFromPayload(
  rawText: string,
  metadata?: unknown,
): McqQuestion[] {
  const { worksheet } = resolveWorksheetFromPayload(rawText, metadata);
  if (!worksheet) return [];

  const out: McqQuestion[] = [];
  for (const sec of worksheet.sections) {
    for (const q of sec.questions) {
      const question = String(q.question || "").trim();
      if (!question) continue;
      out.push({
        question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        questionNumber: q.questionNumber,
      });
    }
  }
  return out;
}

function stripMarkdownLeader(text: string): string {
  const lines = String(text || "").split(/\n/);
  let start = 0;
  while (start < lines.length && /^\s*#+\s/.test(lines[start])) start += 1;
  while (start < lines.length && /^\s*(\*\*|__)?\s*(Class|Subject|Topic|Tool)[:\s]/i.test(lines[start])) {
    start += 1;
  }
  return lines.slice(start).join("\n").trim();
}

function tryParseJsonContent(text: string): McqQuestion[] {
  const t = String(text || "").trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return [];
  try {
    const parsed = JSON.parse(t) as unknown;
    const root = parsed as Record<string, unknown>;
    const questions =
      root?.questions ??
      (root?.structuredContent as Record<string, unknown> | undefined)?.questions;
    if (Array.isArray(questions)) return toQuestionArray(questions);

    const fromSections = questionsFromSectionArrays(
      (root?.structuredContent as Record<string, unknown>) || root || {},
    );
    if (fromSections.length > 0) return fromSections;
  } catch {
    /* ignore */
  }
  return [];
}

function recordRawText(row: {
  content?: string;
  generatedContent?: string;
  preview?: string;
}): string {
  return String(row.content || row.generatedContent || row.preview || "").trim();
}

/**
 * Pull questions from metadata, JSON body, or plain / merged MCQ text in content.
 */
export function extractMcqQuestionsFromRecord(row: {
  toolName?: string;
  content?: string;
  generatedContent?: string;
  preview?: string;
  metadata?: unknown;
}): McqQuestion[] {
  const slug = resolveMcqToolSlug(row.toolName);
  if (!MCQ_TOOLS.has(slug)) return [];

  const meta = row.metadata as Record<string, unknown> | undefined;
  const structured = meta?.structuredContent as Record<string, unknown> | undefined;
  const render = meta?.renderContent as Record<string, unknown> | undefined;
  const rawText = recordRawText(row);

  if (slug === "worksheet-mcq-generator") {
    const fromWorksheet = worksheetQuestionsFromPayload(rawText, meta?.structuredContent ?? meta);
    if (fromWorksheet.length > 0) return fromWorksheet;
  }

  const fromStructured = structured?.questions ?? render?.questions;
  if (Array.isArray(fromStructured) && fromStructured.length > 0) {
    const parsed = toQuestionArray(fromStructured);
    if (parsed.length > 0) return parsed;
  }

  const fromStructuredSections = questionsFromSectionArrays(structured || {});
  if (fromStructuredSections.length > 0) return fromStructuredSections;

  const fromRenderSections = questionsFromSectionArrays(
    render && typeof render === "object" ? render : {},
  );
  if (fromRenderSections.length > 0) return fromRenderSections;

  const fromJson = tryParseJsonContent(rawText);
  if (fromJson.length > 0) return fromJson;

  let body = stripMarkdownLeader(rawText);
  if (body) {
    const fromMultiline = parseMultilineQuestionBlob(body);
    if (fromMultiline.length > 0) return fromMultiline;

    const numberedStart = body.search(/\d+[\.\)]\s*[A-Za-z\u00C0-\u024F]/);
    if (numberedStart > 40) {
      body = body.slice(numberedStart).trim();
    }
    const fromBlob = parseQuestionBlob(body);
    if (fromBlob.length > 0) return fromBlob;
    const fromNumbered = parseQuestionBlob(body.replace(/^---+\s*/m, ""));
    if (fromNumbered.length > 0) return fromNumbered;
  }

  return [];
}

export function displayMcqQuestionSerial(q: McqQuestion, index: number): number {
  return q.questionNumber != null && q.questionNumber > 0 ? q.questionNumber : index + 1;
}
