import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';

/**
 * Super Admin / AI Tool Data sometimes stores `generatedContent` as a JSON
 * envelope `{ formatted, raw }` (occasionally with mangled keys inside `raw`).
 * Teacher/student APIs also return `rawData` from metadata.structuredContent.
 * Normalize so viewers always get clean markdown + structured raw.
 */
export function normalizeAiToolResponsePayload(
  content: unknown,
  rawData?: unknown,
): { formatted: string; raw: unknown | null } {
  let formatted = String(content ?? '').trim();
  let raw: unknown | null =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData)
        ? { items: rawData }
        : null;

  const tryUnwrap = (text: string): boolean => {
    if (!text.startsWith('{') && !text.startsWith('[')) return false;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (typeof parsed.formatted === 'string' && parsed.formatted.trim()) {
        formatted = parsed.formatted.trim();
        if (!raw && parsed.raw && typeof parsed.raw === 'object') {
          raw = parsed.raw;
        }
        return true;
      }
      if (
        !raw &&
        (Array.isArray(parsed.cards) ||
          Array.isArray(parsed.flashcards) ||
          Array.isArray(parsed.application_hots_cards) ||
          Array.isArray(parsed.flashcard_set))
      ) {
        raw = parsed;
        formatted = '';
        return true;
      }
    } catch {
      /* keep original */
    }
    return false;
  };

  // Unwrap up to twice (API content may already be a stringified envelope).
  if (tryUnwrap(formatted)) {
    tryUnwrap(formatted);
  }

  return { formatted, raw };
}

/** Envelope string for viewers that still parse `{ formatted, raw }` JSON. */
export function buildAiToolViewerContent(
  content: unknown,
  rawData?: unknown,
): { displayContent: string; rawContent: unknown | null } {
  const { formatted, raw } = normalizeAiToolResponsePayload(content, rawData);
  if (raw && typeof raw === 'object') {
    return {
      displayContent: JSON.stringify({
        formatted: formatted || '',
        raw,
      }),
      rawContent: raw,
    };
  }
  return { displayContent: formatted, rawContent: null };
}

/**
 * Teacher/student display state: plain markdown for prose + structured raw for cards/sections.
 * Always unwraps `{ formatted, raw }` so viewers never render the JSON envelope as text.
 */
export function resolveAiToolDisplayState(
  content: unknown,
  rawData?: unknown,
): { displayText: string; rawContent: unknown | null } {
  const { formatted, raw } = normalizeAiToolResponsePayload(content, rawData);
  return {
    displayText: stripStructuredAiToolMetadata(formatted || ''),
    rawContent: raw,
  };
}

/** Prefer API rawData, then structuredContent, then envelope embedded in content. */
export function pickAiToolRawData(payload?: {
  rawData?: unknown;
  structuredContent?: unknown;
} | null): unknown {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.rawData && typeof payload.rawData === 'object') return payload.rawData;
  if (payload.structuredContent && typeof payload.structuredContent === 'object') {
    return payload.structuredContent;
  }
  return null;
}
