import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge — see /design_guide/design_guide.md §10.2.
 * Anatomy: Space Grotesk 11px / 600, padding 4px 12px, radius 4px.
 * Variants use rgba-tint backgrounds with darkened text for readability.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-xs border-0 px-3 py-1 font-display text-[11px] font-semibold leading-none tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[rgba(184,98,42,0.15)] text-[#7A3A0A] dark:bg-[rgba(212,132,90,0.18)] dark:text-[#D4845A]",
        success:
          "bg-[rgba(0,196,170,0.15)] text-[#007A68] dark:bg-[rgba(0,196,170,0.18)] dark:text-[#33D4BC]",
        warning:
          "bg-[rgba(212,168,67,0.18)] text-[#7A5A00] dark:bg-[rgba(212,168,67,0.20)] dark:text-[#D4A843]",
        danger:
          "bg-[rgba(224,85,85,0.15)] text-[#8B0000] dark:bg-[rgba(224,112,112,0.18)] dark:text-[#E07070]",
        destructive:
          "bg-[rgba(224,85,85,0.15)] text-[#8B0000] dark:bg-[rgba(224,112,112,0.18)] dark:text-[#E07070]",
        neutral:
          "bg-[rgba(28,43,42,0.08)] text-[rgba(28,43,42,0.55)] dark:bg-[rgba(240,235,224,0.10)] dark:text-[rgba(240,235,224,0.55)]",
        secondary:
          "bg-[rgba(28,43,42,0.08)] text-[rgba(28,43,42,0.55)] dark:bg-[rgba(240,235,224,0.10)] dark:text-[rgba(240,235,224,0.55)]",
        brand:
          "bg-[rgba(184,98,42,0.15)] text-[#7A3A0A] dark:bg-[rgba(212,132,90,0.18)] dark:text-[#D4845A]",
        secondaryAccent:
          "bg-[rgba(58,107,82,0.12)] text-[#3A6B52] dark:bg-[rgba(90,148,112,0.15)] dark:text-[#5A9470]",
        outline:
          "border border-border/50 bg-transparent text-foreground/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
