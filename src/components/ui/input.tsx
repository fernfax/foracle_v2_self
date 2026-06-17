import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input — see /docs/design_guide/design_guide.md §10.3.
 * Default: 1px hairline border, 6px radius, DM Sans 14px.
 * Focus: terracotta border + 3px terracotta-tinted ring.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "border-border/40 bg-card text-foreground file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/10 flex h-10 w-full rounded-sm border px-3.5 py-2 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
