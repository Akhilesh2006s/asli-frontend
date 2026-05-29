/** Template section label vs real activity name (list + detail views). */

export const ACTIVITY_TEMPLATE_TITLE_LINE_RE =
  /^(?:\d+[\.)]\s*)?(?:Title\s+of\s+(?:the\s+)?Activity\s*\/\s*Project|Project\s*\/\s*Activity\s*Title|Title\s+of\s+Activity\s*\/\s*Project)\s*(?:[:\-—]\s*)?(.*)$/i;

export const ACTIVITY_TITLE_FRAGMENT_RE = /^of\s+(?:the\s+)?activity\s*\/\s*project\s*$/i;

export const GENERIC_ACTIVITY_NUMBER_TITLE_RE = /^Activity\s+\d+\s*$/i;

const ACTIVITY_TITLE_JUNK_LINE_RE =
  /^(?:learning\s+stage|duration\s+mode|observation|student\s+name|roll\s*no|date|signature|criteria|marks?\s*obtained|time\s+allotted)/i;

const ACTIVITY_SECTION_HEADING_RE =
  /^(?:\d+[\.)]\s*)?(?:subtopic|learning\s+objectives?|ncf|materials|step-by-step|teacher\s+instructions?|student\s+instructions?|safety|observation|differentiation|assessment|expected\s+learning|real[-\s]?life|reflection)/i;

export function isGenericActivityNumberTitle(text: string): boolean {
  return GENERIC_ACTIVITY_NUMBER_TITLE_RE.test(String(text || "").replace(/\s+/g, " ").trim());
}

export function isActivityTemplateTitleLabel(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (ACTIVITY_TITLE_FRAGMENT_RE.test(t)) return true;
  const m = t.match(ACTIVITY_TEMPLATE_TITLE_LINE_RE);
  if (!m) return false;
  return !String(m[1] || "").trim();
}

export function isCurriculumBreadcrumbTitle(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (isActivityTemplateTitleLabel(t) || isGenericActivityNumberTitle(t)) return true;
  if (/\|/.test(t) && /(?:chapter|subtopic|ncert|class\s+\d|activity\s+project)/i.test(t)) return true;
  if (/^class\s+\d+/i.test(t) && (/\|/.test(t) || /chapter\s+\d/i.test(t))) return true;
  return false;
}

export function looksLikeValidActivityTitle(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t || t.length < 4 || t.length > 140) return false;
  if (isActivityTemplateTitleLabel(t) || isCurriculumBreadcrumbTitle(t) || isGenericActivityNumberTitle(t)) {
    return false;
  }
  if (ACTIVITY_TITLE_FRAGMENT_RE.test(t) || ACTIVITY_TITLE_JUNK_LINE_RE.test(t)) return false;
  if (ACTIVITY_SECTION_HEADING_RE.test(t)) return false;
  if (/learning\s+stage.*duration|duration.*mode.*difficulty/i.test(t)) return false;
  if (
    /\b(learning\s+stage|duration\s+mode|student\s+name|roll\s*no|marks?\s+obtained)\b/i.test(t) &&
    !/\b(game|sorting|mapping|activity|experiment|project|chart|worksheet|hunt|lab|plant|food)\b/i.test(t)
  ) {
    return false;
  }
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 4) {
    const labelHits = words.filter((w) =>
      /^(learning|stage|duration|mode|difficulty|observation|student|teacher|marks|criteria|date|time)$/i.test(w),
    );
    if (labelHits.length >= 3) return false;
  }
  return true;
}

export function cleanActivityTitleForDisplay(raw: string): string {
  let t = String(raw || "").replace(/\s+/g, " ").trim();
  if (!looksLikeValidActivityTitle(t)) return "";
  const m = t.match(ACTIVITY_TEMPLATE_TITLE_LINE_RE);
  if (m) {
    const name = String(m[1] || "").trim();
    if (name.length >= 2 && looksLikeValidActivityTitle(name)) t = name;
    else return "";
  }
  t = t.replace(/^1\.\s*title\s*[—:-]\s*/i, "").trim();
  return looksLikeValidActivityTitle(t) ? t : "";
}

export function extractActivityTitleFromMarkdown(md: string): string {
  const text = String(md || "").trim();
  if (!text) return "";

  const h2 = text.match(/^##\s*Activity\s*\d+\s*:\s*(.+)$/im);
  if (h2) {
    const name = cleanActivityTitleForDisplay(h2[1].trim());
    if (name) return name;
  }

  const section1 = text.match(
    /(?:^|\n)(?:#{1,3}\s*)?1\.\s*(?:Title|Project\s*\/\s*Activity\s*Title|Title\s+of\s+(?:the\s+)?Activity\s*\/\s*Project)[^\n]*\n+([^\n#]+)/im,
  );
  if (section1) {
    const name = cleanActivityTitleForDisplay(section1[1].trim());
    if (name) return name;
  }

  return "";
}
