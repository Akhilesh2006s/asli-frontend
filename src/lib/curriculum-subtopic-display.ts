/**
 * Curriculum display helpers — hide subtopic when scope is whole chapter
 * or an explicit joined multi-subtopic list (not a single focused title).
 *
 * Commas in a single curriculum title are allowed (e.g. "Speed, Velocity and Acceleration").
 */

export function isSingleSubtopicLabel(value?: string | null): boolean {
  const t = String(value || '').trim();
  if (!t) return false;
  if (/^whole\s*chapter$/i.test(t)) return false;
  if (t.includes('|') && t.split('|').map((p) => p.trim()).filter(Boolean).length >= 2) return false;
  if (/\s\+\s/.test(t) && t.split(/\s\+\s/).map((p) => p.trim()).filter(Boolean).length >= 2) {
    return false;
  }
  return true;
}

/** Return the label to show, or empty string when subtopic should be omitted. */
export function displaySubtopicLabel(value?: string | null): string {
  const t = String(value || '').trim();
  if (!isSingleSubtopicLabel(t)) return '';
  return t;
}
