import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button — see /design_guide/design_guide.md §10.1.
 * Default: Space Grotesk 13px / 500, padding 10px 22px, radius 6px.
 * Variants: default (terracotta primary), secondary (outlined terracotta),
 * ghost (transparent + hairline), teal (success-only completion flows),
 * destructive (alert red), outline (legacy alias for ghost), link.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-display text-[13px] font-medium tracking-tight transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15 focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[#D4845A] dark:hover:bg-[#B8622A] active:translate-y-px",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "border border-border/40 bg-transparent text-foreground hover:bg-muted/60 hover:border-border/70",
        secondary:
          "border-[1.5px] border-primary bg-transparent text-primary hover:bg-primary/8",
        ghost:
          "border border-border/30 bg-transparent text-foreground/70 hover:bg-muted/60 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline px-0 h-auto",
        teal:
          "bg-[#00C4AA] text-[#1C2B2A] hover:bg-[#33D4BC] active:translate-y-px",
        warning:
          "bg-[#D4A843] text-[#1C2B2A] hover:bg-[#D4A843]/90",
      },
      size: {
        default: "h-9 px-[22px] py-[10px] has-[>svg]:px-4",
        sm: "h-8 px-4 py-[7px] text-[12px] has-[>svg]:px-3",
        lg: "h-11 px-7 py-[13px] text-[15px] has-[>svg]:px-5",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
