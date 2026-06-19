import * as React from "react"

import { cn } from "@/lib/utils"

export interface ProgressBarProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "color"
> {
  /** 0–100. Clamped; non-finite falls back to 0. */
  value: number
  /**
   * CSS color OR gradient for the fill (e.g. "#00C4AA" or
   * "linear-gradient(90deg, #00C4AA, #5A9470)"). Defaults to the brand accent.
   */
  color?: string
  /** Track height in px (default 8). */
  size?: number
  /** Extra classes on the track. */
  trackClassName?: string
}

/**
 * ProgressBar — the shared portfolio-pages progress fill (loan repayment, goal
 * funding, budget usage). Warm-tinted track, color-able fill.
 *
 * Rendering rule (handoff §Interactions): the fill is visible at its base state
 * and only its WIDTH animates — never gated behind opacity:0.
 */
export function PortfolioProgress({
  value,
  color,
  size = 8,
  trackClassName,
  className,
  style,
  ...props
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "bg-brand-deep-forest/[0.08] dark:bg-brand-cream/[0.1] w-full overflow-hidden rounded-full",
        trackClassName,
        className
      )}
      style={{ height: size, ...style }}
      {...props}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          background: color ?? "var(--brand-terracotta)"
        }}
      />
    </div>
  )
}
