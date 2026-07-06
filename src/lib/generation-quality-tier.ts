export const GENERATION_QUALITY_TIERS = [
  {
    id: "premium" as const,
    label: "Premium",
    description: "Strict validation — every field checked; dedup; retries until content passes or fails",
  },
  {
    id: "balanced" as const,
    label: "Balanced",
    description: "Gemini 2.5 Flash — good quality, moderate cost",
  },
  {
    id: "fast" as const,
    label: "Fast",
    description: "Gemini 3.1 Flash-Lite — cheapest, one at a time",
  },
];

export type GenerationQualityTierId = (typeof GENERATION_QUALITY_TIERS)[number]["id"];

export const DEFAULT_GENERATION_QUALITY_TIER: GenerationQualityTierId = "premium";
