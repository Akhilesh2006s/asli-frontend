import {
  examPaperHasQuestions,
  examPaperHasVisibleContent,
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
import { isStructuredOnlyViewerMode, viewerPayloadFromRecord } from '@/lib/resolve-ai-structured-content';

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

export function resolveMockTestFromPayload(content: string, rawContent?: unknown): ResolvedMockTest {
  if (isStructuredOnlyViewerMode()) {
    const resolved = resolveExamPaperFromPayload('', rawContent);
    const sources = extractStructuredSources(rawContent);
    let meta = metaFromStructured(sources, resolved.paper);
    const activeSectionsForSynth = resolved.paper?.sections.filter((s) => s.questions.length > 0) ?? [];
    if (!meta.answerKey.trim() && activeSectionsForSynth.length) {
      meta = { ...meta, answerKey: synthesizeAnswerKeyFromSections(activeSectionsForSynth) };
    }
    if (!meta.solutions.trim() && activeSectionsForSynth.length) {
      meta = { ...meta, solutions: synthesizeSolutionsFromSections(activeSectionsForSynth) };
    }
    const hasPaper =
      resolved.paper &&
      (examPaperHasQuestions(resolved.paper) || examPaperHasVisibleContent(resolved.paper));
    return {
      meta,
      paper: hasPaper ? resolved.paper : null,
      markdownFallback: null,
    };
  }

  const resolved = resolveExamPaperFromPayload(content, rawContent);
  const sources = extractStructuredSources(rawContent);
  try {
    const t = String(content || '').trim();
    if (t.startsWith('{')) {
      const j = JSON.parse(t) as Record<string, unknown>;
      if (j.raw && typeof j.raw === 'object') sources.push(j.raw as Record<string, unknown>);
      if (j.structuredContent && typeof j.structuredContent === 'object') {
        sources.push(j.structuredContent as Record<string, unknown>);
      }
    }
  } catch {
    /* ignore */
  }

  let meta = metaFromStructured(sources, resolved.paper);
  const mdMeta = metaFromMarkdown(content, resolved.paper);

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

  let paper: NormalizedExamPaper | null = resolved.paper;

  for (const src of sources) {
    const qp = src.question_paper ?? src.questionPaper;
    if (typeof qp === 'string' && qp.trim()) {
      const parsed = parseMockTestQuestionPaperBody(qp);
      if (parsed.some((s) => s.questions.length > 0)) {
        paper = mergeExamPapers(paper, {
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
    }
  }

  const numbered = parseNumberedMarkdownSections(content);
  const sec6 = numbered.get(6);
  if (sec6 && !examPaperHasQuestions(paper)) {
    const fromSec6 = parseMockTestQuestionPaperBody(sec6);
    paper = mergeExamPapers(paper, {
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
    paper = mergeExamPapers(paper, mockMd);
    if (!meta.answerKey) meta = { ...meta, answerKey: mockMd.answerKey || meta.answerKey };
  }

  if (!meta.answerKey.trim()) {
    meta = { ...meta, answerKey: cleanText(numbered.get(7) || paper?.answerKey || '') };
  }
  if (!meta.solutions.trim()) {
    meta = { ...meta, solutions: cleanText(numbered.get(8) || '') };
  }

  const activeSectionsForSynth = paper?.sections.filter((s) => s.questions.length > 0) ?? [];
  if (!meta.answerKey.trim() && activeSectionsForSynth.length) {
    meta = { ...meta, answerKey: synthesizeAnswerKeyFromSections(activeSectionsForSynth) };
  }
  if (!meta.solutions.trim() && activeSectionsForSynth.length) {
    meta = { ...meta, solutions: synthesizeSolutionsFromSections(activeSectionsForSynth) };
  }

  const hasPaper = paper && (examPaperHasQuestions(paper) || examPaperHasVisibleContent(paper));
  return {
    meta,
    paper: hasPaper ? paper : null,
    markdownFallback:
      paper && examPaperHasQuestions(paper) ? null : resolved.markdownFallback || content || null,
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
  const structured = payload.structuredContent;
  return {
    content: payload.content,
    rawContent: {
      ...(structured && typeof structured === 'object' && !Array.isArray(structured)
        ? (structured as Record<string, unknown>)
        : {}),
      structuredContent: structured,
      renderContent: record?.renderContent,
    },
  };
}

export { synthesizeAnswerKeyFromSections, synthesizeSolutionsFromSections };
