/** User-facing success toast for AI tool content (stored or live). */
export function contentGeneratedToast() {
  return {
    title: 'Content generated',
    description: 'Your content is ready.',
  } as const;
}

/** @deprecated Use contentGeneratedToast — kept for existing imports */
export function contentLoadedToastForMetadata(_metadata?: {
  source?: string;
  aiUnavailable?: boolean;
}) {
  return contentGeneratedToast();
}

/** @deprecated Use contentGeneratedToast */
export function storedContentLoadedToast() {
  return contentGeneratedToast();
}

export function isStoredAiToolContent(metadata?: {
  source?: string;
  aiUnavailable?: boolean;
}): boolean {
  const source = String(metadata?.source || '').toLowerCase();
  return (
    !!metadata?.aiUnavailable ||
    source === 'super-admin-ai-tool-data' ||
    source === 'ai-tool-data' ||
    source.includes('super-admin')
  );
}
