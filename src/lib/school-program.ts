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

const CURRICULUM_BOARDS = ['CBSE', 'STATE', 'SSC', 'ICSE', 'IB', 'CAMBRIDGE'] as const;

/** School curriculum board for AI tools (never IIT / ASLI_EXCLUSIVE_SCHOOLS). */
export function resolveCurriculumBoardForAiTools(user?: {
  curriculumBoard?: string;
  board?: string;
} | null): string {
  const raw = String(user?.curriculumBoard || user?.board || '')
    .toUpperCase()
    .trim();
  if ((CURRICULUM_BOARDS as readonly string[]).includes(raw)) return raw;
  return 'CBSE';
}

/** AI Tools board dropdown: curriculum always; IIT only when Asli Prep is on. */
export function getAiToolBoardOptions(
  isAsliPrepExclusive: boolean,
  curriculumBoard: string,
): string[] {
  const curriculum = resolveCurriculumBoardForAiTools({ curriculumBoard });
  const options = [curriculum];
  if (isAsliPrepExclusive && !options.includes('IIT')) {
    options.push('IIT');
  }
  return options;
}

/** Default AI tool board is always the school's curriculum board. */
export function getDefaultAiToolBoard(
  _isAsliPrepExclusive: boolean,
  curriculumBoard: string,
): string {
  return resolveCurriculumBoardForAiTools({ curriculumBoard });
}

/** Map student tool gradeLevel when board is IIT (Asli Prep). */
export function mapGradeLevelForIitBoard(
  board: string | undefined,
  gradeLevel: string | undefined,
): string | undefined {
  if (String(board || '').toUpperCase() !== 'IIT') return gradeLevel;
  return 'IIT-6';
}
