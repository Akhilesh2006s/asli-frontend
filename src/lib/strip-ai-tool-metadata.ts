/**
 * Teacher/student AI tools ask the model for plain text shaped like:
 * NAME OF THE TOOL / CLASS / SUBJECT / TOPIC / SUB TOPIC / CONTENT / ...
 * This returns only the part after the CONTENT header for display and export.
 */
export function stripStructuredAiToolMetadata(text: string): string {
  if (text == null || typeof text !== 'string') return '';
  const normalized = text.replace(/\r\n/g, '\n');
  const re = /(?:^|\n)\s*CONTENT\s*:?\s*\r?\n/i;
  const m = normalized.match(re);
  if (!m || m.index === undefined) return text;
  const start = m.index + m[0].length;
  const rest = normalized.slice(start).trimStart();
  return rest.length > 0 ? rest : text;
}
