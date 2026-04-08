/** Shared helpers for exam class targeting (assignedClasses + legacy classNumber). */

export type ExamClassLike = {
  assignedClasses?: string[] | string | Record<string, unknown>;
  classNumber?: string;
};

export const CLASS_FILTER_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'] as const;

/** Resolves class labels from API (array, classNumber, or odd legacy shapes). */
export function getExamClassStrings(exam: Partial<ExamClassLike>): string[] {
  const raw = exam.assignedClasses as unknown;
  let classes: string[] = [];
  if (typeof raw === 'string' && raw.trim()) {
    const s = raw.trim();
    if (s.includes('|')) {
      classes = s.split('|').map((c) => c.trim()).filter(Boolean);
    } else if (s.includes(',')) {
      classes = s.split(',').map((c) => c.trim()).filter(Boolean);
    } else {
      classes = [s];
    }
  } else if (Array.isArray(raw) && raw.length > 0) {
    classes = raw.map((c) => String(c).trim()).filter(Boolean);
  } else if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    classes = Object.values(raw as object)
      .map((c) => String(c).trim())
      .filter(Boolean);
  }
  const cn =
    exam.classNumber != null && String(exam.classNumber).trim() !== ''
      ? String(exam.classNumber).trim()
      : '';
  if (classes.length === 0 && cn) {
    classes = [cn];
  }
  return classes;
}

export function examIncludesClass(exam: Partial<ExamClassLike>, classNum: string): boolean {
  const want = String(classNum).trim();
  if (!want) return true;
  return getExamClassStrings(exam).some((c) => String(c).trim() === want);
}

/** Student UI: `all`, `my` (match profile class), or a class number from CLASS_FILTER_OPTIONS. */
export function examMatchesStudentClassFilter(
  exam: Partial<ExamClassLike>,
  filter: string,
  userClass?: string
): boolean {
  if (filter === 'all') return true;
  if (filter === 'my') {
    const c = userClass?.trim();
    if (!c) return true;
    return examIncludesClass(exam, c);
  }
  return examIncludesClass(exam, filter);
}
