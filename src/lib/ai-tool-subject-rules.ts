/** Story & Passage Creator is limited to language subjects. */

export const STORY_PASSAGE_TOOL_ID = 'story-passage-creator';

export function isStoryPassageLanguageSubject(subject: string | undefined | null): boolean {
  const s = String(subject || '').trim();
  if (!s) return false;
  if (/(hindi|हिंदी|हिन्दी)/i.test(s)) return true;
  if (/english/i.test(s)) return true;
  return false;
}

export function filterSubjectsForAiTool(toolType: string, subjects: string[]): string[] {
  if (toolType === STORY_PASSAGE_TOOL_ID) {
    return subjects.filter(isStoryPassageLanguageSubject);
  }
  return subjects;
}

export function hasStoryPassageLanguageSubject(subjects: string[]): boolean {
  return subjects.some(isStoryPassageLanguageSubject);
}

export type CurriculumSubjectRow = { value: string; label: string };

export function filterSubjectRowsForAiTool(
  toolType: string,
  rows: CurriculumSubjectRow[],
): CurriculumSubjectRow[] {
  if (toolType !== STORY_PASSAGE_TOOL_ID) return rows;
  return rows.filter(
    (r) => isStoryPassageLanguageSubject(r.label) || isStoryPassageLanguageSubject(r.value),
  );
}

export function subjectLabelFromRows(
  rows: CurriculumSubjectRow[],
  value: string,
): string {
  const row = rows.find((r) => r.value === value);
  return row?.label || value;
}
