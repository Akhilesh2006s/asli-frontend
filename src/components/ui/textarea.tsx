import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-xl border border-slate-300 bg-input px-4 py-3 text-base font-medium leading-relaxed text-ink shadow-sm ring-offset-background placeholder:font-normal placeholder:text-slate-400 focus-visible:border-indigo-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-blue-500/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
