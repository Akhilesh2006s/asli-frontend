/** Parse Super Admin style subject keys, e.g. Chemistry_10 → class "10", plain "Chemistry". */

export function extractClassNumberFromSubjectName(name: string): string | null {
  const match = name.match(/_(\d+)$/);
  return match ? match[1] : null;
}

export function extractPlainSubjectName(name: string): string {
  const match = name.match(/^(.+?)_\d+$/);
  return match ? match[1] : name;
}

export function getSubjectClassLabel(subject: {
  name?: string;
  classNumber?: string;
}): string | null {
  if (subject.classNumber != null && String(subject.classNumber).trim() !== '') {
    return String(subject.classNumber).trim();
  }
  return extractClassNumberFromSubjectName(subject.name || '');
}

/** When Subject has no classNumber / _N suffix, use class from linked prep content (common for 11–12). */
export function inferClassNumberFromPrepContent(
  items: Array<{ classNumber?: string }> | undefined
): string | null {
  if (!items || !Array.isArray(items)) return null;
  for (const item of items) {
    const cn =
      item?.classNumber != null && String(item.classNumber).trim() !== ''
        ? String(item.classNumber).trim()
        : null;
    if (cn) return cn;
  }
  return null;
}

/** Admin Learning Paths: subject row may only have class on Content documents (e.g. Class 11 Chemistry). */
export function getLearningPathClassLabel(subject: {
  name?: string;
  classNumber?: string;
  asliPrepContent?: Array<{ classNumber?: string }>;
}): string | null {
  const fromSubject = getSubjectClassLabel(subject);
  if (fromSubject) return fromSubject;
  return inferClassNumberFromPrepContent(subject.asliPrepContent);
}
