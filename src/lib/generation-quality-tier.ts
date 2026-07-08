export const GENERATION_QUALITY_TIERS = [
  {
    id: "premium" as const,
    label: "Premium",
    description: "Gemini 3.1 Pro Preview — highest quality; strict validation + dedup (slower, higher cost)",
  },
  {
    id: "balanced" as const,
    label: "Balanced",
    description: "Gemini 3.1 Flash-Lite — good quality, moderate cost",
  },
  {
    id: "fast" as const,
    label: "Fast",
    description: "Gemini 3.1 Flash-Lite — cheapest, one at a time",
  },
];

export type GenerationQualityTierId = (typeof GENERATION_QUALITY_TIERS)[number]["id"];

export const DEFAULT_GENERATION_QUALITY_TIER: GenerationQualityTierId = "premium";
