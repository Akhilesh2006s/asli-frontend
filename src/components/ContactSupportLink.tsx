import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "hello@aslilearn.ai";

type ContactSupportLinkProps = {
  className?: string;
  compact?: boolean;
};

/** Shared Contact Support control for every dashboard. */
export function ContactSupportLink({ className, compact = false }: ContactSupportLinkProps) {
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("AsliLearn support request")}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900",
        compact && "px-2 py-1.5 text-xs",
        className,
      )}
    >
      <Mail className="h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
      {compact ? "Support" : "Contact Support"}
    </a>
  );
}

export { SUPPORT_EMAIL };
