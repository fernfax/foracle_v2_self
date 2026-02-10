"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { formatBudgetCurrency } from "@/lib/budget-utils";
import { deleteBudgetShift, type BudgetShift } from "@/lib/actions/budget-shifts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface BudgetShiftHistoryProps {
  shifts: BudgetShift[];
  onShiftDeleted?: () => void;
}

export function BudgetShiftHistory({ shifts, onShiftDeleted }: BudgetShiftHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (shifts.length === 0) {
    return null;
  }

  const handleDelete = async (shiftId: string) => {
    setDeletingId(shiftId);
    try {
      await deleteBudgetShift(shiftId);
      onShiftDeleted?.();
    } catch (error) {
      console.error("Error deleting shift:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Calculate total shifted this month
  const totalShifted = shifts.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  return (
    <Card className="p-4">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">
            Budget Adjustments
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {shifts.length} shift{shifts.length !== 1 ? "s" : ""} this month
            {" · "}
            {formatBudgetCurrency(totalShifted)} moved
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-3">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium truncate">{shift.fromCategoryName}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate">{shift.toCategoryName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{formatBudgetCurrency(parseFloat(shift.amount))}</span>
                  {shift.note && (
                    <>
                      <span>·</span>
                      <span className="truncate">{shift.note}</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(shift.createdAt), "d MMM, h:mm a")}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                onClick={() => handleDelete(shift.id)}
                disabled={deletingId === shift.id}
              >
                <Trash2 className={cn("h-4 w-4", deletingId === shift.id && "animate-pulse")} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
