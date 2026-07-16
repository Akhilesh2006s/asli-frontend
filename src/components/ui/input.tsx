import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-slate-300 bg-input px-4 py-3 text-base font-medium text-ink shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-semibold file:text-foreground placeholder:font-normal placeholder:text-slate-400 transition-colors focus-visible:border-indigo-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-blue-500/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
