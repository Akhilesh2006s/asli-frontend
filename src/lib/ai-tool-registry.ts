/** Retired tool labels — keep in sync with ASLI-STUD-BACK/config/aiToolTemplates.js */
export const DEPRECATED_AI_TOOL_LABELS = [
  "Enrichment / HOTS Task Generator",
  "Remedial Support Plan Generator",
] as const;

function normalizeAiToolIdentifierKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const deprecatedKeys = new Set(DEPRECATED_AI_TOOL_LABELS.map(normalizeAiToolIdentifierKey));

/** True when value is a retired tool slug, label, or legacy contentType. */
export function isDeprecatedAiToolIdentifier(value: unknown): boolean {
  const key = normalizeAiToolIdentifierKey(value);
  if (!key) return false;
  if (deprecatedKeys.has(key)) return true;
  if (key.includes("enrichment") && (key.includes("hots") || key.includes("hotstask"))) return true;
  if (key.includes("remedial") && key.includes("support")) return true;
  return false;
}
