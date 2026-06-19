import * as React from "react"

import { cn } from "@/lib/cn"
import { StatCard, type StatCardProps } from "@/components/ui/stat-card"

export interface StatBandProps {
  /** Each item is a StatCard's props. 3 items → 3-up, 4 items → 4-up on lg. */
  items: StatCardProps[]
  className?: string
}

const COLS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4"
}

/**
 * StatBand — the shared N-up stat band for the portfolio pages. Mirrors the
 * income/expense stat bands exactly (`grid-cols-2 gap-3` base, `lg:grid-cols-N`)
 * so Insurance/Investments read identically to the User Homepage tabs.
 */
export function PortfolioStatBand({ items, className }: StatBandProps) {
  const cols = COLS[items.length] ?? "lg:grid-cols-4"
  return (
    <div className={cn("grid grid-cols-2 gap-3", cols, className)}>
      {items.map((item, i) => (
        <StatCard key={i} {...item} />
      ))}
    </div>
  )
}
