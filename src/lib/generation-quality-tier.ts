export const GENERATION_QUALITY_TIERS = [
  {
    id: "premium" as const,
    label: "Premium",
    description: "Gemini 3.1 Pro Preview — strict validation, dedup, and more retries (best board-grade quality)",
  },
  {
    id: "balanced" as const,
    label: "Balanced",
    description: "Gemini 3.1 Flash-Lite — good quality with moderate cost and faster batches",
  },
  {
    id: "fast" as const,
    label: "Fast",
    description: "Gemini 3.1 Flash-Lite — cheapest option, one slot at a time",
  },
];

export type GenerationQualityTierId = (typeof GENERATION_QUALITY_TIERS)[number]["id"];

export const DEFAULT_GENERATION_QUALITY_TIER: GenerationQualityTierId = "premium";
