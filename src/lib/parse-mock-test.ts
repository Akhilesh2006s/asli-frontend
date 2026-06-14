import {
  examPaperHasQuestions,
  mergeExamPapers,
  parseMockTestMarkdown,
  parseMockTestQuestionPaperBody,
  resolveExamPaperFromPayload,
  type NormalizedExamPaper,
} from '@/lib/parse-exam-question-paper';
import {
  synthesizeAnswerKeyFromSections,
  synthesizeSolutionsFromSections,
} from '@/lib/mock-test-tables';
import { viewerPayloadFromRecord } from '@/lib/resolve-ai-structured-content';
import type { ExamQuestion, ExamSection } from '@/lib/parse-exam-question-paper';

export type MockTestMeta = {
  title: string;
  testPurpose: string;
  learningObjectives: string[];
  ncfAlignment: string;
  instructions: string;
  answerKey: string;
  solutions: string;
  remedial: string[];
  outcomes: string[];
  realLife: string;
  reflection: string;
};

export type ResolvedMockTest = {
  meta: MockTestMeta;
  paper: NormalizedExamPaper | null;
  markdownFallback: string | null;
};

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

/** Strings, string arrays, or simple objects from structuredContent → display text. */
function coerceToMarkdownText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return cleanText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return cleanText(String(value));
  if (Array.isArray(value)) {
    return value
      .map((row) => coerceToMarkdownText(row))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof value === 'object') {
    const row = value as Record<string, unknown>;
    if (Array.isArray(row.lines)) return coerceToMarkdownText(row.lines);
    if (typeof row.text === 'string') return cleanText(row.text);
    if (typeof row.content === 'string') return cleanText(row.content);
    return Object.entries(row)
      .map(([key, val]) => {
        const body = coerceToMarkdownText(val);
        return body ? `${key}: ${body}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return cleanText(value);
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => cleanText(v)).filter(Boolean);
  const s = cleanText(value);
  if (!s) return [];
  return s
    .split(/\n|;/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean);
}

function pickStr(sources: Record<string, unknown>[], ...keys: string[]): string {
  for (const src of sources) {
    for (const k of keys) {
      const v = src[k];
      const text = coerceToMarkdownText(v);
      if (text) return text;
    }
  }
  return '';
}

function pickList(sources: Record<string, unknown>[], ...keys: string[]): string[] {
  for (const src of sources) {
    for (const k of keys) {
      const rows = toList(src[k]);
      if (rows.length) return rows;
    }
  }
  return [];
}

function extractStructuredSources(rawContent?: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const push = (v: unknown) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(v as Record<string, unknown>);
  };
  push(rawContent);
  if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
    const r = rawContent as Record<string, unknown>;
    push(r.metadata);
    if (r.metadata && typeof r.metadata === 'object') {
      push((r.metadata as Record<string, unknown>).structuredContent);
    }
    push(r.structuredContent);
    push(r.renderContent);
    if (r.raw && typeof r.raw === 'object') push(r.raw);
  }
  return out;
}

const MOCK_SECTION_TITLE_HINT =
  /^(mock test title|test purpose|learning objectives|ncf|instructions|question paper|answer key|step-by-step|remedial|expected learning|real[-\s]?life|reflection)/i;

export function parseNumberedMarkdownSections(markdown: string): Map<number, string> {
  const lines = String(markdown || '').split('\n');
  const sections = new Map<number, string[]>();
  let current = 0;

  for (const raw of lines) {
    const line = raw.trim();
    const mdHeading = line.match(/^#{1,3}\s*(\d{1,2})\.\s*(.+)$/);
    const plainHeading = !mdHeading ? line.match(/^(\d{1,2})\.\s+(.+)$/) : null;
    const isSectionBreak =
      mdHeading != null ||
      (plainHeading != null && MOCK_SECTION_TITLE_HINT.test(plainHeading[2].replace(/\*\*/g, '').trim()));

    if (isSectionBreak) {
      const match = mdHeading || plainHeading!;
      current = Number(match[1]);
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current > 0) {
      if (!sections.has(current)) sections.set(current, []);
      sections.get(current)!.push(raw);
    }
  }

  const result = new Map<number, string>();
  for (const [num, body] of sections.entries()) {
    result.set(num, cleanText(body.join('\n')));
  }
  return result;
}

/** Older mock tests used section 9 for self-analysis; sections 10–13 map to 9–12 now. */
function mockTestUsesLegacy13Sections(numbered: Map<number, string>): boolean {
  if (numbered.has(13)) return true;
  const sec9 = numbered.get(9) || '';
  return /self[\s-]*analysis|performance\s+self/i.test(sec9) || (sec9.includes('|') && /marks\s+obtained/i.test(sec9));
}

function metaFromMarkdown(markdown: string, paper: NormalizedExamPaper | null): Partial<MockTestMeta> {
  const numbered = parseNumberedMarkdownSections(markdown);
  const legacy = mockTestUsesLegacy13Sections(numbered);
  const remedialN = legacy ? 10 : 9;
  const outcomesN = legacy ? 11 : 10;
  const realLifeN = legacy ? 12 : 11;
  const reflectionN = legacy ? 13 : 12;

  return {
    title: cleanText(numbered.get(1) || paper?.paperTitle || ''),
    testPurpose: cleanText(numbered.get(2) || ''),
    learningObjectives: toList(numbered.get(3) || ''),
    ncfAlignment: cleanText(numbered.get(4) || ''),
    instructions: cleanText(numbered.get(5) || paper?.instructions || ''),
    answerKey: cleanText(numbered.get(7) || paper?.answerKey || ''),
    solutions: cleanText(numbered.get(8) || ''),
    remedial: toList(numbered.get(remedialN) || ''),
    outcomes: toList(numbered.get(outcomesN) || ''),
    realLife: cleanText(numbered.get(realLifeN) || ''),
    reflection: cleanText(numbered.get(reflectionN) || ''),
  };
}

function metaFromStructured(sources: Record<string, unknown>[], paper: NormalizedExamPaper | null): MockTestMeta {
  return {
    title:
      pickStr(sources, 'mockTestTitle', 'mock_test_title', 'paperTitle', 'paper_title', 'title') ||
      paper?.paperTitle ||
      'Mock Test',
    testPurpose: pickStr(
      sources,
      'testPurposeSubtopicLink',
      'test_purpose_subtopic_link',
      'test_purpose',
      'subtopic_link',
    ),
    learningObjectives: pickList(sources, 'learningObjectives', 'learning_objectives', 'objectives'),
    ncfAlignment: pickStr(
      sources,
      'ncfCompetencyAlignment',
      'ncf_competency_alignment',
      'learning_outcome_alignment',
    ),
    instructions: pickStr(sources, 'instructions', 'general_instructions') || paper?.instructions || '',
    answerKey: pickStr(sources, 'answerKey', 'answer_key') || paper?.answerKey || '',
    solutions: pickStr(
      sources,
      'stepByStepSolutionsExplanations',
      'step_by_step_solutions_explanations',
      'solutions',
      'explanations',
    ),
    remedial: pickList(
      sources,
      'remedialRevisionSuggestions',
      'remedial_revision_suggestions',
      'revision_suggestions',
      'remedial_suggestions',
    ),
    outcomes: pickList(sources, 'expectedLearningOutcomes', 'expected_learning_outcomes'),
    realLife: pickStr(sources, 'realLifeApplication', 'real_life_application', 'real_life_connections'),
    reflection: pickStr(sources, 'reflectionExitTicket', 'reflection_exit_ticket', 'reflection', 'exit_ticket'),
  };
}

function resolveMockTestMarkdownContent(
  content: string,
  rawContent?: unknown,
): string {
  let text = cleanText(content);
  if (text) return text;
  if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
    const r = rawContent as Record<string, unknown>;
    text = cleanText(r.generatedContent || r.content || '');
    if (!text && r.metadata && typeof r.metadata === 'object') {
      const md = r.metadata as Record<string, unknown>;
      text = cleanText(md.generatedContent || md.content || '');
    }
  }
  return text;
}

/** When Gemini saved answer key/solutions but not section_a[], show review cards from Section 7/8 text. */
function buildFallbackSectionsFromMeta(meta: MockTestMeta): ExamSection[] {
  const sectionDefs: Array<{ id: string; title: string; re: RegExp }> = [
    { id: 'a', title: 'Section A: MCQs', re: /^section\s*a\b/i },
    { id: 'b', title: 'Section B: Very Short Answer Questions', re: /^section\s*b\b/i },
    { id: 'c', title: 'Section C: Short Answer Questions', re: /^section\s*c\b/i },
    { id: 'd', title: 'Section D: Long Answer Questions', re: /^section\s*d\b/i },
    { id: 'e', title: 'Section E: Case-based / Competency Questions', re: /^section\s*e\b/i },
  ];
  const buckets = new Map(sectionDefs.map((s) => [s.id, [] as ExamQuestion[]]));
  let currentId = 'a';

  const solutionByNum = new Map<string, string>();
  for (const line of String(meta.solutions || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^(\d{1,2})[\.\)]\s+(.+)/);
    if (m) solutionByNum.set(m[1], m[2].trim());
  }

  const ingestLine = (line: string) => {
    const t = line.trim();
    if (!t) return;
    for (const sec of sectionDefs) {
      if (sec.re.test(t)) {
        currentId = sec.id;
        return;
      }
    }
    const m = t.match(/^(\d{1,2})[\.\)]\s*(?:([A-D])\)?\s*)?(.+)/i);
    if (!m) return;
    const qNum = m[1];
    const answerLetter = (m[2] || '').toUpperCase();
    const body = (m[3] || '').trim();
    const explanation = solutionByNum.get(qNum) || '';
    const question =
      explanation.replace(/^the correct answer is\s+[A-D]\s+because\s+/i, '').trim() ||
      body ||
      `Question ${qNum}`;
    const bucket = buckets.get(currentId) || buckets.get('a')!;
    bucket.push({
      questionNumber: qNum,
      question: question.length > 220 ? `${question.slice(0, 217)}…` : question,
      options: [],
      answer: answerLetter || body.split(/\s/)[0] || '',
      explanation,
      marks: null,
      internalChoiceGroup: '',
    });
  };

  for (const line of String(meta.answerKey || '').split('\n')) {
    ingestLine(line);
  }
  if (![...buckets.values()].some((q) => q.length)) {
    for (const line of String(meta.solutions || '').split('\n')) {
      ingestLine(line);
    }
  }

  return sectionDefs
    .map((s) => ({
      id: s.id,
      title: s.title,
      questions: buckets.get(s.id) || [],
    }))
    .filter((s) => s.questions.length > 0);
}

function enrichMockTestPaper(
  paper: NormalizedExamPaper | null,
  sources: Record<string, unknown>[],
  content: string,
  meta: MockTestMeta,
): NormalizedExamPaper | null {
  let result = paper;

  for (const src of sources) {
    const qp = src.question_paper ?? src.questionPaper;
    if (typeof qp === 'string' && qp.trim()) {
      const parsed = parseMockTestQuestionPaperBody(qp);
      if (parsed.some((s) => s.questions.length > 0)) {
        result = mergeExamPapers(result, {
          paperTitle: meta.title,
          instructions: meta.instructions,
          blueprint: '',
          sections: parsed,
          internalChoices: '',
          answerKey: meta.answerKey,
          markingScheme: '',
          openEndedRubric: '',
        });
      }
    } else if (qp && typeof qp === 'object') {
      const nested = resolveExamPaperFromPayload('', qp);
      if (nested.paper && examPaperHasQuestions(nested.paper)) {
        result = mergeExamPapers(result, nested.paper);
      }
    }
  }

  const numbered = parseNumberedMarkdownSections(content);
  const sec6 = numbered.get(6);
  if (sec6 && !examPaperHasQuestions(result)) {
    const fromSec6 = parseMockTestQuestionPaperBody(sec6);
    result = mergeExamPapers(result, {
      paperTitle: meta.title,
      instructions: meta.instructions,
      blueprint: '',
      sections: fromSec6,
      internalChoices: '',
      answerKey: meta.answerKey,
      markingScheme: '',
      openEndedRubric: '',
    });
  }

  const mockMd = parseMockTestMarkdown(content);
  if (mockMd) {
    result = mergeExamPapers(result, mockMd);
  }

  if (!examPaperHasQuestions(result)) {
    const fallbackSections = buildFallbackSectionsFromMeta(meta);
    if (fallbackSections.length) {
      result = mergeExamPapers(result, {
        paperTitle: meta.title,
        instructions: meta.instructions,
        blueprint: '',
        sections: fallbackSections,
        internalChoices: '',
        answerKey: meta.answerKey,
        markingScheme: '',
        openEndedRubric: '',
      });
    }
  }

  return result;
}

export function resolveMockTestFromPayload(content: string, rawContent?: unknown): ResolvedMockTest {
  const contentText = resolveMockTestMarkdownContent(content, rawContent);
  const sources = extractStructuredSources(rawContent);
  try {
    if (contentText.startsWith('{')) {
      const j = JSON.parse(contentText) as Record<string, unknown>;
      if (j.raw && typeof j.raw === 'object') sources.push(j.raw as Record<string, unknown>);
      if (j.structuredContent && typeof j.structuredContent === 'object') {
        sources.push(j.structuredContent as Record<string, unknown>);
      }
    }
  } catch {
    /* ignore */
  }

  const resolved = resolveExamPaperFromPayload(contentText, rawContent);
  let meta = metaFromStructured(sources, resolved.paper);
  const mdMeta = metaFromMarkdown(contentText, resolved.paper);

  meta = {
    title: meta.title || mdMeta.title || 'Mock Test',
    testPurpose: meta.testPurpose || mdMeta.testPurpose || '',
    learningObjectives: meta.learningObjectives.length ? meta.learningObjectives : mdMeta.learningObjectives || [],
    ncfAlignment: meta.ncfAlignment || mdMeta.ncfAlignment || '',
    instructions: meta.instructions || mdMeta.instructions || '',
    answerKey: meta.answerKey || mdMeta.answerKey || '',
    solutions: meta.solutions || mdMeta.solutions || '',
    remedial: meta.remedial.length ? meta.remedial : mdMeta.remedial || [],
    outcomes: meta.outcomes.length ? meta.outcomes : mdMeta.outcomes || [],
    realLife: meta.realLife || mdMeta.realLife || '',
    reflection: meta.reflection || mdMeta.reflection || '',
  };

  let paper = enrichMockTestPaper(resolved.paper, sources, contentText, meta);

  if (!meta.answerKey.trim()) {
    meta = { ...meta, answerKey: cleanText(parseNumberedMarkdownSections(contentText).get(7) || paper?.answerKey || '') };
  }
  if (!meta.solutions.trim()) {
    meta = { ...meta, solutions: cleanText(parseNumberedMarkdownSections(contentText).get(8) || '') };
  }

  const activeSectionsForSynth = paper?.sections.filter((s) => s.questions.length > 0) ?? [];
  if (!meta.answerKey.trim() && activeSectionsForSynth.length) {
    meta = { ...meta, answerKey: synthesizeAnswerKeyFromSections(activeSectionsForSynth) };
  }
  if (!meta.solutions.trim() && activeSectionsForSynth.length) {
    meta = { ...meta, solutions: synthesizeSolutionsFromSections(activeSectionsForSynth) };
  }

  const hasPaper = paper && examPaperHasQuestions(paper);
  return {
    meta,
    paper: hasPaper ? paper : null,
    markdownFallback:
      hasPaper ? null : resolved.markdownFallback || contentText || null,
  };
}

export function mockTestViewerPayloadFromRecord(
  record?: {
    generatedContent?: string;
    content?: string;
    structuredContent?: unknown;
    renderContent?: unknown;
    metadata?: { structuredContent?: unknown };
  } | null,
): { content: string; rawContent?: unknown } {
  const payload = viewerPayloadFromRecord(record);
  return {
    content: payload.content,
    rawContent: {
      ...(payload.rawContent && typeof payload.rawContent === 'object' ? payload.rawContent : {}),
      renderContent: record?.renderContent,
    },
  };
}

export { synthesizeAnswerKeyFromSections, synthesizeSolutionsFromSections };
