export type ExamAnswerOption = string | { text?: string; label?: string; _id?: string };

export function extractExamAnswerText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (typeof value === 'object') {
    const obj = value as { text?: string; label?: string; value?: string; _id?: string };
    return String(obj.text ?? obj.label ?? obj.value ?? obj._id ?? '').trim();
  }
  return String(value).trim();
}

export function examOptionsAsText(options: ExamAnswerOption[] | undefined): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((opt) => extractExamAnswerText(opt)).filter(Boolean);
}

/**
 * Resolve a stored answer token against option texts.
 * Prefer matching option text before treating numbers as 1-based indices
 * (e.g. correctAnswer "4" with options 2,3,4,5 must resolve to "4", not option D).
 */
export function resolveAnswerAgainstOptions(rawAnswer: unknown, options: string[]): string {
  const raw = extractExamAnswerText(rawAnswer);
  if (!raw || !Array.isArray(options) || options.length === 0) return raw;

  const byText = options.find((o) => o.trim().toLowerCase() === raw.toLowerCase());
  if (byText) return byText.trim();

  const letter = raw.replace(/^[(\[]?\s*/, '').replace(/[)\].:\s].*$/, '').trim();
  if (/^[a-dA-D]$/.test(letter)) {
    const idx = letter.toLowerCase().charCodeAt(0) - 97;
    if (idx >= 0 && idx < options.length && options[idx]?.trim()) {
      return options[idx].trim();
    }
  }

  if (/^\d+$/.test(raw)) {
    const idx = parseInt(raw, 10);
    if (idx >= 0 && idx < options.length && options[idx]?.trim()) return options[idx].trim();
    if (idx >= 1 && idx <= options.length && options[idx - 1]?.trim()) {
      return options[idx - 1].trim();
    }
  }

  return raw;
}

export function resolveAnswerTokenForQuestion(
  question: { questionType?: string; options?: ExamAnswerOption[] },
  value: unknown,
): string {
  const raw = extractExamAnswerText(value);
  if (!raw) return '';

  const rawNorm = raw.toLowerCase();
  if (question?.questionType === 'integer') return rawNorm;

  const options = Array.isArray(question?.options) ? question.options : [];
  const optionMeta = options.map((opt, index) => {
    const text = extractExamAnswerText(opt);
    return {
      index,
      letter: String.fromCharCode(65 + index),
      text,
      textNorm: text.toLowerCase(),
      id: String(typeof opt === 'object' && opt !== null ? opt._id || '' : '').trim(),
    };
  });

  if (!optionMeta.length) return rawNorm;

  const byText = optionMeta.find((o) => o.textNorm && o.textNorm === rawNorm);
  if (byText) return byText.textNorm;

  const byId = optionMeta.find((o) => o.id && o.id === raw);
  if (byId) return byId.textNorm;

  if (/^[a-z]$/i.test(rawNorm)) {
    const byLetter = optionMeta.find((o) => o.letter.toLowerCase() === rawNorm);
    if (byLetter) return byLetter.textNorm;
  }

  const optionMatch = rawNorm.match(/^option\s*([a-z0-9])$/);
  if (optionMatch) {
    const token = optionMatch[1];
    if (/^\d$/.test(token)) {
      const n = parseInt(token, 10);
      if (n >= 1 && n <= optionMeta.length) return optionMeta[n - 1].textNorm;
      if (n >= 0 && n < optionMeta.length) return optionMeta[n].textNorm;
    }
    if (/^[a-z]$/.test(token)) {
      const byLetter = optionMeta.find((o) => o.letter.toLowerCase() === token);
      if (byLetter) return byLetter.textNorm;
    }
  }

  if (/^-?\d+$/.test(rawNorm)) {
    const n = parseInt(rawNorm, 10);
    if (n >= 0 && n < optionMeta.length) return optionMeta[n].textNorm;
    if (n >= 1 && n <= optionMeta.length) return optionMeta[n - 1].textNorm;
  }

  return rawNorm;
}

export function resolveAnswerListForQuestion(
  question: { questionType?: string; options?: ExamAnswerOption[] },
  value: unknown,
): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list.map((item) => resolveAnswerTokenForQuestion(question, item)).filter(Boolean);
}
