import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl font-semibold tracking-tight ring-offset-background transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-indigo-blue-600 text-white shadow-md shadow-indigo-blue-600/15 hover:-translate-y-0.5 hover:bg-indigo-blue-700 hover:shadow-lg hover:shadow-indigo-blue-600/20",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90",
        outline:
          "border border-slate-300 bg-white text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-indigo-blue-300 hover:bg-indigo-blue-50 hover:text-indigo-blue-700",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-mist-deep shadow-sm",
        ghost: "text-slate-700 hover:bg-indigo-blue-50 hover:text-indigo-blue-700",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 min-h-12 px-6 text-base [&_svg]:size-5",
        sm: "h-11 min-h-11 px-4 text-base rounded-xl [&_svg]:size-5",
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
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        type={asChild ? undefined : type ?? "button"}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
