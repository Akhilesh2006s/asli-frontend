/**
 * Build a synthetic generation record for live teacher/student previews
 * so GeneratorRecordViewer can render any of the 21 tools consistently.
 */
export function buildAiToolViewerRecord(params: {
  toolSlug: string;
  generatedContent: string;
  rawContent?: unknown;
  meta?: {
    classLabel?: string;
    subject?: string;
    topic?: string;
    subtopic?: string;
    board?: string;
  };
}): Record<string, unknown> {
  const slug = String(params.toolSlug || '').trim();
  const generatedContent = String(params.generatedContent || '').trim();
  const base =
    params.rawContent && typeof params.rawContent === 'object' && !Array.isArray(params.rawContent)
      ? ({ ...(params.rawContent as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const meta = params.meta || {};

  const structured =
    base.structuredContent ??
    (base.metadata as { structuredContent?: unknown } | undefined)?.structuredContent ??
    base;

  return {
    ...base,
    toolSlug: slug,
    toolName: slug,
    generatedContent,
    content: generatedContent,
    classLabel: meta.classLabel || base.classLabel || '',
    subject: meta.subject || base.subject || '',
    topic: meta.topic || base.topic || '',
    subtopic: meta.subtopic || base.subtopic || '',
    board: meta.board || base.board || '',
    structuredContent: structured,
    metadata: {
      ...(typeof base.metadata === 'object' && base.metadata && !Array.isArray(base.metadata)
        ? (base.metadata as Record<string, unknown>)
        : {}),
      structuredContent: structured,
    },
  };
}
