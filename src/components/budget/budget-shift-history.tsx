"use client"

import { useState } from "react"
import { deleteBudgetShift, type BudgetShift } from "@/actions/budget-shifts"
import { format } from "date-fns"
import { ArrowRight, ChevronDown, ChevronUp, Trash2 } from "lucide-react"

import { formatBudgetCurrency } from "@/lib/finance/budget-utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface BudgetShiftHistoryProps {
  shifts: BudgetShift[]
  onShiftDeleted?: () => void
  readOnly?: boolean
  defaultExpanded?: boolean
}

export function BudgetShiftHistory({
  shifts,
  onShiftDeleted,
  readOnly = false,
  defaultExpanded = false
}: BudgetShiftHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (shifts.length === 0) {
    return null
  }

  const handleDelete = async (shiftId: string) => {
    setDeletingId(shiftId)
    try {
      await deleteBudgetShift(shiftId)
      onShiftDeleted?.()
    } catch (error) {
      console.error("Error deleting shift:", error)
    } finally {
      setDeletingId(null)
    }
  }

  // Calculate total shifted this month
  const totalShifted = shifts.reduce((sum, s) => sum + parseFloat(s.amount), 0)

  return (
    <Card className="p-4">
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}>
        <div>
          <div className="text-muted-foreground text-left text-xs font-semibold tracking-wider uppercase">
            Budget Adjustments
          </div>
          <div className="text-muted-foreground mt-1 text-sm">
            {shifts.length} shift{shifts.length !== 1 ? "s" : ""} this month
            {" · "}
            {formatBudgetCurrency(totalShifted)} moved
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="text-muted-foreground size-4" />
        ) : (
          <ChevronDown className="text-muted-foreground size-4" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-3">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="bg-muted/30 flex items-center gap-3 rounded-lg p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="truncate font-medium">
                    {shift.fromCategoryName}
                  </span>
                  <ArrowRight className="text-muted-foreground size-3 flex-shrink-0" />
                  <span className="truncate font-medium">
                    {shift.toCategoryName}
                  </span>
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                  <span>{formatBudgetCurrency(parseFloat(shift.amount))}</span>
                  {shift.note && (
                    <>
                      <span>·</span>
                      <span className="truncate">{shift.note}</span>
                    </>
                  )}
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {format(new Date(shift.createdAt), "d MMM, h:mm a")}
                </div>
              </div>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-on-danger size-8"
                  onClick={() => handleDelete(shift.id)}
                  disabled={deletingId === shift.id}>
                  <Trash2
                    className={cn(
                      "size-4",
                      deletingId === shift.id && "animate-pulse"
                    )}
                  />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
