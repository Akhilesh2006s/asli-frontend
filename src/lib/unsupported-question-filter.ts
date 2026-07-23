/**
 * Drop question types that cannot render correctly.
 * Diagrams OK with image payload; Match OK with matchPairs.
 */

import {
  isMatchQuestionType,
  isMatchStemText,
  questionHasMatchPayload,
} from '@/lib/match-following';

const IMAGE_STEM_RE =
  /\b(?:refer(?:\s+to)?|see|look\s+at|observe|study|based\s+on|as\s+shown\s+in|given\s+in|shown\s+in|in)\s+(?:the\s+)?(?:following\s+)?(?:figure|fig\.?|image|diagram|picture|illustration|photograph|photo|drawing|sketch)\b/i;

const IMAGE_STEM_RE_2 =
  /\b(?:figure|fig\.?|image|diagram|picture|illustration)\s+(?:above|below|given|provided|shows?|depicts?)\b/i;

const IMAGE_STEM_RE_3 =
  /\b(?:label\s+(?:the\s+)?(?:figure|diagram|image|parts?\s+of)|draw\s+(?:a\s+)?(?:labelled\s+)?diagram|complete\s+the\s+(?:figure|diagram)|identify\s+(?:the\s+)?(?:parts?\s+)?(?:in|from)\s+(?:the\s+)?(?:figure|diagram|image))\b/i;

export function isImageStemQuestion(text: string): boolean {
  const q = String(text || '').trim();
  if (!q) return false;
  return IMAGE_STEM_RE.test(q) || IMAGE_STEM_RE_2.test(q) || IMAGE_STEM_RE_3.test(q);
}

function questionHasDiagramPayload(entry: Record<string, unknown>): boolean {
  if (String(entry.imageUrl || entry.image_url || entry.questionImage || '').trim()) return true;
  if (String(entry.imagePrompt || entry.image_prompt || entry.figurePrompt || '').trim()) return true;
  const flag = entry.needsDiagram ?? entry.needs_diagram ?? entry.needsFigure;
  if (flag === true || flag === 1) return true;
  const s = String(flag || '')
    .trim()
    .toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

export function isUnsupportedQuestionStem(
  text: string,
  type = '',
  opts: {
    allowDiagrams?: boolean;
    hasImage?: boolean;
    allowMatch?: boolean;
    hasMatch?: boolean;
  } = {},
): boolean {
  const q = String(text || '').trim();
  const allowMatch = opts.allowMatch === true || opts.hasMatch === true || opts.allowMatch !== false;

  if (isMatchQuestionType(type) || isMatchStemText(q)) {
    return !allowMatch;
  }

  const allowDiagrams =
    opts.allowDiagrams === true || opts.hasImage === true || opts.allowDiagrams !== false;

  if (!q) return false;
  if (isImageStemQuestion(q)) return !allowDiagrams;
  return false;
}

export function filterUnsupportedQuestions<T extends Record<string, unknown> | string>(
  questions: T[] = [],
  opts: { allowDiagrams?: boolean; allowMatch?: boolean } = {},
): T[] {
  if (!Array.isArray(questions)) return [];
  return questions.filter((entry) => {
    if (typeof entry === 'string') return !isUnsupportedQuestionStem(entry, '', opts);
    if (!entry || typeof entry !== 'object') return false;
    const text = String(
      (entry as any).question ||
        (entry as any).question_text ||
        (entry as any).questionText ||
        (entry as any).prompt ||
        (entry as any).text ||
        '',
    ).trim();
    const type = String(
      (entry as any).type || (entry as any).question_type || (entry as any).questionType || '',
    ).trim();
    const hasImage = questionHasDiagramPayload(entry as Record<string, unknown>);
    const hasMatch = questionHasMatchPayload(entry as Record<string, unknown>);
    if ((isMatchQuestionType(type) || isMatchStemText(text)) && !hasMatch) return false;
    return !isUnsupportedQuestionStem(text, type, { ...opts, hasImage, hasMatch });
  });
}
