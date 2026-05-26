export type NormalizedLesson = {
  sl: number;
  lessonName: string;
  subjectArea: string;
  durationLabel: string;
  learningObjectives: string[];
  ncfAlignment: string[];
  priorKnowledge: string;
  introductionWarmup: string;
  teachingStrategy: string;
  keyVocabulary: string[];
  classroomActivities: string[];
  teacherTalkPoints: string[];
  studentTasks: string[];
  formativeQuestions: string[];
  differentiationPlan: string;
  homeworkPractice: string;
  teachingAids: string[];
  closureExitTicket: string;
  timeline: string[];
  valuesAndMoral: string[];
};

export type ResolvedLessonPlanner = {
  lessons: NormalizedLesson[];
  book: string;
  className: string;
  markdownFallback: string | null;
};

const LESSON_SECTION_HINT: Record<number, RegExp> = {
  2: /learning\s+objective/i,
  3: /ncf|competency|learning\s+outcome\s+alignment/i,
  4: /prior\s+knowledge|diagnostic/i,
  5: /introduction|warm[-\s]?up/i,
  6: /teaching\s+strategy/i,
  7: /classroom\s+activit|teaching\s+activit/i,
  8: /teacher\s+talk/i,
  9: /student\s+task/i,
  10: /formative|assessment\s+question/i,
  11: /differentiation/i,
  12: /homework|practice/i,
  13: /teaching\s+aids|materials?\s+required/i,
  14: /closure|exit\s+ticket|timeline/i,
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

function coalesceNcf(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const t = String(v ?? '').trim();
  if (!t) return [];
  return t.split(/[;\n]+/).map((x) => x.trim()).filter(Boolean);
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function linesToList(body: string): string[] {
  return body
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
    .filter(Boolean);
}

function linesToOrderedList(body: string): string[] {
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const steps: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join(' ').trim();
    if (text) steps.push(text.replace(/^\s*\d+[\).\s]+/i, '').trim());
    buf = [];
  };
  for (const line of lines) {
    if (/^\d+[\).\s]+/.test(line)) {
      flush();
      buf.push(line.replace(/^\s*\d+[\).\s]+/i, '').trim());
    } else if (buf.length) {
      buf.push(line);
    } else {
      steps.push(line.replace(/^\s*[-*•]\s*/, '').trim());
    }
  }
  flush();
  return steps.filter(Boolean);
}

function templateSectionNumberFromLine(line: string): number | null {
  const trimmed = line.trim();
  let m = trimmed.match(SECTION_HEADING_MD_RE);
  if (m) {
    const n = Number(m[1]);
    if (n >= 2 && n <= 14) return n;
  }
  m = trimmed.match(SECTION_HEADING_BOLD_RE);
  if (m) {
    const n = Number(m[1]);
    if (n >= 2 && n <= 14) return n;
  }
  m = trimmed.match(SECTION_PLAIN_RE);
  if (m) {
    const n = Number(m[1]);
    const hint = LESSON_SECTION_HINT[n];
    if (n >= 2 && n <= 14 && hint?.test(m[2])) return n;
  }
  return null;
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

function durationLabelFrom(raw: Record<string, unknown>): string {
  const d = raw.duration as { periods?: number; minutes_per_period?: number } | undefined;
  if (d && typeof d === 'object') {
    const p = Number(d.periods);
    const m = Number(d.minutes_per_period);
    if (p && m) return `${p} period${p > 1 ? 's' : ''} × ${m} min`;
    if (p) return `${p} period${p > 1 ? 's' : ''}`;
  }
  return '';
}

function rawRecordFromSectionMap(
  lessonName: string,
  sectionMap: Map<number, string>,
  idx: number,
): Record<string, unknown> {
  const raw: Record<string, unknown> = {
    sl_no: idx + 1,
    lesson_name: lessonName,
  };
  const get = (n: number) => sectionMap.get(n) || '';

  const lo = linesToList(get(2));
  if (lo.length) raw.learning_objectives = lo;

  const ncf = get(3);
  if (ncf) raw.ncf_competency_alignment = ncf;

  const prior = get(4);
  if (prior) raw.prior_knowledge_diagnostic = prior;

  const intro = get(5);
  if (intro) raw.introduction_warmup = intro;

  const strategy = get(6);
  if (strategy) raw.teaching_strategy = strategy;

  const acts = linesToOrderedList(get(7));
  if (acts.length) raw.teaching_activities = acts;

  const talk = linesToList(get(8));
  if (talk.length) raw.teacher_talk_points = talk;

  const tasks = linesToList(get(9));
  if (tasks.length) raw.student_tasks = tasks;

  const fq = linesToList(get(10));
  if (fq.length) raw.formative_assessment_questions = fq;

  const diff = get(11);
  if (diff) raw.differentiation_plan = diff;

  const hw = get(12);
  if (hw) raw.homework_practice = hw;

  const aids = linesToList(get(13));
  if (aids.length) raw.teaching_aids_required = aids;

  const closure = get(14);
  if (closure) raw.closure_exit_ticket = closure;

  return raw;
}

export function normalizeLesson(raw: Record<string, unknown>, idx: number): NormalizedLesson {
  const o = raw || {};
  const intro = o.introduction as { activities?: string[]; time_minutes?: number } | undefined;
  const presentation = o.presentation as {
    methods?: string[];
    key_vocabulary?: string[];
  } | undefined;
  const explanation = o.explanation_discussion as { discussion_points?: string[] } | undefined;
  const classBlock = o.activities as { class_activities?: string[] } | undefined;

  const introActs = coalesceLines(intro?.activities);
  const presMethods = coalesceLines(presentation?.methods);
  const discussPoints = coalesceLines(explanation?.discussion_points);
  const classActs = coalesceLines(classBlock?.class_activities);

  const introductionWarmup =
    coalesceText(o.introduction_warmup || o.warmup || o.warm_up) ||
    (introActs.length ? introActs.join('\n') : '');

  const teachingStrategy =
    coalesceText(o.teaching_strategy || o.pedagogy || o.methodology_summary) ||
    (presMethods.length ? presMethods.join('\n') : '');

  const teacherTalkPoints = coalesceLines(
    o.teacher_talk_points || o.teacher_instructions || o.teacher_talk,
  );
  const teacherTalk = teacherTalkPoints.length > 0 ? teacherTalkPoints : discussPoints;

  const classroomActivities = coalesceLines(
    o.teaching_activities ||
      o.classroom_activities ||
      o.activities ||
      o.step_by_step_procedure ||
      o.lesson_procedure,
  );
  const activitiesOut = classroomActivities.length > 0 ? classroomActivities : classActs;

  const formativeQuestions = coalesceLines(o.formative_assessment_questions || o.formative_questions);
  const evaluation = coalesceLines(o.evaluation);
  const formative =
    formativeQuestions.length > 0
      ? formativeQuestions
      : evaluation.length > 0
        ? evaluation
        : coalesceText(o.assessment)
          ? [coalesceText(o.assessment)]
          : [];

  const teachingAids = coalesceLines(
    o.teaching_aids_required ||
      o.materials_required ||
      o.materials ||
      o.teaching_learning_materials,
  );

  const priorKnowledge =
    coalesceText(o.prior_knowledge_diagnostic || o.diagnostic_question) ||
    coalesceLines(o.previous_knowledge).join('\n');

  const timeline = coalesceLines(o.timeline || o.schedule);
  const closure = coalesceText(o.closure_exit_ticket || o.reflection_exit_ticket || o.exit_ticket);

  return {
    sl: Number(o.sl_no) || idx + 1,
    lessonName: String(o.lesson_name || o.title || o.name || `Lesson ${idx + 1}`).trim(),
    subjectArea: String(o.subject_area || o.subject || '').trim(),
    durationLabel: durationLabelFrom(o),
    learningObjectives: coalesceLines(o.learning_objectives || o.objectives || o.learningObjectives),
    ncfAlignment: coalesceNcf(o.ncf_competency_alignment || o.competencies || o.ncf_alignment),
    priorKnowledge,
    introductionWarmup,
    teachingStrategy,
    keyVocabulary: coalesceLines(presentation?.key_vocabulary || o.key_vocabulary),
    classroomActivities: activitiesOut,
    teacherTalkPoints: teacherTalk,
    studentTasks: coalesceLines(o.student_tasks || o.student_instructions),
    formativeQuestions: formative,
    differentiationPlan: coalesceText(o.differentiation_plan || o.differentiation),
    homeworkPractice: coalesceText(o.homework_practice || o.homework),
    teachingAids,
    closureExitTicket: closure,
    timeline,
    valuesAndMoral: coalesceLines(o.values_and_moral),
  };
}

function pickList(a: string[], b: string[]): string[] {
  return a.length >= b.length ? a : b;
}

function pickText(a: string, b: string): string {
  return a.length >= b.length ? a : b;
}

export function mergeLessons(base: NormalizedLesson, md: NormalizedLesson, idx: number): NormalizedLesson {
  const merged = normalizeLesson(
    {
      sl_no: md.sl || base.sl || idx + 1,
      lesson_name: pickText(md.lessonName, base.lessonName),
      subject_area: pickText(md.subjectArea, base.subjectArea),
      learning_objectives: pickList(md.learningObjectives, base.learningObjectives),
      ncf_competency_alignment:
        md.ncfAlignment.length >= base.ncfAlignment.length ? md.ncfAlignment : base.ncfAlignment,
      prior_knowledge_diagnostic: pickText(md.priorKnowledge, base.priorKnowledge),
      introduction_warmup: pickText(md.introductionWarmup, base.introductionWarmup),
      teaching_strategy: pickText(md.teachingStrategy, base.teachingStrategy),
      key_vocabulary: pickList(md.keyVocabulary, base.keyVocabulary),
      teaching_activities: pickList(md.classroomActivities, base.classroomActivities),
      teacher_talk_points: pickList(md.teacherTalkPoints, base.teacherTalkPoints),
      student_tasks: pickList(md.studentTasks, base.studentTasks),
      formative_assessment_questions: pickList(md.formativeQuestions, base.formativeQuestions),
      differentiation_plan: pickText(md.differentiationPlan, base.differentiationPlan),
      homework_practice: pickText(md.homeworkPractice, base.homeworkPractice),
      teaching_aids_required: pickList(md.teachingAids, base.teachingAids),
      closure_exit_ticket: pickText(md.closureExitTicket, base.closureExitTicket),
      timeline: pickList(md.timeline, base.timeline),
      values_and_moral: pickList(md.valuesAndMoral, base.valuesAndMoral),
    },
    idx,
  );
  return merged;
}

export function lessonHasVisibleContent(lesson: NormalizedLesson): boolean {
  return (
    lesson.learningObjectives.length > 0 ||
    lesson.ncfAlignment.length > 0 ||
    !!lesson.priorKnowledge ||
    !!lesson.introductionWarmup ||
    !!lesson.teachingStrategy ||
    lesson.keyVocabulary.length > 0 ||
    lesson.classroomActivities.length > 0 ||
    lesson.teacherTalkPoints.length > 0 ||
    lesson.studentTasks.length > 0 ||
    lesson.formativeQuestions.length > 0 ||
    !!lesson.differentiationPlan ||
    !!lesson.homeworkPractice ||
    lesson.teachingAids.length > 0 ||
    !!lesson.closureExitTicket ||
    lesson.timeline.length > 0 ||
    lesson.valuesAndMoral.length > 0
  );
}

function parseLessonBlock(block: string, index: number): NormalizedLesson | null {
  const trimmed = htmlToPlainText(block).trim();
  if (!trimmed) return null;

  const titleMatch = trimmed.match(/^##\s*Lesson\s*(\d+)\s*:\s*(.+?)(?:\n|$)/im);
  const h2Match = trimmed.match(/^##\s+(.+?)(?:\n|$)/m);
  const h3Match = trimmed.match(/^###\s+(.+?)(?:\n|$)/m);

  const sl = titleMatch ? Number(titleMatch[1]) : index + 1;
  let lessonName = titleMatch
    ? titleMatch[2].trim()
    : h2Match
      ? h2Match[1].replace(/^Lesson\s*\d+\s*:\s*/i, '').trim()
      : h3Match
        ? h3Match[1].trim()
        : `Lesson ${sl}`;

  if (/^lesson\s+planner$/i.test(lessonName)) {
    lessonName = `Lesson ${sl}`;
  }

  const bodyStart = titleMatch
    ? trimmed.slice(titleMatch.index! + titleMatch[0].length)
    : h2Match
      ? trimmed.slice(h2Match.index! + h2Match[0].length)
      : h3Match
        ? trimmed.slice(h3Match.index! + h3Match[0].length)
        : trimmed;

  const sectionMap = splitNumberedSections(bodyStart);
  const raw = rawRecordFromSectionMap(lessonName, sectionMap, index);
  return normalizeLesson(raw, index);
}

export function parseLessonsFromMarkdown(content: string): NormalizedLesson[] {
  const text = htmlToPlainText(String(content || '').replace(/\r\n/g, '\n')).trim();
  if (!text) return [];

  let blocks: string[] = [];
  if (/__LESSON_CARD_START__/i.test(text)) {
    blocks = text
      .split(/__LESSON_CARD_(?:START|END)__/i)
      .map((b) => b.trim())
      .filter((b) => b.length > 20 && !/^END\s*$/i.test(b));
  }

  if (blocks.length === 0) {
    blocks = text.split(/(?=^##\s+Lesson\s+\d+)/im).filter((b) => b.trim());
  }
  if (blocks.length <= 1 && /^##\s+/im.test(text)) {
    const parts = text.split(/(?=^##\s+)/im).filter((b) => b.trim());
    if (parts.length > 1) blocks = parts.filter((p) => !/^##\s*📚/i.test(p) && !/^##\s*lesson\s+planner/i.test(p));
  }

  if (blocks.length >= 1) {
    const parsed = blocks
      .map((b, i) => parseLessonBlock(b, i))
      .filter((l): l is NormalizedLesson => !!l && lessonHasVisibleContent(l));
    if (parsed.length) return parsed;
    const titled = blocks
      .map((b, i) => parseLessonBlock(b, i))
      .filter((l): l is NormalizedLesson => !!l);
    if (titled.length) return titled;
  }

  if (/^\d+\.\s+/m.test(text) || /^#{1,3}\s*\d+\./m.test(text)) {
    const single = parseLessonBlock(text, 0);
    return single ? [single] : [];
  }

  const h2 = text.match(/^##\s+(.+)$/m);
  if (h2) {
    const single = parseLessonBlock(text, 0);
    return single ? [single] : [normalizeLesson({ lesson_name: h2[1].trim() }, 0)];
  }

  return [];
}

/** Pull lesson rows from API raw payloads (object, array, or single lesson). */
export function extractLessonRecords(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  }
  if (!raw || typeof raw !== 'object') return [];

  const o = raw as Record<string, unknown>;
  for (const key of ['lessons', 'lesson_plans', 'lessonPlans', 'lesson_plan', 'items', 'plans']) {
    const v = o[key];
    if (Array.isArray(v) && v.length) {
      return v.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
    }
  }

  if (o.lesson_name || o.title || o.name || o.learning_objectives || o.teaching_activities) {
    return [o];
  }

  if (o.raw && typeof o.raw === 'object') return extractLessonRecords(o.raw);
  if (o.data && typeof o.data === 'object') return extractLessonRecords(o.data);

  return [];
}

export function lessonPlannerDisplayMarkdown(content: string, rawContent?: unknown): string | null {
  try {
    const d = JSON.parse(content) as { formatted?: string; markdown?: string };
    if (d.formatted != null && String(d.formatted).trim()) return String(d.formatted);
    if (d.markdown != null && String(d.markdown).trim()) return String(d.markdown);
  } catch {
    /* plain text */
  }
  if (rawContent && typeof rawContent === 'object' && rawContent !== null) {
    const m = String((rawContent as { markdown?: string }).markdown || '').trim();
    if (m) return m;
  }
  const t = String(content || '').trim();
  if (!t.startsWith('{') && !t.startsWith('[')) return t.length > 0 ? t : null;
  return null;
}

export function resolveLessonsFromPayload(
  content: string,
  rawContent?: unknown,
): ResolvedLessonPlanner {
  let formatted = '';
  let book = '';
  let className = '';
  let rawRecords: Record<string, unknown>[] = [];

  const absorbMeta = (v: Record<string, unknown>) => {
    if (v.book) book = String(v.book);
    if (v.class) className = String(v.class);
  };

  const absorbRaw = (v: unknown) => {
    const extracted = extractLessonRecords(v);
    if (extracted.length) rawRecords = extracted;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      absorbMeta(v as Record<string, unknown>);
    }
  };

  const text = String(content || '').trim();

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (Array.isArray(parsed)) {
      absorbRaw(parsed);
    } else {
      if (parsed.formatted != null) formatted = String(parsed.formatted);
      if (parsed.markdown) formatted = formatted || String(parsed.markdown);
      if (parsed.raw) absorbRaw(parsed.raw);
      if (!rawRecords.length) absorbRaw(parsed);
      absorbMeta(parsed);
    }
  } catch {
    formatted = text;
  }

  if (rawContent) absorbRaw(rawContent);

  let fromMd = formatted.trim() ? parseLessonsFromMarkdown(formatted) : [];
  if (!fromMd.length && text && !text.startsWith('{')) {
    fromMd = parseLessonsFromMarkdown(text);
  }

  const fromRaw = rawRecords.map((r, i) => normalizeLesson(r, i));

  let lessons: NormalizedLesson[] = [];
  if (fromRaw.length && fromMd.length) {
    const n = Math.max(fromRaw.length, fromMd.length);
    lessons = Array.from({ length: n }, (_, i) =>
      mergeLessons(
        fromRaw[i] ?? fromRaw[fromRaw.length - 1],
        fromMd[i] ?? fromMd[fromMd.length - 1],
        i,
      ),
    );
  } else if (fromRaw.length) {
    lessons = fromRaw;
  } else if (fromMd.length) {
    lessons = fromMd;
  }

  let mdFallback: string | null = null;
  const displayMd = formatted || lessonPlannerDisplayMarkdown(content, rawContent);

  if (!lessons.length) {
    mdFallback = displayMd;
  } else if (!lessons.some(lessonHasVisibleContent) && displayMd) {
    mdFallback = displayMd;
  }

  return { lessons, book, className, markdownFallback: mdFallback };
}
