/** Story & Passage / Reading Practice tools are limited to language subjects. */

export const STORY_PASSAGE_TOOL_ID = 'story-passage-creator';
export const READING_PRACTICE_TOOL_ID = 'reading-practice-room';

const STORY_LANGUAGE_TOOL_IDS = new Set([STORY_PASSAGE_TOOL_ID, READING_PRACTICE_TOOL_ID]);

/** Tools that must not be used with English, Hindi, or Telugu subjects. */
export const LANGUAGE_EXCLUDED_TOOL_IDS = [
  'worksheet-mcq-generator',
  'short-notes-summaries-maker',
  'concept-mastery-helper',
  'daily-class-plan-maker',
  'concept-breakdown-explainer',
  'chapter-summary-creator',
  'key-points-formula-extractor',
] as const;

const LANGUAGE_EXCLUDED_TOOL_ID_SET = new Set<string>(LANGUAGE_EXCLUDED_TOOL_IDS);

export const LANGUAGE_EXCLUDED_TOOL_ERROR =
  'This tool is not available for English, Hindi, or Telugu subjects.';

export function isStoryLanguageTool(toolType: string): boolean {
  return STORY_LANGUAGE_TOOL_IDS.has(String(toolType || '').trim());
}

export function isLanguageExcludedTool(toolType: string): boolean {
  return LANGUAGE_EXCLUDED_TOOL_ID_SET.has(String(toolType || '').trim());
}

export function isStoryPassageLanguageSubject(subject: string | undefined | null): boolean {
  const s = String(subject || '').trim();
  if (!s) return false;
  if (/(telugu|తెలుగు)/i.test(s)) return true;
  if (/(hindi|हिंदी|हिन्दी)/i.test(s)) return true;
  if (/english/i.test(s)) return true;
  return false;
}

export function filterSubjectsForAiTool(toolType: string, subjects: string[]): string[] {
  if (isStoryLanguageTool(toolType)) {
    return subjects.filter(isStoryPassageLanguageSubject);
  }
  if (isLanguageExcludedTool(toolType)) {
    return subjects.filter((s) => !isStoryPassageLanguageSubject(s));
  }
  return subjects;
}

export function hasStoryPassageLanguageSubject(subjects: string[]): boolean {
  return subjects.some(isStoryPassageLanguageSubject);
}

export function hasNonLanguageSubject(subjects: string[]): boolean {
  return subjects.some((s) => !isStoryPassageLanguageSubject(s));
}

/** Whether a tool card should appear on Vidya dashboard for the user's assigned subjects. */
export function isAiToolVisibleForSubjects(toolId: string, subjectNames: string[]): boolean {
  const id = String(toolId || '').trim();
  if (isStoryLanguageTool(id)) {
    if (subjectNames.length === 0) return true;
    return hasStoryPassageLanguageSubject(subjectNames);
  }
  if (isLanguageExcludedTool(id)) {
    if (subjectNames.length === 0) return true;
    return hasNonLanguageSubject(subjectNames);
  }
  return true;
}

/** @deprecated Use isAiToolVisibleForSubjects */
export const isStudentToolVisibleForSubjects = isAiToolVisibleForSubjects;

/** @deprecated Use isAiToolVisibleForSubjects */
export const isTeacherToolVisibleForSubjects = isAiToolVisibleForSubjects;

export function filterVisibleAiTools<T extends { id: string }>(
  tools: T[],
  subjectNames: string[],
): T[] {
  return tools.filter((tool) => isAiToolVisibleForSubjects(tool.id, subjectNames));
}

export type CurriculumSubjectRow = { value: string; label: string };

export function filterSubjectRowsForAiTool(
  toolType: string,
  rows: CurriculumSubjectRow[],
): CurriculumSubjectRow[] {
  if (isStoryLanguageTool(toolType)) {
    return rows.filter(
      (r) => isStoryPassageLanguageSubject(r.label) || isStoryPassageLanguageSubject(r.value),
    );
  }
  if (isLanguageExcludedTool(toolType)) {
    return rows.filter(
      (r) =>
        !isStoryPassageLanguageSubject(r.label) && !isStoryPassageLanguageSubject(r.value),
    );
  }
  return rows;
}

export function subjectLabelFromRows(
  rows: CurriculumSubjectRow[],
  value: string,
): string {
  const row = rows.find((r) => r.value === value);
  return row?.label || value;
}
