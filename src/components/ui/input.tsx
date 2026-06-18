import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Shared field shell — the canonical look for ALL form controls (see
 * /docs/design_guide/design_guide.md §10.3). 1px hairline border on card
 * surface, 6px radius (rounded-sm), 40px tall, DM Sans 14px, terracotta border
 * + 3px terracotta-tinted ring on focus. Reused by Input and by the DatePicker
 * trigger so a date field is visually identical to a text field.
 */
export const fieldShellClassName =
  "border-border/40 bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/10 flex h-10 w-full rounded-sm border px-3.5 py-2 text-base transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          fieldShellClassName,
          "file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium",
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
