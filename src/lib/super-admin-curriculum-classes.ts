export const CURRICULUM_CLASSES_STORAGE_KEY = 'superAdminCurriculumClasses';
export const SELECT_CLASS_LABEL_KEY = 'superAdminSelectClassLabel';

export type CurriculumClassEntry = {
  classNumber: string;
  description: string;
  label: string;
};

function parseStored(raw: string | null): CurriculumClassEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CurriculumClassEntry =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CurriculumClassEntry).classNumber === 'string' &&
        typeof (item as CurriculumClassEntry).label === 'string'
    );
  } catch {
    return [];
  }
}

export function loadCurriculumClasses(): CurriculumClassEntry[] {
  if (typeof window === 'undefined') return [];
  return parseStored(localStorage.getItem(CURRICULUM_CLASSES_STORAGE_KEY));
}

export function saveCurriculumClass(entry: CurriculumClassEntry): boolean {
  if (typeof window === 'undefined') return false;
  const existing = loadCurriculumClasses();
  if (existing.some((c) => c.classNumber === entry.classNumber)) {
    return false;
  }
  localStorage.setItem(
    CURRICULUM_CLASSES_STORAGE_KEY,
    JSON.stringify([...existing, entry])
  );
  return true;
}

export function getCurriculumClassLabels(): string[] {
  return loadCurriculumClasses()
    .map((c) => c.label)
    .sort((a, b) => {
      const aNum = parseInt(a.replace('Class ', ''), 10);
      const bNum = parseInt(b.replace('Class ', ''), 10);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    });
}

export function consumeSelectClassLabel(): string | null {
  if (typeof window === 'undefined') return null;
  const label = sessionStorage.getItem(SELECT_CLASS_LABEL_KEY);
  sessionStorage.removeItem(SELECT_CLASS_LABEL_KEY);
  return label;
}

export function queueSelectClassLabel(label: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SELECT_CLASS_LABEL_KEY, label);
}
