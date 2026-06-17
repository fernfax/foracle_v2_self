"use client"

import Link from "next/link"

import type { HouseholdSummary } from "@/lib/household-summary"

type Tab = "family" | "incomes" | "expenses" | "cpf" | "holdings"

interface HouseholdContextStripProps {
  summary: HouseholdSummary
  tab: Tab
}

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function fmtK(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return fmt(n)
}

function Divider() {
  return <span className="text-border">·</span>
}

function Stat({ label, value }: { label?: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      {label && <span className="text-muted-foreground/70">{label}</span>}
      <span className="text-foreground/80 font-medium">{value}</span>
    </span>
  )
}

export function HouseholdContextStrip({
  summary,
  tab
}: HouseholdContextStripProps) {
  const {
    grossIncome,
    netIncome,
    cpfEmployeeTotal,
    monthlyExpenses,
    surplus,
    liquidHoldings,
    runwayMonths,
    memberCount
  } = summary

  // Empty state: no incomes at all
  if (grossIncome === 0 && tab !== "family" && tab !== "holdings") {
    return (
      <div className="border-border/40 bg-muted/40 mb-4 rounded-md border px-3 py-2 text-[11px]">
        <Link
          href="/user?tab=incomes"
          className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
          Add an income to see your household picture →
        </Link>
      </div>
    )
  }

  let content: React.ReactNode

  if (tab === "family") {
    content = (
      <>
        <Stat value={`${memberCount} member${memberCount !== 1 ? "s" : ""}`} />
        {grossIncome > 0 && (
          <>
            <Divider />
            <Stat label="Household income" value={`${fmtK(grossIncome)}/mo`} />
          </>
        )}
        {liquidHoldings > 0 && (
          <>
            <Divider />
            <Stat label="Savings" value={fmtK(liquidHoldings)} />
          </>
        )}
      </>
    )
  } else if (tab === "incomes") {
    content = (
      <>
        <Stat label="Gross" value={`${fmtK(grossIncome)}/mo`} />
        <span className="text-muted-foreground/50">→</span>
        <Stat label="Net" value={`${fmtK(netIncome)}/mo`} />
        {cpfEmployeeTotal > 0 && (
          <>
            <span className="text-muted-foreground/50">→</span>
            <Stat label="CPF" value={`${fmtK(cpfEmployeeTotal)}/mo`} />
          </>
        )}
        <span className="text-muted-foreground/50">→</span>
        <Stat
          label="Surplus"
          value={`${surplus >= 0 ? "" : "−"}${fmtK(Math.abs(surplus))}/mo`}
        />
      </>
    )
  } else if (tab === "expenses") {
    content = (
      <>
        <Stat label="Spending" value={`${fmtK(monthlyExpenses)}/mo`} />
        <Divider />
        <Stat
          label="Surplus"
          value={`${surplus >= 0 ? "+" : "−"}${fmtK(Math.abs(surplus))}/mo`}
        />
        {runwayMonths !== null && (
          <>
            <Divider />
            <Stat label="Runway" value={`${runwayMonths} mo`} />
          </>
        )}
      </>
    )
  } else if (tab === "cpf") {
    content = (
      <>
        <Stat label="Employee CPF" value={`${fmtK(cpfEmployeeTotal)}/mo`} />
        {grossIncome > 0 && (
          <>
            <Divider />
            <Stat label="of gross" value={`${fmtK(grossIncome)}/mo`} />
          </>
        )}
      </>
    )
  } else {
    // holdings
    content = (
      <>
        <Stat label="Savings" value={fmtK(liquidHoldings)} />
        {runwayMonths !== null && (
          <>
            <Divider />
            <Stat label="Runway" value={`${runwayMonths} mo`} />
          </>
        )}
      </>
    )
  }

  return (
    <div className="border-border/40 bg-muted/30 mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-1.5 text-[11px]">
      {content}
      <span className="ml-auto pl-2">
        <Link
          href="/overview"
          className="text-muted-foreground/60 hover:text-muted-foreground text-[10px] transition-colors">
          Full picture →
        </Link>
      </span>
    </div>
  )
}
