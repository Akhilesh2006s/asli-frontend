import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm last:mb-0", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex min-w-0">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex min-h-12 sm:min-h-16 flex-1 items-start sm:items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 text-left text-sm sm:text-base font-bold text-slate-800 transition-colors hover:bg-indigo-blue-50 hover:text-indigo-blue-700 [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-indigo-blue-600 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm sm:text-base text-slate-600 transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("border-t border-slate-100 px-2 sm:px-5 pb-3 sm:pb-5 pt-3 sm:pt-4 leading-relaxed min-w-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))

AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
