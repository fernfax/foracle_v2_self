"use client"

import * as React from "react"
import type { Investment } from "@/actions/investments"

import { formatBudgetCurrency } from "@/lib/budget-utils"
import { brandColor } from "@/lib/portfolio-colors"
import { Badge } from "@/components/ui/badge"
import { RowActions } from "@/components/ui/row-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

const TYPE_LABELS: Record<string, string> = {
  stock: "Stock",
  cash: "Cash",
  bonds: "Bonds",
  etf: "ETF",
  crypto: "Crypto",
  mutual_fund: "Mutual Fund",
  reit: "REIT"
}

/** Title-case a raw type slug for the Type badge (falls back to a humanized label). */
function typeLabel(type: string): string {
  if (TYPE_LABELS[type]) return TYPE_LABELS[type]
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/**
 * Normalize a holding's stored contribution to a monthly figure.
 * - monthly → the amount as-is
 * - custom  → (amount × number-of-selected-months) / 12 (annualized → monthly)
 */
function monthlyContribution(investment: Investment): number {
  const amount = parseFloat(investment.contributionAmount) || 0
  if (
    investment.contributionFrequency === "custom" &&
    investment.customMonths
  ) {
    try {
      const months = JSON.parse(investment.customMonths) as number[]
      if (Array.isArray(months)) return (amount * months.length) / 12
    } catch {
      // fall through to the raw amount
    }
  }
  return amount
}

export interface HoldingsTableProps {
  investments: Investment[]
  onEdit: (investment: Investment) => void
  onDelete: (investment: Investment) => void
}

/**
 * HoldingsTable — the standardized holdings table for /investments. Mirrors the
 * house table idiom (rounded-lg border bg-card wrapper, text-right numerics,
 * w-[70px] actions, tabular-nums). Binds only to real fields — there is no cost
 * basis / units / gain, so no Gain or Cost-basis columns.
 */
export function HoldingsTable({
  investments,
  onEdit,
  onDelete
}: HoldingsTableProps) {
  return (
    <div className="bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Holding</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Current value</TableHead>
            <TableHead className="text-right">Proj. yield</TableHead>
            <TableHead className="text-right">Monthly contribution</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investments.map((investment) => {
            const capital = parseFloat(investment.currentCapital) || 0
            const projectedYield = parseFloat(investment.projectedYield) || 0
            const monthly = monthlyContribution(investment)

            return (
              <TableRow key={investment.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: brandColor(investment.type) }}
                      className="inline-block size-2.5 rounded-full"
                    />
                    {investment.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="neutral">{typeLabel(investment.type)}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBudgetCurrency(capital)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {projectedYield.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBudgetCurrency(monthly)}
                </TableCell>
                <TableCell>
                  <RowActions
                    onEdit={() => onEdit(investment)}
                    onDelete={() => onDelete(investment)}
                    editLabel="Edit holding"
                    deleteLabel="Delete holding"
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
