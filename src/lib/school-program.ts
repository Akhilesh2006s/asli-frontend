/**
 * School program content rules for students, teachers, and school admins only.
 * Super Admin content management does NOT use these filters — all types are allowed there.
 */
export type ContentTypeName =
  | 'Video'
  | 'Audio'
  | 'TextBook'
  | 'Workbook'
  | 'Material'
  | 'Homework';

export const ALL_CONTENT_TYPES: ContentTypeName[] = [
  'Video',
  'Audio',
  'TextBook',
  'Workbook',
  'Material',
  'Homework',
];

/** Curriculum / normal schools (when isAsliPrepExclusive is false). */
export const NORMAL_SCHOOL_CONTENT_TYPES: ContentTypeName[] = [
  'Audio',
  'TextBook',
  'Homework',
];

export function resolveIsAsliPrepExclusive(user?: {
  isAsliPrepExclusive?: boolean;
  board?: string;
  assignedAdmin?: { isAsliPrepExclusive?: boolean; board?: string };
} | null): boolean {
  if (!user) return false;
  if (user.isAsliPrepExclusive === true) return true;
  if (user.assignedAdmin?.isAsliPrepExclusive === true) return true;
  if (user.board === 'ASLI_EXCLUSIVE_SCHOOLS') return true;
  if (user.assignedAdmin?.board === 'ASLI_EXCLUSIVE_SCHOOLS') return true;
  return false;
}

/** Types a student/teacher/school admin may browse — based on school program, not subject board. */
export function getAllowedContentTypes(isAsliPrepExclusive: boolean): ContentTypeName[] {
  return isAsliPrepExclusive ? [...ALL_CONTENT_TYPES] : [...NORMAL_SCHOOL_CONTENT_TYPES];
}

export function isAllowedContentType(
  type: string | undefined,
  isAsliPrepExclusive: boolean,
): boolean {
  return getAllowedContentTypes(isAsliPrepExclusive).includes(
    String(type || '').trim() as ContentTypeName,
  );
}

export function filterContentsBySchoolProgram<T extends { type?: string }>(
  contents: T[],
  isAsliPrepExclusive: boolean,
): T[] {
  if (!Array.isArray(contents)) return [];
  return contents.filter((row) => isAllowedContentType(row?.type, isAsliPrepExclusive));
}

/** AI Tools board dropdown options */
export function getAiToolBoardOptions(
  isAsliPrepExclusive: boolean,
  curriculumBoard: string,
): string[] {
  const curriculum = String(curriculumBoard || 'CBSE').trim() || 'CBSE';
  if (isAsliPrepExclusive) return ['IIT'];
  return [curriculum];
}

export function getDefaultAiToolBoard(
  isAsliPrepExclusive: boolean,
  curriculumBoard: string,
): string {
  return isAsliPrepExclusive ? 'IIT' : String(curriculumBoard || 'CBSE').trim() || 'CBSE';
}

/** Map student tool gradeLevel when board is IIT (Asli Prep). */
export function mapGradeLevelForIitBoard(
  board: string | undefined,
  gradeLevel: string | undefined,
): string | undefined {
  if (String(board || '').toUpperCase() !== 'IIT') return gradeLevel;
  return 'IIT-6';
}
