/**
 * Curriculum display helpers — hide subtopic when scope is whole chapter
 * or a joined multi-subtopic list (not a single focused subtopic).
 */

export function isSingleSubtopicLabel(value?: string | null): boolean {
  const t = String(value || '').trim();
  if (!t) return false;
  if (/^whole\s*chapter$/i.test(t)) return false;
  if (/\|\s*/.test(t) && t.split('|').filter((p) => p.trim()).length >= 2) return false;
  const commaParts = t.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
  // Whole-chapter storage used to join every subtopic with commas
  if (commaParts.length >= 2) return false;
  return true;
}

/** Return the label to show, or empty string when subtopic should be omitted. */
export function displaySubtopicLabel(value?: string | null): string {
  const t = String(value || '').trim();
  if (!isSingleSubtopicLabel(t)) return '';
  return t;
}
