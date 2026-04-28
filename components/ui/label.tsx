"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "font-display text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        /** Default form label — Space Grotesk 14px / 500. */
        default: "",
        /**
         * Brand-guide "label-caps" — Space Grotesk 11px / 600 / 0.1em uppercase.
         * Use for KPI labels, eyebrow text, and form section headers.
         */
        caps: "text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, variant, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ variant }), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label, labelVariants }
