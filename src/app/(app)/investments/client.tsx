"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  createInvestment,
  deleteInvestment,
  updateInvestment,
  type Investment,
  type InvestmentsSummary
} from "@/actions/investments"
import { DollarSign, LineChart, Percent, TrendingUp } from "lucide-react"
import { toast } from "sonner"

import { formatBudgetCurrency } from "@/lib/budget-utils"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Toolbar } from "@/components/ui/toolbar"
import {
  AddInvestmentModal,
  WealthProjectionChart
} from "@/components/investments"
import { HoldingsTable } from "@/components/investments/holdings-table"
import { ConfirmDialog } from "@/components/portfolio/confirm-dialog"
import { StatBand } from "@/components/portfolio/stat-band"

interface InvestmentsClientProps {
  initialInvestments: Investment[]
  initialSummary: InvestmentsSummary
}

export function InvestmentsClient({
  initialInvestments,
  initialSummary
}: InvestmentsClientProps) {
  const router = useRouter()
  const [investments, setInvestments] =
    useState<Investment[]>(initialInvestments)
  const [summary, setSummary] = useState<InvestmentsSummary>(initialSummary)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(
    null
  )
  const [deletingInvestment, setDeletingInvestment] =
    useState<Investment | null>(null)

  // Update state when props change
  useEffect(() => {
    setInvestments(initialInvestments)
    setSummary(initialSummary)
  }, [initialInvestments, initialSummary])

  const handleAddInvestment = async (data: {
    name: string
    type: string
    currentCapital: string
    projectedYield: string
    contributionAmount: string
    contributionFrequency: string
    customMonths?: string
  }) => {
    try {
      await createInvestment(data)
      toast.success("Holding added")
      router.refresh()
    } catch (error) {
      console.error("Failed to add investment:", error)
      toast.error("Could not add holding. Please try again.")
      throw error
    }
  }

  const handleEditInvestment = async (data: {
    name: string
    type: string
    currentCapital: string
    projectedYield: string
    contributionAmount: string
    contributionFrequency: string
    customMonths?: string
  }) => {
    if (!editingInvestment) return
    try {
      await updateInvestment(editingInvestment.id, data)
      toast.success("Holding updated")
      setEditingInvestment(null)
      router.refresh()
    } catch (error) {
      console.error("Failed to update investment:", error)
      toast.error("Could not update holding. Please try again.")
      throw error
    }
  }

  const handleDeleteInvestment = async () => {
    if (!deletingInvestment) return
    const target = deletingInvestment
    try {
      await deleteInvestment(target.id)
      setInvestments((prev) => prev.filter((i) => i.id !== target.id))
      toast.success("Holding deleted")
      setDeletingInvestment(null)
      router.refresh()
    } catch (error) {
      console.error("Failed to delete investment:", error)
      toast.error("Could not delete holding. Please try again.")
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Investments" />

      {/* Stat band — reuse the server summary, do not recompute */}
      <StatBand
        items={[
          {
            label: "Portfolio value",
            value: formatBudgetCurrency(summary.totalPortfolioValue),
            icon: DollarSign,
            accent: "brand"
          },
          {
            label: "Avg yield",
            value: `${summary.averageYield.toFixed(1)}%`,
            icon: Percent,
            accent: "teal"
          },
          {
            label: "Monthly contribution",
            value: formatBudgetCurrency(summary.totalMonthlyContribution),
            icon: TrendingUp,
            accent: "jungle"
          }
        ]}
      />

      {/* Toolbar — count + the single primary add action */}
      <Toolbar
        count={{ value: investments.length, label: "holdings" }}
        primaryAction={{
          label: "Add holding",
          onClick: () => setAddModalOpen(true)
        }}
      />

      {/* Holdings table */}
      {investments.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No holdings yet"
          description="Start tracking your investment portfolio by adding your first holding."
          action={{
            label: "Add holding",
            onClick: () => setAddModalOpen(true)
          }}
        />
      ) : (
        <HoldingsTable
          investments={investments}
          onEdit={(investment) => setEditingInvestment(investment)}
          onDelete={(investment) => setDeletingInvestment(investment)}
        />
      )}

      {/* Wealth projection — the chart is already a titled card; render directly to avoid nesting */}
      <WealthProjectionChart investments={investments} />

      {/* Add Investment Modal */}
      <AddInvestmentModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={handleAddInvestment}
      />

      {/* Edit Investment Modal */}
      <AddInvestmentModal
        open={!!editingInvestment}
        onOpenChange={(open) => !open && setEditingInvestment(null)}
        investment={editingInvestment}
        onSubmit={handleEditInvestment}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deletingInvestment !== null}
        onOpenChange={(open) => !open && setDeletingInvestment(null)}
        title="Delete this holding?"
        description={
          <>
            &ldquo;{deletingInvestment?.name}&rdquo; will be removed. This
            can&rsquo;t be undone.
          </>
        }
        confirmLabel="Delete holding"
        onConfirm={handleDeleteInvestment}
      />
    </div>
  )
}
