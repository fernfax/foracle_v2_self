import * as React from "react"
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

type StatAccent = "brand" | "jungle" | "teal" | "gold" | "neutral"

const ACCENT_CHIP: Record<StatAccent, string> = {
  brand:
    "bg-brand-terracotta/[0.12] text-brand-terracotta dark:text-brand-coral",
  jungle: "bg-brand-jungle/[0.12] text-[#3A6B52] dark:text-[#5A9470]",
  teal: "bg-brand-teal/[0.12] text-on-success dark:text-brand-teal-light",
  gold: "bg-brand-gold/[0.16] text-on-warning dark:text-brand-gold",
  neutral:
    "bg-brand-deep-forest/[0.06] text-muted-foreground dark:bg-brand-cream/[0.08]"
}

const DELTA_TONE = {
  up: "text-on-success dark:text-brand-teal-light",
  down: "text-on-danger dark:text-brand-alert-red-dark",
  flat: "text-muted-foreground"
} as const

const DELTA_ICON = { up: ArrowUp, down: ArrowDown, flat: Minus } as const

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  accent?: StatAccent
  /** Small sub-line under the value (e.g. a delta or a count like "2 accounts"). */
  delta?: React.ReactNode
  /** When set, colors the delta and prepends an arrow. Omit for a neutral hint. */
  deltaDirection?: "up" | "down" | "flat"
}

/**
 * StatCard — the unit of every N-up "stat band". Label-caps + icon chip on top,
 * a big tabular-number value, and an optional delta/hint line. Lifts on hover.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "neutral",
  delta,
  deltaDirection,
  className,
  ...props
}: StatCardProps) {
  const DeltaIcon = deltaDirection ? DELTA_ICON[deltaDirection] : null
  return (
    <Card interactive className={cn("p-5", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-label-caps text-muted-foreground uppercase">
          {label}
        </span>
        {Icon && (
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-xl",
              ACCENT_CHIP[accent]
            )}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="font-display text-data mt-3 font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      {delta != null && (
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            deltaDirection
              ? DELTA_TONE[deltaDirection]
              : "text-muted-foreground"
          )}>
          {DeltaIcon && <DeltaIcon className="size-3" />}
          {delta}
        </div>
      )}
    </Card>
  )
}
