/**
 * Detect AI tool template section headers that must not be treated as questions.
 */

const QUICK_ASSIGNMENT_SECTION_HINTS: Array<(t: string) => boolean> = [
  (t) => /assignment\s*title|^title$/.test(t),
  (t) => /learning\s+objectives?/.test(t),
  (t) => /instructions/.test(t),
  (t) => /concept[\s-]*based/.test(t),
  (t) => /application/.test(t),
  (t) => /real[\s-]*life|competency/.test(t),
  (t) => /creative/.test(t),
  (t) => /collaborative|discussion/.test(t),
  (t) => /challenge|advanced/.test(t),
  (t) => /assessment|rubric|marking/.test(t),
  (t) => /expected\s+learning|learning\s+outcomes?/.test(t),
];

const HOMEWORK_SECTION_HINTS: Array<(t: string) => boolean> = [
  (t) => /homework\s+title|^title$/.test(t),
  (t) => /clear\s+student\s+instructions|^instructions/.test(t),
  (t) => /practice\s+questions/.test(t),
  (t) => /application/.test(t),
  (t) => /creative|thinking\s+question/.test(t),
  (t) => /real[\s-]*life|observation/.test(t),
  (t) => /challenge/.test(t),
  (t) => /support\s+hint/.test(t),
  (t) => /answer\s+hints|key\s+points/.test(t),
  (t) => /parent\s+note/.test(t),
];

const PRACTICE_QA_SECTION_HINTS: Array<(t: string) => boolean> = [
  (t) => /^section\s+[a-g]\b/.test(t),
  (t) => /mcqs?|multiple\s+choice/.test(t),
  (t) => /fill\s+in\s+the\s+blanks?/.test(t),
  (t) => /match\s+the\s+following/.test(t),
  (t) => /very\s+short\s+answer/.test(t),
  (t) => /short\s+answer\s+questions?/.test(t) && !/very/.test(t),
  (t) => /application\s*\/\s*case|case[\s-]*based/.test(t),
  (t) => /hots\s*\/\s*analytical|higher[\s-]*order/.test(t),
  (t) => /real[\s-]*life|problem[\s-]*solving/.test(t),
  (t) => /answer\s+key/.test(t),
];

function stripSectionPrefix(line: string): string {
  const raw = String(line || '').trim().replace(/^#{1,3}\s*/, '');
  const withoutNum = raw.replace(/^\d{1,2}\.\s*/, '').trim();
  return (withoutNum || raw).toLowerCase();
}

function matchesHints(title: string, hints: Array<(t: string) => boolean>): boolean {
  const t = stripSectionPrefix(title);
  if (!t || t.length > 96) return false;
  return hints.some((hint) => hint(t));
}

export function isQuickAssignmentSectionHeaderLine(line: string): boolean {
  return matchesHints(line, QUICK_ASSIGNMENT_SECTION_HINTS);
}

export function isHomeworkSectionHeaderLine(line: string): boolean {
  return matchesHints(line, HOMEWORK_SECTION_HINTS);
}

export function isPracticeQaSectionHeaderLine(line: string): boolean {
  return (
    matchesHints(line, PRACTICE_QA_SECTION_HINTS) ||
    isQuickAssignmentSectionHeaderLine(line)
  );
}

export function isTemplateSectionHeaderLine(line: string): boolean {
  return (
    isQuickAssignmentSectionHeaderLine(line) ||
    isHomeworkSectionHeaderLine(line) ||
    isPracticeQaSectionHeaderLine(line)
  );
}

export function isValidQuestionLine(line: string): boolean {
  const t = String(line || '').trim();
  if (!t) return false;
  if (/^section\s+\d{1,2}\b/i.test(t)) return false;
  return !isTemplateSectionHeaderLine(t);
}
