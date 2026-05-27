/**
 * Parse Concept Mastery Helper content into canonical 12-section concept objects.
 */

export type NormalizedConcept = {
  sl: number;
  conceptName: string;
  difficulty?: string;
  simpleDefinition: string;
  whyImportant: string;
  priorKnowledge: string;
  explanation: string;
  diagramSuggestion: string;
  realLifeExamples: string;
  misconceptions: string[];
  conceptCheckQuestions: string[];
  keyPoints: string[];
  examTips: string;
  hotsQuestion: string;
  reflectionPrompt: string;
};

export type ResolvedConceptMastery = {
  concepts: NormalizedConcept[];
  markdownFallback: string | null;
};

const SECTION_BY_NUMBER: Record<
  number,
  { key: keyof NormalizedConcept; list?: boolean }
> = {
  1: { key: 'simpleDefinition' },
  2: { key: 'whyImportant' },
  3: { key: 'priorKnowledge' },
  4: { key: 'explanation' },
  5: { key: 'diagramSuggestion' },
  6: { key: 'realLifeExamples' },
  7: { key: 'misconceptions', list: true },
  8: { key: 'conceptCheckQuestions', list: true },
  9: { key: 'keyPoints', list: true },
  10: { key: 'examTips' },
  11: { key: 'hotsQuestion' },
  12: { key: 'reflectionPrompt' },
};

const SECTION_TITLE_HINT: Record<number, RegExp> = {
  1: /simple\s+definition/i,
  2: /why\s+this\s+concept|important/i,
  3: /prior\s+knowledge/i,
  4: /step-by-step|explanation/i,
  5: /diagram|visuali[sz]ation/i,
  6: /real[-\s]?life/i,
  7: /misconception|common\s+mistake/i,
  8: /concept\s+check/i,
  9: /key\s+points/i,
  10: /exam\s+tips?/i,
  11: /higher[-\s]?order|hots/i,
  12: /self[-\s]?reflection|reflection\s+prompt/i,
};

const SECTION_HEADING_MD_RE = /^#{1,3}\s+(\d{1,2})\.\s*(.+?)\s*$/i;
const SECTION_HEADING_BOLD_RE = /^\*\*(\d{1,2})\.\s*(.+?)\*\*\s*$/i;
const SECTION_PLAIN_RE = /^(\d{1,2})\.\s+(.+?)\s*$/i;

function stripOrderedPrefix(line: string): string {
  return String(line || '')
    .replace(/^\s*\d+[\).\s]+/i, '')
    .replace(/^\s*[-*•]\s*/, '')
    .trim();
}

function coalesceLines(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => stripOrderedPrefix(String(x ?? ''))).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v.split(/\n+/).map(stripOrderedPrefix).filter(Boolean);
  }
  return [];
}

function coalesceText(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).join('\n');
  return String(v ?? '').trim();
}

function stripHtmlBasic(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sectionNumFromTitle(title: string): number | null {
  const t = String(title || '').trim();
  if (!t) return null;
  for (const [num, hint] of Object.entries(SECTION_TITLE_HINT)) {
    if (hint.test(t)) return Number(num);
  }
  return null;
}

function mapHeadingToSection(n: number, title: string): number | null {
  if (n >= 1 && n <= 12) {
    const hint = SECTION_TITLE_HINT[n];
    if (title && hint && !hint.test(title)) {
      const byTitle = sectionNumFromTitle(title);
      if (byTitle != null) return byTitle;
    }
    return n;
  }
  return sectionNumFromTitle(title);
}

function templateSectionNumberFromLine(line: string): number | null {
  const trimmed = line.trim();
  let m = trimmed.match(SECTION_HEADING_MD_RE);
  if (m) {
    const mapped = mapHeadingToSection(Number(m[1]), m[2]);
    if (mapped != null) return mapped;
  }
  m = trimmed.match(SECTION_HEADING_BOLD_RE);
  if (m) {
    const mapped = mapHeadingToSection(Number(m[1]), m[2]);
    if (mapped != null) return mapped;
  }
  m = trimmed.match(SECTION_PLAIN_RE);
  if (m) {
    const n = Number(m[1]);
    const hint = SECTION_TITLE_HINT[n];
    if (n >= 1 && n <= 12 && hint?.test(m[2])) return n;
    const mapped = mapHeadingToSection(n, m[2]);
    if (mapped != null) return mapped;
  }
  return null;
}

function linesToList(body: string): string[] {
  return body
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
    .filter(Boolean);
}

function assignSectionBody(concept: Partial<NormalizedConcept>, sectionNum: number, body: string) {
  const def = SECTION_BY_NUMBER[sectionNum];
  if (!def || !body.trim()) return;
  const trimmed = body.replace(/\n{2,}/g, '\n').trim();
  if (def.list) {
    (concept as Record<string, unknown>)[def.key] = linesToList(trimmed);
  } else {
    (concept as Record<string, unknown>)[def.key] = trimmed;
  }
}

function splitNumberedSections(block: string): Map<number, string> {
  const map = new Map<number, string>();
  const lines = block.split('\n');
  let currentNum: number | null = null;
  const buf: string[] = [];

  const flush = () => {
    if (currentNum != null && buf.length) {
      const body = buf.join('\n').trim();
      if (body) map.set(currentNum, body);
    }
    buf.length = 0;
  };

  for (const line of lines) {
    const sectionNum = templateSectionNumberFromLine(line);
    if (sectionNum != null) {
      flush();
      currentNum = sectionNum;
      continue;
    }
    if (currentNum != null) buf.push(line);
  }
  flush();
  return map;
}

function extractMarkdownH2Section(body: string, title: string): string | undefined {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|\\n)##\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
  const m = body.match(re);
  return m ? m[1].trim() : undefined;
}

export function normalizeConcept(raw: Record<string, unknown>, idx: number): NormalizedConcept {
  const r = raw || {};
  return {
    sl: Number(r.sl_no) || idx + 1,
    conceptName: String(r.concept_name || r.title || r.name || `Concept ${idx + 1}`).trim(),
    difficulty: String(r.difficulty || '').trim() || undefined,
    simpleDefinition: coalesceText(r.simple_definition || r.definition),
    whyImportant: coalesceText(r.why_important || r.importance),
    priorKnowledge: coalesceText(r.prior_knowledge_needed || r.prior_knowledge),
    explanation: coalesceText(r.lesson || r.explanation || r.step_by_step_explanation),
    diagramSuggestion: coalesceText(r.diagram_suggestion || r.visualisation || r.visualization),
    realLifeExamples: coalesceText(r.real_example || r.real_life_examples),
    misconceptions: coalesceLines(r.common_mistakes || r.misconceptions),
    conceptCheckQuestions: coalesceLines(r.concept_check_questions),
    keyPoints: coalesceLines(r.key_points || r.keyPoints),
    examTips: coalesceText(r.exam_tips),
    hotsQuestion: coalesceText(r.hots_question),
    reflectionPrompt: coalesceText(r.self_reflection_prompt || r.reflection),
  };
}

function enrichFromGeminiMarkdown(
  conceptContent: string,
  base: Partial<NormalizedConcept>,
): Partial<NormalizedConcept> {
  const out = { ...base };

  if (!out.simpleDefinition) {
    out.simpleDefinition = extractMarkdownH2Section(conceptContent, 'Simple Definition');
  }
  if (!out.whyImportant) {
    out.whyImportant = extractMarkdownH2Section(conceptContent, 'Why This Concept Is Important');
  }
  if (!out.priorKnowledge) {
    out.priorKnowledge = extractMarkdownH2Section(conceptContent, 'Prior Knowledge Needed');
  }
  if (!out.explanation) {
    const overview = extractMarkdownH2Section(conceptContent, 'Concept Overview');
    const steps = extractMarkdownH2Section(conceptContent, 'Step-by-Step Explanation');
    const keyComp = extractMarkdownH2Section(conceptContent, 'Key Components Breakdown');
    const parts = [overview, keyComp, steps].filter(Boolean);
    if (parts.length) out.explanation = parts.join('\n\n');
    const legacy = conceptContent.match(/\*\*Explanation:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*|$)/);
    if (!out.explanation && legacy) out.explanation = legacy[1].trim();
  }
  if (!out.diagramSuggestion) {
    out.diagramSuggestion = extractMarkdownH2Section(conceptContent, 'Diagram / Visualisation Suggestion');
  }
  if (!out.realLifeExamples) {
    out.realLifeExamples =
      extractMarkdownH2Section(conceptContent, 'Real-World Examples') ||
      extractMarkdownH2Section(conceptContent, 'Real-World Example') ||
      extractMarkdownH2Section(conceptContent, 'Real-life Examples');
    const legacy = conceptContent.match(/\*\*Real-world Example:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*|$)/);
    if (!out.realLifeExamples && legacy) out.realLifeExamples = legacy[1].trim();
  }
  if (!out.misconceptions?.length) {
    const mis = extractMarkdownH2Section(conceptContent, 'Common Misconceptions and Corrections');
    if (mis) out.misconceptions = linesToList(mis);
  }
  if (!out.conceptCheckQuestions?.length) {
    const ccq = extractMarkdownH2Section(conceptContent, 'Concept Check Questions');
    if (ccq) out.conceptCheckQuestions = linesToList(ccq);
  }
  if (!out.keyPoints?.length) {
    const kp = extractMarkdownH2Section(conceptContent, 'Key Points to Remember');
    if (kp) out.keyPoints = linesToList(kp);
    const summary = extractMarkdownH2Section(conceptContent, 'Summary and Key Takeaways');
    if (!out.keyPoints?.length && summary) {
      out.keyPoints = linesToList(summary);
    }
    const legacy = conceptContent.match(/\*\*Key Points:\*\*\s*\n((?:- .+\n?)+)/);
    if (!out.keyPoints?.length && legacy) {
      out.keyPoints = linesToList(legacy[1]);
    }
  }
  if (!out.examTips) {
    out.examTips = extractMarkdownH2Section(conceptContent, 'Exam Tips');
  }
  if (!out.hotsQuestion) {
    out.hotsQuestion = extractMarkdownH2Section(conceptContent, 'Higher-order Thinking Question');
  }
  if (!out.reflectionPrompt) {
    out.reflectionPrompt = extractMarkdownH2Section(conceptContent, 'Quick Self-reflection Prompt');
  }

  return out;
}

function mergeConcept(base: NormalizedConcept, patch: Partial<NormalizedConcept>, idx: number): NormalizedConcept {
  const pickText = (a: string, b: string) => {
    const aa = a.trim();
    const bb = b.trim();
    return aa.length >= bb.length ? aa : bb;
  };
  const pickList = (a: string[], b: string[]) => (a.length >= b.length ? a : b);

  return {
    sl: patch.sl ?? base.sl ?? idx + 1,
    conceptName: pickText(patch.conceptName || '', base.conceptName),
    difficulty: patch.difficulty || base.difficulty,
    simpleDefinition: pickText(patch.simpleDefinition || '', base.simpleDefinition),
    whyImportant: pickText(patch.whyImportant || '', base.whyImportant),
    priorKnowledge: pickText(patch.priorKnowledge || '', base.priorKnowledge),
    explanation: pickText(patch.explanation || '', base.explanation),
    diagramSuggestion: pickText(patch.diagramSuggestion || '', base.diagramSuggestion),
    realLifeExamples: pickText(patch.realLifeExamples || '', base.realLifeExamples),
    misconceptions: pickList(patch.misconceptions || [], base.misconceptions),
    conceptCheckQuestions: pickList(patch.conceptCheckQuestions || [], base.conceptCheckQuestions),
    keyPoints: pickList(patch.keyPoints || [], base.keyPoints),
    examTips: pickText(patch.examTips || '', base.examTips),
    hotsQuestion: pickText(patch.hotsQuestion || '', base.hotsQuestion),
    reflectionPrompt: pickText(patch.reflectionPrompt || '', base.reflectionPrompt),
  };
}

function parseConceptFromHtmlCard(cardContent: string, idx: number): NormalizedConcept | null {
  const conceptMatch = cardContent.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const conceptName = conceptMatch
    ? conceptMatch[1].replace(/📚\s*/g, '').replace(/<[^>]+>/g, '').trim()
    : '';
  if (!conceptName) return null;

  const difficultyMatch = cardContent.match(/<span[^>]*>(EASY|MEDIUM|HARD)<\/span>/i);
  const difficulty = difficultyMatch ? difficultyMatch[1].toLowerCase() : undefined;

  let explanation: string | undefined;
  const lessonBlock = cardContent.match(/<h3[^>]*>Lesson Explanation<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/i);
  if (lessonBlock) explanation = stripHtmlBasic(lessonBlock[1]);

  let realLifeExamples: string | undefined;
  const exampleBlock = cardContent.match(/<h3[^>]*>Real-world Example<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/i);
  if (exampleBlock) realLifeExamples = stripHtmlBasic(exampleBlock[1]);

  const keyPoints: string[] = [];
  const pointsSection = cardContent.match(/<h3[^>]*>Key Points<\/h3>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (pointsSection) {
    const pointsContent = pointsSection[1];
    const pointMatches = Array.from(pointsContent.matchAll(/<span[^>]*>(.*?)<\/span>/g));
    for (const pointMatch of pointMatches) {
      const point = stripHtmlBasic(pointMatch[1]);
      if (point && !/^\d+$/.test(point)) keyPoints.push(point);
    }
    if (!keyPoints.length) {
      const liMatches = Array.from(pointsContent.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
      for (const li of liMatches) {
        const text = stripHtmlBasic(li[1]);
        if (text) keyPoints.push(text);
      }
    }
  }

  return normalizeConcept(
    {
      concept_name: conceptName,
      difficulty,
      lesson: explanation,
      real_example: realLifeExamples,
      key_points: keyPoints,
    },
    idx,
  );
}

function parseConceptMarkdownBlock(conceptContent: string, conceptName: string, idx: number): NormalizedConcept {
  const difficultyMatch = conceptContent.match(/\*\*Difficulty:\*\*\s*(.*?)\n/i);
  const difficulty = difficultyMatch ? difficultyMatch[1].trim().toLowerCase() : undefined;

  const partial: Partial<NormalizedConcept> = {
    conceptName,
    difficulty,
  };

  const sectionMap = splitNumberedSections(conceptContent);
  const draft: Partial<NormalizedConcept> = { ...partial };
  for (const [num, body] of Array.from(sectionMap.entries())) {
    assignSectionBody(draft, num, body);
  }

  const enriched = enrichFromGeminiMarkdown(conceptContent, draft);
  return normalizeConcept(enriched as Record<string, unknown>, idx);
}

export function parseConceptsFromMarkdown(content: string): NormalizedConcept[] {
  const text = String(content || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!text) return [];

  const concepts: NormalizedConcept[] = [];

  const cardRegex = /__CONCEPT_CARD_START__\n([\s\S]*?)\n__CONCEPT_CARD_END__/g;
  const cardMatches = Array.from(text.matchAll(cardRegex));
  for (let i = 0; i < cardMatches.length; i++) {
    const parsed = parseConceptFromHtmlCard(cardMatches[i][1], i);
    if (parsed) concepts.push(parsed);
  }
  if (concepts.length) return concepts;

  let blocks = text.split(/(?=^##\s+(?!#))/im).filter((b) => b.trim());
  if (blocks.length <= 1) {
    blocks = text.split(/(?=^###\s+(?:\d+\.\s*)?)/im).filter((b) => b.trim());
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    const h2 = block.match(/^##\s+(.+?)(?:\n|$)/m);
    const h3 = block.match(/^###\s*(?:\d+\.\s*)?(.+?)(?:\n|$)/m);
    const name = (h2 ? h2[1] : h3 ? h3[1] : '').replace(/^\d+\.\s*/, '').trim();
    if (!name || /^concept\s+mastery/i.test(name)) continue;
    concepts.push(parseConceptMarkdownBlock(block, name, i));
  }

  if (!concepts.length && /^###\s/m.test(text)) {
    const headerRegex = /(?:^|\n)###\s*(?:\d+\.\s*)?([^\n]+)\n/g;
    const matches = Array.from(text.matchAll(headerRegex));
    matches.forEach((match, index) => {
      const conceptName = match[1].trim();
      const startIndex = match.index ?? 0;
      const nextMatch = matches[index + 1];
      const endIndex = nextMatch ? (nextMatch.index ?? text.length) : text.length;
      const conceptContent = text.substring(startIndex, endIndex);
      concepts.push(parseConceptMarkdownBlock(conceptContent, conceptName, index));
    });
  }

  return concepts;
}

export function conceptHasVisibleContent(c: NormalizedConcept): boolean {
  return (
    !!c.simpleDefinition ||
    !!c.whyImportant ||
    !!c.priorKnowledge ||
    !!c.explanation ||
    !!c.diagramSuggestion ||
    !!c.realLifeExamples ||
    c.misconceptions.length > 0 ||
    c.conceptCheckQuestions.length > 0 ||
    c.keyPoints.length > 0 ||
    !!c.examTips ||
    !!c.hotsQuestion ||
    !!c.reflectionPrompt
  );
}

/** Pull concept records out of any raw shape the backend may send. */
function absorbRawRecords(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  // Plain array of concept objects
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  if (typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  // { concepts: [...] }
  if (Array.isArray(o.concepts)) return o.concepts.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  // { raw: { concepts: [...] } }
  if (o.raw && typeof o.raw === 'object') {
    const inner = o.raw as Record<string, unknown>;
    if (Array.isArray(inner.concepts)) return inner.concepts.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
    if (inner.concept_name || inner.lesson) return [inner];
  }
  // Single concept object
  if (o.concept_name || o.lesson || o.simple_definition || o.explanation) return [o];
  return [];
}

export function resolveConceptsFromPayload(
  content?: string,
  rawContent?: unknown,
): ResolvedConceptMastery {
  let formattedText = String(content || '').trim();
  const rawRecords: Record<string, unknown>[] = [];

  // content may be JSON.stringify({formatted, raw}) as set by the teacher tools page
  try {
    const parsed = JSON.parse(formattedText) as Record<string, unknown>;
    if (parsed.formatted != null) formattedText = String(parsed.formatted).trim();
    if (!formattedText && parsed.markdown) formattedText = String(parsed.markdown).trim();
    // raw inside the envelope
    rawRecords.push(...absorbRawRecords(parsed.raw));
    // The envelope itself might directly hold concepts
    if (!rawRecords.length) rawRecords.push(...absorbRawRecords(parsed));
  } catch {
    // not JSON — formattedText stays as-is
  }

  // Also try to parse formattedText itself as JSON (e.g. direct AI output stored as JSON string)
  if (!rawRecords.length) {
    try {
      const inner = JSON.parse(formattedText) as unknown;
      rawRecords.push(...absorbRawRecords(inner));
    } catch { /* not JSON */ }
  }

  // Explicit rawContent from the API response
  rawRecords.push(...absorbRawRecords(rawContent));

  // Deduplicate by index — rawContent duplicates often come from both paths above
  const seen = new Set<string>();
  const uniqueRecords = rawRecords.filter((r) => {
    const key = String(r.concept_name || r.title || r.name || '').toLowerCase().trim() || JSON.stringify(r).slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const fromMd = formattedText ? parseConceptsFromMarkdown(formattedText) : [];
  const fromRaw = uniqueRecords.map((r, i) => normalizeConcept(r, i));

  let concepts: NormalizedConcept[] = [];
  if (fromRaw.length && fromMd.length) {
    // Prefer raw for field values, enrich with markdown where richer
    const n = Math.max(fromRaw.length, fromMd.length);
    concepts = Array.from({ length: n }, (_, i) =>
      mergeConcept(
        fromRaw[i] ?? fromRaw[fromRaw.length - 1],
        fromMd[i] ?? fromMd[fromMd.length - 1],
        i,
      ),
    );
  } else if (fromRaw.length) {
    concepts = fromRaw;
  } else if (fromMd.length) {
    concepts = fromMd;
  }

  let markdownFallback: string | null = null;
  if (!concepts.length && formattedText) {
    markdownFallback = formattedText;
  } else if (concepts.length && !concepts.some(conceptHasVisibleContent) && formattedText) {
    markdownFallback = formattedText;
  }

  return { concepts, markdownFallback };
}
