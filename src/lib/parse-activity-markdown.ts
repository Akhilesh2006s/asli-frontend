/**
 * Parse Activity & Project Generator markdown (## Activity N + numbered sections) into structured rows.
 */

export type ParsedActivity = {
  sl_no?: number;
  title?: string;
  /** Legacy / alternate title field */
  name?: string;
  subtopic_link_prior_knowledge?: string;
  learning_objectives?: string[];
  /** CamelCase alias from some API payloads */
  learningObjectives?: string[];
  ncf_competency_alignment?: string | string[];
  materials_required?: string[];
  materials?: string[];
  step_by_step_procedure?: string[];
  steps?: string[];
  safety_care_instructions?: string[];
  safety_instructions?: string[];
  observation_data_recording_table?: string;
  observation_table?: string;
  creative_output_final_product?: string;
  creative_output?: string;
  differentiation_support_extension?: string;
  self_assessment_rubric?: string[];
  /** Generic procedure / instruction lines */
  instructions?: string | string[];
  /** Legacy — remapped into template fields on sanitize */
  teacher_instructions?: string[];
  student_instructions?: string[];
  differentiation?: string;
  assessment_criteria_rubric?: string[];
  /** Legacy rubric field names */
  assessment?: string | string[];
  evaluation?: string | string[];
  expected_learning_outcomes?: string;
  learning_outcome?: string;
  learning_outcomes?: string | string[];
  expected_outcome?: string;
  real_life_application?: string;
  reflection_exit_ticket?: string;
  reflection?: string;
  period_time_cues?: string;
};

/** Section number in template → field key */
const SECTION_BY_NUMBER: Record<
  number,
  { key: keyof ParsedActivity; list?: boolean; orderedList?: boolean }
> = {
  2: { key: 'subtopic_link_prior_knowledge' },
  3: { key: 'learning_objectives', list: true },
  4: { key: 'ncf_competency_alignment', list: true },
  5: { key: 'materials_required', list: true },
  6: { key: 'step_by_step_procedure', orderedList: true },
  7: { key: 'safety_care_instructions', list: true },
  8: { key: 'observation_data_recording_table' },
  9: { key: 'creative_output_final_product' },
  10: { key: 'differentiation_support_extension' },
  11: { key: 'self_assessment_rubric', list: true },
  12: { key: 'expected_learning_outcomes' },
  13: { key: 'real_life_application' },
  14: { key: 'reflection_exit_ticket' },
  15: { key: 'period_time_cues' },
};

/** Markdown section headers from Super Admin formatter (`pushSection` uses `### N. Title`) */
const SECTION_HEADING_MD_RE = /^#{1,3}\s+(\d{1,2})\.\s*(.+?)\s*$/i;
const SECTION_HEADING_BOLD_RE = /^\*\*(\d{1,2})\.\s*(.+?)\*\*\s*$/i;

/** Plain `N. Title` only when title matches template (avoids procedure steps `2. …` → section 2) */
const SECTION_PLAIN_RE = /^(\d{1,2})\.\s+(.+?)\s*$/i;
const SECTION_TITLE_HINT: Record<number, RegExp> = {
  2: /subtopic|prior\s+knowledge/i,
  3: /learning\s+objective/i,
  4: /ncf|competency|learning\s+outcome\s+alignment/i,
  5: /materials?\s+required/i,
  6: /step-by-step|student\s+procedure|procedure/i,
  7: /safety|care\s+instruction/i,
  8: /observation|data\s+recording/i,
  9: /creative\s+output|final\s+product/i,
  10: /differentiation|support\s+and\s+extension/i,
  11: /self[-\s]?assessment|rubric/i,
  12: /expected\s+learning\s+outcome/i,
  13: /real[-\s]?life/i,
  14: /reflection|exit\s+ticket|closure/i,
  15: /period\s*\/\s*time|time\s+cues?/i,
};

/** Legacy section labels → Project Idea Lab 14-point index. */
function legacyActivitySectionNumFromTitle(title: string): number | null {
  const t = String(title || '').trim();
  if (!t) return null;
  if (/^teacher\s+instruction/i.test(t)) return null;
  if (/^student\s+instruction/i.test(t)) return 6;
  if (/^assessment\s+(?:criteria\s+)?rubric/i.test(t)) return 11;
  if (/^differentiation/i.test(t)) return 10;
  if (/^step-by-step\s+procedure$/i.test(t)) return 6;
  return null;
}

const MATERIAL_LINE_RE =
  /battery|bulb|switch|connecting\s+wires?|nichrome|compass|chart\s+paper|whiteboard|markers?/i;

function sectionNumFromTitle(title: string): number | null {
  const t = String(title || '').trim();
  if (!t) return null;
  for (const [num, hint] of Object.entries(SECTION_TITLE_HINT)) {
    if (hint.test(t)) return Number(num);
  }
  return null;
}

function mapHeadingToSection(n: number, title: string): number | null {
  const legacy = legacyActivitySectionNumFromTitle(title);
  if (legacy != null) return legacy;
  if (n >= 2 && n <= 14) {
    const hint = SECTION_TITLE_HINT[n];
    if (title && hint && !hint.test(title)) {
      const byTitle = sectionNumFromTitle(title);
      if (byTitle != null) return byTitle;
    }
    return n;
  }
  if (n > 14) return sectionNumFromTitle(title);
  return null;
}

/** Numbered action lines inside procedure — not section headers (e.g. "7. Instruct students…"). */
const PROCEDURE_STEP_LINE_RE =
  /^\d{1,2}[\).\s]+(?:Divide|Provide|Instruct|Guide|Ask|Observe|Have|Allow|Distribute|Demonstrate|Explain|Show|Give|Let|Help|Encourage|Monitor|Circulate|Review|Summarize|Collect|Test|Check|Record|Compare|Discuss|Predict|Identify|Label|Place|Prepare|Set|Use|Work)/i;

function looksLikeProcedureStepLine(line: string): boolean {
  return PROCEDURE_STEP_LINE_RE.test(String(line || '').trim());
}

function templateSectionNumberFromLine(line: string): number | null {
  const trimmed = line.trim();
  if (looksLikeProcedureStepLine(trimmed)) return null;
  if (/^\*\*Period\s*\/\s*time\s*cues?\s*:?\s*\*\*$/i.test(trimmed)) return 15;
  if (/^Period\s*\/\s*time\s*cues?\s*:?\s*$/i.test(trimmed)) return 15;

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
    if (n >= 2 && n <= 14 && hint?.test(m[2])) return n;
    const legacy = legacyActivitySectionNumFromTitle(m[2]);
    if (legacy != null) return legacy;
    const mapped = mapHeadingToSection(n, m[2]);
    if (mapped != null) return mapped;
  }
  const bare = trimmed.replace(/^#+\s*/, '').trim();
  const bareLegacy = legacyActivitySectionNumFromTitle(bare);
  if (bareLegacy != null) return bareLegacy;
  const bareNum = sectionNumFromTitle(bare);
  if (bareNum != null) return bareNum;
  return null;
}

/** Strip markdown headings, misplaced materials, and period cues from reflection prose. */
export function cleanReflectionProse(body: string): string {
  const lines = String(body || '').split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    if (/^#{1,3}\s+\d+[\.\)]\s+/i.test(t)) continue;
    if (/^\*\*\d+[\.\)]\s*.+\*\*\s*$/i.test(t)) continue;
    if (/^\*\*Period\s*\/\s*time/i.test(t) || /^Period\s*\/\s*time/i.test(t)) break;
    if (/^[-*•]\s/.test(t) && MATERIAL_LINE_RE.test(t)) continue;
    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function dedupePeriodTimeCues(text: string): string {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const norm = line
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\bminutes?\b/g, 'min');
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(line);
  }
  return out.join('\n');
}

function extractMisplacedMaterials(text: string): { prose: string; materials: string[] } {
  const materials: string[] = [];
  const kept: string[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    if (/^[-*•]\s/.test(t) && MATERIAL_LINE_RE.test(t)) {
      materials.push(t.replace(/^\s*[-*•]\s*/, '').trim());
    } else {
      kept.push(line);
    }
  }
  return { prose: kept.join('\n').trim(), materials };
}

export function sanitizeParsedActivity(activity: ParsedActivity): ParsedActivity {
  const out: ParsedActivity = { ...activity };

  let materials = [
    ...(Array.isArray(out.materials_required) ? out.materials_required : []),
    ...(Array.isArray(out.materials) ? out.materials : []),
  ].map((x) => String(x).trim()).filter(Boolean);

  if (out.period_time_cues) {
    out.period_time_cues = dedupePeriodTimeCues(String(out.period_time_cues));
  }

  let reflectionRaw = String(out.reflection_exit_ticket || '');
  const splitPeriod = reflectionRaw.split(/\n(?=\*{0,2}\s*Period\s*\/\s*time\s*cues?)/i);
  if (splitPeriod.length > 1) {
    reflectionRaw = splitPeriod[0];
    const cues = splitPeriod.slice(1).join('\n').replace(/^\*{0,2}\s*Period\s*\/\s*time\s*cues?\s*:?\s*\*{0,2}\s*/i, '');
    out.period_time_cues = dedupePeriodTimeCues(
      [out.period_time_cues, cues].filter(Boolean).join('\n'),
    );
  }

  const extracted = extractMisplacedMaterials(reflectionRaw);
  if (!materials.length && extracted.materials.length) {
    materials = extracted.materials;
    out.materials_required = materials;
    out.materials = materials;
  }
  out.reflection_exit_ticket = cleanReflectionProse(extracted.prose);

  const studentSteps = Array.isArray(out.student_instructions)
    ? out.student_instructions.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (studentSteps.length) {
    out.step_by_step_procedure = studentSteps;
    out.steps = studentSteps;
  }

  const procedure = extractProcedureSteps(out);
  if (procedure.length && !studentSteps.length) {
    out.step_by_step_procedure = procedure;
    out.steps = procedure;
  }

  const rubric = [
    ...(Array.isArray(out.self_assessment_rubric) ? out.self_assessment_rubric : []),
    ...(Array.isArray(out.assessment_criteria_rubric) ? out.assessment_criteria_rubric : []),
    ...(Array.isArray(out.assessment) ? out.assessment.map(String) : []),
  ].filter(Boolean);
  if (rubric.length) {
    out.self_assessment_rubric = rubric;
    out.assessment_criteria_rubric = rubric;
  }

  if (!String(out.differentiation_support_extension || '').trim() && out.differentiation) {
    out.differentiation_support_extension = out.differentiation;
  }

  out.teacher_instructions = undefined;

  return out;
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

  const flushStep = () => {
    const text = buf.join(' ').trim();
    if (text) steps.push(text.replace(/^\s*\d+[\).\s]+/i, '').trim());
    buf = [];
  };

  for (const line of lines) {
    if (/^\d+[\).\s]+/.test(line)) {
      flushStep();
      buf.push(line.replace(/^\s*\d+[\).\s]+/i, '').trim());
    } else if (buf.length) {
      buf.push(line);
    } else {
      steps.push(line.replace(/^\s*[-*•]\s*/, '').trim());
    }
  }
  flushStep();
  return steps.filter(Boolean);
}

function stripStepLine(line: string): string {
  return String(line || '')
    .replace(/\*\*/g, '')
    .replace(/^\s*\d+[\).\s]+/i, '')
    .replace(/^\s*[-*•]\s*/, '')
    .trim();
}

function isLikelyProcedureStepText(text: string): boolean {
  const t = stripStepLine(text);
  if (!t || t.length < 12) return false;
  if (/^(?:teacher|student)\s+instruction/i.test(t)) return false;
  return (
    looksLikeProcedureStepLine(`1. ${t}`) ||
    /^(?:Divide|Provide|Instruct|Guide|Ask|Observe|Have|Distribute|Demonstrate|Explain|Give|Let|Help|Test|Check|Record|Compare|Discuss|Predict|Identify|Label|Place|Prepare|Set|Use|Work)\b/i.test(
      t,
    )
  );
}

function extractProcedureSteps(activity: ParsedActivity): string[] {
  const blobs: string[] = [];
  const pushBlob = (v: unknown) => {
    if (Array.isArray(v)) blobs.push(v.map((x) => String(x ?? '')).join('\n'));
    else if (typeof v === 'string' && v.trim()) blobs.push(v);
  };

  pushBlob(activity.step_by_step_procedure);
  pushBlob(activity.steps);

  let best: string[] = [];
  for (const src of blobs) {
    const parsed = linesToOrderedList(src).map(stripStepLine).filter(Boolean);
    if (parsed.length > best.length) best = parsed;
  }

  if (best.length <= 1) {
    const teacherLines = Array.isArray(activity.teacher_instructions)
      ? activity.teacher_instructions.map((x) => String(x ?? ''))
      : [];
    const misplaced = teacherLines.map(stripStepLine).filter(isLikelyProcedureStepText);
    if (misplaced.length) {
      const seen = new Set(best.map((s) => s.toLowerCase()));
      for (const line of misplaced) {
        const key = line.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          best.push(line);
        }
      }
    }
  }

  return best;
}

function assignSectionBody(activity: ParsedActivity, sectionNum: number, body: string) {
  const def = SECTION_BY_NUMBER[sectionNum];
  if (!def || !body.trim()) return;

  const trimmedBody = body.replace(/\n{2,}/g, '\n').trim();

  if (def.list) {
    const list = def.orderedList ? linesToOrderedList(trimmedBody) : linesToList(trimmedBody);
    (activity as Record<string, unknown>)[def.key] = list;
    if (def.key === 'materials_required') activity.materials = list;
    if (def.key === 'step_by_step_procedure') activity.steps = list;
    if (def.key === 'ncf_competency_alignment') {
      activity.ncf_competency_alignment =
        list.length === 1 ? list[0] : list.length ? list : trimmedBody;
    }
    return;
  }

  if (def.key === 'reflection_exit_ticket') {
    const prev = String(activity.reflection_exit_ticket || '').trim();
    const next = cleanReflectionProse(trimmedBody);
    activity.reflection_exit_ticket = prev ? cleanReflectionProse(`${prev}\n\n${next}`) : next;
    return;
  }

  if (def.key === 'period_time_cues') {
    const prev = String(activity.period_time_cues || '').trim();
    activity.period_time_cues = dedupePeriodTimeCues(prev ? `${prev}\n${trimmedBody}` : trimmedBody);
    return;
  }

  (activity as Record<string, unknown>)[def.key] = trimmedBody;
}

/** Split block into section number → body text */
function splitNumberedSections(block: string): Map<number, string> {
  const map = new Map<number, string>();
  const lines = block.split('\n');
  let currentNum: number | null = null;
  const buf: string[] = [];

  let skipTeacherBlock = false;

  const flush = () => {
    if (currentNum != null && buf.length) {
      const body = buf.join('\n').trim();
      if (body) map.set(currentNum, body);
    }
    buf.length = 0;
  };

  for (const line of lines) {
    const bare = line.trim().replace(/^#+\s*/, '');
    if (/^teacher\s+instructions/i.test(bare)) {
      flush();
      currentNum = null;
      skipTeacherBlock = true;
      continue;
    }
    const sectionNum = templateSectionNumberFromLine(line);
    if (sectionNum != null) {
      flush();
      currentNum = sectionNum;
      skipTeacherBlock = false;
      continue;
    }
    if (skipTeacherBlock) continue;
    if (currentNum != null) buf.push(line);
  }
  flush();
  return map;
}

function parseActivityBlock(block: string, index: number): ParsedActivity | null {
  const trimmed = block.trim();
  if (!trimmed) return null;

  const titleMatch = trimmed.match(/^##\s*Activity\s*(\d+)\s*:\s*(.+?)(?:\n|$)/im);
  const activityTitleLine = trimmed.match(/^##\s+(.+?)(?:\n|$)/m);
  const sl_no = titleMatch ? Number(titleMatch[1]) : index + 1;
  let title = titleMatch
    ? titleMatch[2].trim()
    : activityTitleLine
      ? activityTitleLine[1].replace(/^Activity\s*\d+\s*:\s*/i, '').trim()
      : `Activity ${sl_no}`;

  const bodyStart = titleMatch
    ? trimmed.slice(titleMatch.index! + titleMatch[0].length)
    : activityTitleLine
      ? trimmed.slice(activityTitleLine.index! + activityTitleLine[0].length)
      : trimmed;

  const activity: ParsedActivity = { sl_no, title };

  const sectionMap = splitNumberedSections(bodyStart);
  for (const [num, body] of Array.from(sectionMap.entries())) {
    assignSectionBody(activity, num, body);
  }

  if (activity.expected_learning_outcomes && !activity.learning_outcome) {
    activity.learning_outcome = activity.expected_learning_outcomes;
  }

  return sanitizeParsedActivity(activity);
}

export function parseActivitiesFromMarkdown(content: string): ParsedActivity[] {
  const text = String(content || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!text) return [];

  let blocks = text.split(/(?=^##\s+Activity\s+\d+)/im).filter((b) => b.trim());
  if (blocks.length <= 1 && /^##\s+/im.test(text)) {
    blocks = text.split(/(?=^##\s+)/im).filter((b) => b.trim());
  }

  if (blocks.length >= 1) {
    const parsed = blocks
      .map((b, i) => parseActivityBlock(b, i))
      .filter((a): a is ParsedActivity => !!a);
    if (parsed.length) return parsed;
  }

  if (/^\d+\.\s+/m.test(text) || /^#{1,3}\s*\d+\./m.test(text)) {
    const single = parseActivityBlock(text, 0);
    return single ? [single] : [];
  }

  return [];
}

function pickList(a?: string[], b?: string[]): string[] {
  const aa = Array.isArray(a) ? a : [];
  const bb = Array.isArray(b) ? b : [];
  return aa.length >= bb.length ? aa : bb;
}

function pickStr(a?: string, b?: string): string {
  const aa = String(a || '').trim();
  const bb = String(b || '').trim();
  return aa.length >= bb.length ? aa : bb;
}

function pickReflection(a?: string, b?: string): string {
  const aa = cleanReflectionProse(String(a || ''));
  const bb = cleanReflectionProse(String(b || ''));
  if (!aa) return bb;
  if (!bb) return aa;
  const score = (s: string) => {
    let sc = 0;
    if (/^#{1,3}\s+\d+/m.test(s)) sc -= 20;
    if (MATERIAL_LINE_RE.test(s) && /^[-*•]/m.test(s)) sc -= 15;
    if (s.length > 600) sc -= 5;
    return sc + Math.min(s.length, 350);
  };
  return score(aa) >= score(bb) ? aa : bb;
}

function pickPeriodCues(a?: string, b?: string): string {
  const aa = dedupePeriodTimeCues(String(a || ''));
  const bb = dedupePeriodTimeCues(String(b || ''));
  if (!aa) return bb;
  if (!bb) return aa;
  return aa.length >= bb.length ? aa : bb;
}

function mergeActivity(base: ParsedActivity = {}, md: ParsedActivity = {}): ParsedActivity {
  return {
    ...base,
    ...md,
    sl_no: md.sl_no ?? base.sl_no,
    title: pickStr(md.title, base.title),
    subtopic_link_prior_knowledge: pickStr(
      md.subtopic_link_prior_knowledge,
      base.subtopic_link_prior_knowledge,
    ),
    learning_objectives: pickList(
      md.learning_objectives,
      base.learning_objectives as string[] | undefined,
    ),
    ncf_competency_alignment: md.ncf_competency_alignment ?? base.ncf_competency_alignment,
    materials_required: pickList(
      md.materials_required,
      base.materials_required as string[] | undefined,
    ),
    materials: pickList(md.materials, base.materials as string[] | undefined),
    step_by_step_procedure: pickList(
      md.step_by_step_procedure,
      base.step_by_step_procedure as string[] | undefined,
    ),
    steps: pickList(md.steps, base.steps as string[] | undefined),
    teacher_instructions: pickList(
      md.teacher_instructions,
      base.teacher_instructions as string[] | undefined,
    ),
    student_instructions: pickList(
      md.student_instructions,
      base.student_instructions as string[] | undefined,
    ),
    differentiation: pickStr(md.differentiation, base.differentiation),
    assessment_criteria_rubric: pickList(
      md.assessment_criteria_rubric,
      base.assessment_criteria_rubric as string[] | undefined,
    ),
    expected_learning_outcomes: pickStr(
      md.expected_learning_outcomes,
      base.expected_learning_outcomes,
    ),
    learning_outcome: pickStr(md.learning_outcome, base.learning_outcome),
    real_life_application: pickStr(md.real_life_application, base.real_life_application),
    reflection_exit_ticket: pickReflection(md.reflection_exit_ticket, base.reflection_exit_ticket),
    period_time_cues: pickPeriodCues(md.period_time_cues, base.period_time_cues),
  };
}

export function resolveActivitiesFromPayload(
  activities: ParsedActivity[] | undefined | null,
  content?: string,
): ParsedActivity[] {
  const fromMd = content?.trim() ? parseActivitiesFromMarkdown(content) : [];
  const fromArr = Array.isArray(activities) ? activities.filter(Boolean) : [];

  if (fromMd.length && fromArr.length) {
    const n = Math.max(fromMd.length, fromArr.length);
    return Array.from({ length: n }, (_, i) =>
      sanitizeParsedActivity(
        mergeActivity(fromArr[i] ?? fromArr[fromArr.length - 1], fromMd[i] ?? fromMd[fromMd.length - 1]),
      ),
    );
  }
  if (fromMd.length) return fromMd.map(sanitizeParsedActivity);
  if (fromArr.length) return fromArr.map(sanitizeParsedActivity);

  const raw = String(content || '').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.activities)) return parsed.activities;
    if (Array.isArray(parsed?.raw?.activities)) return parsed.raw.activities;
    if (parsed && typeof parsed === 'object' && (parsed.title || parsed.steps || parsed.materials)) {
      return [sanitizeParsedActivity(parsed as ParsedActivity)];
    }
  } catch {
    /* not json */
  }
  return [];
}
