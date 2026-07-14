import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl font-semibold tracking-tight ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-teal-green-600 to-indigo-blue-600 text-white shadow-elevated hover:from-teal-green-700 hover:to-indigo-blue-700 hover:shadow-glow",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90",
        outline:
          "border-2 border-ink/15 bg-white/80 text-ink shadow-sm hover:border-primary/40 hover:bg-white hover:text-primary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-mist-deep shadow-sm",
        ghost: "text-ink hover:bg-primary/10 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 min-h-12 px-6 text-base [&_svg]:size-5",
        sm: "h-11 min-h-11 px-4 text-[0.9375rem] rounded-xl [&_svg]:size-5",
        lg: "h-14 min-h-14 px-8 text-lg rounded-2xl [&_svg]:size-6",
        icon: "h-12 w-12 [&_svg]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
