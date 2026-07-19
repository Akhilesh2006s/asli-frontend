/** Soft rotating pastels for Vidya AI tool / prompt cards (blue → cream → pink). */
export const VIDYA_PASTEL_TONES = [
  {
    card: 'border-sky-100 bg-sky-50 hover:border-sky-300',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-700',
  },
  {
    card: 'border-amber-100 bg-amber-50 hover:border-amber-300',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
  },
  {
    card: 'border-rose-100 bg-rose-50 hover:border-rose-300',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
  },
] as const;

export function vidyaPastelTone(index: number) {
  return VIDYA_PASTEL_TONES[index % VIDYA_PASTEL_TONES.length];
}
