/**
 * Normalize exam question/option text for display: fix common mojibake and
 * lossy CSV damage (Excel ANSI export turns θ → ?, √ sometimes appears as "v3/2").
 */

const MOJIBAKE: Record<string, string> = {
  'âˆš': '√',
  'â‰¥': '≥',
  'â‰¤': '≤',
  'â‰ ': '≠',
  'âˆž': '∞',
  'âˆ†': '∆',
  'â€²': "'",
  'â€³': '"',
  'â€“': '-',
  'â€”': '-',
  'â€˜': "'",
  'â€™': "'",
  'â€œ': '"',
  'â€�': '"',
  'Â°': '°',
};

/** Recover √ and θ lost in lossy CSV / manual entry (aligned with ASLI-STUD-BACK/utils/csv-encoding.js). */
export function repairLossyMathSymbols(text: string): string {
  let s = text;
  // Square root written as "v" + fraction (e.g. v3/2) or v(n)
  s = s.replace(/\bv(\d+)\/(\d+)/g, '√$1/$2');
  s = s.replace(/\bv\((\d+)\)/g, '√($1)');
  // θ lost as "?" after sin², tan², etc. (no space before ?)
  s = s.replace(/(?<![A-Za-z])(sin|cos|tan|cot|sec|cosec|csc)([²³\u00B2\u00B3])\?/gi, '$1$2 θ');
  s = s.replace(/\band\s+\?\s+is\s+(acute|obtuse|right)\b/gi, 'and θ is $1');
  s = s.replace(/(?<![A-Za-z])(sin|cos|tan|cot|sec|cosec|csc)\s*\?/gi, '$1 θ');
  // Legacy: ? before exponent digits (narrow use)
  s = s.replace(/\?\s*(\^?\d+)/g, 'θ$1');
  return s;
}

export function normalizeExamDisplayText(value: unknown): string {
  if (value === undefined || value === null) return '';
  let text = String(value);

  if (typeof window !== 'undefined' && text.includes('&')) {
    const parser = document.createElement('textarea');
    parser.innerHTML = text;
    text = parser.value || text;
  }

  Object.entries(MOJIBAKE).forEach(([from, to]) => {
    text = text.split(from).join(to);
  });

  text = repairLossyMathSymbols(text);

  const monthToNumber: Record<string, string> = {
    jan: '1',
    feb: '2',
    mar: '3',
    apr: '4',
    may: '5',
    jun: '6',
    jul: '7',
    aug: '8',
    sep: '9',
    oct: '10',
    nov: '11',
    dec: '12',
  };
  text = text.replace(
    /^(\d{1,2})\s*-\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i,
    (_m, day, mon) => `${String(day)}-${monthToNumber[String(mon).toLowerCase()] || mon}`
  );

  text = text
    .replace(/(^|[\s,(=])\?(?=\d)/g, '$1-')
    .replace(/(^|[\s,(=])\uFFFD(?=\d)/g, '$1-');

  text = text.replace(/[\uFFFD]/g, '?');
  text = text.replace(/\s{2,}/g, ' ').trim();

  return text;
}

/** Unicode subscripts for chemistry formulas (aligned with super-admin exam-management). */
const SUBSCRIPT_DIGITS: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
};

/**
 * Render ASCII digit runs after letters as subscripts (e.g. XH5 → XH₅, H2O → H₂O).
 * Only runs for chemistry so maths expressions like x2 are unchanged.
 * Idempotent if subscripts are already Unicode (\\d+ only matches ASCII digits).
 */
export function formatChemistryDisplayText(text: string, subject?: string): string {
  const s = text === null || text === undefined ? '' : String(text);
  if (String(subject || '').trim().toLowerCase() !== 'chemistry') return s;
  return s.replace(/([A-Za-z\)])(\d+)/g, (_match, prefix: string, digits: string) => {
    const subscript = digits
      .split('')
      .map((digit) => SUBSCRIPT_DIGITS[digit] ?? digit)
      .join('');
    return `${prefix}${subscript}`;
  });
}

/** Full student-facing pipeline: mojibake/math repair + chemistry subscripts when applicable. */
export function normalizeAndFormatExamDisplayText(value: unknown, subject?: string): string {
  return formatChemistryDisplayText(normalizeExamDisplayText(value), subject);
}
