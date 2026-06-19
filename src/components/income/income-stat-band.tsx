"use client"

import { useMemo } from "react"
import { Coins, Crown, Layers, Wallet } from "lucide-react"

import { formatBudgetCurrency } from "@/lib/finance/budget-utils"
import { StatCard } from "@/components/ui/stat-card"

interface IncomeRow {
  name: string
  amount: string
  isActive: boolean | null
  familyMember?: { name: string } | null
}

interface IncomeStatBandProps {
  /** Gross monthly income — reuse the value the household summary already computed. */
  grossIncome: number
  /** Take-home (gross − employee CPF). */
  netIncome: number
  incomes: IncomeRow[]
}

const toNum = (s: string | null | undefined): number => {
  const n = parseFloat(s ?? "")
  return Number.isFinite(n) ? n : 0
}

/**
 * The 4-up stat band that sits above the income timeline — the same stat-band
 * frame the other tabs use. Purely additive: it reads income data, it does not
 * touch the timeline studio below it.
 */
export function IncomeStatBand({
  grossIncome,
  netIncome,
  incomes
}: IncomeStatBandProps) {
  const { activeStreams, largest } = useMemo(() => {
    const active = incomes.filter((i) => i.isActive !== false)
    let largest: { label: string; amount: number } | null = null
    for (const inc of active) {
      const amt = toNum(inc.amount)
      if (!largest || amt > largest.amount) {
        largest = {
          label: inc.name || inc.familyMember?.name || "—",
          amount: amt
        }
      }
    }
    return { activeStreams: active.length, largest }
  }, [incomes])

  return (
    <div
      data-tour="income-stat-band"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Gross income"
        value={`${formatBudgetCurrency(grossIncome)}`}
        icon={Coins}
        accent="jungle"
        delta="/mo"
      />
      <StatCard
        label="Take-home"
        value={`${formatBudgetCurrency(netIncome)}`}
        icon={Wallet}
        accent="teal"
        delta="/mo after CPF"
      />
      <StatCard
        label="Active streams"
        value={String(activeStreams)}
        icon={Layers}
        accent="brand"
        delta={activeStreams === 1 ? "income source" : "income sources"}
      />
      <StatCard
        label="Largest source"
        value={largest ? formatBudgetCurrency(largest.amount) : "—"}
        icon={Crown}
        accent="gold"
        delta={largest?.label ?? "No income yet"}
      />
    </div>
  )
}
