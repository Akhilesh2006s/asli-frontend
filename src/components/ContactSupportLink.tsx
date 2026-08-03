import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SUPPORT_EMAIL = "hello@aslilearn.ai";

type ContactSupportLinkProps = {
  className?: string;
  compact?: boolean;
};

/**
 * Shared Contact Support control for every dashboard.
 *
 * This used to be a bare `mailto:` anchor. On any machine without a default
 * mail client — most test machines, and plenty of real ones — clicking it does
 * nothing at all, which is why QA reported support as "not functioning".
 * It now opens a panel that always shows the address and can copy it, with
 * opening the mail app offered as one route rather than the only one.
 */
export function ContactSupportLink({ className, compact = false }: ContactSupportLinkProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure origin, denied permission). The
      // address is on screen and selectable, so there is still a way through.
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900",
          compact && "px-2 py-1.5 text-xs",
          className,
        )}
      >
        <Mail className="h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
        {compact ? "Support" : "Contact Support"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>
              Email the AsliLearn team and we'll get back to you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Mail className="h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
              <span className="min-w-0 flex-1 select-all truncate text-sm font-medium text-slate-900">
                {SUPPORT_EMAIL}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={copyEmail}>
                {copied ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Copy
                  </>
                )}
              </Button>
            </div>

            <Button asChild className="w-full">
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                  "AsliLearn support request",
                )}`}
              >
                Open in mail app
              </a>
            </Button>
            <p className="text-center text-xs text-slate-500">
              No mail app? Copy the address and write to us from anywhere.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { SUPPORT_EMAIL };
