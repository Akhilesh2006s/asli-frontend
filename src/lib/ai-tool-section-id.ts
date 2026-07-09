/** Stable DOM id for in-page section navigation. */
export function aiToolSectionDomId(num: string, title: string): string {
  const slug = `${num}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug ? `ai-sec-${slug}` : `ai-sec-${String(num).replace(/\D/g, '') || '1'}`;
}
