export const GENERATION_QUALITY_TIERS = [
  {
    id: "premium" as const,
    label: "Premium",
    description: "Best quality — schema validation, dedup, no silent padding",
  },
  {
    id: "balanced" as const,
    label: "Balanced",
    description: "Good quality with moderate cost",
  },
  {
    id: "fast" as const,
    label: "Fast",
    description: "Lower cost — fewer retries, section padding enabled",
  },
];

export type GenerationQualityTierId = (typeof GENERATION_QUALITY_TIERS)[number]["id"];

export const DEFAULT_GENERATION_QUALITY_TIER: GenerationQualityTierId = "premium";
