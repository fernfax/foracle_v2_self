"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Separator — a 1px hairline divider on the semantic `border` token (see design
 * guide §10.3 / §10.4). API-compatible with shadcn's Separator (orientation +
 * className), implemented without @radix-ui/react-separator (which has a React 19
 * peer conflict in this repo). Use this instead of ad-hoc `border-t`/`border-b`
 * dividers so divider styling stays consistent.
 */
interface SeparatorProps extends React.ComponentPropsWithoutRef<"div"> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      data-orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }
