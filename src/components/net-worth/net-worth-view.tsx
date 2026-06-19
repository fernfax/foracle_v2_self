"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  deleteCurrentHolding,
  type CurrentHolding
} from "@/actions/current-holdings"
import {
  Banknote,
  Car,
  ExternalLink,
  Home,
  Landmark,
  Plus,
  Shield,
  TrendingUp,
  Wallet,
  type LucideIcon
} from "lucide-react"
import { toast } from "sonner"

import { formatBudgetCurrency } from "@/lib/finance/budget-utils"
import {
  type AssetClassKey,
  type ClassKey,
  type NetWorthRow,
  type NetWorthSummary
} from "@/lib/finance/net-worth"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { RowActions } from "@/components/ui/row-actions"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"
import { AddCurrentHoldingDialog } from "@/components/current-holdings/current-holding-add-dialog"

const CLASS_ICON: Record<ClassKey, LucideIcon> = {
  cash: Wallet,
  property: Home,
  vehicle: Car,
  investments: TrendingUp,
  insurance: Shield,
  cpf: Landmark,
  propertyLoan: Home,
  vehicleLoan: Car
}

const CHIP_ACCENT: Record<
  AssetClassKey,
  "brand" | "jungle" | "teal" | "gold" | "neutral"
> = {
  cash: "teal",
  property: "jungle",
  vehicle: "brand",
  investments: "brand",
  insurance: "gold",
  cpf: "jungle"
}

interface NetWorthViewProps {
  summary: NetWorthSummary
  initialHoldings: CurrentHolding[]
}

export function NetWorthView({ summary, initialHoldings }: NetWorthViewProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [holdingToEdit, setHoldingToEdit] = useState<CurrentHolding | null>(
    null
  )
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const hasAnything =
    summary.assetRows.length > 0 || summary.liabilityRows.length > 0

  const openAdd = () => {
    setHoldingToEdit(null)
    setAddOpen(true)
  }

  const openEditCash = (id: string) => {
    const holding = initialHoldings.find((h) => h.id === id) ?? null
    if (!holding) {
      toast.error("Could not find that holding to edit.")
      return
    }
    setHoldingToEdit(holding)
    setAddOpen(true)
  }

  const handleSaved = () => {
    // The net-worth summary is derived server-side; re-fetch so the hero,
    // composition and tables all recompute from the new data.
    toast.success(holdingToEdit ? "Holding updated" : "Holding added")
    setHoldingToEdit(null)
    router.refresh()
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await deleteCurrentHolding(deleteId)
      toast.success("Holding removed")
      setDeleteId(null)
      router.refresh()
    } catch (err) {
      console.error("Failed to delete holding:", err)
      toast.error("Could not remove holding. Please try again.")
    }
  }

  return (
    <div className="space-y-4">
      {/* Hero — net worth + composition */}
      <SectionCard
        icon={Landmark}
        title="Net Worth"
        subtitle="Everything you own, minus what you owe."
        actions={
          <Button data-tour="add-holding-btn" onClick={openAdd}>
            <Plus className="size-4" />
            Add holding
          </Button>
        }>
        <div
          data-tour="net-worth-hero"
          className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-display text-data-lg font-semibold tracking-tight tabular-nums">
              {formatBudgetCurrency(summary.netWorth)}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              <span className="text-on-success dark:text-brand-teal-light">
                {formatBudgetCurrency(summary.totalAssets)}
              </span>{" "}
              in assets ·{" "}
              <span className="text-on-danger dark:text-brand-alert-red-dark">
                {formatBudgetCurrency(summary.totalLiabilities)}
              </span>{" "}
              in liabilities
            </p>
          </div>
        </div>

        {summary.composition.length > 0 && (
          <div className="mt-5">
            <div className="bg-muted flex h-3 overflow-hidden rounded-full">
              {summary.composition.map((seg) => (
                <div
                  key={seg.key}
                  style={{
                    width: `${seg.pct * 100}%`,
                    backgroundColor: seg.color
                  }}
                  title={`${seg.label} — ${formatBudgetCurrency(seg.amount)}`}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {summary.composition.map((seg) => (
                <span
                  key={seg.key}
                  className="flex items-center gap-1.5 text-xs">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-muted-foreground">{seg.label}</span>
                  <span className="font-medium tabular-nums">
                    {Math.round(seg.pct * 100)}%
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {!hasAnything ? (
        <SectionCard title="Assets & Liabilities" icon={Wallet}>
          <EmptyState
            icon={Banknote}
            title="Nothing tracked yet"
            description="Add a bank holding here, or record property, vehicles and investments from their own pages to build your net worth."
            action={{ label: "Add holding", onClick: openAdd }}
          />
        </SectionCard>
      ) : (
        <>
          {/* Asset-class chips */}
          {summary.assetClasses.length > 0 && (
            <div
              data-tour="asset-class-chips"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {summary.assetClasses.map((c) => (
                <StatCard
                  key={c.key}
                  label={c.label}
                  value={formatBudgetCurrency(c.amount)}
                  icon={CLASS_ICON[c.key]}
                  accent={CHIP_ACCENT[c.key as AssetClassKey] ?? "neutral"}
                  delta={`${c.count} ${c.count === 1 ? "item" : "items"}`}
                />
              ))}
            </div>
          )}

          {/* Assets */}
          <SectionCard
            icon={Wallet}
            title="Assets"
            subtitle={`${summary.assetRows.length} ${summary.assetRows.length === 1 ? "holding" : "holdings"}`}
            noBodyPadding>
            <RowList
              rows={summary.assetRows}
              onEdit={openEditCash}
              onDelete={setDeleteId}
            />
          </SectionCard>

          {/* Liabilities */}
          {summary.liabilityRows.length > 0 && (
            <SectionCard
              icon={Banknote}
              title="Liabilities"
              subtitle="Outstanding loans, managed with their assets"
              noBodyPadding
              footer={
                <div className="flex w-full items-center justify-between">
                  <span className="text-label-caps text-muted-foreground uppercase">
                    Net worth
                  </span>
                  <span className="font-display text-base font-semibold tabular-nums">
                    {formatBudgetCurrency(summary.netWorth)}
                  </span>
                </div>
              }>
              <RowList rows={summary.liabilityRows} negative />
            </SectionCard>
          )}
        </>
      )}

      <AddCurrentHoldingDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) setHoldingToEdit(null)
        }}
        onHoldingAdded={handleSaved}
        holding={holdingToEdit}
      />

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this holding?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the bank holding record. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-brand-alert-red hover:bg-brand-alert-red/90 text-white">
              Delete holding
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RowList({
  rows,
  onEdit,
  onDelete,
  negative = false
}: {
  rows: NetWorthRow[]
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  negative?: boolean
}) {
  return (
    <ul className="divide-border/40 divide-y">
      {rows.map((row) => (
        <li
          key={`${row.classKey}-${row.id}`}
          className="flex items-center gap-3 px-5 py-3.5">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: row.color }}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{row.label}</div>
            <div className="text-muted-foreground truncate text-xs">
              {row.classLabel}
              {row.sublabel ? ` · ${row.sublabel}` : ""}
            </div>
          </div>
          <span
            className={`font-display shrink-0 text-sm font-semibold tabular-nums ${
              negative ? "text-on-danger dark:text-brand-alert-red-dark" : ""
            }`}>
            {negative ? "−" : ""}
            {formatBudgetCurrency(row.value)}
          </span>
          <div className="flex w-[76px] shrink-0 justify-end">
            {row.editable && onEdit && onDelete ? (
              <RowActions
                onEdit={() => onEdit(row.id)}
                onDelete={() => onDelete(row.id)}
              />
            ) : row.manageHref ? (
              <Button
                asChild
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-primary border-transparent hover:border-transparent"
                title="Manage">
                <Link href={row.manageHref}>
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
