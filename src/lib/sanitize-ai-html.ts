import DOMPurify from 'dompurify';

/** Sanitize AI/markdown HTML before dangerouslySetInnerHTML. */
export function sanitizeAiHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['class', 'target', 'rel'],
  });
}
