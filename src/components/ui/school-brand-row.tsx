import { School } from "lucide-react";
import { getSchoolBranding } from "@/lib/school-branding";
import { cn } from "@/lib/utils";

type Variant = "onPrimary" | "onLight";

type Props = {
  user?: Parameters<typeof getSchoolBranding>[0];
  schoolName?: string;
  schoolLogo?: string | null;
  variant?: Variant;
  compact?: boolean;
  className?: string;
};

export default function SchoolBrandRow({
  user,
  schoolName,
  schoolLogo,
  variant = "onPrimary",
  compact = false,
  className,
}: Props) {
  const branding =
    schoolName || schoolLogo
      ? {
          schoolName: schoolName || "Your School",
          schoolLogo: schoolLogo ?? null,
        }
      : getSchoolBranding(user);

  if (!branding) return null;

  const isOnPrimary = variant === "onPrimary";
  const logoSize = compact ? "h-7 w-7" : "h-9 w-9";

  return (
    <div className={cn("flex min-w-0 max-w-full items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border",
          logoSize,
          isOnPrimary
            ? "border-white/25 bg-white/15"
            : "border-orange-200 bg-orange-50"
        )}
      >
        {branding.schoolLogo ? (
          <img
            src={branding.schoolLogo}
            alt={`${branding.schoolName} logo`}
            className="h-[85%] w-[85%] object-contain"
          />
        ) : (
          <School
            className={cn(
              compact ? "h-3.5 w-3.5" : "h-4 w-4",
              isOnPrimary ? "text-white/90" : "text-orange-600"
            )}
          />
        )}
      </div>
      <p
        className={cn(
          "min-w-0 font-semibold leading-snug",
          compact ? "text-[15px]" : "text-[17px]",
          isOnPrimary ? "text-white/95" : "text-slate-900"
        )}
      >
        {branding.schoolName}
      </p>
    </div>
  );
}
