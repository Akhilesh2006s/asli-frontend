/** Normalize display names / slugs to canonical kebab-case tool ids. */
export function normalizeAiToolSlug(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

export function isActivityProjectGeneratorSlug(value: unknown): boolean {
  return normalizeAiToolSlug(value) === 'activity-project-generator';
}

export function isProjectIdeaLabSlug(value: unknown): boolean {
  return normalizeAiToolSlug(value) === 'project-idea-lab';
}

export function isActivityToolSlug(value: unknown): boolean {
  const slug = normalizeAiToolSlug(value);
  return slug === 'activity-project-generator' || slug === 'project-idea-lab';
}
