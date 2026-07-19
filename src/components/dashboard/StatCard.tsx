import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "violet" | "blue" | "teal" | "amber" | "rose";

/** Decorative motif drawn in the card's bottom-right corner. */
export type StatMotif = "wave" | "bars" | "play" | "ring" | "none";

const tones: Record<StatTone, { surface: string; icon: string; accent: string; track: string; bar: string }> = {
  violet: {
    surface: "from-violet-50 to-indigo-blue-50/70 border-violet-100",
    icon: "bg-gradient-to-br from-violet-500 to-indigo-blue-600",
    accent: "text-violet-400",
    track: "bg-violet-100",
    bar: "bg-gradient-to-r from-violet-500 to-indigo-blue-600",
  },
  blue: {
    surface: "from-sky-50 to-blue-50/70 border-sky-100",
    icon: "bg-gradient-to-br from-sky-500 to-blue-600",
    accent: "text-sky-400",
    track: "bg-sky-100",
    bar: "bg-gradient-to-r from-sky-500 to-blue-600",
  },
  teal: {
    surface: "from-teal-50 to-emerald-50/70 border-teal-100",
    icon: "bg-gradient-to-br from-teal-500 to-emerald-600",
    accent: "text-teal-400",
    track: "bg-teal-100",
    bar: "bg-gradient-to-r from-teal-500 to-emerald-600",
  },
  amber: {
    surface: "from-amber-50 to-orange-50/70 border-amber-100",
    icon: "bg-gradient-to-br from-amber-500 to-orange-600",
    accent: "text-amber-400",
    track: "bg-amber-100",
    bar: "bg-gradient-to-r from-amber-500 to-orange-600",
  },
  rose: {
    surface: "from-rose-50 to-pink-50/70 border-rose-100",
    icon: "bg-gradient-to-br from-rose-500 to-pink-600",
    accent: "text-rose-400",
    track: "bg-rose-100",
    bar: "bg-gradient-to-r from-rose-500 to-pink-600",
  },
};

function Motif({ motif, className }: { motif: StatMotif; className: string }) {
  if (motif === "none") return null;
  const common = { className, "aria-hidden": true as const, fill: "none" };

  if (motif === "wave")
    return (
      <svg viewBox="0 0 120 48" {...common}>
        <path d="M0 34c14 0 14-16 28-16s14 16 28 16 14-20 28-20 14 12 28 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      </svg>
    );
  if (motif === "bars")
    return (
      <svg viewBox="0 0 120 48" {...common}>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={8 + i * 22} y={44 - (10 + i * 7)} width="12" height={10 + i * 7} rx="4" fill="currentColor" opacity={0.3 + i * 0.12} />
        ))}
      </svg>
    );
  if (motif === "play")
    return (
      <svg viewBox="0 0 120 48" {...common}>
        <circle cx="92" cy="24" r="20" fill="currentColor" opacity="0.25" />
        <path d="M87 15l13 9-13 9V15z" fill="currentColor" opacity="0.6" />
      </svg>
    );
  return (
    <svg viewBox="0 0 120 48" {...common}>
      <circle cx="94" cy="24" r="18" stroke="currentColor" strokeWidth="4" opacity="0.3" />
      <path d="M94 6a18 18 0 0 1 15 27" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
  tone?: StatTone;
  motif?: StatMotif;
  /** 0–100. Renders a progress bar in place of the caption spacing. */
  progress?: number;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "violet",
  motif = "none",
  progress,
  onClick,
}: StatCardProps) {
  const t = tones[tone];
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-5 text-left transition-all sm:p-6",
        t.surface,
        onClick &&
          "hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <Motif motif={motif} className={cn("pointer-events-none absolute -bottom-1 right-0 h-16 w-28", t.accent)} />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="text-base font-semibold text-ink-soft">{label}</p>
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm", t.icon)}>
          <Icon className="h-[1.35rem] w-[1.35rem] text-white" aria-hidden="true" />
        </span>
      </div>

      <p className="relative z-10 mt-3 font-display text-4xl font-extrabold leading-none tracking-tight text-ink">
        {value}
      </p>

      {typeof progress === "number" && (
        <div className={cn("relative z-10 mt-4 h-2 w-full overflow-hidden rounded-full", t.track)}>
          <div
            className={cn("h-2 rounded-full transition-all duration-700", t.bar)}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      {caption && <p className="relative z-10 mt-3 text-sm font-medium text-muted-foreground">{caption}</p>}
    </Wrapper>
  );
}

export default StatCard;
