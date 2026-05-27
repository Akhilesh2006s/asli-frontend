export type ExamQuestion = {
  questionNumber: string;
  question: string;
  options: string[];
  answer: string;
  marks: number | null;
  internalChoiceGroup: string;
};

export type ExamSection = {
  id: string;
  title: string;
  questions: ExamQuestion[];
};

export type NormalizedExamPaper = {
  paperTitle: string;
  instructions: string;
  blueprint: string;
  sections: ExamSection[];
  internalChoices: string;
  answerKey: string;
  markingScheme: string;
  openEndedRubric: string;
};

export type ResolvedExamPaper = {
  paper: NormalizedExamPaper | null;
  markdownFallback: string | null;
};

const SECTION_META: Array<{ id: string; title: string; keys: string[] }> = [
  { id: 'a', title: 'Section A - MCQs', keys: ['section_a', 'sectionA'] },
  { id: 'b', title: 'Section B - Very Short Answer', keys: ['section_b', 'sectionB'] },
  { id: 'c', title: 'Section C - Short Answer', keys: ['section_c', 'sectionC'] },
  { id: 'd', title: 'Section D - Long Answer', keys: ['section_d', 'sectionD'] },
  { id: 'e', title: 'Section E - Case-based / Competency', keys: ['section_e', 'sectionE'] },
];

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function normalizeOption(input: unknown): string {
  if (typeof input === 'string') return cleanText(input);
  if (input && typeof input === 'object') {
    const row = input as Record<string, unknown>;
    const key = cleanText(row.key || row.label || row.option || '');
    const value = cleanText(row.value || row.text || row.optionText || '');
    if (key && value) return `${key}. ${value}`;
    return key || value;
  }
  return '';
}

function normalizeOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(normalizeOption).filter(Boolean);
  }
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.entries(row)
      .map(([k, v]) => `${k}. ${cleanText(v)}`.trim())
      .filter((x) => x !== '.');
  }
  return [];
}

function parseMarks(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const maybe = Number.parseFloat(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(maybe) ? maybe : null;
}

function normalizeQuestion(value: unknown, idx: number): ExamQuestion {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    questionNumber: cleanText(row.question_number || row.qNo || row.id || `${idx + 1}`),
    question: cleanText(row.question || row.prompt || row.statement || ''),
    options: normalizeOptions(row.options),
    answer: cleanText(row.answer || row.correct_answer || row.answer_key || ''),
    marks: parseMarks(row.marks),
    internalChoiceGroup: cleanText(row.internal_choice_group || row.internalChoiceGroup || ''),
  };
}

function pickFirstKey(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] != null) return record[key];
  }
  return undefined;
}

function normalizeSection(record: Record<string, unknown>, id: string, title: string, keys: string[]): ExamSection {
  const raw = pickFirstKey(record, keys);
  const list = Array.isArray(raw) ? raw : [];
  return {
    id,
    title,
    questions: list.map((q, i) => normalizeQuestion(q, i)).filter((q) => q.question || q.options.length > 0),
  };
}

function isLikelyExamRecord(record: Record<string, unknown>): boolean {
  return SECTION_META.some((sec) => pickFirstKey(record, sec.keys) != null);
}

function normalizeExam(record: Record<string, unknown>): NormalizedExamPaper {
  const sections = SECTION_META.map((sec) => normalizeSection(record, sec.id, sec.title, sec.keys));
  return {
    paperTitle: cleanText(record.paper_title || record.title || 'Exam Question Paper'),
    instructions: cleanText(record.instructions),
    blueprint: cleanText(record.blueprint || record.design_grid),
    sections,
    internalChoices: cleanText(record.internal_choices),
    answerKey: cleanText(record.answer_key),
    markingScheme: cleanText(record.marking_scheme),
    openEndedRubric: cleanText(record.open_ended_rubric),
  };
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getSectionById(id: string): ExamSection {
  const meta = SECTION_META.find((s) => s.id === id);
  return { id, title: meta?.title || `Section ${id.toUpperCase()}`, questions: [] };
}

function parseQuestionBlock(block: string, fallbackIndex: number): ExamQuestion | null {
  const lines = block
    .split('\n')
    .map((l) => l.replace(/\*\*/g, '').trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const first = lines[0];
  const qMatch = first.match(/^Q(?:uestion)?\s*([A-Za-z0-9]+)[\).:\-]?\s*(.*)$/i);
  if (!qMatch) return null;
  const qNo = cleanText(qMatch[1] || `${fallbackIndex + 1}`);
  const qTextStart = cleanText(qMatch[2]);

  const options: string[] = [];
  let answer = '';
  let marks: number | null = null;
  let internalChoiceGroup = '';
  const questionBody: string[] = qTextStart ? [qTextStart] : [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-D][\).:\-]\s+/i.test(line)) {
      options.push(line);
      continue;
    }
    if (/^Answer\s*:/i.test(line)) {
      answer = cleanText(line.replace(/^Answer\s*:/i, ''));
      continue;
    }
    if (/^Marks?\s*:/i.test(line)) {
      marks = parseMarks(line);
      continue;
    }
    if (/^Internal\s*Choice/i.test(line)) {
      internalChoiceGroup = cleanText(line.replace(/^Internal\s*Choice\s*:?/i, ''));
      continue;
    }
    questionBody.push(line);
  }

  return {
    questionNumber: qNo,
    question: cleanText(questionBody.join(' ').trim()),
    options,
    answer,
    marks,
    internalChoiceGroup,
  };
}

function parseQuestionsFromSectionText(sectionBody: string): ExamQuestion[] {
  const cleaned = cleanText(sectionBody).replace(/\*\*/g, '');
  if (!cleaned) return [];

  const qStarts: Array<{ idx: number; label: string }> = [];
  const qRegex = /(^|\n)\s*(Q(?:uestion)?\s*[A-Za-z0-9]+[\).:\-]?)/gi;
  let m: RegExpExecArray | null;
  while ((m = qRegex.exec(cleaned)) !== null) {
    const full = m[0];
    const label = m[2];
    const idx = m.index + full.indexOf(label);
    qStarts.push({ idx, label });
  }

  if (!qStarts.length) {
    return [];
  }

  const questions: ExamQuestion[] = [];
  for (let i = 0; i < qStarts.length; i += 1) {
    const start = qStarts[i].idx;
    const end = i + 1 < qStarts.length ? qStarts[i + 1].idx : cleaned.length;
    const block = cleaned.slice(start, end).trim();
    const q = parseQuestionBlock(block, i);
    if (q) questions.push(q);
  }
  return questions;
}

function parseMarkdownExam(markdown: string): NormalizedExamPaper | null {
  const lines = String(markdown || '').split('\n');
  const numberedSections = new Map<number, string[]>();
  let currentSection = 0;
  const headingMap: Record<number, string> = {};

  for (const raw of lines) {
    const line = raw.trim();
    const secMatch = line.match(/^(?:#{1,3}\s*)?(\d{1,2})\.\s*(.+)$/);
    if (secMatch) {
      currentSection = Number(secMatch[1]);
      headingMap[currentSection] = cleanText(secMatch[2]);
      if (!numberedSections.has(currentSection)) numberedSections.set(currentSection, []);
      continue;
    }
    if (currentSection > 0 && numberedSections.has(currentSection)) {
      numberedSections.get(currentSection)!.push(raw);
    }
  }

  const sec1 = cleanText((numberedSections.get(1) || []).join('\n'));
  const sec2 = cleanText((numberedSections.get(2) || []).join('\n'));
  const sec8 = cleanText((numberedSections.get(8) || []).join('\n'));
  const sec9 = cleanText((numberedSections.get(9) || []).join('\n'));
  const sec10 = cleanText((numberedSections.get(10) || []).join('\n'));
  const sec11 = cleanText((numberedSections.get(11) || []).join('\n'));
  const titleFromTop = cleanText(String(lines.find((l) => l.trim() && !/^\d+\./.test(l.trim())) || ''));

  const paper: NormalizedExamPaper = {
    paperTitle: titleFromTop || 'Exam Question Paper',
    instructions: sec1,
    blueprint: sec2,
    sections: SECTION_META.map((m) => getSectionById(m.id)),
    internalChoices: sec8,
    answerKey: sec9,
    markingScheme: sec10,
    openEndedRubric: sec11,
  };

  for (let i = 0; i < SECTION_META.length; i += 1) {
    const blockNum = i + 3; // numbered headings: 3..7 map to Section A..E
    const sectionBody = cleanText((numberedSections.get(blockNum) || []).join('\n'));
    const parsedQuestions = parseQuestionsFromSectionText(sectionBody);
    if (parsedQuestions.length) {
      paper.sections[i].questions = parsedQuestions;
    }
    const heading = headingMap[blockNum];
    if (heading) {
      paper.sections[i].title = heading;
    }
  }

  if (!examPaperHasVisibleContent(paper)) return null;
  return paper;
}

function extractObjectCandidates(payload: unknown): Record<string, unknown>[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (obj.raw && typeof obj.raw === 'object') {
      return extractObjectCandidates(obj.raw);
    }
    if (Array.isArray(obj.items)) return extractObjectCandidates(obj.items);
    return [obj];
  }
  return [];
}

export function examPaperHasVisibleContent(paper: NormalizedExamPaper | null): boolean {
  if (!paper) return false;
  const hasSections = paper.sections.some((s) => s.questions.length > 0);
  return Boolean(
    hasSections ||
      paper.instructions ||
      paper.blueprint ||
      paper.answerKey ||
      paper.markingScheme ||
      paper.openEndedRubric,
  );
}

export function resolveExamPaperFromPayload(content: string, rawContent?: unknown): ResolvedExamPaper {
  const candidates: Record<string, unknown>[] = [];
  candidates.push(...extractObjectCandidates(rawContent));

  const parsed = tryParseJson(String(content || '').trim());
  candidates.push(...extractObjectCandidates(parsed));

  for (const candidate of candidates) {
    if (!isLikelyExamRecord(candidate)) continue;
    const paper = normalizeExam(candidate);
    if (examPaperHasVisibleContent(paper)) {
      return { paper, markdownFallback: null };
    }
  }

  const markdown = String(content || '').trim();
  const parsedFromMarkdown = parseMarkdownExam(markdown);
  if (parsedFromMarkdown) {
    return { paper: parsedFromMarkdown, markdownFallback: null };
  }
  return { paper: null, markdownFallback: markdown || null };
}

