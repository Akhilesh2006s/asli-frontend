import { formatLabeledMcqOptions } from '@/lib/parse-exam-question-paper';

export type StudyGuideKeyConcept = { name: string; explanation: string };
export type StudyGuideDefinition = { term: string; definition: string };
export type StudyGuideFormula = { name: string; formula: string; note: string };
export type StudyGuidePracticeQuestion = {
  question: string;
  type: 'objective' | 'subjective';
  answer: string;
  options: string[];
};

export type StudyGuideContent = {
  title: string;
  chapterOverview: string;
  learningObjectives: string[];
  priorKnowledge: string[];
  keyConcepts: StudyGuideKeyConcept[];
  definitions: StudyGuideDefinition[];
  formulae: StudyGuideFormula[];
  conceptFlow: string;
  realLifeExamples: string[];
  quickRevisionNotes: string[];
  practiceQuestions: StudyGuidePracticeQuestion[];
  improvementTips: string[];
};

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
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

function parseNumberedSections(markdown: string): Map<number, string> {
  const lines = String(markdown || '').split('\n');
  const sections = new Map<number, string[]>();
  let current = 0;

  for (const raw of lines) {
    const line = raw.trim();
    const match = line.match(/^(?:#{1,3}\s*)?(\d{1,2})\.\s*(.+)$/);
    if (match) {
      current = Number(match[1]);
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current > 0 && sections.has(current)) {
      sections.get(current)!.push(raw);
    }
  }

  const result = new Map<number, string>();
  for (const [num, body] of sections.entries()) {
    result.set(num, cleanText(body.join('\n')));
  }
  return result;
}

function extractTitleFromMarkdown(markdown: string): string {
  const firstH1 = String(markdown || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^#\s+/.test(l) && !/^##\s+/.test(l));
  if (firstH1) return cleanText(firstH1.replace(/^#+\s*/, ''));
  return '';
}

function parseKeyConceptsBlock(text: string): StudyGuideKeyConcept[] {
  const out: StudyGuideKeyConcept[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[—–-]\s*(.*)$/);
    if (m) {
      out.push({ name: cleanText(m[1]), explanation: cleanText(m[2]) });
      continue;
    }
    const m2 = t.match(/^\d+\.\s+(.+?)\s*[—–-]\s*(.+)$/);
    if (m2) out.push({ name: cleanText(m2[1]), explanation: cleanText(m2[2]) });
  }
  return out;
}

function parseDefinitionsFormulaeBlock(text: string): {
  definitions: StudyGuideDefinition[];
  formulae: StudyGuideFormula[];
} {
  const definitions: StudyGuideDefinition[] = [];
  const formulae: StudyGuideFormula[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    const def = t.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[—–-]\s*(.*)$/);
    if (def) {
      definitions.push({ term: cleanText(def[1]), definition: cleanText(def[2]) });
      continue;
    }
    const fm = t.match(/^\d+\.\s+(.+?):\s*(.+?)(?:\s*\((.+)\))?$/);
    if (fm) {
      formulae.push({
        name: cleanText(fm[1]),
        formula: cleanText(fm[2]),
        note: cleanText(fm[3] || ''),
      });
    }
  }
  return { definitions, formulae };
}

function parsePracticeQuestionsBlock(text: string): StudyGuidePracticeQuestion[] {
  const out: StudyGuidePracticeQuestion[] = [];
  let current: StudyGuidePracticeQuestion | null = null;

  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    const qMatch = line.match(/^\d+\.\s+\[(objective|subjective|mcq)\]\s*(.+)$/i);
    if (qMatch) {
      if (current) out.push(current);
      const type = /objective|mcq/i.test(qMatch[1]) ? 'objective' : 'subjective';
      current = { question: cleanText(qMatch[2]), type, answer: '', options: [] };
      continue;
    }
    if (!current) continue;
    const opt = line.match(/^[A-D][\).:\-]\s+(.+)$/i);
    if (opt) {
      current.options.push(cleanText(opt[0]));
      continue;
    }
    const ans = line.match(/^\*\*Answer:\*\*\s*(.+)$/i);
    if (ans) current.answer = cleanText(ans[1]);
  }
  if (current) out.push(current);

  return out.map((q) => ({
    ...q,
    options: q.options.length >= 2 ? formatLabeledMcqOptions(q.options) : q.options,
  }));
}

function normalizePracticeQuestions(raw: unknown): StudyGuidePracticeQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q) => {
      if (q && typeof q === 'object') {
        const row = q as Record<string, unknown>;
        const typeRaw = cleanText(row.type).toLowerCase();
        const type =
          typeRaw === 'objective' || typeRaw === 'mcq' ? ('objective' as const) : ('subjective' as const);
        const options = Array.isArray(row.options)
          ? row.options.map((o) => cleanText(o)).filter(Boolean)
          : [];
        return {
          question: cleanText(row.question),
          type,
          answer: cleanText(row.answer),
          options: options.length >= 2 ? formatLabeledMcqOptions(options) : options,
        };
      }
      return {
        question: cleanText(q),
        type: 'subjective' as const,
        answer: '',
        options: [],
      };
    })
    .filter((q) => q.question);
}

function normalizeKeyConcepts(raw: unknown): StudyGuideKeyConcept[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      if (c && typeof c === 'object') {
        const row = c as Record<string, unknown>;
        return {
          name: cleanText(row.name || row.concept),
          explanation: cleanText(row.explanation),
        };
      }
      return { name: cleanText(c), explanation: '' };
    })
    .filter((c) => c.name);
}

function extractSources(rawContent?: unknown): Record<string, unknown>[] {
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
    if (r.raw && typeof r.raw === 'object') push(r.raw);
  }
  return out;
}

function fromStructured(sources: Record<string, unknown>[]): StudyGuideContent {
  const pick = (...keys: string[]) => {
    for (const src of sources) {
      for (const k of keys) {
        const v = src[k];
        if (v != null && cleanText(v)) return cleanText(v);
      }
    }
    return '';
  };
  const pickList = (...keys: string[]) => {
    for (const src of sources) {
      for (const k of keys) {
        const rows = toList(src[k]);
        if (rows.length) return rows;
      }
    }
    return [];
  };

  let keyConcepts: StudyGuideKeyConcept[] = [];
  let definitions: StudyGuideDefinition[] = [];
  let formulae: StudyGuideFormula[] = [];
  let practiceQuestions: StudyGuidePracticeQuestion[] = [];

  for (const src of sources) {
    if (!keyConcepts.length) keyConcepts = normalizeKeyConcepts(src.key_concepts ?? src.concepts);
    if (!definitions.length && Array.isArray(src.definitions)) {
      definitions = src.definitions
        .map((d) => {
          if (d && typeof d === 'object') {
            const row = d as Record<string, unknown>;
            return { term: cleanText(row.term || row.name), definition: cleanText(row.definition) };
          }
          return { term: cleanText(d), definition: '' };
        })
        .filter((d) => d.term);
    }
    const fmRaw = src.formulae ?? src.formulas;
    if (!formulae.length && Array.isArray(fmRaw)) {
      formulae = fmRaw
        .map((f) => {
          if (f && typeof f === 'object') {
            const row = f as Record<string, unknown>;
            return {
              name: cleanText(row.name),
              formula: cleanText(row.formula),
              note: cleanText(row.note),
            };
          }
          return { name: '', formula: cleanText(f), note: '' };
        })
        .filter((f) => f.formula || f.name);
    }
    if (!practiceQuestions.length) {
      practiceQuestions = normalizePracticeQuestions(src.practice_questions ?? src.questions);
    }
  }

  return {
    title: pick('title') || 'Study Guide',
    chapterOverview: pick('chapter_subtopic_overview', 'chapter_overview', 'overview'),
    learningObjectives: pickList('learning_objectives', 'learningObjectives', 'objectives'),
    priorKnowledge: pickList('prior_knowledge_required', 'prior_knowledge'),
    keyConcepts,
    definitions,
    formulae,
    conceptFlow: pick('concept_flow_mind_map', 'concept_flow', 'mind_map'),
    realLifeExamples: pickList('real_life_examples', 'real_life_applications', 'examples'),
    quickRevisionNotes: pickList('quick_revision_notes', 'revision_checklist', 'quick_review'),
    practiceQuestions,
    improvementTips: pickList('improvement_tips', 'study_tips', 'tips'),
  };
}

function mergeGuide(base: StudyGuideContent, patch: Partial<StudyGuideContent>): StudyGuideContent {
  return {
    title: base.title || patch.title || 'Study Guide',
    chapterOverview: base.chapterOverview || patch.chapterOverview || '',
    learningObjectives: base.learningObjectives.length ? base.learningObjectives : patch.learningObjectives || [],
    priorKnowledge: base.priorKnowledge.length ? base.priorKnowledge : patch.priorKnowledge || [],
    keyConcepts: base.keyConcepts.length ? base.keyConcepts : patch.keyConcepts || [],
    definitions: base.definitions.length ? base.definitions : patch.definitions || [],
    formulae: base.formulae.length ? base.formulae : patch.formulae || [],
    conceptFlow: base.conceptFlow || patch.conceptFlow || '',
    realLifeExamples: base.realLifeExamples.length ? base.realLifeExamples : patch.realLifeExamples || [],
    quickRevisionNotes: base.quickRevisionNotes.length
      ? base.quickRevisionNotes
      : patch.quickRevisionNotes || [],
    practiceQuestions: base.practiceQuestions.length
      ? base.practiceQuestions
      : patch.practiceQuestions || [],
    improvementTips: base.improvementTips.length ? base.improvementTips : patch.improvementTips || [],
  };
}

export function resolveStudyGuideFromPayload(
  content: string,
  rawContent?: unknown,
): { guide: StudyGuideContent; markdownFallback: string | null } {
  const sources = extractSources(rawContent);
  try {
    const t = String(content || '').trim();
    if (t.startsWith('{')) {
      const j = JSON.parse(t) as Record<string, unknown>;
      if (j.structuredContent && typeof j.structuredContent === 'object') {
        sources.push(j.structuredContent as Record<string, unknown>);
      }
    }
  } catch {
    /* ignore */
  }

  let guide = fromStructured(sources);
  const numbered = parseNumberedSections(content);
  const mdTitle = extractTitleFromMarkdown(content) || cleanText(numbered.get(1) || '');

  const fromMd: Partial<StudyGuideContent> = {
    title: mdTitle,
    chapterOverview: cleanText(numbered.get(2) || ''),
    learningObjectives: toList(numbered.get(3) || ''),
    priorKnowledge: toList(numbered.get(4) || ''),
    keyConcepts: parseKeyConceptsBlock(numbered.get(5) || ''),
    ...parseDefinitionsFormulaeBlock(numbered.get(6) || ''),
    conceptFlow: cleanText(numbered.get(7) || ''),
    realLifeExamples: toList(numbered.get(8) || ''),
    quickRevisionNotes: toList(numbered.get(9) || ''),
    practiceQuestions: parsePracticeQuestionsBlock(numbered.get(10) || ''),
    improvementTips: toList(numbered.get(11) || ''),
  };

  guide = mergeGuide(guide, fromMd);
  if (!guide.title || guide.title === 'Study Guide') {
    guide = { ...guide, title: mdTitle || guide.title };
  }

  const hasBody =
    guide.chapterOverview ||
    guide.keyConcepts.length ||
    guide.definitions.length ||
    guide.practiceQuestions.length ||
    guide.quickRevisionNotes.length;

  return {
    guide,
    markdownFallback: hasBody ? null : content || null,
  };
}

export function studyGuideViewerPayloadFromRecord(
  record?: {
    generatedContent?: string;
    content?: string;
    structuredContent?: unknown;
    metadata?: { structuredContent?: unknown };
  } | null,
): { content: string; rawContent?: unknown } {
  const content = String(record?.generatedContent || record?.content || '').trim();
  const rawContent =
    record?.structuredContent ??
    (record?.metadata && typeof record.metadata === 'object'
      ? (record.metadata as { structuredContent?: unknown }).structuredContent
      : record);
  return { content, rawContent };
}

export function looksLikeStudyGuideContent(text: string): boolean {
  const sample = String(text || '').slice(0, 14000);
  if (!sample.trim()) return false;
  if (
    /chapter\s*summary\s*creator|chapter\s*summary\s*title|overview of the chapter|important concepts and explanations|practice recall questions|concept connections/i.test(
      sample,
    )
  ) {
    return false;
  }
  const hasGuideLabel = /smart\s*study\s*guide|study\s*guide\s*title/i.test(sample);
  const hasSections =
    /(?:^|\n)\s*#{1,3}\s*\d{1,2}\.\s*(Chapter and Subtopic|Prior Knowledge|Key Concepts Explained|Practice Questions|Tips for Further)/im.test(
      sample,
    ) || /key\s*concepts\s*explained/i.test(sample);
  return hasGuideLabel || (hasSections && /quick\s*revision/i.test(sample));
}
