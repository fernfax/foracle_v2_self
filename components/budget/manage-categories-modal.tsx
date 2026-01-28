"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerBody,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronDown, ChevronUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDefaultCategoryIcon, getCategoryIconColor, getCategoryBgColor, formatFrequency } from "@/lib/budget-utils";
import { updateTrackedExpenses, type ExpenseCategory, type ExpenseItem } from "@/lib/actions/expense-categories";
import * as LucideIcons from "lucide-react";

interface ManageCategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  expensesByCategory: Record<string, ExpenseItem[]>;
  onSuccess?: () => void;
}

// Helper to get Lucide icon component by name
function getIconComponent(iconName: string | null, categoryName: string) {
  const name = iconName || getDefaultCategoryIcon(categoryName);
  const pascalCase = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascalCase];
  return IconComponent || LucideIcons.CircleDollarSign;
}

// Get unique frequencies for a category's expenses
function getCategoryFrequencies(expenses: ExpenseItem[]): string {
  const frequencies = new Set(expenses.map((e) => e.frequency));
  return Array.from(frequencies).map(formatFrequency).join(", ");
}

// Calculate total amount for selected expenses in a category
function getSelectedTotal(expenses: ExpenseItem[], selectedIds: Set<string>): number {
  return expenses
    .filter((exp) => selectedIds.has(exp.id))
    .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
}

export function ManageCategoriesModal({
  open,
  onOpenChange,
  categories,
  expensesByCategory,
  onSuccess,
}: ManageCategoriesModalProps) {
  // Track selected expense IDs (not category IDs)
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Get all expenses as a flat list
  const allExpenses = useMemo(() => {
    return Object.values(expensesByCategory).flat();
  }, [expensesByCategory]);

  // Initialize selected expenses when modal opens
  useEffect(() => {
    if (open) {
      const tracked = new Set(
        allExpenses
          .filter((exp) => exp.trackedInBudget !== false)
          .map((exp) => exp.id)
      );
      setSelectedExpenseIds(tracked);
      setExpandedCategories(new Set());
    }
  }, [open, allExpenses]);

  // Toggle a single expense
  const handleToggleExpense = (expenseId: string) => {
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(expenseId)) {
        next.delete(expenseId);
      } else {
        next.add(expenseId);
      }
      return next;
    });
  };

  // Toggle all expenses in a category
  const handleToggleCategory = (categoryExpenses: ExpenseItem[]) => {
    const expenseIds = categoryExpenses.map((e) => e.id);
    const allSelected = expenseIds.every((id) => selectedExpenseIds.has(id));

    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect all
        expenseIds.forEach((id) => next.delete(id));
      } else {
        // Select all
        expenseIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTrackedExpenses(Array.from(selectedExpenseIds));
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating tracked expenses:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Get checkbox state for a category: "checked", "indeterminate", or "unchecked"
  const getCategoryCheckState = (categoryExpenses: ExpenseItem[]): "checked" | "indeterminate" | "unchecked" => {
    if (categoryExpenses.length === 0) return "unchecked";

    const selectedCount = categoryExpenses.filter((e) => selectedExpenseIds.has(e.id)).length;
    if (selectedCount === 0) return "unchecked";
    if (selectedCount === categoryExpenses.length) return "checked";
    return "indeterminate";
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {/* Header */}
        <DrawerHeader>
          <DrawerTitle className="flex-1 text-lg font-semibold">
            Manage Categories
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <DrawerBody>
          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4">
            Select expenses to track on your dashboard
          </p>

          {/* Category List - only show categories that have expenses */}
          <div className="space-y-2">
            {categories
              .filter((category) => (expensesByCategory[category.name] || []).length > 0)
              .map((category) => {
              const Icon = getIconComponent(category.icon, category.name);
              const iconColor = getCategoryIconColor(category.name);
              const bgColor = getCategoryBgColor(category.name);
              const categoryExpenses = expensesByCategory[category.name] || [];
              const hasExpenses = categoryExpenses.length > 0;
              const hasMultipleExpenses = categoryExpenses.length > 1;
              const isExpanded = expandedCategories.has(category.id);
              const frequencies = hasExpenses ? getCategoryFrequencies(categoryExpenses) : "";
              const checkState = getCategoryCheckState(categoryExpenses);
              const selectedTotal = getSelectedTotal(categoryExpenses, selectedExpenseIds);

              return (
                <div key={category.id}>
                  {/* Category Row */}
                  <div
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                      checkState === "checked"
                        ? "border-primary bg-primary/5"
                        : checkState === "indeterminate"
                        ? "border-primary/50 bg-primary/5"
                        : "border-transparent bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    {/* Checkbox with indeterminate state */}
                    {hasExpenses ? (
                      <div
                        className="relative flex items-center justify-center cursor-pointer"
                        onClick={() => handleToggleCategory(categoryExpenses)}
                      >
                        {checkState === "indeterminate" ? (
                          <div className="h-4 w-4 rounded-sm border border-primary bg-primary flex items-center justify-center">
                            <Minus className="h-3 w-3 text-primary-foreground" />
                          </div>
                        ) : (
                          <Checkbox
                            checked={checkState === "checked"}
                            onCheckedChange={() => handleToggleCategory(categoryExpenses)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        )}
                      </div>
                    ) : (
                      <Checkbox disabled className="opacity-50" />
                    )}

                    {/* Icon */}
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", bgColor)}>
                      <Icon className={cn("h-5 w-5", iconColor)} />
                    </div>

                    {/* Category Name & Frequency */}
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => hasExpenses && handleToggleCategory(categoryExpenses)}
                    >
                      <div className="font-medium">{category.name}</div>
                      {frequencies && (
                        <div className="text-sm text-muted-foreground">{frequencies}</div>
                      )}
                    </div>

                    {/* Total Amount (only selected) */}
                    {hasExpenses && (
                      <div className="text-right">
                        <div className="font-semibold">
                          ${selectedTotal.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    )}

                    {/* Expand/Collapse Button */}
                    {hasMultipleExpenses && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(category.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Expanded Expense Sub-items */}
                  {hasMultipleExpenses && isExpanded && (
                    <div className="ml-6 mt-2 space-y-2">
                      {categoryExpenses.map((expense) => {
                        const isSelected = selectedExpenseIds.has(expense.id);
                        return (
                          <div
                            key={expense.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border bg-background hover:bg-muted/50"
                            )}
                            onClick={() => handleToggleExpense(expense.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleExpense(expense.id)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <div className="flex-1">
                              <span className="font-medium">{expense.name}</span>
                              <span className="text-muted-foreground">
                                {" "}${parseFloat(expense.amount).toLocaleString("en-SG", { minimumFractionDigits: 2 })} &bull; {formatFrequency(expense.frequency)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DrawerBody>

        {/* Footer with buttons */}
        <DrawerFooter>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
