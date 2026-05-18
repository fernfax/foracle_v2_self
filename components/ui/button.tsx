import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button — see /design_guide/design_guide.md §10.1.
 *
 * Polished tactile feel: 10px radius (up from 6px sharp), brand-tinted
 * lift shadow on the primary variant (so the CTA reads as a slightly
 * raised tag), subtle press translate. Ghost / outline / link stay flat
 * so secondary affordances don't compete with the primary action.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-display text-[13px] font-medium tracking-tight transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15 focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(184,98,42,0.18),0_1px_2px_rgba(28,43,42,0.04)] hover:bg-[#D4845A] hover:shadow-[0_4px_12px_rgba(184,98,42,0.22),0_1px_2px_rgba(28,43,42,0.04)] active:translate-y-px active:shadow-[0_1px_2px_rgba(184,98,42,0.18)] dark:hover:bg-[#B8622A]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_2px_8px_rgba(224,85,85,0.18),0_1px_2px_rgba(28,43,42,0.04)] hover:bg-destructive/90 hover:shadow-[0_4px_12px_rgba(224,85,85,0.22)] active:translate-y-px focus-visible:ring-destructive/20",
        outline:
          "border border-border/40 bg-background text-foreground hover:bg-muted/60 hover:border-border/70",
        secondary:
          "border-[1.5px] border-primary bg-background text-primary hover:bg-primary/8 hover:shadow-[0_2px_8px_rgba(184,98,42,0.10)] active:translate-y-px",
        ghost:
          "border border-border/30 bg-background text-foreground/70 hover:bg-muted/60 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline px-0 h-auto",
        teal:
          "bg-[#00C4AA] text-[#1C2B2A] shadow-[0_2px_8px_rgba(0,196,170,0.20),0_1px_2px_rgba(28,43,42,0.04)] hover:bg-[#33D4BC] hover:shadow-[0_4px_12px_rgba(0,196,170,0.24)] active:translate-y-px",
        warning:
          "bg-[#D4A843] text-[#1C2B2A] shadow-[0_2px_8px_rgba(212,168,67,0.20),0_1px_2px_rgba(28,43,42,0.04)] hover:bg-[#D4A843]/90 active:translate-y-px",
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
