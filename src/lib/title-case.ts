/**
 * Acronyms that must keep their own casing, keyed by their UPPERCASE form
 * because that is what the lookup normalises to.
 *
 * The previous version stored mixed-case entries like 'MCQs' in a Set and then
 * looked up `bare.toUpperCase()` — 'MCQS' never matched 'MCQs', so the very
 * acronyms this list existed to protect were title-cased into "Mcqs". VSAQ,
 * SAQ and LAQ were missing entirely, which is why every AI tool form showed
 * "Mcqs / Vsaqs / Saqs / Laqs".
 */
const ACRONYM_DISPLAY = new Map<string, string>([
  ['MCQ', 'MCQ'],
  ['MCQS', 'MCQs'],
  ['VSAQ', 'VSAQ'],
  ['VSAQS', 'VSAQs'],
  ['SAQ', 'SAQ'],
  ['SAQS', 'SAQs'],
  ['LAQ', 'LAQ'],
  ['LAQS', 'LAQs'],
  ['HOTS', 'HOTS'],
  ['NCERT', 'NCERT'],
  ['IIT', 'IIT'],
  ['NEET', 'NEET'],
  ['CBSE', 'CBSE'],
  ['ICSE', 'ICSE'],
  ['SSC', 'SSC'],
  ['NEP', 'NEP'],
  ['NCF', 'NCF'],
  ['AI', 'AI'],
  ['V2', 'V2'],
  ['PDF', 'PDF'],
  ['PDFS', 'PDFs'],
  ['DOCX', 'DOCX'],
  ['CSV', 'CSV'],
  ['URL', 'URL'],
  ['ASLI', 'ASLI'],
  ['OCR', 'OCR'],
  ['RAG', 'RAG'],
  ['QA', 'Q&A'],
  ['FAQ', 'FAQ'],
  ['FAQS', 'FAQs'],
  ['UI', 'UI'],
  ['API', 'API'],
  ['ID', 'ID'],
  ['IDS', 'IDs'],
  ['OTP', 'OTP'],
  ['SMS', 'SMS'],
]);

function titleCaseToken(token: string): string {
  if (!token) return token;
  if (/^\d+$/.test(token)) return token;

  const bare = token.replace(/[^\w'-]/g, '');
  const display = ACRONYM_DISPLAY.get(bare.toUpperCase());
  if (display) return token.replace(bare, display);

  // Already an all-caps acronym we don't know — leave it alone.
  if (/^[A-Z0-9]{2,}$/.test(bare)) return token;

  const match = token.match(/^([^A-Za-z0-9]*)([A-Za-z0-9][A-Za-z0-9'/-]*)([^A-Za-z0-9]*)$/);
  if (!match) return token;
  const [, pre, core, post] = match;

  // Capitalize the first letter of every word (product-wide Title Case rule).
  const cased = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
  return `${pre}${cased}${post}`;
}

/** Title Case each word (e.g. "learning objectives" → "Learning Objectives"). */
export function toTitleCaseWords(value: string): string {
  return formatAiToolText(value);
}

/** Standard label / heading formatter for all AI tool surfaces. */
export function formatAiToolText(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/https?:\/\//i.test(raw)) return raw;
  if (raw.includes('\n')) {
    return raw
      .split('\n')
      .map((line) => formatAiToolText(line))
      .join('\n');
  }
  const words = raw.split(/\s+/).filter(Boolean);
  return words.map((token) => titleCaseToken(token)).join(' ');
}
