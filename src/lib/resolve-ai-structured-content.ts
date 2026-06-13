/**
 * AI tool viewer payloads: structured JSON is primary; markdown supplements sparse sections.
 * Export/download still uses resolveAiExportMarkdown.
 */

export const AI_VIEWER_STRUCTURED_ONLY = true;

export type AiRecordLike = {
  generatedContent?: string;
  content?: string;
  structuredContent?: unknown;
  metadata?: {
    structuredContent?: unknown;
    formatSource?: string;
  };
};

export function isStructuredOnlyViewerMode(): boolean {
  return AI_VIEWER_STRUCTURED_ONLY;
}

export function resolveAiStructuredContent(record: AiRecordLike | null | undefined): unknown {
  if (record && typeof record === 'object' && !Array.isArray(record)) {
    const direct = (record as { structuredContent?: unknown }).structuredContent;
    if (direct && typeof direct === 'object') return direct;
  }
  const md = record?.metadata;
  if (md?.structuredContent && typeof md.structuredContent === 'object') {
    return md.structuredContent;
  }
  return null;
}

/** Unwrap structured JSON from viewer rawContent / API record shapes. */
export function absorbStructuredRecords(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  }
  if (typeof raw !== 'object') return [];

  const o = raw as Record<string, unknown>;
  const meta = o.metadata as Record<string, unknown> | undefined;
  if (meta?.structuredContent && typeof meta.structuredContent === 'object') {
    return absorbStructuredRecords(meta.structuredContent);
  }
  if (o.structuredContent && typeof o.structuredContent === 'object') {
    return absorbStructuredRecords(o.structuredContent);
  }
  if (o.raw && typeof o.raw === 'object') return absorbStructuredRecords(o.raw);
  if (o.data && typeof o.data === 'object') return absorbStructuredRecords(o.data);

  const keys = Object.keys(o);
  const looksStructured =
    keys.some((k) =>
      [
        'title',
        'worksheet_title',
        'lesson_name',
        'homework_title',
        'mock_test_title',
        'paper_title',
        'questions',
        'sections',
        'learning_objectives',
        'cards',
        'criteria',
        'concepts',
      ].includes(k),
    ) || keys.length > 2;

  if (looksStructured) return [o];
  return [];
}

/** Merge record, structured fields, and markdown for parser absorb/extract helpers. */
export function buildEnrichedRawContent(
  record: AiRecordLike | null | undefined,
  structuredContent: unknown | null,
): unknown {
  const markdown = resolveAiExportMarkdown(record);
  const base =
    record && typeof record === 'object' && !Array.isArray(record)
      ? { ...(record as Record<string, unknown>) }
      : {};
  const structured =
    structuredContent && typeof structuredContent === 'object' && !Array.isArray(structuredContent)
      ? (structuredContent as Record<string, unknown>)
      : {};
  return {
    ...base,
    ...structured,
    generatedContent: markdown || base.generatedContent || base.content,
    content: markdown || base.content || base.generatedContent,
    structuredContent: structuredContent ?? structured,
    metadata: base.metadata ?? record?.metadata,
  };
}

/** Standard viewer props — structured primary; content carries markdown for sparse-section fallback. */
export function buildAiViewerProps(record: AiRecordLike | null | undefined): {
  content: string;
  rawContent: unknown;
  structuredContent: unknown | null;
  source: 'structuredContent' | 'markdown';
} {
  const structuredContent = resolveAiStructuredContent(record);
  const markdown = resolveAiExportMarkdown(record);
  return {
    content: markdown,
    rawContent: buildEnrichedRawContent(record, structuredContent),
    structuredContent,
    source: structuredContent ? 'structuredContent' : 'markdown',
  };
}

export function viewerPayloadFromRecord(
  record?: AiRecordLike | null,
): { content: string; rawContent?: unknown; structuredContent?: unknown | null } {
  const props = buildAiViewerProps(record);
  return {
    content: props.content,
    rawContent: props.rawContent,
    structuredContent: props.structuredContent,
  };
}

export function resolveAiViewerMarkdown(record: AiRecordLike | null | undefined): string {
  return String(record?.generatedContent || record?.content || '').trim();
}

/** Export/download/preview only — not for viewer components. */
export function resolveAiExportMarkdown(record: AiRecordLike | null | undefined): string {
  return resolveAiViewerMarkdown(record);
}

export function resolveAiViewerPayload(record: AiRecordLike | null | undefined): {
  structuredContent: unknown | null;
  markdown: string;
  source: 'structuredContent' | 'markdown';
} {
  const structuredContent = resolveAiStructuredContent(record);
  return {
    structuredContent,
    markdown: resolveAiExportMarkdown(record),
    source: structuredContent ? 'structuredContent' : 'markdown',
  };
}

/** @deprecated Parsers now merge markdown when structured sections are sparse. */
export function noMarkdownFallback<T>(value: T | null): { value: T | null; markdownFallback: null } {
  return { value, markdownFallback: null };
}
