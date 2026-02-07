"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AddExpenseModal } from "./add-expense-modal";
import { useAddExpense } from "./add-expense-context";
import { getExpenseCategories, type ExpenseCategory } from "@/lib/actions/expense-categories";
import { getBudgetVsActual, type BudgetVsActual } from "@/lib/actions/budget-calculator";

export function GlobalAddExpenseModal() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, closeModal } = useAddExpense();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetVsActual[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Don't render on budget page - it has its own modal
  const isBudgetPage = pathname === "/budget";

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && !isBudgetPage) {
      setIsLoading(true);
      const now = new Date();
      Promise.all([
        getExpenseCategories(),
        getBudgetVsActual(now.getFullYear(), now.getMonth() + 1),
      ])
        .then(([cats, budget]) => {
          setCategories(cats);
          setBudgetData(budget);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, isBudgetPage]);

  // Don't render on budget page
  if (isBudgetPage) {
    return null;
  }

  const handleSuccess = () => {
    closeModal();
    // Navigate to budget tracking page after saving
    router.push("/budget");
  };

  return (
    <AddExpenseModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
      categories={categories.filter(c => c.trackedInBudget)}
      budgetData={budgetData}
      dailyExpenses={[]}
      onSuccess={handleSuccess}
      editingExpense={null}
      preselectedCategoryName={null}
    />
  );
}
