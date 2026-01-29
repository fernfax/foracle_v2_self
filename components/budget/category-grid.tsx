"use client";

import { CategoryBudgetCard } from "./category-budget-card";
import type { BudgetVsActual } from "@/lib/actions/budget-calculator";

interface CategoryGridProps {
  budgetData: BudgetVsActual[];
  onCategoryClick?: (categoryName: string) => void;
}

export function CategoryGrid({ budgetData, onCategoryClick }: CategoryGridProps) {
  // Filter to only show categories with a budget or spending
  const activeCategories = budgetData.filter(
    (b) => b.monthlyBudget > 0 || b.spent > 0
  );

  if (activeCategories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No budget categories set up yet.</p>
        <p className="text-sm mt-1">
          Add recurring expenses to see your budget breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {activeCategories.map((budget) => (
        <CategoryBudgetCard
          key={budget.categoryName}
          categoryName={budget.categoryName}
          icon={budget.icon}
          spent={budget.spent}
          budget={budget.monthlyBudget}
          onClick={() => onCategoryClick?.(budget.categoryName)}
        />
      ))}
    </div>
  );
}
