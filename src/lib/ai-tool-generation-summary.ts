export type AiToolGenerationMeta = {
  source?: string;
  sourceLabel?: string;
  matchType?: string | null;
  totalCandidates?: number;
  selectedIndex?: number;
  toolType?: string;
  classNumber?: string | number;
  subject?: string;
  topic?: string;
  subTopic?: string;
  board?: string;
  gradeLevel?: string;
};

export function buildAiToolGenerationSummary(
  form: {
    board?: string;
    gradeLevel?: string;
    subject?: string;
    subjects?: string;
    topic?: string;
    concept?: string;
    chapter?: string;
    projectTopic?: string;
    subTopic?: string;
  },
  meta?: AiToolGenerationMeta | null,
  toolDisplayName?: string
): string {
  const parts: string[] = [];

  if (toolDisplayName?.trim()) parts.push(toolDisplayName.trim());

  if (form.board?.trim()) parts.push(String(form.board).trim());
  if (form.gradeLevel?.trim()) parts.push(String(form.gradeLevel).trim());

  const subject = form.subject || form.subjects;
  if (subject) parts.push(String(subject).trim());

  const topic =
    form.topic || form.concept || form.chapter || form.projectTopic;
  if (topic) parts.push(String(topic).trim());
  if (form.subTopic?.trim()) parts.push(`Sub topic: ${String(form.subTopic).trim()}`);

  return parts.filter(Boolean).join(" · ");
}
