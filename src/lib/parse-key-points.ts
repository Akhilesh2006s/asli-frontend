import { viewerPayloadFromRecord } from '@/lib/resolve-ai-structured-content';
import { sanitizeAiDisplayText } from '@/lib/sanitize-ai-display-text';

export type KeyPointsConcept = { name: string; explanation: string };
export type KeyPointsDefinition = { term: string; definition: string };
export type KeyPointsFormula = { name: string; formula: string; note: string };
export type KeyPointsKeyword = { term: string; meaning: string };

export type KeyPointsContent = {
  title: string;
  importantConcepts: KeyPointsConcept[];
  essentialDefinitions: KeyPointsDefinition[];
  formulae: KeyPointsFormula[];
  keywords: KeyPointsKeyword[];
  mustRememberFacts: string[];
  realLifeConnections: string[];
  examPoints: string[];
  mnemonics: string[];
  revisionSummary: string;
};

function cleanText(value: unknown): string {
  return sanitizeAiDisplayText(value);
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => cleanText(v)).filter(Boolean);
  const s = cleanText(value);
  if (!s) return [];
  return s
    .split(/\n|;/)
    .map((line) => line.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
    .filter(Boolean);
}

function normalizeConcepts(raw: unknown): KeyPointsConcept[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (row && typeof row === 'object') {
        const o = row as Record<string, unknown>;
        return {
          name: cleanText(o.name || o.concept || o.point),
          explanation: cleanText(o.explanation || o.detail),
        };
      }
      return { name: cleanText(row), explanation: '' };
    })
    .filter((c) => c.name);
}

function normalizeDefinitions(raw: unknown): KeyPointsDefinition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (row && typeof row === 'object') {
        const o = row as Record<string, unknown>;
        return {
          term: cleanText(o.term || o.name),
          definition: cleanText(o.definition),
        };
      }
      return { term: cleanText(row), definition: '' };
    })
    .filter((d) => d.term);
}

function normalizeFormulae(raw: unknown): KeyPointsFormula[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (row && typeof row === 'object') {
        const o = row as Record<string, unknown>;
        return {
          name: cleanText(o.name || o.title || 'Formula'),
          formula: cleanText(o.formula || o.rule || o.expression),
          note: cleanText(o.note || o.explanation),
        };
      }
      const line = cleanText(row);
      return line ? { name: 'Rule', formula: line, note: '' } : null;
    })
    .filter((f): f is KeyPointsFormula => f != null && Boolean(f.formula));
}

function normalizeKeywords(raw: unknown): KeyPointsKeyword[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (row && typeof row === 'object') {
        const o = row as Record<string, unknown>;
        return {
          term: cleanText(o.term || o.keyword || o.name),
          meaning: cleanText(o.meaning || o.definition),
        };
      }
      return { term: cleanText(row), meaning: '' };
    })
    .filter((k) => k.term);
}

export function normalizeKeyPointsRecord(raw: Record<string, unknown>): KeyPointsContent {
  const title = cleanText(raw.topic_title || raw.title || raw.topic || 'Key Points');
  return {
    title: title || 'Key Points',
    importantConcepts: normalizeConcepts(raw.important_concepts || raw.key_concepts || raw.concepts),
    essentialDefinitions: normalizeDefinitions(raw.essential_definitions || raw.definitions),
    formulae: normalizeFormulae(raw.formulae || raw.formulas || raw.rules),
    keywords: normalizeKeywords(raw.keywords_terminologies || raw.keywords || raw.terminologies),
    mustRememberFacts: toList(raw.must_remember_facts || raw.key_points || raw.key_points_to_remember),
    realLifeConnections: toList(raw.real_life_connections || raw.real_life_applications),
    examPoints: toList(raw.frequently_asked_exam_points || raw.exam_points),
    mnemonics: toList(raw.mnemonics_memory_tricks || raw.mnemonics || raw.memory_tricks),
    revisionSummary: cleanText(
      raw.one_minute_revision_summary || raw.revision_summary || raw.summary,
    ),
  };
}

export function keyPointsHasVisibleBody(content: KeyPointsContent): boolean {
  return (
    content.importantConcepts.length > 0 ||
    content.essentialDefinitions.length > 0 ||
    content.formulae.length > 0 ||
    content.mustRememberFacts.length > 0 ||
    Boolean(content.revisionSummary)
  );
}

export function resolveKeyPointsFromPayload(
  content: string,
  rawContent?: unknown,
): { keyPoints: KeyPointsContent | null; markdownFallback: string | null } {
  if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
    const row = rawContent as Record<string, unknown>;
    const structured =
      (row.structuredContent as Record<string, unknown> | undefined) ||
      (row.metadata as { structuredContent?: Record<string, unknown> } | undefined)?.structuredContent ||
      row;
    if (structured && typeof structured === 'object') {
      const normalized = normalizeKeyPointsRecord(structured as Record<string, unknown>);
      if (keyPointsHasVisibleBody(normalized)) {
        return { keyPoints: normalized, markdownFallback: null };
      }
    }
  }

  const text = String(content || '').trim();
  if (!text) return { keyPoints: null, markdownFallback: null };
  return { keyPoints: null, markdownFallback: text };
}

export function keyPointsViewerPayloadFromRecord(record: Record<string, unknown>) {
  const payload = viewerPayloadFromRecord(record);
  return {
    content: String(payload.content || record.generatedContent || record.content || ''),
    rawContent: payload.rawContent ?? record,
  };
}

export function looksLikeKeyPointsContent(text: string): boolean {
  const sample = String(text || '').slice(0, 16000);
  if (!sample.trim()) return false;

  if (/chapter\s*summary\s*creator/i.test(sample) && !/key\s*points/i.test(sample)) {
    return false;
  }

  const hasKeyPointsLabel =
    /key\s*points\s*(?:extractor|formula\s*extractor|sheet)/i.test(sample) ||
    /topic\s*title/i.test(sample);

  const hasKeyPointsSections =
    /essential\s*definitions/i.test(sample) ||
    /keywords?\s*(?:&|and)?\s*terminolog/i.test(sample) ||
    /must[\s-]*remember\s*facts/i.test(sample) ||
    /frequently\s*asked\s*exam\s*points/i.test(sample) ||
    /mnemonics?\s*(?:&|and)?\s*memory\s*tricks/i.test(sample) ||
    /one[\s-]*minute\s*revision\s*summary/i.test(sample) ||
    /(?:^|\n)\s*#{0,3}\s*3\.\s*Essential Definitions/im.test(sample) ||
    /(?:^|\n)\s*#{0,3}\s*10\.\s*One[\s-]*Minute Revision Summary/im.test(sample);

  const hasStructuredFields =
    /"important_concepts"\s*:/i.test(sample) ||
    /"essential_definitions"\s*:/i.test(sample) ||
    /"one_minute_revision_summary"\s*:/i.test(sample);

  return hasKeyPointsLabel || hasKeyPointsSections || hasStructuredFields;
}
