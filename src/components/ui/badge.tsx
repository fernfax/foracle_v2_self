import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/cn"

/**
 * Badge — see /docs/design_guide/design_guide.md §10.2.
 *
 * Polished tag style: fully rounded pill, Space Grotesk uppercase with
 * wider tracking, subtle warm shadow so the badge reads as a physical
 * label clipped onto its parent surface (not a flat fill).
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border-0 px-3 py-1.5 font-display text-[10px] font-semibold leading-none uppercase tracking-[0.14em] transition-colors shadow-[0_1px_4px_rgba(28,43,42,0.04)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-brand-terracotta/[0.14] text-on-brand dark:bg-brand-coral/[0.18] dark:text-brand-coral",
        success:
          "bg-brand-teal/[0.14] text-on-success dark:bg-brand-teal/[0.18] dark:text-brand-teal-light",
        warning:
          "bg-brand-gold/[0.18] text-on-warning dark:bg-brand-gold/[0.2] dark:text-brand-gold",
        danger:
          "bg-brand-alert-red/[0.14] text-on-danger dark:bg-brand-alert-red-dark/[0.18] dark:text-brand-alert-red-dark",
        destructive:
          "bg-brand-alert-red/[0.14] text-on-danger dark:bg-brand-alert-red-dark/[0.18] dark:text-brand-alert-red-dark",
        neutral:
          "bg-brand-deep-forest/[0.06] text-brand-deep-forest/[0.55] dark:bg-brand-cream/[0.1] dark:text-brand-cream/[0.55]",
        secondary:
          "bg-brand-deep-forest/[0.06] text-brand-deep-forest/[0.55] dark:bg-brand-cream/[0.1] dark:text-brand-cream/[0.55]",
        brand:
          "bg-brand-terracotta/[0.14] text-on-brand dark:bg-brand-coral/[0.18] dark:text-brand-coral",
        secondaryAccent:
          "bg-brand-jungle/[0.12] text-positive dark:bg-brand-sage/[0.15]",
        outline:
          "border border-border/50 bg-transparent text-foreground/80 shadow-none"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
