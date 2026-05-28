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

const MCQ_OPTION_LABEL_RE = /^([A-Da-d])[\).:\-\s]+/;

/** Ensure MCQ choices display as A) B) C) D) (strips duplicate labels first). */
export function formatLabeledMcqOptions(options: string[], maxOptions = 4): string[] {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const texts = options
    .map((o) => cleanText(o))
    .filter(Boolean)
    .map((o) => o.replace(MCQ_OPTION_LABEL_RE, '').trim())
    .filter(Boolean);
  return texts.slice(0, maxOptions).map((text, i) => `${letters[i]}) ${text}`);
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
  let raw: string[] = [];
  if (Array.isArray(value)) {
    raw = value.map(normalizeOption).filter(Boolean);
  } else if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    const ordered: string[] = [];
    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const v =
        row[letter] ??
        row[letter.toLowerCase()] ??
        row[`option_${letter}`] ??
        row[`option_${letter.toLowerCase()}`] ??
        row[`option${letter}`];
      if (v != null && cleanText(v)) ordered.push(cleanText(v));
    }
    if (ordered.length >= 2) {
      raw = ordered;
    } else {
      raw = Object.entries(row)
        .map(([, v]) => cleanText(v))
        .filter(Boolean);
    }
  }
  if (raw.length >= 2) return formatLabeledMcqOptions(raw);
  return raw;
}

function parseMarks(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const maybe = Number.parseFloat(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(maybe) ? maybe : null;
}

function collectOptionsFromRow(row: Record<string, unknown>): string[] {
  const fromArray = normalizeOptions(row.options);
  if (fromArray.length >= 2) return fromArray;
  const loose: string[] = [];
  for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const v =
      row[letter] ??
      row[letter.toLowerCase()] ??
      row[`option_${letter}`] ??
      row[`option_${letter.toLowerCase()}`] ??
      row[`option${letter}`];
    if (v != null && cleanText(v)) loose.push(cleanText(v));
  }
  if (loose.length >= 2) return formatLabeledMcqOptions(loose);
  return fromArray;
}

function normalizeQuestion(value: unknown, idx: number): ExamQuestion {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    questionNumber: cleanText(row.question_number || row.qNo || row.id || `${idx + 1}`),
    question: cleanText(row.question || row.prompt || row.statement || ''),
    options: collectOptionsFromRow(row),
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
  return (
    SECTION_META.some((sec) => pickFirstKey(record, sec.keys) != null) ||
    Boolean(cleanText(record.mock_test_title || record.mockTestTitle)) ||
    Array.isArray(record.sections)
  );
}

function normalizeExam(record: Record<string, unknown>): NormalizedExamPaper {
  const sections = SECTION_META.map((sec) => normalizeSection(record, sec.id, sec.title, sec.keys));
  if (Array.isArray(record.sections) && record.sections.length) {
    for (const sec of record.sections) {
      if (!sec || typeof sec !== 'object') continue;
      const row = sec as Record<string, unknown>;
      const name = cleanText(row.sectionName || row.name || row.title || '').toLowerCase();
      const questions = (Array.isArray(row.questions) ? row.questions : [])
        .map((q, i) => normalizeQuestion(q, i))
        .filter((q) => q.question || q.options.length > 0);
      if (!questions.length) continue;
      const target =
        /^section\s*a|mcq/.test(name)
          ? 'a'
          : /^section\s*b|very\s*short|vsa/.test(name)
            ? 'b'
            : /^section\s*c|short\s*answer/.test(name) && !/very\s*short|vsa/.test(name)
              ? 'c'
              : /^section\s*d|long\s*answer|essay/.test(name)
                ? 'd'
                : /^section\s*e|case|competency/.test(name)
                  ? 'e'
                  : '';
      if (target) {
        const idx = sections.findIndex((s) => s.id === target);
        if (idx >= 0) {
          sections[idx] = {
            ...sections[idx],
            title: cleanText(row.sectionName || row.name || sections[idx].title),
            questions: [...sections[idx].questions, ...questions],
          };
        }
      }
    }
  }
  let mergedSections = sections;
  const questionPaperRaw = record.question_paper ?? record.questionPaper;
  if (typeof questionPaperRaw === 'string' && questionPaperRaw.trim()) {
    mergedSections = mergeExamSections(mergedSections, parseMockTestQuestionPaperBody(questionPaperRaw));
  }

  return {
    paperTitle: cleanText(
      record.mock_test_title || record.mockTestTitle || record.paper_title || record.title || 'Exam Question Paper',
    ),
    instructions: cleanText(record.instructions),
    blueprint: cleanText(record.blueprint || record.design_grid),
    sections: mergedSections,
    internalChoices: cleanText(record.internal_choices),
    answerKey: cleanText(record.answer_key),
    markingScheme: cleanText(record.marking_scheme),
    openEndedRubric: cleanText(record.open_ended_rubric),
  };
}

export function examPaperHasQuestions(paper: NormalizedExamPaper | null): boolean {
  return Boolean(paper?.sections.some((s) => s.questions.length > 0));
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

function parseQuestionBlockLines(
  lines: string[],
  qNo: string,
  qTextStart: string,
): ExamQuestion | null {
  const options: string[] = [];
  let answer = '';
  let marks: number | null = null;
  let internalChoiceGroup = '';
  const questionBody: string[] = qTextStart ? [qTextStart] : [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-D][\).:\-]\s+/i.test(line)) {
      options.push(line.replace(MCQ_OPTION_LABEL_RE, '').trim());
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

  const question = cleanText(questionBody.join(' ').trim());
  if (!question && !options.length) return null;

  return {
    questionNumber: qNo,
    question,
    options: options.length >= 2 ? formatLabeledMcqOptions(options) : options,
    answer,
    marks,
    internalChoiceGroup,
  };
}

function parseQuestionBlock(block: string, fallbackIndex: number): ExamQuestion | null {
  const lines = block
    .split('\n')
    .map((l) => l.replace(/\*\*/g, '').trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const first = lines[0];

  const qMatch = first.match(/^Q(?:uestion)?\s*([A-Za-z0-9]+)[\).:\-]?\s*(.*)$/i);
  if (qMatch) {
    return parseQuestionBlockLines(
      lines,
      cleanText(qMatch[1] || `${fallbackIndex + 1}`),
      cleanText(qMatch[2]),
    );
  }

  const numMatch = first.match(/^(\d+)[\).:\-]\s*(.*)$/);
  if (numMatch) {
    return parseQuestionBlockLines(lines, cleanText(numMatch[1]), cleanText(numMatch[2]));
  }

  return null;
}

function splitQuestionBlocks(cleaned: string, pattern: RegExp): string[] {
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  while ((m = re.exec(cleaned)) !== null) {
    const label = m[2] || m[1];
    const idx = m.index + m[0].indexOf(label);
    starts.push(idx);
  }
  if (!starts.length) return [];
  const blocks: string[] = [];
  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : cleaned.length;
    blocks.push(cleaned.slice(start, end).trim());
  }
  return blocks;
}

function parseQuestionsFromSectionText(sectionBody: string): ExamQuestion[] {
  const cleaned = cleanText(sectionBody).replace(/\*\*/g, '');
  if (!cleaned) return [];

  const qBlocks = splitQuestionBlocks(cleaned, /(^|\n)\s*(Q(?:uestion)?\s*[A-Za-z0-9]+[\).:\-]?)/i);
  if (qBlocks.length) {
    return qBlocks
      .map((block, i) => parseQuestionBlock(block, i))
      .filter((q): q is ExamQuestion => q != null);
  }

  const numBlocks = splitQuestionBlocks(cleaned, /(^|\n)\s*(\d+[\).:\-]\s+)/);
  return numBlocks
    .map((block, i) => parseQuestionBlock(block, i))
    .filter((q): q is ExamQuestion => q != null);
}

function sectionIdFromHeading(heading: string): string {
  const h = heading.toLowerCase();
  if (/section\s*a\b|\bmcq|multiple\s*choice/.test(h)) return 'a';
  if (/section\s*b\b|very\s*short|vsa/.test(h)) return 'b';
  if (/section\s*c\b|short\s*answer/.test(h) && !/very\s*short|vsa/.test(h)) return 'c';
  if (/section\s*d\b|long\s*answer|essay/.test(h)) return 'd';
  if (/section\s*e\b|case|competency|competence/.test(h)) return 'e';
  return '';
}

/** Parse mock-test Section 6 body (### Section A… + Q1 / 1. numbered items). */
export function parseMockTestQuestionPaperBody(body: string): ExamSection[] {
  const sections = SECTION_META.map((m) => getSectionById(m.id));
  const text = cleanText(body).replace(/\*\*/g, '');
  if (!text) return sections;

  const subChunks = text
    .split(/(?=(?:^|\n)\s*#{2,4}\s*Section\s*[A-E])/gim)
    .map((c) => c.trim())
    .filter(Boolean);
  let assigned = false;

  for (const chunk of subChunks) {
    const headerLine = chunk.split('\n').find((l) => /section\s*[a-e]/i.test(l)) || '';
    const sectionId = sectionIdFromHeading(headerLine);
    const questions = parseQuestionsFromSectionText(chunk);
    if (!questions.length) continue;
    assigned = true;
    const idx = sections.findIndex((s) => s.id === (sectionId || 'a'));
    const target = idx >= 0 ? idx : 0;
    sections[target] = {
      ...sections[target],
      title: headerLine.replace(/^#{1,3}\s*/, '').trim() || sections[target].title,
      questions: [...sections[target].questions, ...questions],
    };
  }

  if (!assigned) {
    const all = parseQuestionsFromSectionText(text);
    if (all.length) {
      sections[0] = { ...sections[0], questions: all };
    }
  }

  return sections;
}

function collectNumberedMarkdownSections(markdown: string): {
  headingMap: Record<number, string>;
  bodies: Map<number, string>;
} {
  const lines = String(markdown || '').split('\n');
  const numberedSections = new Map<number, string[]>();
  const headingMap: Record<number, string> = {};
  let currentSection = 0;

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

  const bodies = new Map<number, string>();
  for (const [num, body] of numberedSections.entries()) {
    bodies.set(num, cleanText(body.join('\n')));
  }
  return { headingMap, bodies };
}

/** 12-section mock test markdown → exam sections (section 6 = question paper). */
export function parseMockTestMarkdown(markdown: string): NormalizedExamPaper | null {
  const { headingMap, bodies } = collectNumberedMarkdownSections(markdown);
  const isMock =
    /question\s*paper/i.test(headingMap[6] || '') ||
    /mock\s*test/i.test(headingMap[1] || '') ||
    Boolean(bodies.get(6)?.trim());
  if (!isMock) return null;

  const questionSections = parseMockTestQuestionPaperBody(bodies.get(6) || '');
  const hasQuestions = questionSections.some((s) => s.questions.length > 0);
  if (!hasQuestions) return null;

  const legacy13 =
    bodies.has(13) || /self[\s-]*analysis|performance\s+self/i.test(headingMap[9] || '');
  const reflectionN = legacy13 ? 13 : 12;

  return {
    paperTitle: cleanText(bodies.get(1) || headingMap[1] || 'Mock Test'),
    instructions: cleanText(bodies.get(5) || ''),
    blueprint: '',
    sections: questionSections,
    internalChoices: '',
    answerKey: cleanText(bodies.get(7) || ''),
    markingScheme: '',
    openEndedRubric: cleanText(bodies.get(reflectionN) || ''),
  };
}

function mergeExamSections(base: ExamSection[], extra: ExamSection[]): ExamSection[] {
  return base.map((sec) => {
    const add = extra.find((e) => e.id === sec.id);
    if (!add?.questions.length) return sec;
    return {
      ...sec,
      title: sec.questions.length ? sec.title : add.title || sec.title,
      questions: sec.questions.length ? sec.questions : add.questions,
    };
  });
}

export function mergeExamPapers(
  base: NormalizedExamPaper | null,
  extra: NormalizedExamPaper | null,
): NormalizedExamPaper | null {
  if (!extra) return base;
  if (!base) return extra;
  return {
    ...base,
    paperTitle: base.paperTitle || extra.paperTitle,
    instructions: base.instructions || extra.instructions,
    blueprint: base.blueprint || extra.blueprint,
    sections: mergeExamSections(base.sections, extra.sections),
    internalChoices: base.internalChoices || extra.internalChoices,
    answerKey: base.answerKey || extra.answerKey,
    markingScheme: base.markingScheme || extra.markingScheme,
    openEndedRubric: base.openEndedRubric || extra.openEndedRubric,
  };
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

  let paper: NormalizedExamPaper | null = null;
  for (const candidate of candidates) {
    if (!isLikelyExamRecord(candidate)) continue;
    const normalized = normalizeExam(candidate);
    if (examPaperHasVisibleContent(normalized)) {
      paper = mergeExamPapers(paper, normalized);
    }
  }

  const markdown = String(content || '').trim();
  const mockPaper = parseMockTestMarkdown(markdown);
  if (mockPaper) {
    paper = mergeExamPapers(paper, mockPaper);
  }

  if (!examPaperHasQuestions(paper)) {
    const parsedFromMarkdown = parseMarkdownExam(markdown);
    if (parsedFromMarkdown) {
      paper = mergeExamPapers(paper, parsedFromMarkdown);
    }
  }

  if (paper && examPaperHasVisibleContent(paper)) {
    return { paper, markdownFallback: null };
  }
  return { paper: null, markdownFallback: markdown || null };
}

