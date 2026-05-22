/** Match backend soft-delete suffix (see ASLI-STUD-BACK/utils/subjectDelete.js). */
export function isSoftDeletedCatalogName(name?: string | null): boolean {
  return String(name || '').includes('__deleted__');
}

export function isActiveCatalogSubject(subject?: {
  name?: string;
  isActive?: boolean;
} | null): boolean {
  if (!subject) return false;
  if (subject.isActive === false) return false;
  if (isSoftDeletedCatalogName(subject.name)) return false;
  return true;
}

export function filterActiveCatalogSubjects<T extends { name?: string; isActive?: boolean }>(
  rows: T[]
): T[] {
  return rows.filter(isActiveCatalogSubject);
}

export function filterActiveCatalogContent(items: unknown[]): unknown[] {
  return (items ?? []).filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const row = item as { isActive?: boolean; subject?: unknown };
    if (row.isActive === false) return false;
    const subj = row.subject;
    if (subj == null) return false;
    if (typeof subj === 'object') {
      const s = subj as { name?: string; isActive?: boolean };
      return isActiveCatalogSubject(s);
    }
    return true;
  });
}
