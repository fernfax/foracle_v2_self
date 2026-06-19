"use client"

import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Fab } from "@/components/ui/fab-stack"
import { useAddExpense } from "@/components/budget/budget-add-expense-context"

export function BudgetFloatingAddButton() {
  const pathname = usePathname()
  const { openModal } = useAddExpense()
  const isBudgetPage = pathname === "/budget"
  const isAssistantPage = pathname === "/assistant"

  const handleClick = () => {
    openModal()
  }

  // Don't render on budget page (it has its own button) or assistant page
  if (isBudgetPage || isAssistantPage) {
    return null
  }

  return (
    // order 10 — sits directly above the help button. `desktop:hidden` so it's
    // mobile-only off the budget page; phone-landscape keeps it, matching the
    // shell's isDesktop check that drives the bottom nav.
    <Fab order={10} className="desktop:hidden">
      <Button
        size="icon"
        variant="outline"
        className="bg-background/95 hover:bg-accent h-14 w-14 rounded-full shadow-lg backdrop-blur-sm"
        onClick={handleClick}
        aria-label="Add expense">
        <Plus className="size-6" />
      </Button>
    </Fab>
  )
}
