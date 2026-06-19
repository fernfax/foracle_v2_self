"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Fab } from "@/components/ui/fab-stack"
import { useAddExpense } from "@/components/budget/budget-add-expense-context"

/**
 * Add-expense FAB for the Budget page, mounted from `budget/layout.tsx`.
 *
 * Unlike the global FloatingAddButton (mobile-only, navigates to /budget), this
 * shows on every size and opens the budget page's own rich in-place modal. It
 * does so by flipping the shared `useAddExpense` context, which BudgetClient
 * watches — keeping the modal's data/state ownership inside the page while the
 * trigger lives in the layout. The GlobalAddExpenseModal no-ops on /budget, so
 * there is no double modal.
 */
export function BudgetAddFab() {
  const { openModal } = useAddExpense()

  return (
    // order 10 — same slot as the global add button (the two are never visible
    // together: FloatingAddButton bails out on /budget).
    <Fab order={10}>
      <Button
        size="icon"
        variant="outline"
        className="bg-background/95 hover:bg-accent h-14 w-14 rounded-full shadow-lg backdrop-blur-sm"
        onClick={openModal}
        aria-label="Add expense">
        <Plus className="size-6" />
      </Button>
    </Fab>
  )
}
