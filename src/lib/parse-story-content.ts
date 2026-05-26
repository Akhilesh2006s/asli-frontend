/**
 * Parse Story & Passage Creator output (JSON, markdown sections, legacy passages bundle).
 */

export type StoryQuestion = {
  question: string;
  answer?: string;
};

export type StoryPassageItem = {
  passageNumber: number;
  paragraph: string;
  questions: string[];
};

export type ParsedStory = {
  title: string;
  alignment?: string;
  learningObjectives: string[];
  passage: string;
  vocabulary: string[];
  questions: StoryQuestion[];
  answerHints: string[];
  differentiationSupport?: string;
  differentiationExtension?: string;
  realLifeApplication?: string;
  reflection?: string;
  meta?: {
    subject?: string;
    book?: string;
    chapter?: string;
    instructions?: string;
  };
};

export type ParsedPassagesBundle = {
  title: string;
  instructions?: string;
  meta?: ParsedStory['meta'];
  passages: StoryPassageItem[];
};

export type ResolvedStoryContent =
  | { mode: 'stories'; stories: ParsedStory[] }
  | { mode: 'passages'; bundle: ParsedPassagesBundle }
  | { mode: 'empty' };

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function strArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(/\n+/)
      .map((line) => line.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
      .filter(Boolean);
  }
  return [];
}

function toQuestions(v: unknown): StoryQuestion[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((q) => {
      if (typeof q === 'string') return { question: str(q) };
      if (q && typeof q === 'object') {
        const o = q as Record<string, unknown>;
        return {
          question: str(o.question || o.text || o.prompt),
          answer: str(o.answer || o.hint),
        };
      }
      return null;
    })
    .filter((q): q is StoryQuestion => !!q?.question);
}

function normalizeStoryFromObject(raw: Record<string, unknown>, fallbackTitle?: string): ParsedStory {
  const alignment =
    str(raw.alignment_block) ||
    [
      raw.nep_ncf_focus ? `NEP/NCF: ${str(raw.nep_ncf_focus)}` : '',
      raw.skill_focus ? `Skill focus: ${str(raw.skill_focus)}` : '',
      raw.udl_support || raw.udl ? `UDL: ${str(raw.udl_support || raw.udl)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

  return {
    title: str(raw.title) || fallbackTitle || 'Story',
    alignment: alignment || undefined,
    learningObjectives: strArr(raw.learning_objectives || raw.objectives),
    passage: str(raw.passage || raw.content || raw.story_text),
    vocabulary: strArr(raw.vocabulary_support || raw.vocabulary),
    questions: toQuestions(raw.questions || raw.comprehension_questions),
    answerHints: strArr(raw.answer_hints || raw.answer_key),
    differentiationSupport: str(raw.differentiation_support) || undefined,
    differentiationExtension: str(raw.differentiation_extension) || undefined,
    realLifeApplication: str(raw.real_life_application || raw.real_life_link) || undefined,
    reflection: str(raw.reflection_prompt || raw.reflection_exit_ticket) || undefined,
    meta: {
      subject: str(raw.subject) || undefined,
      book: str(raw.book) || undefined,
      chapter: str(raw.chapter || raw.topic) || undefined,
      instructions: str(raw.instructions) || undefined,
    },
  };
}

function extractJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < trimmed.length; i++) {
    if (trimmed[i] === '{') depth++;
    else if (trimmed[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function extractJsonArray(text: string): unknown[] | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf('[');
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < trimmed.length; i++) {
    if (trimmed[i] === '[') depth++;
    else if (trimmed[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parsePassagesBundle(obj: Record<string, unknown>): ParsedPassagesBundle | null {
  const passages = Array.isArray(obj.passages) ? obj.passages : null;
  if (!passages?.length) return null;
  const items: StoryPassageItem[] = passages
    .map((p, i) => {
      const row = (p || {}) as Record<string, unknown>;
      return {
        passageNumber: Number(row.passage_number) || i + 1,
        paragraph: str(row.paragraph || row.passage || row.content),
        questions: strArr(row.questions),
      };
    })
    .filter((p) => p.paragraph);
  if (!items.length) return null;
  return {
    title: str(obj.title) || 'Reading passages',
    instructions: str(obj.instructions) || undefined,
    meta: {
      subject: str(obj.subject) || undefined,
      book: str(obj.book) || undefined,
      chapter: str(obj.chapter) || undefined,
    },
    passages: items,
  };
}

const STORY_SECTION_HINT: Record<number, keyof ParsedStory | 'alignment'> = {
  1: 'alignment',
  2: 'learningObjectives',
  3: 'passage',
  4: 'vocabulary',
  5: 'questions',
  6: 'answerHints',
  7: 'differentiationSupport',
  8: 'realLifeApplication',
  9: 'reflection',
};

const SECTION_HEADING_MD_RE = /^#{1,3}\s+(\d{1,2})\.\s*(.+?)\s*$/i;
const SECTION_PLAIN_RE = /^(\d{1,2})\.\s+(.+?)\s*$/i;
const SECTION_TITLE_HINT: Record<number, RegExp> = {
  1: /alignment|nep|ncf|udl|skill/i,
  2: /learning\s+objective/i,
  3: /^passage|story\s+text/i,
  4: /vocabulary/i,
  5: /comprehension|thinking\s+question/i,
  6: /answer\s+hint/i,
  7: /differentiation/i,
  8: /real[-\s]?life/i,
  9: /reflection|exit\s+ticket/i,
};

function sectionNumFromLine(line: string): number | null {
  const trimmed = line.trim();
  let m = trimmed.match(SECTION_HEADING_MD_RE);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 9) return n;
  }
  m = trimmed.match(SECTION_PLAIN_RE);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 9 && SECTION_TITLE_HINT[n]?.test(m[2])) return n;
  }
  return null;
}

function linesToList(body: string): string[] {
  return body
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
    .filter(Boolean);
}

/** Numbered lines inside a section (e.g. comprehension Q1–Qn) — do not treat as template headers */
function linesToOrderedList(body: string): string[] {
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    const text = buf.join(' ').trim();
    if (text) items.push(text.replace(/^\s*\d+[\).\s]+/i, '').trim());
    buf = [];
  };

  for (const line of lines) {
    if (/^\d+[\).\s]+/.test(line)) {
      flush();
      buf.push(line.replace(/^\s*\d+[\).\s]+/i, '').trim());
    } else if (buf.length) {
      buf.push(line);
    } else if (line.startsWith('-') || line.startsWith('*')) {
      items.push(line.replace(/^\s*[-*•]\s*/, '').trim());
    } else if (line) {
      items.push(line);
    }
  }
  flush();
  return items.filter(Boolean);
}

function storyHasContent(s: ParsedStory): boolean {
  return !!(
    s.passage ||
    s.alignment ||
    s.learningObjectives.length ||
    s.vocabulary.length ||
    s.questions.length ||
    s.answerHints.length ||
    s.differentiationSupport ||
    s.differentiationExtension ||
    s.realLifeApplication ||
    s.reflection
  );
}

function pickStr(a?: string, b?: string): string {
  const aa = String(a || '').trim();
  const bb = String(b || '').trim();
  return bb.length >= aa.length ? bb : aa;
}

function pickList(a: string[], b: string[]): string[] {
  return b.length >= a.length ? b : a;
}

function pickQuestions(a: StoryQuestion[], b: StoryQuestion[]): StoryQuestion[] {
  return b.length >= a.length ? b : a;
}

export function mergeStory(base: ParsedStory = emptyStory(), md: ParsedStory = emptyStory()): ParsedStory {
  return {
    title: pickStr(md.title, base.title),
    alignment: pickStr(md.alignment, base.alignment) || undefined,
    learningObjectives: pickList(md.learningObjectives, base.learningObjectives),
    passage: pickStr(md.passage, base.passage),
    vocabulary: pickList(md.vocabulary, base.vocabulary),
    questions: pickQuestions(md.questions, base.questions),
    answerHints: pickList(md.answerHints, base.answerHints),
    differentiationSupport:
      pickStr(md.differentiationSupport, base.differentiationSupport) || undefined,
    differentiationExtension:
      pickStr(md.differentiationExtension, base.differentiationExtension) || undefined,
    realLifeApplication: pickStr(md.realLifeApplication, base.realLifeApplication) || undefined,
    reflection: pickStr(md.reflection, base.reflection) || undefined,
    meta: { ...base.meta, ...md.meta },
  };
}

function emptyStory(title = 'Story'): ParsedStory {
  return {
    title,
    learningObjectives: [],
    passage: '',
    vocabulary: [],
    questions: [],
    answerHints: [],
  };
}

function parseStoryFromMarkdown(text: string): ParsedStory | null {
  const trimmed = text.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return null;

  const titleMatch = trimmed.match(/^##\s+(.+?)(?:\n|$)/m);
  const title = titleMatch ? titleMatch[1].replace(/^Story\s+\d+\s*:\s*/i, '').trim() : 'Story';
  const bodyStart = titleMatch ? trimmed.slice(titleMatch.index! + titleMatch[0].length) : trimmed;

  const sections = new Map<number, string>();
  const lines = bodyStart.split('\n');
  let current: number | null = null;
  const buf: string[] = [];

  const flush = () => {
    if (current != null && buf.length) {
      const body = buf.join('\n').trim();
      if (body) sections.set(current, body);
    }
    buf.length = 0;
  };

  for (const line of lines) {
    const n = sectionNumFromLine(line);
    if (n != null) {
      flush();
      current = n;
      continue;
    }
    if (current != null) buf.push(line);
  }
  flush();

  const story: ParsedStory = {
    title,
    learningObjectives: [],
    passage: '',
    vocabulary: [],
    questions: [],
    answerHints: [],
  };

  for (const [num, body] of Array.from(sections.entries())) {
    const key = STORY_SECTION_HINT[num];
    if (!key) continue;
    if (key === 'alignment') story.alignment = body.replace(/\n{2,}/g, '\n').trim();
    else if (key === 'learningObjectives') story.learningObjectives = linesToList(body);
    else if (key === 'passage') story.passage = body.replace(/\n{2,}/g, '\n').trim();
    else if (key === 'vocabulary') story.vocabulary = linesToList(body);
    else if (key === 'questions') {
      story.questions = linesToOrderedList(body).map((q) => ({ question: q }));
    } else if (key === 'answerHints') story.answerHints = linesToList(body);
    else if (key === 'differentiationSupport') {
      const support = body.match(/support:\s*(.+)/i);
      const ext = body.match(/extension:\s*(.+)/i);
      if (support) story.differentiationSupport = support[1].trim();
      if (ext) story.differentiationExtension = ext[1].trim();
      if (!support && !ext) story.differentiationSupport = body.trim();
    } else if (key === 'realLifeApplication') story.realLifeApplication = body.trim();
    else if (key === 'reflection') story.reflection = body.trim();
  }

  if (!storyHasContent(story)) return null;
  return story;
}

function parseAllStoriesFromMarkdown(text: string): ParsedStory[] {
  const trimmed = text.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return [];

  let blocks = trimmed.split(/(?=^##\s+)/im).filter((b) => b.trim());
  if (blocks.length <= 1 && /^##\s+/im.test(trimmed)) {
    blocks = [trimmed];
  }

  const parsed = blocks
    .map((b) => parseStoryFromMarkdown(b))
    .filter((s): s is ParsedStory => !!s);

  if (parsed.length) return parsed;

  const single = parseStoryFromMarkdown(trimmed);
  return single ? [single] : [];
}

function parseFromUnknown(parsed: unknown): ResolvedStoryContent {
  if (!parsed) return { mode: 'empty' };

  if (Array.isArray(parsed)) {
    const stories = parsed
      .map((row, i) =>
        row && typeof row === 'object'
          ? normalizeStoryFromObject(row as Record<string, unknown>, `Story ${i + 1}`)
          : null,
      )
      .filter((s): s is ParsedStory => !!s && storyHasContent(s));
    if (stories.length) return { mode: 'stories', stories };
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const bundle = parsePassagesBundle(obj);
    if (bundle) return { mode: 'passages', bundle };

    const nested = obj.raw || obj.data || obj.story || obj.item;
    if (nested && typeof nested === 'object') {
      const inner = parseFromUnknown(nested);
      if (inner.mode !== 'empty') return inner;
    }
    if (Array.isArray(obj.stories)) {
      const inner = parseFromUnknown(obj.stories);
      if (inner.mode !== 'empty') return inner;
    }
    if (Array.isArray(obj.items)) {
      const inner = parseFromUnknown(obj.items);
      if (inner.mode !== 'empty') return inner;
    }

    const story = normalizeStoryFromObject(obj);
    if (storyHasContent(story)) {
      return { mode: 'stories', stories: [story] };
    }
  }

  return { mode: 'empty' };
}

function storiesFromText(text: string): ParsedStory[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const fromArr = extractJsonArray(trimmed);
  if (fromArr) {
    const parsed = parseFromUnknown(fromArr);
    if (parsed.mode === 'stories') return parsed.stories;
    if (parsed.mode === 'passages') return [];
  }

  const fromObj = extractJsonObject(trimmed);
  if (fromObj) {
    const parsed = parseFromUnknown(fromObj);
    if (parsed.mode === 'stories') return parsed.stories;
  }

  try {
    const direct = JSON.parse(trimmed);
    const parsed = parseFromUnknown(direct);
    if (parsed.mode === 'stories') return parsed.stories;
  } catch {
    /* markdown */
  }

  return parseAllStoriesFromMarkdown(trimmed);
}

export function resolveStoryContent(content?: string, rawData?: unknown): ResolvedStoryContent {
  const text = String(content || '').trim();
  const fromRaw = rawData ? parseFromUnknown(rawData) : { mode: 'empty' as const };
  const fromMd = text ? storiesFromText(text) : [];

  if (fromRaw.mode === 'passages') {
    if (!fromMd.length) return fromRaw;
  }

  if (fromMd.length && fromRaw.mode === 'stories') {
    const n = Math.max(fromMd.length, fromRaw.stories.length);
    const stories = Array.from({ length: n }, (_, i) =>
      mergeStory(
        fromRaw.stories[i] ?? fromRaw.stories[fromRaw.stories.length - 1] ?? emptyStory(),
        fromMd[i] ?? fromMd[fromMd.length - 1] ?? emptyStory(),
      ),
    );
    return { mode: 'stories', stories };
  }

  if (fromMd.length) return { mode: 'stories', stories: fromMd };

  if (fromRaw.mode !== 'empty') return fromRaw;

  if (text.length > 80) {
    return {
      mode: 'stories',
      stories: [{ ...emptyStory('Reading passage'), passage: text }],
    };
  }

  return { mode: 'empty' };
}
