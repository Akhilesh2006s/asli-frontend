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

const MATCH_TYPE_LABELS: Record<string, string> = {
  "exact-with-tool": "Exact (tool + topic + sub-topic)",
  "exact-any-tool": "Exact (topic + sub-topic)",
  "topic-with-tool": "Topic match (tool)",
  "topic-any-tool": "Topic match",
  "subject-with-tool": "Subject match (tool)",
  "subject-any-tool": "Subject match",
  "fuzzy-with-tool": "Fuzzy match (tool)",
  "fuzzy-any-tool": "Fuzzy match",
};

export function resolveAiToolSourceLabel(meta?: AiToolGenerationMeta | null): string {
  if (!meta) return "";
  if (meta.sourceLabel?.trim()) return meta.sourceLabel.trim();
  const src = String(meta.source || "").toLowerCase();
  if (
    src.includes("ai-tool") ||
    src === "super-admin-ai-tool-data" ||
    src === "fallback-db"
  ) {
    return src === "fallback-db" ? "Previously generated content" : "AI Tool Data";
  }
  if (src === "pdf-extracted") return "Textbook (PDF)";
  if (src === "csv" || src.includes("question-bank")) return "Question Bank (CSV)";
  if (src === "rag" || src === "cache") return "Previously generated content";
  return "";
}

function humanizeMatchType(matchType?: string | null): string {
  const key = String(matchType || "").trim();
  if (!key) return "";
  return MATCH_TYPE_LABELS[key] || key.replace(/-/g, " ");
}

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

  const sourceLabel = resolveAiToolSourceLabel(meta);
  if (sourceLabel) parts.push(sourceLabel);

  const matchLabel = humanizeMatchType(meta?.matchType);
  if (matchLabel) parts.push(`Lookup: ${matchLabel}`);

  const total = meta?.totalCandidates;
  const idx = meta?.selectedIndex;
  if (typeof total === "number" && total > 1 && typeof idx === "number" && idx >= 0) {
    parts.push(`Variant ${idx + 1} of ${total}`);
  } else if (typeof total === "number" && total > 0) {
    parts.push(`${total} stored variant${total === 1 ? "" : "s"}`);
  }

  return parts.filter(Boolean).join(" · ");
}
