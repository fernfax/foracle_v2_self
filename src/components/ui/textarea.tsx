import * as React from "react"

import { cn } from "@/lib/cn"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "border-border/40 bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/10 flex min-h-[80px] w-full rounded-sm border px-3.5 py-2.5 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
